import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { users, sellerProfiles, categories, products, activityLogs } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is missing. Please set it in your environment to seed the database.");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });
  console.log("Starting database seed script...");

  try {
    // 1. Seed Categories
    console.log("Seeding categories...");
    const categoryNames = [
      { name: "API", description: "Active Pharmaceutical Ingredients" },
      { name: "Solvent", description: "Liquid solvents for dilutions and synthesis" },
      { name: "Excipient", description: "Inactive binding agents, fillers or coatings" },
      { name: "Intermediate", description: "Chemical compounds formed during API synthesis" },
      { name: "Laboratory Reagent", description: "Reagents for testing and research" },
      { name: "Finished Product", description: "Packaged pharmaceutical products ready for distribution" }
    ];

    const categoryMap: Record<string, string> = {};

    for (const cat of categoryNames) {
      const existing = await db.select().from(categories).where(eq(categories.name, cat.name)).limit(1);
      if (existing.length === 0) {
        const [inserted] = await db.insert(categories).values({
          name: cat.name,
          description: cat.description
        }).returning();
        categoryMap[cat.name] = inserted.id;
        console.log(`Inserted category: ${cat.name}`);
      } else {
        categoryMap[cat.name] = existing[0].id;
        console.log(`Category exists: ${cat.name}`);
      }
    }

    // 2. Hash default passwords
    const defaultPasswordHash = await bcrypt.hash("Admin@123", 10);
    const sellerPasswordHash = await bcrypt.hash("Seller@123", 10);
    const buyerPasswordHash = await bcrypt.hash("Buyer@123", 10);

    // 3. Seed Admin
    console.log("Seeding Admin user...");
    let adminUser;
    const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@pharma.com")).limit(1);
    if (existingAdmin.length === 0) {
      const [inserted] = await db.insert(users).values({
        name: "Admin Supervisor",
        email: "admin@pharma.com",
        passwordHash: defaultPasswordHash,
        role: "admin"
      }).returning();
      adminUser = inserted;
      console.log("Inserted admin user: admin@pharma.com");
    } else {
      adminUser = existingAdmin[0];
      console.log("Admin user exists.");
    }

    // 4. Seed Seller User & Profile
    console.log("Seeding Seller user & profile...");
    let sellerUser;
    let sellerProfileRecord;
    const existingSeller = await db.select().from(users).where(eq(users.email, "seller@pharma.com")).limit(1);
    if (existingSeller.length === 0) {
      const [inserted] = await db.insert(users).values({
        name: "Alpha Chemicals",
        email: "seller@pharma.com",
        passwordHash: sellerPasswordHash,
        role: "seller"
      }).returning();
      sellerUser = inserted;
      console.log("Inserted seller user: seller@pharma.com");
    } else {
      sellerUser = existingSeller[0];
      console.log("Seller user exists.");
    }

    const existingProfile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, sellerUser.id)).limit(1);
    if (existingProfile.length === 0) {
      const [insertedProfile] = await db.insert(sellerProfiles).values({
        userId: sellerUser.id,
        businessName: "Alpha Chemicals Ltd",
        gstNumber: "27AAAAA1111A1Z1",
        drugLicenseNumber: "DL-9999/SELLER",
        address: "Chemical Plot 45, GIDC Industrial Estate, Mumbai, MH - 400001",
        verificationStatus: "approved",
        verifiedAt: new Date(),
        approvedBy: adminUser.id,
        approvedAt: new Date()
      }).returning();
      sellerProfileRecord = insertedProfile;
      console.log("Inserted approved seller profile for Alpha Chemicals");
    } else {
      sellerProfileRecord = existingProfile[0];
      console.log("Seller profile exists.");
    }

    // 5. Seed Buyer User
    console.log("Seeding Buyer user...");
    let buyerUser;
    const existingBuyer = await db.select().from(users).where(eq(users.email, "buyer@pharma.com")).limit(1);
    if (existingBuyer.length === 0) {
      const [inserted] = await db.insert(users).values({
        name: "Zenith Pharmaceutics",
        email: "buyer@pharma.com",
        passwordHash: buyerPasswordHash,
        role: "buyer"
      }).returning();
      buyerUser = inserted;
      console.log("Inserted buyer user: buyer@pharma.com");
    } else {
      buyerUser = existingBuyer[0];
      console.log("Buyer user exists.");
    }

    // 6. Seed Mock Approved Products
    console.log("Seeding mock active marketplace products...");
    const mockProducts = [
      {
        name: "Paracetamol Fine Powder API",
        sku: "PARA-API-001",
        categoryId: categoryMap["API"],
        dimensionType: "weight" as const,
        baseUnit: "g" as const,
        inventoryQuantity: "5000000.0000000000", // 5000 kg
        pricePerBaseUnit: "1.5000000000", // ₹1.5 per gram
        description: "High purity Paracetamol (Acetaminophen) active pharmaceutical ingredient. Grade: USP/BP. Purity: >= 99.8%. Batch: PR-2026."
      },
      {
        name: "Anhydrous Ethanol 99.9%",
        sku: "ETH-SOL-050",
        categoryId: categoryMap["Solvent"],
        dimensionType: "volume" as const,
        baseUnit: "mL" as const,
        inventoryQuantity: "2500000.0000000000", // 2500 L
        pricePerBaseUnit: "0.1200000000", // ₹0.12 per mL
        description: "Reagent grade Anhydrous Ethanol (Ethyl Alcohol). Purity: >= 99.9%. Ideal solvent for chemical extractions and sanitization blends."
      },
      {
        name: "Microcrystalline Cellulose MCC 102",
        sku: "MCC-EXC-200",
        categoryId: categoryMap["Excipient"],
        dimensionType: "weight" as const,
        baseUnit: "g" as const,
        inventoryQuantity: "12000000.0000000000", // 12000 kg
        pricePerBaseUnit: "0.8500000000", // ₹0.85 per gram
        description: "Standard pharmaceutical binding excipient Microcrystalline Cellulose (MCC-102). Used for direct tablet compression and capsules fillers."
      },
      {
        name: "Sterile Water for Injection",
        sku: "WFI-FIN-005",
        categoryId: categoryMap["Finished Product"],
        dimensionType: "volume" as const,
        baseUnit: "mL" as const,
        inventoryQuantity: "10000000.0000000000", // 10000 L
        pricePerBaseUnit: "0.0500000000", // ₹0.05 per mL
        description: "Sterile, non-pyrogenic Water for Injection (WFI) ready-to-use vials. Ideal for dissolving intravenous preparations. Batch WFI-2026."
      }
    ];

    for (const mockP of mockProducts) {
      const existingProduct = await db.select().from(products).where(eq(products.sku, mockP.sku)).limit(1);
      if (existingProduct.length === 0) {
        const [insertedProduct] = await db.insert(products).values({
          sellerProfileId: sellerProfileRecord.id,
          categoryId: mockP.categoryId,
          name: mockP.name,
          sku: mockP.sku,
          dimensionType: mockP.dimensionType,
          baseUnit: mockP.baseUnit,
          inventoryQuantity: mockP.inventoryQuantity,
          reservedQuantity: "0.0000000000",
          pricePerBaseUnit: mockP.pricePerBaseUnit,
          description: mockP.description,
          productStatus: "approved",
          isActive: true
        }).returning();

        // Log seeding to activity log
        await db.insert(activityLogs).values({
          userId: adminUser.id,
          action: "seeded_product",
          entityType: "product",
          entityId: insertedProduct.id,
          metadata: { sku: mockP.sku, name: mockP.name }
        });

        console.log(`Inserted product: ${mockP.name}`);
      } else {
        console.log(`Product exists: ${mockP.name}`);
      }
    }

    console.log("Seeding script completed successfully! Test credentials generated.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding script failed with error:", error);
    process.exit(1);
  }
}

main();
