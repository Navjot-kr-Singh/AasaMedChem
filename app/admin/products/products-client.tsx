"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { deleteProduct, restoreProduct } from "@/actions/products";
import { reviewProduct as adminReviewProductAction } from "@/actions/admin";
import { toast } from "sonner";
import { 
  Package, 
  Check, 
  X, 
  Trash2, 
  RefreshCcw,
  Loader2, 
  Info,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/decimal";

interface Product {
  id: string;
  sellerProfileId: string;
  categoryId: string;
  name: string;
  description: string;
  sku: string;
  dimensionType: string;
  baseUnit: string;
  inventoryQuantity: string;
  reservedQuantity: string;
  pricePerBaseUnit: string;
  productStatus: "draft" | "pending_review" | "approved" | "rejected";
  rejectionReason: string | null;
  isActive: boolean;
  categoryName: string;
  sellerName: string;
}

interface Props {
  initialProducts: Product[];
}

export function AdminProductsClient({ initialProducts }: Props) {
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "deleted">("pending");
  const [isPending, startTransition] = useTransition();

  // Rejection modal state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const pendingList = productsList.filter(p => p.isActive && p.productStatus === "pending_review");
  const approvedList = productsList.filter(p => p.isActive && p.productStatus === "approved");
  const rejectedList = productsList.filter(p => p.isActive && p.productStatus === "rejected");
  const deletedList = productsList.filter(p => !p.isActive);

  const handleReview = (productId: string, action: "approved" | "rejected", reason?: string) => {
    startTransition(async () => {
      const res = await adminReviewProductAction(productId, action, reason);
      if (res.success) {
        toast.success(res.message);
        setProductsList(prev => prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              productStatus: action,
              rejectionReason: action === "rejected" ? (reason || "No reason specified") : null
            };
          }
          return p;
        }));
        setShowRejectDialog(false);
        setRejectionReason("");
        setSelectedProductId(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDelete = (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? It will be soft-deleted and removed from the marketplace.")) return;
    
    startTransition(async () => {
      const res = await deleteProduct(productId);
      if (res.success) {
        toast.success(res.message);
        setProductsList(prev => prev.map(p => {
          if (p.id === productId) {
            return { ...p, isActive: false };
          }
          return p;
        }));
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleRestore = (productId: string) => {
    startTransition(async () => {
      const res = await restoreProduct(productId);
      if (res.success) {
        toast.success(res.message);
        setProductsList(prev => prev.map(p => {
          if (p.id === productId) {
            return { ...p, isActive: true, productStatus: "pending_review" };
          }
          return p;
        }));
      } else {
        toast.error(res.message);
      }
    });
  };

  const currentList = 
    activeTab === "pending" ? pendingList : 
    activeTab === "approved" ? approvedList : 
    activeTab === "rejected" ? rejectedList : deletedList;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "pending" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Pending Review ({pendingList.length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "approved" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Approved Marketplace ({approvedList.length})
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "rejected" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Rejected ({rejectedList.length})
        </button>
        <button
          onClick={() => setActiveTab("deleted")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "deleted" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Soft-Deleted ({deletedList.length})
        </button>
      </div>

      {/* Products table list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-350" />
            <p className="text-sm font-medium">No products found in this section.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Product details</th>
                  <th className="px-6 py-3">Vendor / Seller</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Pricing per base</th>
                  <th className="px-6 py-3">Available Inventory</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {currentList.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{product.name}</div>
                      <div className="text-[10px] text-slate-450 mt-0.5 font-mono">SKU: {product.sku}</div>
                      {product.productStatus === "rejected" && product.rejectionReason && (
                        <div className="mt-2 text-red-650 bg-red-50 px-2.5 py-1.5 rounded-lg flex items-start gap-1 font-sans">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>Rejection note: {product.rejectionReason}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {product.sellerName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-650 uppercase tracking-wider">
                        {product.categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {formatINR(product.pricePerBaseUnit)} / {product.baseUnit}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">
                        {parseFloat(product.inventoryQuantity).toFixed(2).replace(/\.?0+$/, "")} {product.baseUnit}
                      </div>
                      {parseFloat(product.reservedQuantity) > 0 && (
                        <div className="text-[10px] text-indigo-500 font-bold">
                          Reserved: {parseFloat(product.reservedQuantity).toFixed(2).replace(/\.?0+$/, "")} {product.baseUnit}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {activeTab === "pending" && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReview(product.id, "approved")}
                            disabled={isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold p-2 rounded-lg transition-all shadow-sm cursor-pointer"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setShowRejectDialog(true);
                            }}
                            disabled={isPending}
                            className="bg-white hover:bg-red-50 border border-slate-200 text-slate-650 hover:text-red-700 font-bold p-2 rounded-lg transition-all shadow-sm cursor-pointer"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {activeTab === "approved" && (
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={isPending}
                          className="bg-white hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-700 p-2 rounded-lg transition-all shadow-sm cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {activeTab === "rejected" && (
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={isPending}
                          className="bg-white hover:bg-red-50 border border-slate-200 text-slate-550 hover:text-red-700 p-2 rounded-lg transition-all shadow-sm cursor-pointer"
                          title="Delete Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {activeTab === "deleted" && (
                        <button
                          onClick={() => handleRestore(product.id)}
                          disabled={isPending}
                          className="bg-white hover:bg-indigo-50 border border-slate-200 text-slate-650 hover:text-indigo-600 p-2 rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1 font-bold text-xs"
                          title="Restore Product"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Product Modal */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h4 className="text-base font-bold text-slate-800">Reject Product Listing</h4>
              <p className="text-xs text-slate-500 mt-0.5">Please provide a feedback reason. This is logged and shown to the seller.</p>
            </div>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-800 outline-none transition-all resize-none"
              placeholder="e.g., The listed SKU is already assigned to another vendor. Please double-check SKU coding guidelines."
              required
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                  setSelectedProductId(null);
                }}
                className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedProductId) {
                    handleReview(selectedProductId, "rejected", rejectionReason);
                  }
                }}
                disabled={!rejectionReason.trim() || isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
              >
                Reject Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
