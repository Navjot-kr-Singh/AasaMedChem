"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { convertQuotationToOrder } from "@/actions/orders";
import { getQuotationItems } from "@/actions/queries";
import { toast } from "sonner";
import { 
  FileText, 
  ChevronRight, 
  Info,
  Loader2,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/decimal";

interface Quotation {
  id: string;
  status: "pending" | "approved" | "rejected" | "converted";
  totalAmount: string;
  createdAt: Date | string;
}

interface QuotationItem {
  id: string;
  productId: string;
  enteredQuantity: string;
  enteredUnit: string;
  convertedQuantity: string;
  internalUnit: string;
  unitPrice: string;
  totalPrice: string;
  productName: string;
  sku: string;
  sellerName: string;
}

interface Props {
  initialQuotations: Quotation[];
}

export function BuyerQuotationsClient({ initialQuotations }: Props) {
  const [quotesList, setQuotesList] = useState<Quotation[]>(initialQuotations);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState<QuotationItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelectQuote = async (quote: Quotation) => {
    setSelectedQuote(quote);
    setLoadingItems(true);
    try {
      const items = await getQuotationItems(quote.id);
      setSelectedQuoteItems(items as any);
    } catch (err) {
      toast.error("Failed to load quotation items");
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCheckout = (quoteId: string) => {
    if (!confirm("Confirm checkout? This will finalize the quotation transaction and deduct reserved inventory.")) return;

    startTransition(async () => {
      const res = await convertQuotationToOrder(quoteId);
      if (res.success) {
        toast.success(res.message);
        setQuotesList(prev => prev.map(q => {
          if (q.id === quoteId) {
            return { ...q, status: "converted" };
          }
          return q;
        }));
        if (selectedQuote && selectedQuote.id === quoteId) {
          setSelectedQuote(prev => prev ? { ...prev, status: "converted" } : null);
        }
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Quotations List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-855 uppercase tracking-wider">My Quotation Requests</h3>
            </div>
            <span className="text-xs font-bold text-slate-550 bg-slate-50 px-2.5 py-1 rounded-lg">
              Count: {quotesList.length}
            </span>
          </div>

          {quotesList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">You haven't requested any quotations yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Quotation ID</th>
                    <th className="px-6 py-3">Request Date</th>
                    <th className="px-6 py-3">Proposed Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                  {quotesList.map((quote) => (
                    <tr 
                      key={quote.id} 
                      onClick={() => handleSelectQuote(quote)}
                      className={cn(
                        "hover:bg-slate-50/50 cursor-pointer transition-colors",
                        selectedQuote?.id === quote.id ? "bg-indigo-50/30" : ""
                      )}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        #{quote.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-slate-450 font-medium">
                        {new Date(quote.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {formatINR(quote.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                          quote.status === "approved" 
                            ? "bg-green-100 text-green-700" 
                            : quote.status === "rejected" 
                              ? "bg-red-100 text-red-700" 
                              : quote.status === "converted" 
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                        )}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Selected Quotation detail panel */}
      <div className="space-y-4">
        {selectedQuote ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 sticky top-24">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Quote summary</h4>
                <p className="font-mono text-[10px] text-indigo-600 mt-0.5">#{selectedQuote.id}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{new Date(selectedQuote.createdAt).toLocaleTimeString("en-IN")}</span>
            </div>

            {/* Status alerts */}
            {selectedQuote.status === "pending" && (
              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>Under administrative review. Sellers will reserve stock upon approval.</span>
              </div>
            )}
            
            {selectedQuote.status === "rejected" && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>Quotation request rejected by platform sellers/admin.</span>
              </div>
            )}

            {selectedQuote.status === "converted" && (
              <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800 flex gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-650 mt-0.5" />
                <span>✓ Successfully converted to order. Purchases settled.</span>
              </div>
            )}

            {/* Approved - Checkout conversion */}
            {selectedQuote.status === "approved" && (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800 flex gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
                  <span>Approved! Inventory reservation is active. Checkout below.</span>
                </div>
                <button
                  onClick={() => handleCheckout(selectedQuote.id)}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-3 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                  Checkout & Complete Purchase
                </button>
              </div>
            )}

            {/* Quotation Items snapshot */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Requested items snapshot</p>
              {loadingItems ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                  {selectedQuoteItems.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{item.productName}</span>
                        <span>{formatINR(item.totalPrice)}</span>
                      </div>
                      <div className="text-[10px] text-slate-455 font-mono">SKU: {item.sku}</div>
                      
                      <div className="grid grid-cols-2 text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400">Entered:</span> {parseFloat(item.enteredQuantity).toFixed(2).replace(/\.?0+$/, "")} {item.enteredUnit}
                        </div>
                        <div>
                          <span className="text-slate-400">Converted:</span> {parseFloat(item.convertedQuantity).toFixed(2).replace(/\.?0+$/, "")} {item.internalUnit}
                        </div>
                        <div className="col-span-2 pt-1 mt-1 border-t border-slate-200/50 text-slate-550">
                          Price snapshot: {formatINR(item.unitPrice)} / {item.internalUnit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-655">Estimated Total:</span>
              <span className="text-lg font-black text-slate-900">{formatINR(selectedQuote.totalAmount)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-405 h-80 flex flex-col items-center justify-center">
            <AlertCircle className="w-8 h-8 text-slate-350 mb-2" />
            <p className="text-sm font-medium">Select a quotation on the left to view negotiation details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
