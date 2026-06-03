"use strict";

"use client";

import React, { useState, useTransition } from "react";
import { createProduct, updateProduct, deleteProduct } from "@/actions/products";
import { adjustStock } from "@/actions/inventory";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Sliders, 
  Loader2, 
  X,
  Boxes,
  Info,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/decimal";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  categoryId: string;
  dimensionType: "weight" | "volume" | "count";
  baseUnit: "g" | "kg" | "mL" | "L" | "item";
  inventoryQuantity: string;
  reservedQuantity: string;
  pricePerBaseUnit: string;
  productStatus: "draft" | "pending_review" | "approved" | "rejected";
  rejectionReason: string | null;
  categoryName: string;
}

interface Props {
  initialProducts: Product[];
  categories: Category[];
  sellerProfileId: string;
}

export function SellerProductsClient({ initialProducts, categories, sellerProfileId }: Props) {
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Forms state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [dimensionType, setDimensionType] = useState<"weight" | "volume" | "count">("weight");
  const [baseUnit, setBaseUnit] = useState<"g" | "kg" | "mL" | "L" | "item">("g");
  const [pricePerBaseUnit, setPricePerBaseUnit] = useState("");
  const [initialStock, setInitialStock] = useState("0");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Adjust stock state
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"stock_added" | "stock_removed" | "adjustment">("stock_added");
  const [adjustNotes, setAdjustNotes] = useState("");

  const handleOpenAdd = () => {
    setName("");
    setSku("");
    setDescription("");
    setCategoryId(categories[0]?.id || "");
    setDimensionType("weight");
    setBaseUnit("g");
    setPricePerBaseUnit("");
    setInitialStock("0");
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setSelectedProduct(p);
    setName(p.name);
    setSku(p.sku);
    setDescription(p.description);
    setCategoryId(p.categoryId);
    setPricePerBaseUnit(parseFloat(p.pricePerBaseUnit).toFixed(2));
    setShowEditModal(true);
  };

  const handleOpenAdjust = (p: Product) => {
    setSelectedProduct(p);
    setAdjustQty("");
    setAdjustType("stock_added");
    setAdjustNotes("");
    setShowAdjustModal(true);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !pricePerBaseUnit) {
      toast.error("Please fill in required fields.");
      return;
    }

    startTransition(async () => {
      const res = await createProduct({
        name,
        description,
        sku,
        categoryId,
        dimensionType,
        baseUnit,
        pricePerBaseUnit,
        inventoryQuantity: initialStock
      });

      if (res.success) {
        toast.success(res.message);
        setShowAddModal(false);
        // Reload page to fetch newly inserted product lists
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    startTransition(async () => {
      const res = await updateProduct(selectedProduct.id, {
        name,
        sku,
        description,
        categoryId,
        pricePerBaseUnit
      });

      if (res.success) {
        toast.success(res.message);
        setShowEditModal(false);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty) return;

    const change = adjustType === "stock_removed" ? `-${adjustQty}` : adjustQty;

    startTransition(async () => {
      const res = await adjustStock(
        selectedProduct.id,
        change,
        adjustType,
        "product",
        null,
        adjustNotes
      );

      if (res.success) {
        toast.success(res.message);
        setShowAdjustModal(false);
        window.location.reload();
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDeleteProduct = (productId: string) => {
    if (!confirm("Are you sure you want to delete this product listing? This soft-deletes the item from marketplace displays.")) return;

    startTransition(async () => {
      const res = await deleteProduct(productId);
      if (res.success) {
        toast.success(res.message);
        setProductsList(prev => prev.filter(p => p.id !== productId));
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleDimensionChange = (dim: typeof dimensionType) => {
    setDimensionType(dim);
    if (dim === "weight") setBaseUnit("g");
    else if (dim === "volume") setBaseUnit("mL");
    else setBaseUnit("item");
  };

  return (
    <div className="space-y-6">
      {/* Header buttons */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <span className="text-xs font-bold text-slate-500">Catalog Size: {productsList.length} items</span>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm hover:shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Chemical Product
        </button>
      </div>

      {/* Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {productsList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-350" />
            <p className="text-sm font-medium">Your catalog is currently empty. Click above to add products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Product details</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Price / base unit</th>
                  <th className="px-6 py-3">Current Stock</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {productsList.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{product.name}</div>
                      <div className="text-[10px] text-slate-450 mt-0.5 font-mono">SKU: {product.sku}</div>
                      {product.productStatus === "rejected" && product.rejectionReason && (
                        <div className="mt-2 text-red-650 bg-red-50 px-2.5 py-1.5 rounded-lg flex items-start gap-1 font-sans">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>Rejection note: {product.rejectionReason}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-650 uppercase tracking-wider">
                        {product.categoryName}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {formatINR(product.pricePerBaseUnit)} / {product.baseUnit}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">
                        {parseFloat(product.inventoryQuantity).toFixed(2).replace(/\.?0+$/, "")} {product.baseUnit}
                      </div>
                      {parseFloat(product.reservedQuantity) > 0 && (
                        <div className="text-[10px] text-indigo-500 font-bold">
                          Reserved: {parseFloat(product.reservedQuantity).toFixed(2).replace(/\.?0+$/, "")} {product.baseUnit}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        product.productStatus === "approved" 
                          ? "bg-green-100 text-green-700" 
                          : product.productStatus === "rejected" 
                            ? "bg-red-100 text-red-700" 
                            : "bg-blue-100 text-blue-700"
                      )}>
                        {product.productStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-1.5">
                      <button
                        onClick={() => handleOpenAdjust(product)}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-2 rounded-lg transition-all shadow-sm cursor-pointer flex items-center gap-1 font-bold text-xs"
                        title="Adjust Stock"
                      >
                        <Boxes className="w-4 h-4 shrink-0 text-slate-400" />
                        Stock
                      </button>
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 p-2 rounded-lg transition-all shadow-sm cursor-pointer"
                        title="Edit Info"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="bg-white hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-700 p-2 rounded-lg transition-all shadow-sm cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
              <h4 className="text-base font-bold text-slate-800">Add Chemical Product</h4>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAddProduct} className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                    placeholder="e.g., Paracetamol API"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-755">SKU Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                    placeholder="e.g., PARA-API-001"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-750">Product Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Dimension Type</label>
                  <select
                    value={dimensionType}
                    onChange={(e) => handleDimensionChange(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                  >
                    <option value="weight">WEIGHT (g/kg)</option>
                    <option value="volume">VOLUME (mL/L)</option>
                    <option value="count">COUNT (item)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Base Unit (Internal)</label>
                  <select
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all uppercase"
                  >
                    {dimensionType === "weight" && (
                      <>
                        <option value="g">gram (g)</option>
                        <option value="kg">kilogram (kg)</option>
                      </>
                    )}
                    {dimensionType === "volume" && (
                      <>
                        <option value="mL">milliliter (mL)</option>
                        <option value="L">liter (L)</option>
                      </>
                    )}
                    {dimensionType === "count" && <option value="item">item</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Price per base unit (INR)</label>
                  <input
                    type="number"
                    step="any"
                    value={pricePerBaseUnit}
                    onChange={(e) => setPricePerBaseUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                    placeholder="₹50"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Initial Inventory quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                    placeholder="1000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-750">Product Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all resize-none"
                  placeholder="Chemical specs, assay purity percentage, etc."
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save and Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
              <h4 className="text-base font-bold text-slate-800">Edit Product details</h4>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleEditProduct} className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">SKU Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-750">Product Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-750">Price per base unit (INR)</label>
                <input
                  type="number"
                  step="any"
                  value={pricePerBaseUnit}
                  onChange={(e) => setPricePerBaseUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-750">Product Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all resize-none"
                />
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 flex gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Editing core specifications triggers re-review and will queue this product back into administrative evaluation.</span>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Inventory Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
              <h4 className="text-base font-bold text-slate-800">Adjust Inventory Stock</h4>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAdjustStockSubmit} className="space-y-4 text-xs text-slate-700">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-600 space-y-1">
                <p>Product: <strong>{selectedProduct.name}</strong></p>
                <p>Current stock: <strong>{parseFloat(selectedProduct.inventoryQuantity).toFixed(2).replace(/\.?0+$/, "")} {selectedProduct.baseUnit}</strong></p>
                {parseFloat(selectedProduct.reservedQuantity) > 0 && (
                  <p>Active reservations: <strong className="text-indigo-650">{parseFloat(selectedProduct.reservedQuantity).toFixed(2).replace(/\.?0+$/, "")} {selectedProduct.baseUnit}</strong></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Adjustment Action</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all font-semibold"
                  >
                    <option value="stock_added">Stock Added (+)</option>
                    <option value="stock_removed">Stock Removed (-)</option>
                    <option value="adjustment">Audit Correction</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-750">Quantity ({selectedProduct.baseUnit})</label>
                  <input
                    type="number"
                    step="any"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all"
                    placeholder="e.g. 50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-750">Ledger Entry Audit Notes</label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition-all resize-none"
                  placeholder="e.g., Weekly stock audit discrepancy correction"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
