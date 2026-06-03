"use strict";

"use server";

import { db } from "@/db";
import { 
  categories, 
  products, 
  sellerProfiles, 
  sellerDocuments, 
  quotations, 
  quotationItems, 
  orders, 
  orderItems, 
  activityLogs, 
  users 
} from "@/db/schema";
import { eq, and, or, like, ilike, sql, desc, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * Returns all product categories.
 */
export async function getCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

export interface ProductFilterInput {
  search?: string;
  sku?: string;
  categoryId?: string;
  sellerProfileId?: string;
  minPrice?: string;
  maxPrice?: string;
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected';
}

/**
 * Retrieves products based on search filters and user permissions.
 */
export async function getFilteredProducts(filters: ProductFilterInput = {}) {
  const session = await auth();
  const role = session?.user ? (session.user as any).role : null;
  const sellerProfileId = session?.user ? (session.user as any).sellerProfileId : null;

  const conditions = [];

  // 1. Basic active state filter (soft deletes are hidden from all except Admin)
  if (role !== 'admin') {
    conditions.push(eq(products.isActive, true));
  }

  // 2. Hide products from suspended/non-approved sellers for buyers and other sellers
  if (role !== 'admin' && filters.sellerProfileId !== sellerProfileId) {
    conditions.push(eq(sellerProfiles.verificationStatus, 'approved'));
  }

  // 3. Role-based product status filtering
  if (role === 'admin') {
    // Admin can see everything. Allow filter by status if specified.
    if (filters.status) {
      conditions.push(eq(products.productStatus, filters.status));
    }
  } else if (role === 'seller') {
    // Sellers can see all of their own products. 
    // If they look at other products, they can only see approved ones.
    if (filters.sellerProfileId === sellerProfileId) {
      // Viewing own products. Can filter by status.
      conditions.push(eq(products.sellerProfileId, sellerProfileId));
      if (filters.status) {
        conditions.push(eq(products.productStatus, filters.status));
      }
    } else {
      // Viewing marketplace. Only approved products.
      conditions.push(eq(products.productStatus, 'approved'));
      if (filters.sellerProfileId) {
        conditions.push(eq(products.sellerProfileId, filters.sellerProfileId));
      }
    }
  } else {
    // Buyers / Guests can only see approved, active products.
    conditions.push(eq(products.productStatus, 'approved'));
    if (filters.sellerProfileId) {
      conditions.push(eq(products.sellerProfileId, filters.sellerProfileId));
    }
  }

  // 3. User input filters
  if (filters.search) {
    conditions.push(ilike(products.name, `%${filters.search}%`));
  }
  if (filters.sku) {
    conditions.push(ilike(products.sku, `%${filters.sku}%`));
  }
  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }
  if (filters.minPrice) {
    conditions.push(gte(products.pricePerBaseUnit, filters.minPrice));
  }
  if (filters.maxPrice) {
    conditions.push(lte(products.pricePerBaseUnit, filters.maxPrice));
  }

  try {
    return await db.select({
      id: products.id,
      sellerProfileId: products.sellerProfileId,
      categoryId: products.categoryId,
      name: products.name,
      description: products.description,
      sku: products.sku,
      dimensionType: products.dimensionType,
      baseUnit: products.baseUnit,
      inventoryQuantity: products.inventoryQuantity,
      reservedQuantity: products.reservedQuantity,
      pricePerBaseUnit: products.pricePerBaseUnit,
      productStatus: products.productStatus,
      rejectionReason: products.rejectionReason,
      isActive: products.isActive,
      createdAt: products.createdAt,
      categoryName: categories.name,
      sellerName: sellerProfiles.businessName
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(sellerProfiles, eq(products.sellerProfileId, sellerProfiles.id))
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));
  } catch (error) {
    console.error("Failed to query products:", error);
    return [];
  }
}

/**
 * Returns document list uploaded by a seller.
 */
