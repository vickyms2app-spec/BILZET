import { useState, useEffect } from "react";
import {
  ArrowRightLeft,
  Plus,
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
import { apiError } from "../api/http";
import SearchBar from "../components/common/SearchBar";
import Button, { CompactIconButton } from "../components/common/Button";

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Active Store Display
  const [activeStoreName, setActiveStoreName] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
      return stored?.name || stored?.shopName || "Default Store";
    } catch (_) {
      return "Default Store";
    }
  });

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

    const handleSync = () => {
      loadData();
      try {
        const stored = JSON.parse(localStorage.getItem("bilzet_active_store") || "null");
        if (stored?.name || stored?.shopName) {
          setActiveStoreName(stored.name || stored.shopName);
        }
      } catch (_) {}
    };

    window.addEventListener("bilzet:store-changed", handleSync);
    window.addEventListener("bilzet:inventory-changed", handleSync);
    window.addEventListener("bilzet:products-changed", handleSync);
    return () => {
      window.removeEventListener("bilzet:store-changed", handleSync);
      window.removeEventListener("bilzet:inventory-changed", handleSync);
      window.removeEventListener("bilzet:products-changed", handleSync);
    };
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
      window.dispatchEvent(new CustomEvent("bilzet:inventory-changed"));
      loadData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(apiError(err));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <ArrowRightLeft size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="page-title">
                Stock Transfers
              </h1>
              <span className="badge badge-info uppercase tracking-wider flex items-center gap-1">
                <Building2 size={11} />
                <span>{activeStoreName}</span>
              </span>
            </div>
            <p className="page-desc">
              Transfer stock between your godowns and track transfer history.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setErrorMsg("");
            setShowModal(true);
          }}
          className="self-start sm:self-center"
        >
          New Stock Transfer
        </Button>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search transfers, products or godowns..."
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs text-slate-500 font-medium">
            Total Transfers: <strong className="text-slate-800 font-bold">{filteredTransfers.length}</strong>
          </span>
          <CompactIconButton
            icon={RefreshCw}
            variant="neutral"
            title="Refresh transfer history"
            onClick={loadData}
            disabled={loading}
            className={loading ? "animate-spin text-blue-600" : ""}
          />
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
          <div className="mt-4 flex justify-center">
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setShowModal(true)}
            >
              Create First Transfer
            </Button>
          </div>
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
              <CompactIconButton
                icon={X}
                variant="neutral"
                onClick={() => setShowModal(false)}
                title="Close"
              />
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Source Godown *</label>
                  <select
                    required
                    value={form.sourceWarehouseId}
                    onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}
                    className="form-select font-medium"
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
                  <label className="form-label">Destination Godown *</label>
                  <select
                    required
                    value={form.destinationWarehouseId}
                    onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })}
                    className="form-select font-medium"
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
                <label className="form-label">Product Item *</label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="form-select font-medium"
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
                <label className="form-label">Quantity to Transfer *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="form-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="form-label">Transfer Reference / Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Inter-branch replenishment, shelf restock"
                  className="form-input"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="neutral"
                  icon={X}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  icon={ArrowRightLeft}
                  loading={submitting}
                  disabled={submitting}
                >
                  Confirm & Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
