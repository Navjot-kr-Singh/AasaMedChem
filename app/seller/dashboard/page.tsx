import React from "react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { sellerProfiles, sellerDocuments, products, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SellerOnboarding } from "@/components/seller-onboarding";
import { getSellerStats } from "@/actions/dashboards";
import { SellerDashboardCharts } from "@/components/dashboard-charts";
import { formatINR, dec } from "@/lib/decimal";
import { 
  Package, 
  ShoppingCart, 
  FileText, 
  IndianRupee, 
  Boxes,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export const revalidate = 0;

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // Retrieve seller profile
  const profileList = await db.select().from(sellerProfiles)
    .where(eq(sellerProfiles.userId, userId))
    .limit(1);

  if (profileList.length === 0) {
    // Should not happen as registerUser creates profile, but fallback:
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-2" />
        <h3 className="font-bold text-slate-800">No Profile Found</h3>
        <p className="text-xs text-slate-500 mt-1">Please register as a seller first.</p>
      </div>
    );
  }

  const profile = profileList[0];

  // If seller profile is NOT approved, show Onboarding checklist
  if (profile.verificationStatus !== "approved") {
    const docs = await db.select().from(sellerDocuments)
      .where(eq(sellerDocuments.sellerProfileId, profile.id));

    return (
      <div className="space-y-8 font-sans">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Onboarding & Compliance</h2>
          <p className="text-sm text-slate-500 mt-1">Complete your B2B pharmaceutical vendor credentials verification.</p>
        </div>

        <SellerOnboarding sellerProfile={profile as any} initialDocuments={docs as any} />
      </div>
    );
  }

  // Approved seller view
  const stats = await getSellerStats();

  // Load category distribution values for Pie Charts
  const sellerProducts = await db.select({
    categoryName: categories.name,
    inventoryQuantity: products.inventoryQuantity,
    pricePerBaseUnit: products.pricePerBaseUnit
  })
  .from(products)
  .innerJoin(categories, eq(products.categoryId, categories.id))
  .where(and(eq(products.sellerProfileId, profile.id), eq(products.isActive, true)));

  const grouped: Record<string, any> = {};
  for (const p of sellerProducts) {
    const val = dec(p.inventoryQuantity).times(dec(p.pricePerBaseUnit));
    grouped[p.categoryName] = (grouped[p.categoryName] || dec(0)).plus(val);
  }

  const categoryData = Object.keys(grouped).map(catName => ({
    name: catName,
    value: parseFloat(grouped[catName].toFixed(2))
  }));

  const metrics = [
    { title: "Total Products", value: stats.totalProducts, icon: Package, desc: `${stats.pendingProducts} pending approval`, color: "text-indigo-650 bg-indigo-50" },
    { title: "Inventory Value", value: formatINR(stats.inventoryValue), icon: Boxes, desc: "Estimated base valuation", color: "text-amber-600 bg-amber-50" },
    { title: "Orders Received", value: stats.ordersReceived, icon: ShoppingCart, desc: "Procurement orders log", color: "text-blue-600 bg-blue-50" },
    { title: "Quotation Requests", value: stats.quotationsReceived, icon: FileText, desc: "Active price negotiations", color: "text-pink-600 bg-pink-50" },
    { title: "Revenue (Finalized)", value: formatINR(stats.revenue), icon: IndianRupee, desc: "Delivered transactions total", color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Seller Workspace</h2>
          <p className="text-sm text-slate-500 mt-1">Manage catalog listings, inspect incoming orders, and negotiate quotations.</p>
        </div>
        <div className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
          Compliance Status: APPROVED VENDOR
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.title} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{m.title}</span>
                  <p className="text-2xl font-extrabold text-slate-850">{m.value}</p>
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

      {/* Charts section */}
      <SellerDashboardCharts categoryData={categoryData} />
    </div>
  );
}