export async function getSellerDocuments(sellerProfileId: string) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = (session.user as any).role;
  const userSellerProfileId = (session.user as any).sellerProfileId;

  // Protect documents: only Admin or own Seller profile can view documents
  if (role !== 'admin' && sellerProfileId !== userSellerProfileId) {
    throw new Error("Unauthorized access to document files.");
  }

  return db.select()
    .from(sellerDocuments)
    .where(eq(sellerDocuments.sellerProfileId, sellerProfileId))
    .orderBy(desc(sellerDocuments.createdAt));
}

/**
 * Retrieves quotations based on user role.
 */
export async function getQuotations() {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const sellerProfileId = (session.user as any).sellerProfileId;

  try {
    if (role === 'admin') {
      // Admin sees everything
      return await db.select({
        id: quotations.id,
        status: quotations.status,
        totalAmount: quotations.totalAmount,
        createdAt: quotations.createdAt,
        buyerName: users.name,
        buyerEmail: users.email
      })
      .from(quotations)
      .innerJoin(users, eq(quotations.buyerId, users.id))
      .orderBy(desc(quotations.createdAt));
    } else if (role === 'seller') {
      // Seller sees quotations containing products they own
      // We perform a sub-query or distinct selection
      return await db.selectDistinct({
        id: quotations.id,
        status: quotations.status,
        totalAmount: quotations.totalAmount,
        createdAt: quotations.createdAt,
        buyerName: users.name,
        buyerEmail: users.email
      })
      .from(quotations)
      .innerJoin(users, eq(quotations.buyerId, users.id))
      .innerJoin(quotationItems, eq(quotationItems.quotationId, quotations.id))
      .innerJoin(products, eq(quotationItems.productId, products.id))
      .where(eq(products.sellerProfileId, sellerProfileId))
      .orderBy(desc(quotations.createdAt));
    } else {
      // Buyer sees own quotations
      return await db.select({
        id: quotations.id,
        status: quotations.status,
        totalAmount: quotations.totalAmount,
        createdAt: quotations.createdAt,
        buyerName: users.name,
        buyerEmail: users.email
      })
      .from(quotations)
      .innerJoin(users, eq(quotations.buyerId, users.id))
      .where(eq(quotations.buyerId, userId))
      .orderBy(desc(quotations.createdAt));
    }
  } catch (error) {
    console.error("Failed to query quotations:", error);
    return [];
  }
}

/**
 * Retrieves quotation items for a specific quotation.
 */
export async function getQuotationItems(quotationId: string) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = (session.user as any).role;
  const sellerProfileId = (session.user as any).sellerProfileId;
  const userId = (session.user as any).id;

  try {
    const items = await db.select({
      id: quotationItems.id,
      quotationId: quotationItems.quotationId,
      productId: quotationItems.productId,
      enteredQuantity: quotationItems.enteredQuantity,
      enteredUnit: quotationItems.enteredUnit,
      convertedQuantity: quotationItems.convertedQuantity,
      internalUnit: quotationItems.internalUnit,
      unitPrice: quotationItems.unitPrice,
      totalPrice: quotationItems.totalPrice,
      productName: products.name,
      sku: products.sku,
      dimensionType: products.dimensionType,
      sellerName: sellerProfiles.businessName,
      sellerProfileId: products.sellerProfileId,
      buyerId: quotations.buyerId
    })
    .from(quotationItems)
    .innerJoin(products, eq(quotationItems.productId, products.id))
    .innerJoin(sellerProfiles, eq(products.sellerProfileId, sellerProfiles.id))
    .innerJoin(quotations, eq(quotationItems.quotationId, quotations.id))
    .where(eq(quotationItems.quotationId, quotationId));

    // Access control: only admin, the buyer who created it, or the seller who owns the products can view
    if (items.length > 0) {
      const isOwnerSeller = items.some(item => item.sellerProfileId === sellerProfileId);
      const isOwnerBuyer = items[0].buyerId === userId;
      if (role !== 'admin' && !isOwnerBuyer && !isOwnerSeller) {
        throw new Error("Access Denied");
      }
    }

    return items;
  } catch (error) {
    console.error("Failed to query quotation items:", error);
    return [];
  }
}

