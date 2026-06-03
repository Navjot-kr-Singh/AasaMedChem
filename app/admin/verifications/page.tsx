import React from "react";
import { getSellerProfiles, getSellerDocuments } from "@/actions/queries";
import { SellerVerificationsClient } from "./verifications-client";

export const revalidate = 0;

export default async function AdminVerificationsPage() {
  const sellers = await getSellerProfiles();

  // Fetch documents for each seller profile concurrently
  const sellersWithDocs = await Promise.all(
    sellers.map(async (seller) => {
      try {
        const docs = await getSellerDocuments(seller.id);
        return {
          ...seller,
          documents: docs.map(d => ({
            id: d.id,
            documentType: d.documentType,
            documentUrl: d.documentUrl
          }))
        };
      } catch (err) {
        console.error(`Failed to fetch documents for seller ${seller.id}`, err);
        return { ...seller, documents: [] };
      }
    })
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Seller Verification</h2>
        <p className="text-sm text-slate-500 mt-1">Review legal documents and approve or reject pharmaceutical vendor onboarding.</p>
      </div>

      {/* Main Client Panel */}
      <SellerVerificationsClient initialSellers={sellersWithDocs} />
    </div>
  );
}
