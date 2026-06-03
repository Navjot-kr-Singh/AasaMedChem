"use strict";

"use server";

import { db } from "@/db";
import { products, sellerProfiles } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logActivity } from "./logging";
import { dec } from "@/lib/decimal";

export interface ProductInput {
  name: string;
  description: string;
  sku: string;
  categoryId: string;
  dimensionType: 'weight' | 'volume' | 'count';
  baseUnit: 'g' | 'kg' | 'mL' | 'L' | 'item';
  pricePerBaseUnit: string;
  inventoryQuantity: string;
}

/**
 * Creates a new pharmaceutical product.
 * Triggers status: 'pending_review'
 */
export async function createProduct(input: ProductInput): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user) {
    return { success: false, message: "Unauthorized" };
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  let sellerProfileId = (session.user as any).sellerProfileId;

  // Validate inputs
  if (!input.name || !input.sku || !input.categoryId || !input.pricePerBaseUnit) {
    return { success: false, message: "Missing required fields" };
  }

  try {
    // 1. Double check authorization
    if (role === 'admin') {
      // Admins creating products must specify a seller profile or default to a system placeholder.
      // But usually sellers create products. If admin creates, let's look up the first approved seller.
      const sellers = await db.select().from(sellerProfiles).limit(1);
      if (sellers.length === 0) {
        return { success: false, message: "No seller profiles exist on the platform to assign this product to." };
      }
      sellerProfileId = sellers[0].id;
    } else if (role === 'seller') {
      // Must be verified seller
      const seller = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, sellerProfileId)).limit(1);
      if (seller.length === 0 || seller[0].verificationStatus !== 'approved') {
        return { success: false, message: "Only verified sellers can create products." };
      }
    } else {
      return { success: false, message: "Only admin and approved sellers can manage products." };
    }

    // 2. Validate SKU uniqueness
    const existingSku = await db.select().from(products).where(eq(products.sku, input.sku)).limit(1);
    if (existingSku.length > 0) {
      return { success: false, message: "A product with this SKU already exists" };
    }

    // 3. Save to database
    await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({
        sellerProfileId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        sku: input.sku,
        dimensionType: input.dimensionType,
        baseUnit: input.baseUnit,
        inventoryQuantity: dec(input.inventoryQuantity).toString(),
        reservedQuantity: '0.0000000000',
        pricePerBaseUnit: dec(input.pricePerBaseUnit).toString(),
        productStatus: 'pending_review', // Default to admin review
        isActive: true,
      }).returning();

      // Log initial stock load transaction if quantity > 0
      if (dec(input.inventoryQuantity).gt(0)) {
        const { inventoryTransactions } = require("@/db/schema");
        await tx.insert(inventoryTransactions).values({
          productId: product.id,
          quantity: dec(input.inventoryQuantity).toString(),
          transactionType: 'stock_added',
          referenceType: 'product',
          referenceId: product.id,
          notes: "Initial inventory setup on product creation",
          createdBy: userId,
        });
      }

      await logActivity(tx, userId, 'created_product', 'product', product.id, {
        sku: input.sku,
        name: input.name
      });
    });

    return { success: true, message: "Product created and submitted for review successfully." };
  } catch (error: any) {
    console.error("Product creation error:", error);
    return { success: false, message: error.message || "Failed to create product" };
  }
}

/**
 * Updates an existing product.
 * Enforces ownership: only Admin or owner Seller.
 */
export async function updateProduct(
  productId: string,
  input: Partial<ProductInput> & { productStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected' }
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user) {
    return { success: false, message: "Unauthorized" };
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const sellerProfileId = (session.user as any).sellerProfileId;

  try {
    const existingList = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (existingList.length === 0 || !existingList[0].isActive) {
      return { success: false, message: "Product not found" };
    }

    const product = existingList[0];

    // Enforce ownership
    if (role !== 'admin' && product.sellerProfileId !== sellerProfileId) {
      return { success: false, message: "Access denied. You do not own this product." };
    }

    // Enforce SKU check if updating SKU
    if (input.sku && input.sku !== product.sku) {
      const existingSku = await db.select().from(products)
        .where(and(eq(products.sku, input.sku), ne(products.id, productId)))
        .limit(1);
      if (existingSku.length > 0) {
        return { success: false, message: "A product with this SKU already exists" };
      }
    }

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateFields.name = input.name;
    if (input.description !== undefined) updateFields.description = input.description;
    if (input.sku !== undefined) updateFields.sku = input.sku;
    if (input.categoryId !== undefined) updateFields.categoryId = input.categoryId;
    if (input.pricePerBaseUnit !== undefined) updateFields.pricePerBaseUnit = dec(input.pricePerBaseUnit).toString();
    
    // Changing details triggers re-review for sellers
    if (role === 'seller') {
      updateFields.productStatus = 'pending_review';
    } else if (role === 'admin' && input.productStatus !== undefined) {
      updateFields.productStatus = input.productStatus;
    }

    await db.transaction(async (tx) => {
      await tx.update(products).set(updateFields).where(eq(products.id, productId));
      await logActivity(tx, userId, 'updated_product', 'product', productId, updateFields);
    });

    return { success: true, message: "Product updated successfully. Under review if modified." };
  } catch (error: any) {
    console.error("Product update error:", error);
    return { success: false, message: error.message || "Failed to update product" };
  }
}

/**
 * Soft-deletes a product by marking isActive = false and setting deletedAt.
 * Enforces ownership: only Admin or owner Seller.
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user) {
    return { success: false, message: "Unauthorized" };
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const sellerProfileId = (session.user as any).sellerProfileId;

  try {
    const existingList = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (existingList.length === 0 || !existingList[0].isActive) {
      return { success: false, message: "Product not found or already deleted" };
    }

    const product = existingList[0];

    // Enforce ownership
    if (role !== 'admin' && product.sellerProfileId !== sellerProfileId) {
      return { success: false, message: "Access denied. You do not own this product." };
    }

    await db.transaction(async (tx) => {
      await tx.update(products).set({
        isActive: false,
        deletedAt: new Date(),
        productStatus: 'draft' // pull from active catalog
      }).where(eq(products.id, productId));

      await logActivity(tx, userId, 'soft_deleted_product', 'product', productId);
    });

    return { success: true, message: "Product deleted successfully from the marketplace." };
  } catch (error: any) {
    console.error("Product deletion error:", error);
    return { success: false, message: error.message || "Failed to delete product" };
  }
}

/**
 * Restores a soft-deleted product.
 * Enforces ownership: only Admin can restore.
 */
export async function restoreProduct(productId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return { success: false, message: "Only administrators can restore products." };
  }

  const userId = (session.user as any).id;

  try {
    await db.transaction(async (tx) => {
      await tx.update(products).set({
        isActive: true,
        deletedAt: null,
        productStatus: 'pending_review', // needs re-approval
      }).where(eq(products.id, productId));

      await logActivity(tx, userId, 'restored_product', 'product', productId);
    });

    return { success: true, message: "Product restored and queued for verification." };
  } catch (error: any) {
    console.error("Product restore error:", error);
    return { success: false, message: error.message || "Failed to restore product" };
  }
}
