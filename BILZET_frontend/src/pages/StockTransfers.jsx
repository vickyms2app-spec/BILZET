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
    <div className="space-y-6 max-w-7xl mx-auto fade-up text-[#111318]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F6F6F8] p-5 rounded-[24px] border border-[#E7E8EC] shadow-fintech">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-xs">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#111318] tracking-tight">
                Stock Transfers
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 uppercase tracking-wider flex items-center gap-1">
                <Building2 size={11} />
                <span>{activeStoreName}</span>
              </span>
            </div>
            <p className="text-xs text-[#7C7F8A] mt-0.5">
              Transfer stock between your godowns and track transfer history.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg("");
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#12151C] hover:bg-black text-white transition cursor-pointer shadow-fintech self-start sm:self-auto"
        >
          <Plus size={14} className="text-[#5BF07B]" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      {/* ── Notifications ── */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D] text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="text-[#E5484D] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Search Bar & Filter ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F6F6F8] p-4 rounded-[24px] border border-[#E7E8EC] shadow-fintech">
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search transfers, products or godowns..."
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs text-[#7C7F8A] font-medium">
            Total Transfers: <strong className="text-[#111318] font-bold">{filteredTransfers.length}</strong>
          </span>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Refresh transfer history"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] hover:bg-[#EDEDEF] text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#111318]" : "text-[#7C7F8A]"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Transfer Records View ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#7C7F8A]">
          <RefreshCw size={24} className="animate-spin text-[#12151C]" />
          <p className="text-xs font-medium">Loading stock transfer records…</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="p-12 text-center bg-[#F6F6F8] rounded-[24px] border border-dashed border-[#E7E8EC]">
          <div className="w-12 h-12 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ArrowRightLeft size={20} />
          </div>
          <h3 className="text-sm font-bold text-[#111318]">No stock transfers recorded yet</h3>
          <p className="text-xs text-[#7C7F8A] mt-1 max-w-sm mx-auto">
            Easily move inventory items between different godown locations with atomic balance validation.
          </p>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#12151C] hover:bg-black text-white transition cursor-pointer shadow-fintech"
            >
              <Plus size={14} className="text-[#5BF07B]" />
              <span>Create First Transfer</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] shadow-fintech overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E7E8EC] bg-[#FAFAFB] text-[11px] font-bold text-[#7C7F8A] uppercase tracking-wider">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Source Godown</th>
                  <th className="py-3 px-4">Destination Godown</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E8EC] text-xs bg-white">
                {filteredTransfers.map((t) => (
                  <tr key={t.id || t._id} className="hover:bg-[#EDEDEF]/60 transition">
                    <td className="py-3 px-4 font-mono text-[#7C7F8A] text-[11px]">
                      {new Date(t.createdAt || Date.now()).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#111318]">
                      {t.product?.name || "Product"}
                    </td>
                    <td className="py-3 px-4 text-[#7C7F8A]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAFAFB] border border-[#E7E8EC] font-semibold text-[11px] text-[#111318]">
                        <Building2 size={11} className="text-[#7C7F8A]" />
                        <span>{t.fromWarehouse?.name || "Godown"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#7C7F8A]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 font-semibold text-[11px]">
                        <Building2 size={11} className="text-[#0E2A16]" />
                        <span>{t.toWarehouse?.name || "Godown"}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#111318]">
                      {t.quantity} {t.product?.unit || "pcs"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E2A16] bg-[#DFFFE6] border border-[#5BF07B]/40 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={12} className="text-[#0E2A16]" />
                        <span>Completed</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#7C7F8A] text-[11px] max-w-xs truncate">
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
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-[#F6F6F8] w-full max-w-md rounded-[24px] shadow-fintech border border-[#E7E8EC] overflow-hidden fade-up p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E8EC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111318]">New Stock Transfer</h3>
                  <p className="text-[11px] text-[#7C7F8A]">Atomically move stock between godowns</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#7C7F8A] hover:text-[#111318] p-1.5 rounded-xl hover:bg-[#EDEDEF] transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111318] mb-1">Source Godown *</label>
                  <select
                    required
                    value={form.sourceWarehouseId}
                    onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318] font-medium"
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
                  <label className="block font-semibold text-[#111318] mb-1">Destination Godown *</label>
                  <select
                    required
                    value={form.destinationWarehouseId}
                    onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318] font-medium"
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
                <label className="block font-semibold text-[#111318] mb-1">Product Item *</label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318] font-medium"
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
                <label className="block font-semibold text-[#111318] mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111318] mb-1">Transfer Reference / Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Inter-branch replenishment, shelf restock"
                  className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 text-[#111318]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E7E8EC]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] hover:bg-[#EDEDEF] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#12151C] hover:bg-black text-white text-xs font-semibold shadow-fintech transition cursor-pointer disabled:opacity-50"
                >
                  <ArrowRightLeft size={13} className="text-[#5BF07B]" />
                  <span>{submitting ? "Transferring..." : "Confirm & Transfer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
