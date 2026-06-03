import React from "react";
import { getFilteredProducts, getCategories } from "@/actions/queries";
import { BuyerCatalogClient } from "./catalog-client";

export const revalidate = 0;

export default async function BuyerCatalogPage() {
  // Buyers can only view approved, active products in the system.
  // getFilteredProducts handles role authorization checks automatically
  const products = await getFilteredProducts();
  const categories = await getCategories();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Pharmaceutical Marketplace</h2>
        <p className="text-sm text-slate-500 mt-1">Browse verified ingredients, perform live unit conversions, and negotiate quotations directly with vendors.</p>
      </div>

      <BuyerCatalogClient 
        initialProducts={products as any} 
        categories={categories} 
      />
    </div>
  );
}
