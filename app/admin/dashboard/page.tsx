import React from "react";
import { getAdminStats } from "@/actions/admin";
import { getActivityLogs } from "@/actions/queries";
import { formatINR } from "@/lib/decimal";
import { AdminDashboardCharts } from "@/components/dashboard-charts";
import { 
  Users, 
  Building2, 
  Package, 
  ShoppingCart, 
  FileText, 
  IndianRupee, 
  Clock, 
  ListOrdered,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

export const revalidate = 0; // Disable static rendering cache

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const logs = await getActivityLogs();

  // Monthly aggregated data for charts (mock trends aligning with system seed)
  const chartData = [
    { month: "Jan", sales: 250000, orders: 4 },
    { month: "Feb", sales: 480000, orders: 8 },
    { month: "Mar", sales: 950000, orders: 12 },
    { month: "Apr", sales: 1500000, orders: 19 },
    { month: "May", sales: 2400000, orders: 28 },
    { month: "Jun", sales: Number(stats.totalRevenue) || 0, orders: stats.totalOrders || 0 },
  ];

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, desc: "Registered accounts", color: "text-indigo-600 bg-indigo-50" },
    { title: "Active Sellers", value: stats.totalSellers, icon: Building2, desc: `${stats.verifiedSellers} verified / ${stats.pendingSellers} pending`, color: "text-amber-600 bg-amber-50" },
    { title: "Marketplace Products", value: stats.totalProducts, icon: Package, desc: `${stats.pendingProductReviews} pending review`, color: "text-purple-600 bg-purple-50" },
    { title: "Total Revenue", value: formatINR(stats.totalRevenue), icon: IndianRupee, desc: "Delivered transactions total", color: "text-emerald-600 bg-emerald-50" },
    { title: "Orders Placed", value: stats.totalOrders, icon: ShoppingCart, desc: "B2B procurement orders", color: "text-blue-600 bg-blue-50" },
    { title: "Quotation Requests", value: stats.totalQuotations, icon: FileText, desc: "Negotiation requests log", color: "text-pink-600 bg-pink-50" },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Platform overview, seller statuses, and system audit logs.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.title}</span>
                  <p className="text-3xl font-extrabold text-slate-800">{card.value}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", card.color)}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-slate-450 mt-4 font-medium">{card.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <AdminDashboardCharts revenueData={chartData} />

      {/* Recent Activity Log Ledger */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Security & Operation Audit Trail</h3>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-350" />
            <p className="text-sm font-medium">No activity log entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Action performed</th>
                  <th className="px-6 py-3">Entity Type</th>
                  <th className="px-6 py-3">Entity ID</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{log.userEmail} ({log.userRole})</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-indigo-600 bg-indigo-50/20 px-2 py-0.5 rounded max-w-xs truncate">
                      {log.action}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-650 uppercase tracking-wider">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-400 max-w-[120px] truncate">
                      {log.entityId || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-slate-450 font-medium">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
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
