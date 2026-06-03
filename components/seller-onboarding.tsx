"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { uploadSellerDocument, resubmitSellerProfile } from "@/actions/seller";
import { toast } from "sonner";
import { 
  Building2, 
  FileCheck, 
  Upload, 
  CheckCircle2, 
  AlertOctagon, 
  Loader2, 
  Info,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  documentType: string;
  documentUrl: string;
}

interface Props {
  sellerProfile: {
    id: string;
    businessName: string;
    gstNumber: string;
    verificationStatus: "pending" | "approved" | "rejected";
    rejectionReason: string | null;
  };
  initialDocuments: Document[];
}

const DOCUMENT_TYPES = [
  { key: "gst_certificate", label: "GST Certificate", required: true },
  { key: "drug_license", label: "Drug License Certificate", required: false },
  { key: "pan_card", label: "PAN Card", required: true },
  { key: "business_registration", label: "Business Registration Certificate", required: true },
  { key: "other", label: "Other Supporting Documents", required: false }
];

export function SellerOnboarding({ sellerProfile, initialDocuments }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (PDF only)
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are allowed");
      return;
    }

    // Validate size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds the 20MB limit");
      return;
    }

    setUploadingType(docType);
    const formData = new FormData();
    formData.append("sellerProfileId", sellerProfile.id);
    formData.append("documentType", docType);
    formData.append("file", file);

    try {
      const res = await uploadSellerDocument(formData);
      if (res.success && res.url) {
        toast.success(res.message);
        // Add to local state (remove duplicate type if exists)
        setDocuments(prev => {
          const filtered = prev.filter(d => d.documentType !== docType);
          return [...filtered, { id: Date.now().toString(), documentType: docType, documentUrl: res.url! }];
        });
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingType(null);
    }
  };

  const handleResubmit = () => {
    startTransition(async () => {
      const res = await resubmitSellerProfile(sellerProfile.id);
      if (res.success) {
        toast.success(res.message);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    });
  };

  const hasDoc = (docType: string) => documents.some(d => d.documentType === docType);
  const getDocUrl = (docType: string) => documents.find(d => d.documentType === docType)?.documentUrl;

  const requiredUploaded = DOCUMENT_TYPES
    .filter(t => t.required)
    .every(t => hasDoc(t.key));

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-sans">
      {/* Onboarding State Header Banner */}
      <div className={cn(
        "border rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-start shadow-sm",
        sellerProfile.verificationStatus === "pending" 
          ? "bg-blue-50/50 border-blue-200 text-blue-900" 
          : "bg-red-50/50 border-red-200 text-red-900"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
          sellerProfile.verificationStatus === "pending" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
        )}>
          {sellerProfile.verificationStatus === "pending" ? <Info className="w-6 h-6" /> : <AlertOctagon className="w-6 h-6" />}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold">
            {sellerProfile.verificationStatus === "pending" 
              ? "Account Under Review" 
              : "Verification Application Rejected"}
          </h3>
          <p className="text-sm opacity-90 leading-relaxed">
            {sellerProfile.verificationStatus === "pending" 
              ? `Thank you for registering "${sellerProfile.businessName}". Our administrative compliance team is currently reviewing your uploaded credentials. You will gain platform access as soon as your profile is verified.`
              : "Your seller application could not be verified due to inconsistencies in your submitted documentation."}
          </p>

          {sellerProfile.verificationStatus === "rejected" && sellerProfile.rejectionReason && (
            <div className="bg-white/80 border border-red-200 p-4 rounded-xl text-xs text-red-800 font-medium mt-4 shadow-sm">
              <span className="font-extrabold block mb-1">Administrative Feedback:</span>
              {sellerProfile.rejectionReason}
            </div>
          )}
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
        <div>
          <h4 className="text-base font-bold text-slate-800">Verification Document Checklist</h4>
          <p className="text-xs text-slate-500 mt-0.5">Please upload official documents in PDF format. Max file size: 20MB.</p>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          {DOCUMENT_TYPES.map((docType) => {
            const uploaded = hasDoc(docType.key);
            const url = getDocUrl(docType.key);
            const isUploading = uploadingType === docType.key;

            return (
              <div key={docType.key} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-850">{docType.label}</span>
                    {docType.required && (
                      <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-100 rounded px-1.5 uppercase">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Official government copy for compliance check</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {uploaded ? (
                    <div className="flex items-center gap-2">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 transition-all shadow-sm"
                      >
                        View File
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Uploaded
                      </span>
                    </div>
                  ) : null}

                  <label className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer",
                    uploaded 
                      ? "border-slate-200 hover:border-indigo-500 hover:bg-slate-50 text-slate-600 hover:text-indigo-600 bg-white" 
                      : "border-indigo-600 hover:bg-indigo-50 text-indigo-600 bg-white"
                  )}>
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{uploaded ? "Re-upload" : "Upload File"}</span>
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, docType.key)}
                      disabled={isUploading}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resubmit Control */}
        {sellerProfile.verificationStatus === "rejected" && (
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              {requiredUploaded 
                ? "All required documents uploaded. You can now resubmit your profile."
                : "Please upload all required files before resubmitting."}
            </p>
            <button
              onClick={handleResubmit}
              disabled={!requiredUploaded || isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit Profile for Re-review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
