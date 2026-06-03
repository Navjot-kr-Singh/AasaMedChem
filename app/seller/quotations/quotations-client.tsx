"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { updateQuotationStatus } from "@/actions/quotations";
import { getQuotationItems } from "@/actions/queries";
import { toast } from "sonner";
import { 
  FileText, 
  ChevronRight, 
  User, 
  Info,
  Loader2,
  Calendar,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/decimal";

interface Quotation {
  id: string;
  status: "pending" | "approved" | "rejected" | "converted";
  totalAmount: string;
  createdAt: Date | string;
  buyerName: string;
  buyerEmail: string;
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

export function SellerQuotationsClient({ initialQuotations }: Props) {
  const [quotesList, setQuotesList] = useState<Quotation[]>(initialQuotations);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState<QuotationItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Rejection state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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

  const handleStatusUpdate = (quoteId: string, action: "approved" | "rejected", reason?: string) => {
    startTransition(async () => {
      const res = await updateQuotationStatus(quoteId, action, reason);
      if (res.success) {
        toast.success(res.message);
        setQuotesList(prev => prev.map(q => {
          if (q.id === quoteId) {
            return { ...q, status: action };
          }
          return q;
        }));
        if (selectedQuote && selectedQuote.id === quoteId) {
          setSelectedQuote(prev => prev ? { ...prev, status: action } : null);
        }
        setShowRejectDialog(false);
        setRejectionReason("");
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
              <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Quotations Received</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
              Count: {quotesList.length}
            </span>
          </div>

          {quotesList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-350" />
              <p className="text-sm font-medium">No quotation requests received.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Quotation Details</th>
                    <th className="px-6 py-3">Buyer customer</th>
                    <th className="px-6 py-3">Proposed Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {quotesList.map((quote) => (
                    <tr 
                      key={quote.id} 
                      onClick={() => handleSelectQuote(quote)}
                      className={cn(
                        "hover:bg-slate-50/50 cursor-pointer transition-colors",
                        selectedQuote?.id === quote.id ? "bg-indigo-50/30" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-indigo-600 truncate max-w-[120px]" title={quote.id}>
                          #{quote.id.slice(0, 8)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(quote.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{quote.buyerName}</div>
                        <div className="text-[10px] text-slate-450">{quote.buyerEmail}</div>
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

      {/* Selected Quotation Detail Sidebar */}
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

            {/* Buyer Info */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Buyer Customer Info</p>
              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedQuote.buyerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedQuote.buyerEmail}</span>
                </div>
              </div>
            </div>

            {/* Action buttons (only for pending) */}
            {selectedQuote.status === "pending" && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleStatusUpdate(selectedQuote.id, "approved")}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Approve & Lock Stock
                </button>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-655 hover:text-red-700 text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject Quote
                </button>
              </div>
            )}

            {selectedQuote.status === "approved" && (
              <div className="p-3 bg-green-50 border border-green-150 rounded-xl text-xs text-green-700 flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Active Reservation:</span> Stock locked for this customer. Awaiting order checkout conversion.
                </div>
              </div>
            )}
            
            {selectedQuote.status === "converted" && (
              <div className="p-3 bg-purple-50 border border-purple-150 rounded-xl text-xs text-purple-750 flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Converted to Order:</span> Purchase finalized. Reservation has been deducted.
                </div>
              </div>
            )}

            {/* Quotation Items Snapshot */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Proposed Products</p>
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
                        <div className="col-span-2 pt-1 mt-1 border-t border-slate-200/50 text-slate-500">
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
            <p className="text-sm font-medium">Select a quotation on the left to inspect detailed values.</p>
          </div>
        )}
      </div>

      {/* Reject Quote Modal */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h4 className="text-base font-bold text-slate-800">Reject Quotation Request</h4>
              <p className="text-xs text-slate-500 mt-0.5">Please provide a feedback explanation for the buyer.</p>
            </div>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-800 outline-none transition-all resize-none"
              placeholder="e.g. Current chemical inventory is fully booked. Please submit a new request in 48 hours when the next batch is released."
              required
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                }}
                className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedQuote) {
                    handleStatusUpdate(selectedQuote.id, "rejected", rejectionReason);
                  }
                }}
                disabled={!rejectionReason.trim() || isPending}
                className="px-4 py-2 bg-red-655 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
