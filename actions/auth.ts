"use strict";

"use server";

import { db } from "@/db";
import { users, sellerProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logActivity } from "./logging";

export interface RegisterResult {
  success: boolean;
  message: string;
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as 'buyer' | 'seller';

  if (!name || !email || !password || !role) {
    return { success: false, message: "All fields are required" };
  }

  try {
    // 1. Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return { success: false, message: "Email is already registered" };
    }

    // 2. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Insert user (and seller profile if role === 'seller') in a transaction
    await db.transaction(async (tx) => {
      // Insert User
      const [insertedUser] = await tx.insert(users).values({
        name,
        email,
        passwordHash,
        role,
      }).returning();

      if (role === 'seller') {
        const businessName = formData.get("businessName") as string;
        const gstNumber = formData.get("gstNumber") as string;
        const drugLicenseNumber = formData.get("drugLicenseNumber") as string || null;
        const address = formData.get("address") as string;

        if (!businessName || !gstNumber || !address) {
          throw new Error("Seller profiles require business name, GST number, and address.");
        }

        // Insert Seller Profile
        const [profile] = await tx.insert(sellerProfiles).values({
          userId: insertedUser.id,
          businessName,
          gstNumber,
          drugLicenseNumber,
          address,
          verificationStatus: 'pending',
        }).returning();

        // Audit Log
        await logActivity(tx, insertedUser.id, 'seller_registered', 'seller_profile', profile.id, {
          businessName,
          gstNumber
        });
      } else {
        // Audit Log for Buyer
        await logActivity(tx, insertedUser.id, 'buyer_registered', 'user', insertedUser.id);
      }
    });

    return { success: true, message: "Registration successful. You can now log in." };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, message: error.message || "An error occurred during registration" };
  }
}
