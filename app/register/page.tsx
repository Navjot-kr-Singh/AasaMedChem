"use strict";

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/actions/auth";
import { 
  User, 
  Building2, 
  Mail, 
  Lock, 
  FileText, 
  MapPin, 
  Loader2, 
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  
  // General fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Seller specific fields
  const [businessName, setBusinessName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [drugLicense, setDrugLicense] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password) {
      setError("Please fill out all general fields.");
      return;
    }

    if (role === 'seller' && (!businessName || !gstNumber || !address)) {
      setError("Please fill out all business details for seller registration.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);

    if (role === 'seller') {
      formData.append("businessName", businessName);
      formData.append("gstNumber", gstNumber);
      formData.append("drugLicenseNumber", drugLicense);
      formData.append("address", address);
    }

    try {
      const res = await registerUser(formData);
      setLoading(false);

      if (!res.success) {
        setError(res.message);
      } else {
        setSuccess(res.message);
        // Reset form
        setName("");
        setEmail("");
        setPassword("");
        setBusinessName("");
        setGstNumber("");
        setDrugLicense("");
        setAddress("");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: any) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center py-12 px-4 font-sans">
      <div className="max-w-xl w-full">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-200 mb-3">
            A
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create Your Account</h2>
          <p className="text-sm text-slate-500 mt-1">Join the AasaMedChem B2B marketplace</p>
        </div>

        {/* Card Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          {/* Role selector tab */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => { setRole('buyer'); setError(""); }}
              className={`flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                role === 'buyer' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              <User className="w-4 h-4" />
              Buyer Portal
            </button>
            <button
              type="button"
              onClick={() => { setRole('seller'); setError(""); }}
              className={`flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                role === 'seller' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Seller Portal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 flex items-start gap-2.5">
                <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* General Info header */}
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-850">Personal Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition-all"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition-all"
                    placeholder="john@company.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition-all"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {/* Seller profile fields */}
            {role === 'seller' && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-850">Business Credentials</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      Registered Business Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition-all"
                        placeholder="Alpha Pharma Ltd"
                        required={role === 'seller'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                      GSTIN (GST Number)
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition-all"
                        placeholder="22AAAAA0000A1Z5"
                        required={role === 'seller'}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Drug License Number <span className="text-slate-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      value={drugLicense}
                      onChange={(e) => setDrugLicense(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition-all"
                      placeholder="DL-12345/67"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                    Business Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-4.5 h-4.5 text-slate-400" />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 outline-none transition-all resize-none"
                      placeholder="Complete chemical manufacturing unit or office address"
                      required={role === 'seller'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Onboarding...</span>
                </>
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
