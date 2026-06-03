import React from "react";
import { getQuotations } from "@/actions/queries";
import { BuyerQuotationsClient } from "./quotations-client";

export const revalidate = 0;

export default async function BuyerQuotationsPage() {
  // Fetches only current buyer's quotations
  const quotesList = await getQuotations();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">My Quotation Requests</h2>
        <p className="text-sm text-slate-500 mt-1">Track status updates of your chemical negotiation quotes, and checkout approved requests.</p>
      </div>

      <BuyerQuotationsClient initialQuotations={quotesList as any} />
    </div>
  );
}
