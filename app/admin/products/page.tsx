import React from "react";
import { getFilteredProducts } from "@/actions/queries";
import { AdminProductsClient } from "./products-client";

export const revalidate = 0;

export default async function AdminProductsPage() {
  // Query all products across the system, including drafts/review states
  const products = await getFilteredProducts();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Product Catalog Management</h2>
        <p className="text-sm text-slate-500 mt-1">Verify new seller products, manage existing catalog, or restore soft-deleted items.</p>
      </div>

      <AdminProductsClient initialProducts={products as any} />
    </div>
  );
}
