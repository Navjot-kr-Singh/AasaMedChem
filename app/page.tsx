import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { 
  ShieldCheck, 
  Scale, 
  History, 
  TrendingUp, 
  ArrowRight,
  Database,
  Calculator,
  Layers
} from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  
  if (session?.user) {
    const role = (session.user as any).role;
    if (role === "admin") {
      redirect("/admin/dashboard");
    } else if (role === "seller") {
      redirect("/seller/dashboard");
    } else if (role === "buyer") {
      redirect("/buyer/dashboard");
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200">
              A
            </div>
            <span className="font-bold text-slate-800 text-lg tracking-tight">AasaMedChem</span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm px-4 py-2 rounded-lg transition-all"
            >
              Register Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-700 mb-6">
            <ShieldCheck className="w-4 h-4" />
            Regulated B2B Pharmaceutical Marketplace
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
            Precision-Safe Pharma <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Inventory & Quotation</span> Management
          </h1>
          
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Audit-safe chemical procurement with 10-decimal precision, unified base-unit conversion engines, and concurrency-locked inventory ledgers. Fully compliant workflow control for sellers, buyers, and administrators.
          </p>

          <div className="flex justify-center gap-4">
            <Link 
              href="/register" 
              className="flex items-center gap-2 text-base font-semibold text-white bg-slate-900 hover:bg-slate-850 px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all group"
            >
              Get Started 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/login" 
              className="text-base font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 px-6 py-3 rounded-lg shadow-sm transition-all"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 bg-white border-t border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Engineered for Pharmaceutical Integrity</h2>
              <p className="text-sm text-slate-500">Every database state change is locked, audited, and formatted to support rigorous pharmaceutical supply-chain checks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <Calculator className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">10-Decimal Scale Precision</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Bypasses JavaScript floating point limits using <code className="text-indigo-600 font-mono text-xs">decimal.js</code>. Safely handles microgram active ingredients up to metric tons under PostgreSQL <code className="font-mono text-xs">NUMERIC(30,10)</code>.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Concurrency-Locked Ledger</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Avoids race-condition overselling. Runs transactions with database row-level locking (<code className="font-mono text-xs">SELECT FOR UPDATE</code>) and records all adjustments in a transaction history ledger.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-xl hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <History className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Quotation Reservation</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Approved quotation items automatically reserve inventory, preventing conflict double-booking. When quote expires or orders convert, reserved stock resolves seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Business Model Section */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Compliance Workflow</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mt-2 mb-6">
                Three Role Boundaries, One Secure Ecosystem
              </h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Verified Seller Onboarding</h4>
                    <p className="text-sm text-slate-500 mt-1">Sellers register and upload official GST Certificates, Drug Licenses, and PAN Cards. Platform access is restricted under a "Pending" block until Admin approves.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Traceable B2B Quotations</h4>
                    <p className="text-sm text-slate-500 mt-1">Buyers browse approved items, submit quotes with selected custom units, calculate prices live, and convert quotes directly to orders with trace audits preserved.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">Administrative Audit Trail</h4>
                    <p className="text-sm text-slate-500 mt-1">Full activity logs log every sign-up, document upload, status check, product verification, quotation reservation, and manual stock adjustment.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-900 text-slate-100 rounded-2xl shadow-xl flex flex-col justify-between h-96 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -z-0"></div>
              
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">INR standard formatting</span>
                <h3 className="text-2xl font-bold mt-1 mb-4">Centralized Financial Auditing</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Pricing and total values snapshot inside order and quotation tables at the moment of negotiation. Even if product base prices change, historical records remain completely untouched.
                </p>
                
                <div className="space-y-2 font-mono text-xs bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-indigo-400">// Conversion Audit Snapshot</p>
                  <p><span className="text-slate-400">Entered:</span> 2.5 kg</p>
                  <p><span className="text-slate-400">Converted base unit:</span> 2500 g</p>
                  <p><span className="text-slate-400">Base Unit price:</span> ₹50.00 / g</p>
                  <p className="text-green-400 font-semibold"><span className="text-slate-400">Calculated Total:</span> ₹1,25,000.00</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-850">
                <span>Database Standard: Numeric(30,10)</span>
                <span>Currency Code: INR</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        <p>© 2026 AasaMedChem. Built with Next.js 15, Drizzle ORM, Neon PostgreSQL, and Vercel Blob Storage.</p>
      </footer>
    </div>
  );
}
