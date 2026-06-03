import React from "react";
import { db } from "@/db";
import { users, sellerProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { 
  Users, 
  Building2, 
  Mail, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

export const revalidate = 0;

export default async function AdminUsersPage() {
  // Query all users
  const userList = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    // Join seller profiles
    businessName: sellerProfiles.businessName,
    verificationStatus: sellerProfiles.verificationStatus
  })
  .from(users)
  .leftJoin(sellerProfiles, eq(users.id, sellerProfiles.userId))
  .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">User Directory</h2>
          <p className="text-sm text-slate-500 mt-1">Manage platform users, roles, and connected profiles.</p>
        </div>
        <div className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          Total Registers: {userList.length}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">All Accounts</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3">User Details</th>
                <th className="px-6 py-3">Platform Role</th>
                <th className="px-6 py-3">Seller Business Info</th>
                <th className="px-6 py-3">Vetting Status</th>
                <th className="px-6 py-3">Created On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {userList.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{user.name}</div>
                    <div className="text-[10px] text-slate-450 mt-0.5 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                      user.role === "admin" 
                        ? "bg-purple-100 text-purple-700" 
                        : user.role === "seller" 
                          ? "bg-amber-100 text-amber-700" 
                          : "bg-emerald-100 text-emerald-700"
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "seller" && user.businessName ? (
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        {user.businessName}
                      </div>
                    ) : (
                      <span className="text-slate-400">N/A (Buyer Account)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "seller" ? (
                      <span className={cn(
                        "inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        user.verificationStatus === "approved" 
                          ? "bg-green-100 text-green-700" 
                          : user.verificationStatus === "rejected" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-blue-100 text-blue-700"
                      )}>
                        {user.verificationStatus}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                        exempt
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-450 font-medium">
                    {new Date(user.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
