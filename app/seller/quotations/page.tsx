import React from "react";
import { getQuotations } from "@/actions/queries";
import { SellerQuotationsClient } from "./quotations-client";

export const revalidate = 0;

export default async function SellerQuotationsPage() {
  const quotesList = await getQuotations();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quotations Received</h2>
        <p className="text-sm text-slate-500 mt-1">Review incoming buyer negotiation requests, audit snapshotted chemical values, and approve to reserve inventory.</p>
      </div>

      <SellerQuotationsClient initialQuotations={quotesList as any} />
    </div>
  );
}
