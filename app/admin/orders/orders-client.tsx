"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { updateOrderStatus } from "@/actions/orders";
import { getOrderItems } from "@/actions/queries";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User, 
  FileText, 
  Loader2,
  Calendar,
  AlertCircle,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/decimal";

interface Order {
  id: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  totalAmount: string;
  createdAt: Date | string;
  quotationId: string | null;
  buyerName: string;
  buyerEmail: string;
}

interface OrderItem {
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
  initialOrders: Order[];
}

export function AdminOrdersClient({ initialOrders }: Props) {
  const [ordersList, setOrdersList] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    try {
      const items = await getOrderItems(order.id);
      setSelectedOrderItems(items as any);
    } catch (err) {
      toast.error("Failed to load order item details");
    } finally {
      setLoadingItems(false);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order["status"]) => {
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.success) {
        toast.success(res.message);
        setOrdersList(prev => prev.map(o => {
          if (o.id === orderId) {
            return { ...o, status: newStatus };
          }
          return o;
        }));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Orders List Panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">All Procurement Orders</h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
              Count: {ordersList.length}
            </span>
          </div>

          {ordersList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No orders recorded in the system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Order Details</th>
                    <th className="px-6 py-3">Buyer info</th>
                    <th className="px-6 py-3">Total bill</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {ordersList.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => handleSelectOrder(order)}
                      className={cn(
                        "hover:bg-slate-50/50 cursor-pointer transition-colors",
                        selectedOrder?.id === order.id ? "bg-indigo-50/30" : ""
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-indigo-600 truncate max-w-[120px]" title={order.id}>
                          #{order.id.slice(0, 8)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{order.buyerName}</div>
                        <div className="text-[10px] text-slate-450">{order.buyerEmail}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {formatINR(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                          order.status === "delivered" 
                            ? "bg-green-100 text-green-700" 
                            : order.status === "cancelled" 
                              ? "bg-red-100 text-red-700" 
                              : order.status === "pending" 
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                        )}>
                          {order.status}
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

      {/* Selected Order Detail Sidebar Panel */}
      <div className="space-y-4">
        {selectedOrder ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 sticky top-24">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Order Details</h4>
                <p className="font-mono text-[10px] text-indigo-600 mt-0.5">#{selectedOrder.id}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{new Date(selectedOrder.createdAt).toLocaleTimeString("en-IN")}</span>
            </div>

            {/* Buyer Details */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Buyer Customer Info</p>
              <div className="bg-slate-55/40 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedOrder.buyerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedOrder.buyerEmail}</span>
                </div>
                {selectedOrder.quotationId && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[10px] text-indigo-600 font-mono font-bold">
                    <span>Source Quote: {selectedOrder.quotationId.slice(0, 8)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Status Actions */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Update Tracking Status</label>
              <div className="relative">
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as any)}
                  disabled={isPending || selectedOrder.status === "delivered" || selectedOrder.status === "cancelled"}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg py-2.5 px-3 text-xs text-slate-700 outline-none transition-all cursor-pointer font-semibold uppercase"
                >
                  <option value="pending">Pending Checkout</option>
                  <option value="confirmed">Order Confirmed</option>
                  <option value="processing">Manufacturing/Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered Successfully</option>
                  <option value="cancelled">Cancel Order (restock)</option>
                </select>
                {isPending && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-slate-400" />}
              </div>
              
              {selectedOrder.status === "delivered" && (
                <p className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                  ✓ Order is finalized and delivered. Stocks are settled.
                </p>
              )}
              {selectedOrder.status === "cancelled" && (
                <p className="text-[10px] text-red-650 font-semibold flex items-center gap-1">
                  ✕ Order has been cancelled. Inventory returned to ledger.
                </p>
              )}
            </div>

            {/* Order Items Snapshot */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Purchased Items Snapshot</p>
              {loadingItems ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className="space-y-3 divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                  {selectedOrderItems.map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 space-y-1.5 text-xs text-slate-700">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{item.productName}</span>
                        <span>{formatINR(item.totalPrice)}</span>
                      </div>
                      <div className="text-[10px] text-slate-450 font-mono">SKU: {item.sku}</div>
                      
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
              <span className="text-xs font-bold text-slate-650">Grand Total:</span>
              <span className="text-lg font-black text-slate-900">{formatINR(selectedOrder.totalAmount)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-405 h-80 flex flex-col items-center justify-center">
            <AlertCircle className="w-8 h-8 text-slate-350 mb-2" />
            <p className="text-sm font-medium">Select an order on the left to review invoice detail summaries.</p>
          </div>
        )}
      </div>
    </div>
  );
}
