"use strict";

"use server";

import { db } from "@/db";
import { products, inventoryTransactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { dec } from "@/lib/decimal";
import { logActivity } from "./logging";
import Decimal from "decimal.js";

/**
 * Public action for Admin/Seller to adjust inventory quantities (e.g. manual adjustments, additions).
 * Executes in a locked database transaction.
 */
export async function adjustStock(
  productId: string,
  quantityChange: string,
  transactionType: 'stock_added' | 'stock_removed' | 'adjustment',
  referenceType: 'product' | 'admin_adjustment',
  referenceId: string | null,
  notes: string | null
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user) {
    return { success: false, message: "Unauthorized" };
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const sellerProfileId = (session.user as any).sellerProfileId;

  // Look up product to verify owner
  const pList = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (pList.length === 0 || !pList[0].isActive) {
    return { success: false, message: "Product not found" };
  }

  const product = pList[0];
  if (role !== 'admin' && product.sellerProfileId !== sellerProfileId) {
    return { success: false, message: "Access denied. You do not own this product." };
  }

  const change = dec(quantityChange);
  if (change.isZero()) {
    return { success: false, message: "Quantity adjustment cannot be zero" };
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Lock the row using FOR UPDATE
      const res = await tx.execute(
        sql`SELECT id, inventory_quantity, reserved_quantity FROM products WHERE id = ${productId} FOR UPDATE`
      );
      const rows = (res.rows || res) as any[];
      if (rows.length === 0) {
        throw new Error("Failed to lock product row. Product may have been deleted.");
      }

      const currentInv = dec(rows[0].inventory_quantity as string);
      const currentRes = dec(rows[0].reserved_quantity as string);
      
      const newInv = currentInv.plus(change);
      const newAvailable = newInv.minus(currentRes);

      if (newInv.lt(0)) {
        throw new Error(`Inventory cannot fall below zero. Current: ${currentInv.toString()}, change: ${change.toString()}`);
      }

      if (newAvailable.lt(0)) {
        throw new Error(`Available stock cannot go below zero due to active reservations. Current Available: ${currentInv.minus(currentRes).toString()}, change: ${change.toString()}`);
      }

      // 2. Perform updates
      await tx.update(products)
        .set({
          inventoryQuantity: newInv.toString(),
          updatedAt: new Date()
        })
        .where(eq(products.id, productId));

      // 3. Write Ledger Entry
      const [ledgerEntry] = await tx.insert(inventoryTransactions).values({
        productId,
        quantity: change.toString(),
        transactionType,
        referenceType,
        referenceId: referenceId || productId,
        notes,
        createdBy: userId,
      }).returning();

      // 4. Activity log
      await logActivity(tx, userId, 'stock_adjusted_manually', 'inventory_transaction', ledgerEntry.id, {
        productId,
        change: change.toString(),
        newInventory: newInv.toString()
      });

      return { 
        success: true, 
        message: `Inventory updated successfully. New quantity: ${newInv.toString()}` 
      };
    });
  } catch (error: any) {
    console.error("Stock adjustment error:", error);
    return { success: false, message: error.message || "Failed to adjust stock" };
  }
}


// --- INTERNAL TRANSACT HELPER METHODS ---
// These execute inside an external transaction block passed as parameter `tx`.

/**
 * Internal helper to reserve stock on Quotation approval.
 */
export async function internalReserveStock(
  tx: any,
  productId: string,
  quantityToReserve: Decimal,
  quotationId: string,
  createdByUserId: string
) {
  // 1. Lock Row
  const res = await tx.execute(
    sql`SELECT id, inventory_quantity, reserved_quantity FROM products WHERE id = ${productId} FOR UPDATE`
  );
  const rows = (res.rows || res) as any[];
  if (rows.length === 0) {
    throw new Error("Product not found for reservation");
  }

  const currentInv = dec(rows[0].inventory_quantity as string);
  const currentRes = dec(rows[0].reserved_quantity as string);
  const available = currentInv.minus(currentRes);

  if (available.lt(quantityToReserve)) {
    throw new Error(`Insufficient available stock for reservation. Available: ${available.toString()}, requested reservation: ${quantityToReserve.toString()}`);
  }

  const newRes = currentRes.plus(quantityToReserve);

  // 2. Update reserved quantity
  await tx.update(products)
    .set({
      reservedQuantity: newRes.toString(),
      updatedAt: new Date()
    })
    .where(eq(products.id, productId));

  // 3. Write Ledger Entry
  await tx.insert(inventoryTransactions).values({
    productId,
    quantity: quantityToReserve.toString(), // Reserved quantity increase
    transactionType: 'quotation_reservation',
    referenceType: 'quotation',
    referenceId: quotationId,
    notes: `Reserved stock on quotation approval.`,
    createdBy: createdByUserId,
  });
}

