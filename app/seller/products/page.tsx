import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFilteredProducts, getCategories } from "@/actions/queries";
import { SellerProductsClient } from "./products-client";

export const revalidate = 0;

export default async function SellerProductsPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const sellerProfileId = (session.user as any).sellerProfileId;
  if (!sellerProfileId) {
    redirect("/seller/dashboard");
  }

  // Fetch only this seller's products
  const products = await getFilteredProducts({ sellerProfileId });
  const categories = await getCategories();

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Chemical Product Catalog</h2>
        <p className="text-sm text-slate-500 mt-1">Upload pharmaceutical ingredients, configure unit prices, and adjust physical stock logs.</p>
      </div>

      <SellerProductsClient 
        initialProducts={products as any} 
        categories={categories}
        sellerProfileId={sellerProfileId}
      />
    </div>
  );
}
