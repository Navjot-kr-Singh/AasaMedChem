"use strict";

"use server";

import { db } from "@/db";
import { quotations, quotationItems, products, sellerProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { calculatePricing } from "@/lib/pricing-engine";
import { dec } from "@/lib/decimal";
import { logActivity } from "./logging";
import { internalReserveStock, internalReleaseStock } from "./inventory";

export interface QuotationItemInput {
  productId: string;
  enteredQuantity: string;
  enteredUnit: 'g' | 'kg' | 'mL' | 'L' | 'item';
}

/**
 * Creates a quotation request for a buyer.
 */
export async function createQuotationRequest(items: QuotationItemInput[]): Promise<{ success: boolean; message: string; quotationId?: string }> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'buyer') {
    return { success: false, message: "Only buyers can create quotation requests." };
  }

  const buyerId = (session.user as any).id;

  if (!items || items.length === 0) {
    return { success: false, message: "Request must contain at least one item." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Calculate pricing details for all items
      let totalAmount = dec(0);
      const calculatedItems = [];

      for (const item of items) {
        // Retrieve product
        const pList = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (pList.length === 0 || !pList[0].isActive || pList[0].productStatus !== 'approved') {
          throw new Error(`Product not found or not active: ${item.productId}`);
        }
        const product = pList[0];

        // Perform calculation
        const pricing = calculatePricing({
          enteredQuantity: item.enteredQuantity,
          enteredUnit: item.enteredUnit,
          pricePerBaseUnit: product.pricePerBaseUnit,
          dimensionType: product.dimensionType as any
        });

        totalAmount = totalAmount.plus(dec(pricing.totalPrice));

        calculatedItems.push({
          productId: product.id,
          enteredQuantity: pricing.enteredQuantity,
          enteredUnit: pricing.enteredUnit,
          convertedQuantity: pricing.convertedQuantity,
          internalUnit: pricing.internalUnit,
          unitPrice: pricing.pricePerBaseUnit,
          totalPrice: pricing.totalPrice
        });
      }

      // 2. Insert Quotation Record
      const [quotation] = await tx.insert(quotations).values({
        buyerId,
        status: 'pending',
        totalAmount: totalAmount.toString(),
      }).returning();

      // 3. Insert Quotation Items
      for (const calcItem of calculatedItems) {
        await tx.insert(quotationItems).values({
          quotationId: quotation.id,
          productId: calcItem.productId,
          enteredQuantity: calcItem.enteredQuantity,
          enteredUnit: calcItem.enteredUnit,
          convertedQuantity: calcItem.convertedQuantity,
          internalUnit: calcItem.internalUnit,
          unitPrice: calcItem.unitPrice,
          totalPrice: calcItem.totalPrice
        });
      }

      // 4. Log Activity
      await logActivity(tx, buyerId, 'created_quotation', 'quotation', quotation.id, {
        totalAmount: totalAmount.toString(),
        itemCount: items.length
      });

      return { success: true, message: "Quotation request submitted successfully", quotationId: quotation.id };
    });

    return result;
  } catch (error: any) {
    console.error("Quotation creation error:", error);
    return { success: false, message: error.message || "Failed to create quotation request" };
  }
}

/**
 * Updates quotation status (Approve or Reject).
 * Admin can approve any quotation.
 * Seller can approve if they own the product(s) in the quotation.
 */
export async function updateQuotationStatus(
  quotationId: string,
  newStatus: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user) {
    return { success: false, message: "Unauthorized" };
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const sellerProfileId = (session.user as any).sellerProfileId;

  if (role === 'buyer') {
    return { success: false, message: "Access denied." };
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch quotation and items
      const quoteList = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).limit(1);
      if (quoteList.length === 0) {
        throw new Error("Quotation not found");
      }
      const quotation = quoteList[0];
      
      const qItems = await tx.select({
        id: quotationItems.id,
        productId: quotationItems.productId,
        convertedQuantity: quotationItems.convertedQuantity,
        sellerProfileId: products.sellerProfileId
      })
      .from(quotationItems)
      .innerJoin(products, eq(quotationItems.productId, products.id))
      .where(eq(quotationItems.quotationId, quotationId));

      // 2. Validate Seller permission (if seller, verify they own the products in this quotation)
      if (role === 'seller') {
        const belongsToSeller = qItems.every(item => item.sellerProfileId === sellerProfileId);
        if (!belongsToSeller) {
          throw new Error("Access Denied. You do not own the products in this quotation.");
        }
      }

      // Check current state
      const currentStatus = quotation.status;
      if (currentStatus === 'converted') {
        throw new Error("Quotation has already been converted to an order and cannot be modified.");
      }
      if (currentStatus === newStatus) {
        return { success: true, message: `Quotation is already in ${newStatus} state.` };
      }

      // 3. Status Transition Logics
      if (newStatus === 'approved') {
        if (currentStatus === 'rejected') {
          throw new Error("Cannot approve a rejected quotation. A new request must be created.");
        }
        // Transition: pending -> approved (Reserve stock)
        for (const item of qItems) {
          await internalReserveStock(tx, item.productId, dec(item.convertedQuantity), quotationId, userId);
        }
      } else if (newStatus === 'rejected') {
        // Transition: approved -> rejected (Release reserved stock)
        if (currentStatus === 'approved') {
          for (const item of qItems) {
            await internalReleaseStock(tx, item.productId, dec(item.convertedQuantity), quotationId, userId);
          }
        }
      }

      // 4. Update Database
      await tx.update(quotations)
        .set({
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(quotations.id, quotationId));

      // 5. Activity Logging
      await logActivity(tx, userId, `quotation_${newStatus}`, 'quotation', quotationId, {
        rejectionReason: rejectionReason || null
      });

      return { success: true, message: `Quotation status updated to ${newStatus}` };
    });
  } catch (error: any) {
    console.error("Quotation update error:", error);
    return { success: false, message: error.message || "Failed to update quotation" };
  }
}
