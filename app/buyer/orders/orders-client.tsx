"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { updateOrderStatus } from "@/actions/orders";
import { getOrderItems } from "@/actions/queries";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  ChevronRight, 
  Info,
  Loader2,
  Calendar,
  XCircle,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/decimal";

interface Order {
  id: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  totalAmount: string;
  createdAt: Date | string;
  quotationId: string | null;
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

export function BuyerOrdersClient({ initialOrders }: Props) {
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

  const handleCancelOrder = (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? This will release reserved stock back into active inventory.")) return;

    startTransition(async () => {
      const res = await updateOrderStatus(orderId, "cancelled");
      if (res.success) {
        toast.success(res.message);
        setOrdersList(prev => prev.map(o => {
          if (o.id === orderId) {
            return { ...o, status: "cancelled" };
          }
          return o;
        }));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: "cancelled" } : null);
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
              <h3 className="text-sm font-bold text-slate-855 uppercase tracking-wider">My Procurement Orders</h3>
            </div>
            <span className="text-xs font-bold text-slate-550 bg-slate-50 px-2.5 py-1 rounded-lg">
              Count: {ordersList.length}
            </span>
          </div>

          {ordersList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">You haven't placed any orders yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Purchase Date</th>
                    <th className="px-6 py-3">Grand Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                  {ordersList.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => handleSelectOrder(order)}
                      className={cn(
                        "hover:bg-slate-50/50 cursor-pointer transition-colors",
                        selectedOrder?.id === order.id ? "bg-indigo-50/30" : ""
                      )}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-slate-450 font-medium">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
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

      {/* Selected Order detail panel */}
      <div className="space-y-4">
        {selectedOrder ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 sticky top-24">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Order details</h4>
                <p className="font-mono text-[10px] text-indigo-600 mt-0.5">#{selectedOrder.id}</p>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{new Date(selectedOrder.createdAt).toLocaleTimeString("en-IN")}</span>
            </div>

            {/* Tracking Status Detail */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Tracking Status</p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Current Tracking State:</span>
                  <span className={cn(
                    "text-[10px] font-extrabold uppercase",
                    selectedOrder.status === "delivered" ? "text-green-600" : selectedOrder.status === "cancelled" ? "text-red-650" : "text-amber-600"
                  )}>
                    {selectedOrder.status}
                  </span>
                </div>
                
                {selectedOrder.status === "pending" && (
                  <div className="pt-2 border-t border-slate-200/50 space-y-2">
                    <p className="text-[10px] text-slate-500">Order is pending checkout validation. You can cancel this order before fulfillment begins.</p>
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-1 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-655 hover:text-red-750 text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer"
                    >
                      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Cancel Order & Restock
                    </button>
                  </div>
                )}

                {selectedOrder.status === "confirmed" && (
                  <p className="text-[10px] text-indigo-600 font-semibold pt-1">
                    ✓ Order confirmed by vendor. Inventory has been debited.
                  </p>
                )}

                {selectedOrder.status === "processing" && (
                  <p className="text-[10px] text-indigo-600 font-semibold pt-1">
                    ✓ Batch packaging and chemical purity checks active.
                  </p>
                )}

                {selectedOrder.status === "shipped" && (
                  <p className="text-[10px] text-indigo-600 font-semibold pt-1">
                    ✓ Consignment dispatched. Tracking code will resolve.
                  </p>
                )}

                {selectedOrder.status === "delivered" && (
                  <p className="text-[10px] text-green-600 font-semibold pt-1">
                    ✓ Shipment received successfully. Invoice closed.
                  </p>
                )}

                {selectedOrder.status === "cancelled" && (
                  <p className="text-[10px] text-red-600 font-semibold pt-1">
                    ✕ Procurement cancelled. Concurrency stocks returned.
                  </p>
                )}
              </div>
            </div>

            {/* Order Items snapshot */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Purchased items</p>
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
              <span className="text-xs font-bold text-slate-655">Grand Total:</span>
              <span className="text-lg font-black text-slate-900">{formatINR(selectedOrder.totalAmount)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-405 h-80 flex flex-col items-center justify-center">
            <AlertCircle className="w-8 h-8 text-slate-350 mb-2" />
            <p className="text-sm font-medium">Select an order on the left to review details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
