import React from "react";
import { getOrders } from "@/actions/queries";
import { SellerOrdersClient } from "./orders-client";

export const revalidate = 0;

export default async function SellerOrdersPage() {
  const ordersList = await getOrders();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Orders Received</h2>
        <p className="text-sm text-slate-500 mt-1">Track incoming procurement order checkout values and update order fulfillment statuses.</p>
      </div>

      <SellerOrdersClient initialOrders={ordersList as any} />
    </div>
  );
}
