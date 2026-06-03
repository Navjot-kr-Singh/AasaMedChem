"use strict";

"use client";

import React, { useState, useMemo, useTransition } from "react";
import { createDirectOrder } from "@/actions/orders";
import { createQuotationRequest } from "@/actions/quotations";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  FileText, 
  Loader2, 
  X,
  Building,
  Tag,
  AlertTriangle,
  Scale,
  IndianRupee,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR, dec } from "@/lib/decimal";
import { convertToBaseUnit } from "@/lib/conversions";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  categoryId: string;
  dimensionType: "weight" | "volume" | "count";
  baseUnit: "g" | "kg" | "mL" | "L" | "item";
  inventoryQuantity: string;
  reservedQuantity: string;
  pricePerBaseUnit: string;
  categoryName: string;
  sellerName: string;
  sellerProfileId: string;
}

interface Props {
  initialProducts: Product[];
  categories: Category[];
}

export function BuyerCatalogClient({ initialProducts, categories }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [isPending, startTransition] = useTransition();

  // Selected product checkout modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderQty, setOrderQty] = useState("1");
  const [orderUnit, setOrderUnit] = useState<any>("");

  // Filtering products client-side for ultra-fast responsive interactions
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryId === "all" || p.categoryId === categoryId;
      const matchPrice = !maxPrice || dec(p.pricePerBaseUnit).lte(dec(maxPrice));
      return matchSearch && matchCategory && matchPrice;
    });
  }, [products, search, categoryId, maxPrice]);

  const handleOpenCheckout = (p: Product) => {
    setSelectedProduct(p);
    setOrderQty("1");
    // Set default unit based on dimension type
    if (p.dimensionType === "weight") setOrderUnit("kg");
    else if (p.dimensionType === "volume") setOrderUnit("L");
    else setOrderUnit("item");
  };

  // Live client-side pricing calculation matching backend strategy
  const livePriceDetails = useMemo(() => {
    if (!selectedProduct || !orderQty || isNaN(Number(orderQty)) || Number(orderQty) <= 0) {
      return { convertedQty: "0", total: "0", isValid: false };
    }

    try {
      const qtyDec = dec(orderQty);
      const baseQty = convertToBaseUnit(qtyDec, orderUnit);
      const total = baseQty.times(dec(selectedProduct.pricePerBaseUnit));
      
      const available = dec(selectedProduct.inventoryQuantity).minus(dec(selectedProduct.reservedQuantity));
      const hasEnoughStock = available.gte(baseQty);

      return {
        convertedQty: baseQty.toFixed(4).replace(/\.?0+$/, ""),
        total: total.toString(),
        isValid: true,
        hasEnoughStock,
        availableStock: available.toFixed(4).replace(/\.?0+$/, "")
      };
    } catch (err) {
      return { convertedQty: "0", total: "0", isValid: false };
    }
  }, [selectedProduct, orderQty, orderUnit]);

  const handleCheckoutAction = (action: "order" | "quotation") => {
    if (!selectedProduct || !livePriceDetails.isValid) return;

    if (action === "order" && !livePriceDetails.hasEnoughStock) {
      toast.error("Direct order quantity exceeds available stock. Please request a quotation instead.");
      return;
    }

    startTransition(async () => {
      if (action === "order") {
        const res = await createDirectOrder([
          {
            productId: selectedProduct.id,
            enteredQuantity: orderQty,
            enteredUnit: orderUnit
          }
        ]);
        if (res.success) {
          toast.success(res.message);
          setSelectedProduct(null);
          // Reload page to decrement local products quantities
          window.location.reload();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createQuotationRequest([
          {
            productId: selectedProduct.id,
            enteredQuantity: orderQty,
            enteredUnit: orderUnit
          }
        ]);
        if (res.success) {
          toast.success(res.message);
          setSelectedProduct(null);
        } else {
          toast.error(res.message);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Search Name / SKU</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
              placeholder="e.g. Paracetamol or SKU..."
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chemical Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 px-3 text-xs text-slate-700 outline-none transition-all cursor-pointer font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Max Price Filter */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Max price per base unit (INR)</label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-3 w-4 h-4 text-slate-405" />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-8 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
              placeholder="e.g. 100"
            />
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-slate-350" />
          <p className="text-sm font-medium">No active products match your search filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const availableStock = dec(product.inventoryQuantity).minus(dec(product.reservedQuantity));
            return (
              <div 
                key={product.id} 
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group"
              >
                {/* Details */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-650 uppercase tracking-wider">
                      {product.categoryName}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400">SKU: {product.sku}</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-[10px] text-slate-450 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      Seller: <strong className="font-semibold text-slate-700">{product.sellerName}</strong>
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Unit Price</span>
                      <span className="font-extrabold text-slate-800">{formatINR(product.pricePerBaseUnit)}</span>
                      <span className="text-[10px] text-slate-450"> / {product.baseUnit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Available stock</span>
                      <span className="font-bold text-slate-700">
                        {availableStock.toFixed(2).replace(/\.?0+$/, "")} {product.baseUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 shrink-0">
                  <button
                    onClick={() => handleOpenCheckout(product)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    Place Order / Negotiate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout / Quotation Negotiator Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
              <div>
                <h4 className="text-base font-bold text-slate-800">{selectedProduct.name}</h4>
                <p className="text-[10px] text-slate-450 font-mono">SKU: {selectedProduct.sku} | Seller: {selectedProduct.sellerName}</p>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="text-slate-400 hover:text-slate-650"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form */}
            <div className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Order Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0.0000000001"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Select Unit</label>
                  <select
                    value={orderUnit}
                    onChange={(e) => setOrderUnit(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all uppercase font-semibold cursor-pointer"
                  >
                    {selectedProduct.dimensionType === "weight" && (
                      <>
                        <option value="kg">kilogram (kg)</option>
                        <option value="g">gram (g)</option>
                      </>
                    )}
                    {selectedProduct.dimensionType === "volume" && (
                      <>
                        <option value="L">liter (L)</option>
                        <option value="mL">milliliter (mL)</option>
                      </>
                    )}
                    {selectedProduct.dimensionType === "count" && (
                      <option value="item">item</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Conversion Display Widget */}
              {livePriceDetails.isValid && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-[10px] text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Base Conversion Quantity:</span>
                    <strong className="font-bold text-slate-800">
                      {livePriceDetails.convertedQty} {selectedProduct.baseUnit}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Base Unit Purity Price:</span>
                    <strong className="font-bold text-slate-800">
                      {formatINR(selectedProduct.pricePerBaseUnit)} / {selectedProduct.baseUnit}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                    <span>Platform Available Stock:</span>
                    <strong className="font-bold text-slate-800">
                      {livePriceDetails.availableStock} {selectedProduct.baseUnit}
                    </strong>
                  </div>
                </div>
              )}

              {/* Concurrency Check Warnings */}
              {livePriceDetails.isValid && !livePriceDetails.hasEnoughStock && (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Direct order quantity exceeds available stock. You cannot checkout directly but can <strong>Request a Quotation</strong> for manufacturing scheduling.
                  </span>
                </div>
              )}

              {/* Total display */}
              {livePriceDetails.isValid && (
                <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                  <span className="font-bold text-slate-600">Calculated price:</span>
                  <span className="text-lg font-black text-slate-900">{formatINR(livePriceDetails.total)}</span>
                </div>
              )}

              {/* Order Actions */}
              <div className="flex flex-col gap-2 pt-4">
                <button
                  onClick={() => handleCheckoutAction("order")}
                  disabled={isPending || !livePriceDetails.isValid || !livePriceDetails.hasEnoughStock}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold py-3 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                  Place Direct Order (Instant Checkout)
                </button>
                
                <button
                  onClick={() => handleCheckoutAction("quotation")}
                  disabled={isPending || !livePriceDetails.isValid}
                  className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold py-3 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 text-slate-450" />
                  )}
                  Submit B2B Quotation Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
