import { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  X,
  Search,
  Plus,
  Minus,
  Equal,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { productsApi, inventoryApi } from "../../api";

export default function StockAdjustmentModal({ isOpen, onClose, onSuccess, initialProductId }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");

  const [mode, setMode] = useState("ADD"); // "ADD" | "REDUCE" | "SET"
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("Stock Audit / Physical Count");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setQuantity("1");
      setNotes("");
      setMode("ADD");
      setReason("Stock Audit / Physical Count");

      setLoadingProducts(true);
      productsApi
        .list({ limit: 100 })
        .then((res) => {
          const list = res?.products || [];
          setProducts(list);
          if (initialProductId) {
            const found = list.find((p) => (p.id || p._id) === initialProductId);
            if (found) setSelectedProduct(found);
          } else if (list.length > 0 && !selectedProduct) {
            setSelectedProduct(list[0]);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingProducts(false));
    }
  }, [isOpen, initialProductId]);

  const currentStock = Number(selectedProduct?.stock ?? selectedProduct?.stockQuantity ?? 0);
  const parsedQty = Math.max(0, Number(quantity) || 0);

  const newStock = useMemo(() => {
    if (mode === "ADD") return currentStock + parsedQty;
    if (mode === "REDUCE") return Math.max(0, currentStock - parsedQty);
    if (mode === "SET") return parsedQty;
    return currentStock;
  }, [currentStock, mode, parsedQty]);

  const netDelta = useMemo(() => {
    return newStock - currentStock;
  }, [newStock, currentStock]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.includes(q)
    );
  }, [products, search]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError("Please select an item to adjust.");
      return;
    }
    if (parsedQty <= 0 && mode !== "SET") {
      setError("Please specify a quantity greater than zero.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        productId: selectedProduct.id || selectedProduct._id,
        type: mode,
        quantity: parsedQty,
        newStock,
        reason: `${reason}${notes ? ` - ${notes}` : ""}`,
      };

      await inventoryApi.adjust(payload);
      window.dispatchEvent(new CustomEvent("bilzet:inventory-changed"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to adjust stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Quick Stock Adjustment</h3>
              <p className="text-xs text-slate-400">Correct inventory quantities and log audit trail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Product <span className="text-rose-500">*</span>
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, SKU or barcode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/30">
              {loadingProducts ? (
                <p className="text-xs text-slate-400 text-center py-4">Loading catalog…</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No matching products found.</p>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected =
                    (selectedProduct?.id || selectedProduct?._id) === (p.id || p._id);
                  const pStock = Number(p.stock ?? p.stockQuantity ?? 0);
                  return (
                    <div
                      key={p.id || p._id}
                      onClick={() => setSelectedProduct(p)}
                      className={`px-3 py-2 flex items-center justify-between cursor-pointer transition text-xs select-none ${
                        isSelected
                          ? "bg-blue-50/80 border-l-4 border-l-blue-600 font-semibold"
                          : "hover:bg-slate-100/60"
                      }`}
                    >
                      <div>
                        <div className="text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.sku || p.barcode || "No SKU"}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            pStock <= 5
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {pStock} in stock
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Adjustment Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("ADD")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "ADD"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stock (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("REDUCE")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "REDUCE"
                    ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Reduce (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("SET")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === "SET"
                    ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Equal className="w-3.5 h-3.5" />
                <span>Set Exact (=)</span>
              </button>
            </div>
          </div>

          {/* Quantity Input & Real-Time Calculation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  {mode === "SET" ? "Exact Count Quantity" : "Adjustment Quantity"}
                </label>
                <span className="text-[11px] text-slate-400">
                  {mode === "ADD"
                    ? "Units to receive / add"
                    : mode === "REDUCE"
                    ? "Units damaged / removed"
                    : "Exact physical stock counted"}
                </span>
              </div>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-24 px-3 py-1.5 text-base font-bold text-right bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Impact Preview */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Current: <strong>{currentStock}</strong></span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">New Level:</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-xs">
                  {newStock}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    netDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  ({netDelta >= 0 ? `+${netDelta}` : netDelta})
                </span>
              </div>
            </div>
          </div>

          {/* Reason & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjustment Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Stock Audit / Physical Count">Stock Audit / Physical Count</option>
              <option value="Damaged / Broken in Store">Damaged / Broken in Store</option>
              <option value="Expired Goods Removal">Expired Goods Removal</option>
              <option value="Customer Return Restock">Customer Return Restock</option>
              <option value="Loss / Theft Adjustment">Loss / Theft Adjustment</option>
              <option value="Internal Store Consumption">Internal Store Consumption</option>
              <option value="Other">Other Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Shelf recount by cashier on shift close"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Boxes className="w-4 h-4" />
              <span>{submitting ? "Updating…" : "Apply Adjustment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
