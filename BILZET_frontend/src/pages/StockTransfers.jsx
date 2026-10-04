import { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  Building2,
  Boxes,
  RefreshCw,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import { warehousesApi, productsApi } from "../api";

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Transfer Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [form, setForm] = useState({
    sourceWarehouseId: "",
    destinationWarehouseId: "",
    productId: "",
    quantity: 1,
    notes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [whRes, trRes, prodRes] = await Promise.all([
        warehousesApi.list(),
        warehousesApi.transfers(),
        productsApi.list({ limit: 100 }),
      ]);
      setWarehouses(whRes?.warehouses || []);
      setTransfers(trRes?.transfers || []);
      const pList = prodRes?.data?.products || prodRes?.products || [];
      setProducts(pList);
    } catch (err) {
      console.error("Failed to load transfer data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.sourceWarehouseId) {
      setErrorMsg("Please select a Source Godown.");
      return;
    }
    if (!form.destinationWarehouseId) {
      setErrorMsg("Please select a Destination Godown.");
      return;
    }
    if (form.sourceWarehouseId === form.destinationWarehouseId) {
      setErrorMsg("Source and Destination Godowns must be different.");
      return;
    }
    if (!form.productId) {
      setErrorMsg("Please select a product to transfer.");
      return;
    }
    if (Number(form.quantity) <= 0) {
      setErrorMsg("Transfer quantity must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await warehousesApi.transfer({
        ...form,
        fromWarehouseId: form.sourceWarehouseId,
        toWarehouseId: form.destinationWarehouseId,
      });
      setSuccessMsg("Stock transferred atomically across godowns!");
      setShowModal(false);
      setForm({
        sourceWarehouseId: "",
        destinationWarehouseId: "",
        productId: "",
        quantity: 1,
        notes: "",
      });
      loadData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || "Failed to transfer stock");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    const q = search.toLowerCase();
    const prodName = t.product?.name?.toLowerCase() || "";
    const fromName = t.fromWarehouse?.name?.toLowerCase() || "";
    const toName = t.toWarehouse?.name?.toLowerCase() || "";
    const notes = t.notes?.toLowerCase() || "";

    const matchesSearch =
      !search ||
      prodName.includes(q) ||
      fromName.includes(q) ||
      toName.includes(q) ||
      notes.includes(q);

    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <ArrowRightLeft size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Stock Transfers
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Transfer stock between your godowns and track transfer history.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs self-start sm:self-center"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>New Stock Transfer</span>
        </button>
      </div>

      {/* ── Notifications ── */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Search Bar & Filter ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer records, products or godowns..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-slate-500 font-medium">
            Total Transfers: <strong className="text-slate-800">{filteredTransfers.length}</strong>
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh transfer history"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* ── Transfer Records View ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-blue-600" />
          <p className="text-xs text-slate-500">Loading stock transfer records…</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <ArrowRightLeft size={20} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No stock transfers recorded yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Easily move inventory items between different godown locations with atomic balance validation.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <Plus size={14} />
            <span>Create First Transfer</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Source Godown</th>
                  <th className="py-3 px-4">Destination Godown</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransfers.map((t) => (
                  <tr key={t.id || t._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {new Date(t.createdAt || Date.now()).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {t.product?.name || "Product"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-medium text-[11px]">
                        <Building2 size={11} className="text-amber-600" />
                        <span>{t.fromWarehouse?.name || "Godown"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium text-[11px]">
                        <Building2 size={11} className="text-emerald-600" />
                        <span>{t.toWarehouse?.name || "Godown"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {t.quantity} {t.product?.unit || "pcs"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {t.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── New Stock Transfer Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden fade-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">New Stock Transfer</h3>
                  <p className="text-[11px] text-slate-500">Atomically move stock between godowns</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Source Godown *
                  </label>
                  <select
                    required
                    value={form.sourceWarehouseId}
                    onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="">Select Origin...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Destination Godown *
                  </label>
                  <select
                    required
                    value={form.destinationWarehouseId}
                    onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  >
                    <option value="">Select Destination...</option>
                    {warehouses
                      .filter((w) => w.id !== form.sourceWarehouseId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.code ? `(${w.code})` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Product Item *
                </label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="">Select Product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock ?? p.currentStock ?? 0} {p.unit || "pcs"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Quantity to Transfer *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Transfer Reference / Notes
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Inter-branch replenishment, shelf restock"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Processing Transfer..." : "Confirm & Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
