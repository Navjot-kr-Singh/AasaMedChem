import React from "react";
import { getOrders } from "@/actions/queries";
import { BuyerOrdersClient } from "./orders-client";

export const revalidate = 0;

export default async function BuyerOrdersPage() {
  const ordersList = await getOrders();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">My Procurement Orders</h2>
        <p className="text-sm text-slate-500 mt-1">Review invoice breakdowns, check tracking logs, or cancel pending checkouts.</p>
      </div>

      <BuyerOrdersClient initialOrders={ordersList as any} />
    </div>
  );
}
