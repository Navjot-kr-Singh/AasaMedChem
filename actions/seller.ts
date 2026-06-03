"use strict";

"use server";

import { db } from "@/db";
import { sellerProfiles, sellerDocuments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { logActivity } from "./logging";

export interface UploadResult {
  success: boolean;
  message: string;
  url?: string;
}

/**
 * Uploads a seller document to Vercel Blob and records the database entry.
 */
export async function uploadSellerDocument(formData: FormData): Promise<UploadResult> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'seller') {
    return { success: false, message: "Unauthorized access" };
  }

  const userId = (session.user as any).id;
  const sellerProfileId = formData.get("sellerProfileId") as string;
  const documentType = formData.get("documentType") as string;
  const file = formData.get("file") as File;

  if (!sellerProfileId || !documentType || !file || file.size === 0) {
    return { success: false, message: "Missing files or configurations" };
  }

  // Validate type (PDF only)
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { success: false, message: "Only PDF documents are allowed." };
  }

  // Validate size (max 20MB)
  if (file.size > 20 * 1024 * 1024) {
    return { success: false, message: "File size exceeds the 20MB limit." };
  }

  // 1. Verify that the logged-in seller owns this seller profile
  const profileList = await db.select().from(sellerProfiles)
    .where(eq(sellerProfiles.id, sellerProfileId))
    .limit(1);

  if (profileList.length === 0 || profileList[0].userId !== userId) {
    return { success: false, message: "Profile validation failed" };
  }

  try {
    // Create a unique name to prevent collisions
    const originalName = file.name || "document.pdf";
    const fileName = `sellers/${sellerProfileId}/${documentType}_${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Upload to Vercel Blob directly by passing the File object
    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
      // Vercel Blob automatically picks up BLOB_READ_WRITE_TOKEN from environment if set, but we can safeguard it
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    let docId: string = "";

    // 3. Save URL to database inside transaction
    await db.transaction(async (tx) => {
      const [insertedDoc] = await tx.insert(sellerDocuments).values({
        sellerProfileId,
        documentType,
        documentUrl: blob.url,
      }).returning();

      docId = insertedDoc.id;

      await logActivity(tx, userId, `uploaded_document_${documentType}`, 'seller_document', insertedDoc.id, {
        documentUrl: blob.url,
        documentType
      });
    });

    return { 
      success: true, 
      message: `${documentType.replace("_", " ")} uploaded successfully.`, 
      url: blob.url 
    };
  } catch (error: any) {
    console.error("Document upload error:", error);
    return { success: false, message: error.message || "Failed to upload document" };
  }
}

/**
 * Resubmits a profile for review (e.g. after a rejection). Sets status back to pending.
 */
export async function resubmitSellerProfile(sellerProfileId: string): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session || !session.user || (session.user as any).role !== 'seller') {
    return { success: false, message: "Unauthorized" };
  }

  const userId = (session.user as any).id;

  try {
    const profileList = await db.select().from(sellerProfiles)
      .where(eq(sellerProfiles.id, sellerProfileId))
      .limit(1);

    if (profileList.length === 0 || profileList[0].userId !== userId) {
      return { success: false, message: "Unauthorized profile access" };
    }

    await db.transaction(async (tx) => {
      await tx.update(sellerProfiles)
        .set({
          verificationStatus: 'pending',
          rejectionReason: null,
          rejectedBy: null,
          rejectedAt: null
        })
        .where(eq(sellerProfiles.id, sellerProfileId));

      await logActivity(tx, userId, 'resubmitted_profile', 'seller_profile', sellerProfileId);
    });

    return { success: true, message: "Profile resubmitted for review successfully." };
  } catch (error: any) {
    console.error("Profile resubmission error:", error);
    return { success: true, message: error.message || "Failed to resubmit profile" };
  }
}