/**
 * Retrieves orders.
 */
export async function getOrders() {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const sellerProfileId = (session.user as any).sellerProfileId;

  try {
    if (role === 'admin') {
      return await db.select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        quotationId: orders.quotationId,
        buyerName: users.name,
        buyerEmail: users.email
      })
      .from(orders)
      .innerJoin(users, eq(orders.buyerId, users.id))
      .orderBy(desc(orders.createdAt));
    } else if (role === 'seller') {
      return await db.selectDistinct({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        quotationId: orders.quotationId,
        buyerName: users.name,
        buyerEmail: users.email
      })
      .from(orders)
      .innerJoin(users, eq(orders.buyerId, users.id))
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.sellerProfileId, sellerProfileId))
      .orderBy(desc(orders.createdAt));
    } else {
      return await db.select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        quotationId: orders.quotationId,
        buyerName: users.name,
        buyerEmail: users.email
      })
      .from(orders)
      .innerJoin(users, eq(orders.buyerId, users.id))
      .where(eq(orders.buyerId, userId))
      .orderBy(desc(orders.createdAt));
    }
  } catch (error) {
    console.error("Failed to query orders:", error);
    return [];
  }
}

/**
 * Retrieves order items for a specific order.
 */
export async function getOrderItems(orderId: string) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = (session.user as any).role;
  const sellerProfileId = (session.user as any).sellerProfileId;
  const userId = (session.user as any).id;

  try {
    const items = await db.select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      enteredQuantity: orderItems.enteredQuantity,
      enteredUnit: orderItems.enteredUnit,
      convertedQuantity: orderItems.convertedQuantity,
      internalUnit: orderItems.internalUnit,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      productName: products.name,
      sku: products.sku,
      dimensionType: products.dimensionType,
      sellerName: sellerProfiles.businessName,
      sellerProfileId: products.sellerProfileId,
      buyerId: orders.buyerId
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(sellerProfiles, eq(products.sellerProfileId, sellerProfiles.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orderItems.orderId, orderId));

    if (items.length > 0) {
      const isOwnerSeller = items.some(item => item.sellerProfileId === sellerProfileId);
      const isOwnerBuyer = items[0].buyerId === userId;
      if (role !== 'admin' && !isOwnerBuyer && !isOwnerSeller) {
        throw new Error("Access Denied");
      }
    }

    return items;
  } catch (error) {
    console.error("Failed to query order items:", error);
    return [];
  }
}

/**
 * Retrieves activity logs. Admins see all logs, others see logs relating to their ID.
 */
export async function getActivityLogs() {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  try {
    if (role === 'admin') {
      return await db.select({
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role
      })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);
    } else {
      return await db.select({
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role
      })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100);
    }
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return [];
  }
}

/**
 * Returns all seller profiles. Useful for Admin User Management.
 */
export async function getSellerProfiles() {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    throw new Error("Unauthorized");
  }

  return db.select({
    id: sellerProfiles.id,
    businessName: sellerProfiles.businessName,
    gstNumber: sellerProfiles.gstNumber,
    drugLicenseNumber: sellerProfiles.drugLicenseNumber,
    address: sellerProfiles.address,
    verificationStatus: sellerProfiles.verificationStatus,
    rejectionReason: sellerProfiles.rejectionReason,
    verifiedAt: sellerProfiles.verifiedAt,
    createdAt: sellerProfiles.createdAt,
    ownerName: users.name,
    ownerEmail: users.email
  })
  .from(sellerProfiles)
  .innerJoin(users, eq(sellerProfiles.userId, users.id))
  .orderBy(desc(sellerProfiles.createdAt));
}
