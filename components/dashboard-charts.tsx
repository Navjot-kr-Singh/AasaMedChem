"use strict";

"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Colors for charts
const COLORS = ["#4f46e5", "#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

interface AdminChartsProps {
  revenueData: { month: string; sales: number; orders: number }[];
}

export function AdminDashboardCharts({ revenueData }: AdminChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Trend Chart */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Revenue Analytics (INR)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip 
                formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                contentStyle={{ background: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px" }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="sales" name="Delivered Sales" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders Volume Chart */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Monthly Orders Distribution</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px" }} />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="orders" name="Total Orders placed" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface SellerChartsProps {
  categoryData: { name: string; value: number }[];
}

export function SellerDashboardCharts({ categoryData }: SellerChartsProps) {
  const isDataEmpty = categoryData.every(item => item.value === 0) || categoryData.length === 0;
  
  const displayData = isDataEmpty 
    ? [{ name: "No Inventory Registered", value: 1 }] 
    : categoryData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Pie Chart */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Inventory Value Share by Category</h3>
        <div className="h-72 w-full flex items-center justify-center">
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {displayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={isDataEmpty ? "#cbd5e1" : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => isDataEmpty ? ["--", "Empty"] : [`₹${Number(value).toLocaleString("en-IN")}`, name]}
                  contentStyle={{ background: "#ffffff", borderColor: "#e2e8f0", borderRadius: "8px" }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stock Levels Indicator */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider">Inventory Health check</h3>
          <p className="text-xs text-slate-500 mb-6">Distribution and categorization of products uploaded under this seller account.</p>
        </div>
        
        <div className="space-y-4">
          {displayData.map((item, index) => (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>{item.name}</span>
                <span>{isDataEmpty ? "0%" : `₹${Number(item.value).toLocaleString("en-IN")}`}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    backgroundColor: isDataEmpty ? "#cbd5e1" : COLORS[index % COLORS.length],
                    width: isDataEmpty ? "0%" : `${Math.min(100, (item.value / displayData.reduce((acc, curr) => acc + curr.value, 0)) * 100)}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
