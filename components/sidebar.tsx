"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Package, 
  FileText, 
  ShoppingCart, 
  LogOut, 
  Building, 
  Lock,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const user = session?.user as any;
  const role = user?.role || "buyer";
  const name = user?.name || "User";
  const email = user?.email || "";
  const verificationStatus = user?.verificationStatus || "pending";

  const adminLinks: SidebarLink[] = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "User Management", href: "/admin/users", icon: Users },
    { label: "Seller Verification", href: "/admin/verifications", icon: CheckSquare },
    { label: "Product Management", href: "/admin/products", icon: Package },
    { label: "Order Management", href: "/admin/orders", icon: ShoppingCart },
    { label: "Quotation Management", href: "/admin/quotations", icon: FileText },
  ];

  const sellerLinks: SidebarLink[] = [
    { label: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
    { label: "Manage Products", href: "/seller/products", icon: Package },
    { label: "Quotations Received", href: "/seller/quotations", icon: FileText },
    { label: "Orders Received", href: "/seller/orders", icon: ShoppingCart },
  ];

  const buyerLinks: SidebarLink[] = [
    { label: "Dashboard", href: "/buyer/dashboard", icon: LayoutDashboard },
    { label: "Product Catalog", href: "/buyer/catalog", icon: SearchIcon },
    { label: "My Quotations", href: "/buyer/quotations", icon: FileText },
    { label: "My Orders", href: "/buyer/orders", icon: ShoppingCart },
  ];

  function SearchIcon(props: any) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  }

  const links = role === "admin" ? adminLinks : role === "seller" ? sellerLinks : buyerLinks;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0 shrink-0 shadow-sm">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200">
          A
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 leading-tight">AasaMedChem</span>
          <span className="text-[10px] text-indigo-600 font-medium tracking-wider uppercase">B2B Portal</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group duration-200",
                isActive 
                  ? "bg-indigo-50 text-indigo-600" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
              <span>{link.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-600" />}
            </Link>
          );
        })}
      </nav>

      {/* User Information Summary Card */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{name}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={cn(
                "inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                role === "admin" 
                  ? "bg-purple-100 text-purple-700" 
                  : role === "seller" 
                    ? "bg-amber-100 text-amber-700" 
                    : "bg-emerald-100 text-emerald-700"
              )}>
                {role}
              </span>
              
              {role === "seller" && (
                <span className={cn(
                  "inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                  verificationStatus === "approved" 
                    ? "bg-green-100 text-green-700" 
                    : verificationStatus === "rejected" 
                      ? "bg-red-100 text-red-700" 
                      : "bg-blue-100 text-blue-700"
                )}>
                  {verificationStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 shadow-sm transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
