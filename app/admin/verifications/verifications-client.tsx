"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { reviewSellerProfile } from "@/actions/admin";
import { toast } from "sonner";
import { 
  Building2, 
  User, 
  FileText, 
  MapPin, 
  Check, 
  X, 
  Loader2,
  ExternalLink,
  ChevronDown,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerProfile {
  id: string;
  businessName: string;
  gstNumber: string;
  drugLicenseNumber: string | null;
  address: string;
  verificationStatus: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  verifiedAt: Date | string | null;
  createdAt: Date | string;
  ownerName: string;
  ownerEmail: string;
  documents?: { id: string; documentType: string; documentUrl: string }[];
}

interface Props {
  initialSellers: SellerProfile[];
}

export function SellerVerificationsClient({ initialSellers }: Props) {
  const [sellers, setSellers] = useState<SellerProfile[]>(initialSellers);
  const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");
  const [isPending, startTransition] = useTransition();
  
  // Rejection modal state
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Preview modal state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const pendingList = sellers.filter(s => s.verificationStatus === "pending");
  const reviewedList = sellers.filter(s => s.verificationStatus !== "pending");
  const currentList = activeTab === "pending" ? pendingList : reviewedList;

  const handleReview = (profileId: string, action: "approved" | "rejected", reason?: string) => {
    startTransition(async () => {
      const res = await reviewSellerProfile(profileId, action, reason);
      if (res.success) {
        toast.success(res.message);
        
        // Update local state
        setSellers(prev => prev.map(s => {
          if (s.id === profileId) {
            return {
              ...s,
              verificationStatus: action,
              rejectionReason: action === "rejected" ? (reason || "No reason specified") : null,
              verifiedAt: new Date().toISOString()
            };
          }
          return s;
        }));
        
        setShowRejectDialog(false);
        setRejectionReason("");
        setSelectedProfileId(null);
      } else {
        toast.error(res.message);
      }
    });
  };

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
          onClick={() => setActiveTab("reviewed")}
          className={cn(
            "pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer",
            activeTab === "reviewed" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Reviewed Profiles ({reviewedList.length})
        </button>
      </div>

      {/* Sellers List */}
      <div className="space-y-6">
        {currentList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No seller applications in this section.</p>
          </div>
        ) : (
          currentList.map((seller: SellerProfile) => (
            <div 
              key={seller.id} 
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 flex flex-col lg:flex-row gap-6 justify-between items-start"
            >
              {/* Profile Details */}
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-800">{seller.businessName}</h3>
                  <span className={cn(
                    "inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                    seller.verificationStatus === "approved" 
                      ? "bg-green-100 text-green-700" 
                      : seller.verificationStatus === "rejected" 
                        ? "bg-red-100 text-red-700" 
                        : "bg-blue-100 text-blue-700"
                  )}>
                    {seller.verificationStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-650">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Owner: <strong>{seller.ownerName}</strong> ({seller.ownerEmail})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>GSTIN: <strong>{seller.gstNumber}</strong></span>
                  </div>
                  {seller.drugLicenseNumber && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Drug License: <strong>{seller.drugLicenseNumber}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="truncate">Address: {seller.address}</span>
                  </div>
                </div>

                {/* Uploaded Documents List */}
                {seller.documents && seller.documents.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Submitted verification files:</p>
                    <div className="flex flex-wrap gap-3">
                      {seller.documents.map((doc: any) => (
                        <button 
                          key={doc.id}
                          onClick={() => {
                            setPreviewUrl(doc.documentUrl);
                            setPreviewTitle(doc.documentType);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-indigo-500 rounded-lg text-xs font-semibold text-slate-655 hover:text-indigo-650 bg-slate-50 hover:bg-white shadow-sm transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="capitalize">{doc.documentType.replace("_", " ")}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Note Display */}
                {seller.verificationStatus === "rejected" && seller.rejectionReason && (
                  <div className="p-4 bg-red-50/50 border border-red-150/60 rounded-xl text-xs text-red-700 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <span className="font-bold">Rejection Reason:</span> {seller.rejectionReason}
                    </div>
                  </div>
                )}
              </div>

              {/* Review Buttons */}
              {seller.verificationStatus === "pending" && (
                <div className="flex flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
                  <button
                    onClick={() => handleReview(seller.id, "approved")}
                    disabled={isPending}
                    className="flex-1 lg:w-36 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProfileId(seller.id);
                      setShowRejectDialog(true);
                    }}
                    disabled={isPending}
                    className="flex-1 lg:w-36 flex items-center justify-center gap-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-700 text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject Application
                  </button>
                </div>
              )}

              {/* Suspend/Re-approve controls for reviewed profiles */}
              {seller.verificationStatus !== "pending" && (
                <div className="flex flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
                  {seller.verificationStatus === "approved" ? (
                    <button
                      onClick={() => {
                        setSelectedProfileId(seller.id);
                        setRejectionReason("");
                        setShowRejectDialog(true);
                      }}
                      disabled={isPending}
                      className="flex-1 lg:w-36 flex items-center justify-center gap-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-650 hover:text-red-750 text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm cursor-pointer animate-fade-in"
                    >
                      <X className="w-3.5 h-3.5" />
                      Suspend Seller
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReview(seller.id, "approved")}
                      disabled={isPending}
                      className="flex-1 lg:w-36 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer animate-fade-in"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve Vendor
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rejection/Suspension Reason Modal */}
      {showRejectDialog && (() => {
        const selectedSeller = sellers.find(s => s.id === selectedProfileId);
        const isSuspending = selectedSeller?.verificationStatus === "approved";

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  {isSuspending ? "Suspend Seller Account" : "Reject Seller Application"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSuspending 
                    ? "Provide a reason for suspending this vendor. Their products will be hidden and trading will be blocked."
                    : "Please provide a reason. This will be shown to the seller so they can resolve the issues."}
                </p>
              </div>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-3 text-sm text-slate-800 outline-none transition-all resize-none"
                placeholder={isSuspending 
                  ? "e.g., Seller has breached platform trading terms or loaded duplicate products."
                  : "e.g., GST Certificate file uploaded is blurry and unreadable. Please upload a clear digital copy."}
                required
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason("");
                    setSelectedProfileId(null);
                  }}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-650 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedProfileId) {
                      handleReview(selectedProfileId, "rejected", rejectionReason);
                    }
                  }}
                  disabled={!rejectionReason.trim() || isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
                >
                  {isSuspending ? "Suspend Account" : "Reject Profile"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PDF Inline Document Viewer Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-650" />
                <h4 className="font-bold text-slate-800 capitalize">
                  {previewTitle.replace("_", " ")} Preview
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-250 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg text-xs font-semibold transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setPreviewTitle("");
                  }}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-850 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* PDF iframe viewer */}
            <div className="flex-1 bg-slate-850 p-2 relative h-full">
              <iframe
                src={`${previewUrl}#toolbar=1`}
                className="w-full h-full rounded-lg border-0 bg-slate-800"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
