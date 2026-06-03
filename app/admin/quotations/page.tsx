import React from "react";
import { getQuotations } from "@/actions/queries";
import { AdminQuotationsClient } from "./quotations-client";

export const revalidate = 0;

export default async function AdminQuotationsPage() {
  const quotesList = await getQuotations();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quotation Negotiations</h2>
        <p className="text-sm text-slate-500 mt-1">Verrify buyer negotiation limits, review snapshotted chemical values, and approve to trigger stock reservations.</p>
      </div>

      <AdminQuotationsClient initialQuotations={quotesList as any} />
    </div>
  );
}
