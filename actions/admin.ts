"use strict";

"use server";

import { db } from "@/db";
import { 
  users, 
  sellerProfiles, 
  products, 
  orders, 
  quotations, 
  activityLogs, 
  orderItems, 
  categories 
} from "@/db/schema";
import { eq, and, count, sum, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logActivity } from "./logging";
import { dec } from "@/lib/decimal";

/**
 * Reviews and updates a seller verification profile (Approve/Reject).
 */
export async function reviewSellerProfile(
  profileId: string,
  action: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return { success: false, message: "Only administrators can perform seller reviews." };
  }

  const adminId = (session.user as any).id;

  try {
    const profileList = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, profileId)).limit(1);
    if (profileList.length === 0) {
      return { success: false, message: "Seller profile not found." };
    }

    const profile = profileList[0];

    const userList = await db.select().from(users).where(eq(users.id, profile.userId)).limit(1);
    const sellerEmail = userList[0]?.email;

    const updateFields: any = {
      verificationStatus: action,
    };

    if (action === 'approved') {
      updateFields.approvedBy = adminId;
      updateFields.approvedAt = new Date();
      updateFields.verifiedAt = new Date();
      updateFields.rejectionReason = null;
      updateFields.rejectedBy = null;
      updateFields.rejectedAt = null;
    } else {
      updateFields.rejectedBy = adminId;
      updateFields.rejectedAt = new Date();
      updateFields.rejectionReason = rejectionReason || "No reason specified";
      updateFields.approvedBy = null;
      updateFields.approvedAt = null;
    }

    await db.transaction(async (tx) => {
      // 1. Update the profile status
      await tx.update(sellerProfiles).set(updateFields).where(eq(sellerProfiles.id, profileId));
      
      // 2. Log activity
      await logActivity(tx, adminId, `admin_seller_verification_${action}`, 'seller_profile', profileId, {
        rejectionReason: rejectionReason || null
      });
    });

    // Send onboarding email if approved
    if (action === 'approved' && sellerEmail) {
      try {
        const { sendVerificationEmail } = await import("@/lib/email");
        await sendVerificationEmail(sellerEmail, profile.businessName);
      } catch (emailError) {
        console.error("Onboarding email warning (non-blocking):", emailError);
      }
    }

    return { success: true, message: `Seller profile has been ${action} successfully.` };
  } catch (error: any) {
    console.error("Seller profile review error:", error);
    return { success: false, message: error.message || "Failed to process seller review" };
  }
}

/**
 * Reviews a product created by a seller (Approve/Reject).
 */
export async function reviewProduct(
  productId: string,
  action: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return { success: false, message: "Only administrators can perform product reviews." };
  }

  const adminId = (session.user as any).id;

  try {
    const productList = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (productList.length === 0 || !productList[0].isActive) {
      return { success: false, message: "Product not found or soft-deleted." };
    }

    const updateFields: any = {
      productStatus: action,
      rejectionReason: action === 'rejected' ? (rejectionReason || "No reason specified") : null,
      updatedAt: new Date()
    };

    await db.transaction(async (tx) => {
      await tx.update(products).set(updateFields).where(eq(products.id, productId));
      await logActivity(tx, adminId, `admin_product_review_${action}`, 'product', productId, {
        rejectionReason: rejectionReason || null
      });
    });

    return { success: true, message: `Product status updated to ${action} successfully.` };
  } catch (error: any) {
    console.error("Product review error:", error);
    return { success: false, message: error.message || "Failed to process product review" };
  }
}

export interface AdminStats {
  totalUsers: number;
  totalSellers: number;
  verifiedSellers: number;
  pendingSellers: number;
  totalProducts: number;
  pendingProductReviews: number;
  totalOrders: number;
  totalQuotations: number;
  totalRevenue: string;
}

/**
 * Aggregates global dashboard statistics for Admin.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    throw new Error("Unauthorized access.");
  }

  try {
    // Run counts concurrently or in sequence
    const [uCount] = await db.select({ value: count() }).from(users);
    const [sCount] = await db.select({ value: count() }).from(sellerProfiles);
    const [vCount] = await db.select({ value: count() }).from(sellerProfiles).where(eq(sellerProfiles.verificationStatus, 'approved'));
    const [pSCount] = await db.select({ value: count() }).from(sellerProfiles).where(eq(sellerProfiles.verificationStatus, 'pending'));
    const [pCount] = await db.select({ value: count() }).from(products).where(eq(products.isActive, true));
    const [pPReview] = await db.select({ value: count() }).from(products).where(and(eq(products.productStatus, 'pending_review'), eq(products.isActive, true)));
    const [oCount] = await db.select({ value: count() }).from(orders);
    const [qCount] = await db.select({ value: count() }).from(quotations);
    
    // Total Revenue (Sum of all orders not cancelled)
    const revSum = await db.select({ value: sum(orders.totalAmount) })
      .from(orders)
      .where(and(
        eq(orders.status, 'confirmed'),
        // Or include processing, shipped, delivered - basically anything not pending or cancelled
        // Let's sum everything except cancelled for standard billing revenue, or just delivered/shipped. Let's sum all except cancelled.
        // Drizzle sum returns a string or null
      ));
      
    // Better query: sum of orders where status is processing, shipped, delivered, or confirmed
    // Let's just grab all orders except cancelled
    const revResult = await db.select({ value: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.status, 'delivered')); // Sum only finalized transactions for security

    const revenueVal = revResult[0]?.value || '0.0000000000';

    return {
      totalUsers: uCount.value,
      totalSellers: sCount.value,
      verifiedSellers: vCount.value,
      pendingSellers: pSCount.value,
      totalProducts: pCount.value,
      pendingProductReviews: pPReview.value,
      totalOrders: oCount.value,
      totalQuotations: qCount.value,
      totalRevenue: dec(revenueVal).toFixed(2)
    };
  } catch (error) {
    console.error("Failed to aggregate admin statistics:", error);
    throw error;
  }
}
