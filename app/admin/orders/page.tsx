import React from "react";
import { getOrders } from "@/actions/queries";
import { AdminOrdersClient } from "./orders-client";

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const ordersList = await getOrders();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Procurement Orders</h2>
        <p className="text-sm text-slate-500 mt-1">Review checkout values, inspect snapshotted conversion factors, and update order fulfillment statuses.</p>
      </div>

      <AdminOrdersClient initialOrders={ordersList as any} />
    </div>
  );
}
