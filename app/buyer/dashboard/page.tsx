import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBuyerStats } from "@/actions/dashboards";
import { getOrders } from "@/actions/queries";
import { formatINR } from "@/lib/decimal";
import { 
  ShoppingCart, 
  FileText, 
  PackageCheck, 
  Calendar, 
  Clock, 
  ArrowRight,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const revalidate = 0;

export default async function BuyerDashboardPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const stats = await getBuyerStats();
  const orders = await getOrders();
  const recentOrders = orders.slice(0, 5);

  const metrics = [
    { title: "My Quotation Requests", value: stats.totalQuotations, icon: FileText, desc: "Negotiations created", color: "text-indigo-600 bg-indigo-50" },
    { title: "Procurement Orders", value: stats.totalOrders, icon: ShoppingCart, desc: "Total orders checked out", color: "text-blue-600 bg-blue-50" },
    { title: "Finalized Purchases", value: stats.recentPurchasesCount, icon: PackageCheck, desc: "Delivered chemical batches", color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Buyer Console</h2>
          <p className="text-sm text-slate-500 mt-1">Browse pharmaceutical catalog, review quotations, and track order shipments.</p>
        </div>
        <Link 
          href="/buyer/catalog"
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all group"
        >
          Explore Catalog 
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.title} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.title}</span>
                  <p className="text-3xl font-extrabold text-slate-850">{m.value}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", m.color)}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-450 mt-4 font-medium">{m.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Orders Log */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-855 uppercase tracking-wider">Recent Orders</h3>
          </div>
          <Link href="/buyer/orders" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
            View All Orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Order Code</th>
                  <th className="px-6 py-3">Created On</th>
                  <th className="px-6 py-3">Invoice Total</th>
                  <th className="px-6 py-3">Tracking Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-slate-450 font-medium">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {formatINR(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        order.status === "delivered" 
                          ? "bg-green-100 text-green-700" 
                          : order.status === "cancelled" 
                            ? "bg-red-100 text-red-700" 
                            : order.status === "pending" 
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                      )}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