/**
 * Internal helper to release reserved stock (e.g. quotation expired or rejected).
 */
export async function internalReleaseStock(
  tx: any,
  productId: string,
  quantityToRelease: Decimal,
  quotationId: string,
  createdByUserId: string
) {
  // 1. Lock Row
  const res = await tx.execute(
    sql`SELECT id, inventory_quantity, reserved_quantity FROM products WHERE id = ${productId} FOR UPDATE`
  );
  const rows = (res.rows || res) as any[];
  if (rows.length === 0) {
    throw new Error("Product not found for release");
  }

  const currentRes = dec(rows[0].reserved_quantity as string);
  let newRes = currentRes.minus(quantityToRelease);
  if (newRes.lt(0)) newRes = dec(0);

  // 2. Update reserved quantity
  await tx.update(products)
    .set({
      reservedQuantity: newRes.toString(),
      updatedAt: new Date()
    })
    .where(eq(products.id, productId));

  // 3. Write Ledger Entry
  await tx.insert(inventoryTransactions).values({
    productId,
    quantity: quantityToRelease.negated().toString(), // Negative representation for release
    transactionType: 'quotation_release',
    referenceType: 'quotation',
    referenceId: quotationId,
    notes: `Released stock reservation.`,
    createdBy: createdByUserId,
  });
}

/**
 * Internal helper to convert a reservation into a deduction when an order completes.
 * Subtracts from both inventory_quantity and reserved_quantity.
 */
export async function internalDeductReservedStock(
  tx: any,
  productId: string,
  quantityToDeduct: Decimal,
  orderId: string,
  createdByUserId: string
) {
  // 1. Lock Row
  const res = await tx.execute(
    sql`SELECT id, inventory_quantity, reserved_quantity FROM products WHERE id = ${productId} FOR UPDATE`
  );
  const rows = (res.rows || res) as any[];
  if (rows.length === 0) {
    throw new Error("Product not found for deduction");
  }

  const currentInv = dec(rows[0].inventory_quantity as string);
  const currentRes = dec(rows[0].reserved_quantity as string);

  const newInv = currentInv.minus(quantityToDeduct);
  let newRes = currentRes.minus(quantityToDeduct);

  if (newInv.lt(0)) {
    throw new Error(`Insufficient stock for order completion. Total stock is: ${currentInv.toString()}`);
  }
  if (newRes.lt(0)) {
    newRes = dec(0);
  }

  // 2. Update product quantities
  await tx.update(products)
    .set({
      inventoryQuantity: newInv.toString(),
      reservedQuantity: newRes.toString(),
      updatedAt: new Date()
    })
    .where(eq(products.id, productId));

  // 3. Write Ledger Entry
  await tx.insert(inventoryTransactions).values({
    productId,
    quantity: quantityToDeduct.negated().toString(), // Negative for order fulfillment deduction
    transactionType: 'order',
    referenceType: 'order',
    referenceId: orderId,
    notes: `Deducted stock on order fulfillment.`,
    createdBy: createdByUserId,
  });
}

/**
 * Internal helper to deduct stock directly without a reservation (Direct Order).
 */
export async function internalDeductDirectStock(
  tx: any,
  productId: string,
  quantityToDeduct: Decimal,
  orderId: string,
  createdByUserId: string
) {
  // 1. Lock Row
  const res = await tx.execute(
    sql`SELECT id, inventory_quantity, reserved_quantity FROM products WHERE id = ${productId} FOR UPDATE`
  );
  const rows = (res.rows || res) as any[];
  if (rows.length === 0) {
    throw new Error("Product not found for direct deduction");
  }

  const currentInv = dec(rows[0].inventory_quantity as string);
  const currentRes = dec(rows[0].reserved_quantity as string);
  const available = currentInv.minus(currentRes);

  if (available.lt(quantityToDeduct)) {
    throw new Error(`Insufficient available stock for order. Available: ${available.toString()}, requested: ${quantityToDeduct.toString()}`);
  }

  const newInv = currentInv.minus(quantityToDeduct);

  // 2. Update product quantity
  await tx.update(products)
    .set({
      inventoryQuantity: newInv.toString(),
      updatedAt: new Date()
    })
    .where(eq(products.id, productId));

  // 3. Write Ledger Entry
  await tx.insert(inventoryTransactions).values({
    productId,
    quantity: quantityToDeduct.negated().toString(),
    transactionType: 'order',
    referenceType: 'order',
    referenceId: orderId,
    notes: `Deducted stock on direct order placement.`,
    createdBy: createdByUserId,
  });
}
