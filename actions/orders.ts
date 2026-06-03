"use strict";

"use server";

import { db } from "@/db";
import { orders, orderItems, products, quotations, quotationItems, inventoryTransactions, sellerProfiles } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { calculatePricing } from "@/lib/pricing-engine";
import { dec } from "@/lib/decimal";
import { logActivity } from "./logging";
import { 
  internalDeductDirectStock, 
  internalDeductReservedStock, 
  adjustStock 
} from "./inventory";

export interface OrderItemInput {
  productId: string;
  enteredQuantity: string;
  enteredUnit: 'g' | 'kg' | 'mL' | 'L' | 'item';
}

/**
 * Places a direct order (without a quotation) for a buyer.
 * Deducts stock directly.
 */
export async function createDirectOrder(items: OrderItemInput[]): Promise<{ success: boolean; message: string; orderId?: string }> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'buyer') {
    return { success: false, message: "Only buyers can place orders." };
  }

  const buyerId = (session.user as any).id;

  if (!items || items.length === 0) {
    return { success: false, message: "Order must contain at least one item." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      let totalAmount = dec(0);
      const calculatedItems = [];

      // 1. Calculate pricing and verify available stock
      for (const item of items) {
        const pList = await tx.select({
          product: products,
          seller: sellerProfiles
        })
        .from(products)
        .innerJoin(sellerProfiles, eq(products.sellerProfileId, sellerProfiles.id))
        .where(eq(products.id, item.productId))
        .limit(1);

        if (pList.length === 0 || !pList[0].product.isActive || pList[0].product.productStatus !== 'approved' || pList[0].seller.verificationStatus !== 'approved') {
          throw new Error("Product not found, not approved, or vendor is currently suspended.");
        }
        const product = pList[0].product;

        const pricing = calculatePricing({
          enteredQuantity: item.enteredQuantity,
          enteredUnit: item.enteredUnit,
          pricePerBaseUnit: product.pricePerBaseUnit,
          dimensionType: product.dimensionType as any
        });

        const qtyToDeduct = dec(pricing.convertedQuantity);
        
        // Verify available stock before ordering
        const availableStock = dec(product.inventoryQuantity).minus(dec(product.reservedQuantity));
        if (availableStock.lt(qtyToDeduct)) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock.toString()} ${product.baseUnit}, Requested: ${qtyToDeduct.toString()} ${product.baseUnit}`);
        }

        totalAmount = totalAmount.plus(dec(pricing.totalPrice));

        calculatedItems.push({
          productId: product.id,
          enteredQuantity: pricing.enteredQuantity,
          enteredUnit: pricing.enteredUnit,
          convertedQuantity: pricing.convertedQuantity,
          internalUnit: pricing.internalUnit,
          unitPrice: pricing.pricePerBaseUnit,
          totalPrice: pricing.totalPrice,
          qtyToDeduct
        });
      }

      // 2. Insert Order Header
      const [order] = await tx.insert(orders).values({
        buyerId,
        quotationId: null,
        status: 'pending',
        totalAmount: totalAmount.toString(),
      }).returning();

      // 3. Deduct stock and save order items
      for (const calcItem of calculatedItems) {
        // Safe concurrency deduction
        await internalDeductDirectStock(tx, calcItem.productId, calcItem.qtyToDeduct, order.id, buyerId);

        await tx.insert(orderItems).values({
          orderId: order.id,
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
      await logActivity(tx, buyerId, 'placed_direct_order', 'order', order.id, {
        totalAmount: totalAmount.toString()
      });

      return { success: true, message: "Order placed successfully.", orderId: order.id };
    });

    return result;
  } catch (error: any) {
    console.error("Direct order placement error:", error);
    return { success: false, message: error.message || "Failed to place order" };
  }
}

/**
 * Converts an approved quotation into a completed order.
 * Deducts stock from reservations.
 */
export async function convertQuotationToOrder(quotationId: string): Promise<{ success: boolean; message: string; orderId?: string }> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'buyer') {
    return { success: false, message: "Only buyers can complete purchases." };
  }

  const buyerId = (session.user as any).id;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Fetch quotation and items
      const quoteList = await tx.select().from(quotations)
        .where(and(eq(quotations.id, quotationId), eq(quotations.buyerId, buyerId)))
        .limit(1);

      if (quoteList.length === 0) {
        throw new Error("Quotation request not found.");
      }

      const quotation = quoteList[0];

      if (quotation.status !== 'approved') {
        throw new Error(`Quotation cannot be converted. Status is: ${quotation.status}`);
      }

      const qItems = await tx.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
      if (qItems.length === 0) {
        throw new Error("Quotation contains no items.");
      }

      // Ensure the seller of the items in the quote is still approved
      for (const item of qItems) {
        const pList = await tx.select({
          product: products,
          seller: sellerProfiles
        })
        .from(products)
        .innerJoin(sellerProfiles, eq(products.sellerProfileId, sellerProfiles.id))
        .where(eq(products.id, item.productId))
        .limit(1);

        if (pList.length === 0 || pList[0].seller.verificationStatus !== 'approved') {
          throw new Error("This quotation cannot be purchased because the seller is currently suspended/not approved.");
        }
      }

      // 2. Insert Order Header
      const [order] = await tx.insert(orders).values({
        buyerId,
        quotationId: quotation.id,
        status: 'pending',
        totalAmount: quotation.totalAmount,
      }).returning();

      // 3. Deduct reserved stock and insert order items
      for (const qItem of qItems) {
        // Safe reservation conversion to inventory deduction
        await internalDeductReservedStock(tx, qItem.productId, dec(qItem.convertedQuantity), order.id, buyerId);

        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: qItem.productId,
          enteredQuantity: qItem.enteredQuantity,
          enteredUnit: qItem.enteredUnit,
          convertedQuantity: qItem.convertedQuantity,
          internalUnit: qItem.internalUnit,
          unitPrice: qItem.unitPrice,
          totalPrice: qItem.totalPrice
        });
      }

      // 4. Mark quotation as converted
      await tx.update(quotations)
        .set({ status: 'converted', updatedAt: new Date() })
        .where(eq(quotations.id, quotationId));

      // 5. Activity log
      await logActivity(tx, buyerId, 'converted_quotation_to_order', 'order', order.id, {
        quotationId,
        totalAmount: quotation.totalAmount
      });

      return { success: true, message: "Quotation converted to order successfully.", orderId: order.id };
    });

    return result;
  } catch (error: any) {
    console.error("Convert quotation error:", error);
    return { success: false, message: error.message || "Failed to convert quotation to order" };
  }
}

/**
 * Updates order tracking status.
 * Enforces permissions: Admin or seller of the products in the order.
 * If order is cancelled: replenishes inventory and creates adjustment ledgers.
 */
export async function updateOrderStatus(orderId: string, newStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user) {
    return { success: false, message: "Unauthorized" };
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const sellerProfileId = (session.user as any).sellerProfileId;

  if (role === 'buyer') {
    return { success: false, message: "Buyers cannot update order tracking statuses." };
  }

  try {
    return await db.transaction(async (tx) => {
      const orderList = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (orderList.length === 0) {
        throw new Error("Order not found.");
      }

      const order = orderList[0];

      // If status is already updated
      if (order.status === newStatus) {
        return { success: true, message: `Order status is already ${newStatus}` };
      }

      // Fetch items and check seller ownership
      const oItems = await tx.select({
        id: orderItems.id,
        productId: orderItems.productId,
        convertedQuantity: orderItems.convertedQuantity,
        sellerProfileId: products.sellerProfileId
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

      if (role === 'seller') {
        const belongsToSeller = oItems.every(item => item.sellerProfileId === sellerProfileId);
        if (!belongsToSeller) {
          throw new Error("Access Denied. You do not own the products in this order.");
        }
      }

      // Handle Cancelled Status (Replenish inventory)
      if (newStatus === 'cancelled') {
        if (order.status === 'delivered') {
          throw new Error("Cannot cancel a completed, delivered order.");
        }
        if (order.status === 'cancelled') {
          throw new Error("Order is already cancelled.");
        }

        // Return stock to products
        for (const item of oItems) {
          const res = await tx.execute(
            sql`SELECT id, inventory_quantity FROM products WHERE id = ${item.productId} FOR UPDATE`
          );
          const rows = (res.rows || res) as any[];
          const lockedProduct = rows[0];

          if (lockedProduct) {
            const currentInv = dec(lockedProduct.inventory_quantity as string);
            const returnedQty = dec(item.convertedQuantity);
            const newInv = currentInv.plus(returnedQty);

            await tx.update(products)
              .set({ inventoryQuantity: newInv.toString() })
              .where(eq(products.id, item.productId));

            await tx.insert(inventoryTransactions).values({
              productId: item.productId,
              quantity: returnedQty.toString(),
              transactionType: 'stock_added',
              referenceType: 'order',
              referenceId: orderId,
              notes: `Replenished stock from cancelled order ${orderId}`,
              createdBy: userId
            });
          }
        }
      }

      // Update Order Status
      await tx.update(orders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await logActivity(tx, userId, `order_status_${newStatus}`, 'order', orderId);

      return { success: true, message: `Order status updated to ${newStatus}` };
    });
  } catch (error: any) {
    console.error("Order status update error:", error);
    return { success: false, message: error.message || "Failed to update order status" };
  }
}
