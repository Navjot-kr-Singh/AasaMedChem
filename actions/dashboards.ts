"use strict";

"use server";

import { db } from "@/db";
import { 
  products, 
  orders, 
  orderItems, 
  quotations, 
  quotationItems, 
  sellerProfiles 
} from "@/db/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { dec } from "@/lib/decimal";

export interface SellerStats {
  totalProducts: number;
  pendingProducts: number;
  inventoryValue: string;
  ordersReceived: number;
  revenue: string;
  quotationsReceived: number;
}

export interface BuyerStats {
  totalOrders: number;
  totalQuotations: number;
  recentPurchasesCount: number;
}

/**
 * Loads analytics metrics for the current verified Seller.
 */
export async function getSellerStats(): Promise<SellerStats> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'seller') {
    throw new Error("Unauthorized access");
  }

  const sellerProfileId = (session.user as any).sellerProfileId;
  if (!sellerProfileId) {
    return {
      totalProducts: 0,
      pendingProducts: 0,
      inventoryValue: "0.00",
      ordersReceived: 0,
      revenue: "0.00",
      quotationsReceived: 0
    };
  }

  try {
    // 1. Total & Pending Products
    const [pAll] = await db.select({ value: count() }).from(products).where(and(eq(products.sellerProfileId, sellerProfileId), eq(products.isActive, true)));
    const [pPending] = await db.select({ value: count() }).from(products).where(and(eq(products.sellerProfileId, sellerProfileId), eq(products.productStatus, 'pending_review'), eq(products.isActive, true)));

    // 2. Inventory Value (inventory_quantity * price_per_base_unit)
    const productList = await db.select({
      inventoryQuantity: products.inventoryQuantity,
      pricePerBaseUnit: products.pricePerBaseUnit
    })
    .from(products)
    .where(and(eq(products.sellerProfileId, sellerProfileId), eq(products.isActive, true)));

    let totalInvValue = dec(0);
    for (const p of productList) {
      totalInvValue = totalInvValue.plus(dec(p.inventoryQuantity).times(dec(p.pricePerBaseUnit)));
    }

    // 3. Orders Received Count & Seller Revenue
    // Fetch order items belonging to this seller
    const sellerOrderItems = await db.select({
      orderId: orderItems.orderId,
      totalPrice: orderItems.totalPrice,
      orderStatus: orders.status
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(products.sellerProfileId, sellerProfileId));

    // Calculate unique order count and revenue from delivered orders
    const uniqueOrders = new Set();
    let totalRevenue = dec(0);

    for (const item of sellerOrderItems) {
      uniqueOrders.add(item.orderId);
      if (item.orderStatus === 'delivered' || item.orderStatus === 'shipped' || item.orderStatus === 'processing' || item.orderStatus === 'confirmed') {
        totalRevenue = totalRevenue.plus(dec(item.totalPrice));
      }
    }

    // 4. Quotations Received Count
    const sellerQuotationItems = await db.select({
      quotationId: quotationItems.quotationId
    })
    .from(quotationItems)
    .innerJoin(products, eq(quotationItems.productId, products.id))
    .where(eq(products.sellerProfileId, sellerProfileId));

    const uniqueQuotes = new Set();
    for (const item of sellerQuotationItems) {
      uniqueQuotes.add(item.quotationId);
    }

    return {
      totalProducts: pAll.value,
      pendingProducts: pPending.value,
      inventoryValue: totalInvValue.toFixed(2),
      ordersReceived: uniqueOrders.size,
      revenue: totalRevenue.toFixed(2),
      quotationsReceived: uniqueQuotes.size
    };
  } catch (error) {
    console.error("Seller stats loading failed:", error);
    throw error;
  }
}

/**
 * Loads analytics metrics for the current Buyer.
 */
export async function getBuyerStats(): Promise<BuyerStats> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'buyer') {
    throw new Error("Unauthorized access");
  }

  const buyerId = (session.user as any).id;

  try {
    const [oCount] = await db.select({ value: count() }).from(orders).where(eq(orders.buyerId, buyerId));
    const [qCount] = await db.select({ value: count() }).from(quotations).where(eq(quotations.buyerId, buyerId));
    const [purchasesCount] = await db.select({ value: count() }).from(orders).where(and(eq(orders.buyerId, buyerId), eq(orders.status, 'delivered')));

    return {
      totalOrders: oCount.value,
      totalQuotations: qCount.value,
      recentPurchasesCount: purchasesCount.value
    };
  } catch (error) {
    console.error("Buyer stats loading failed:", error);
    throw error;
  }
}
