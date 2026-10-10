import { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  PackageCheck,
  IndianRupee,
  RefreshCw,
  ArrowUpDown,
  X,
  Warehouse,
  History,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { inventoryApi, productsApi, warehousesApi } from "../api";
import { useAuth } from "../store/auth";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";

export default function Inventory() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "history"
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  // Adjust Stock Modal State
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

  const [formProductId, setFormProductId] = useState("");
  const [adjustType, setAdjustType] = useState("ADD"); // "ADD" or "REMOVE"
  const [adjustQty, setAdjustQty] = useState("10");
  const [reasonSelect, setReasonSelect] = useState("New Purchase");
  const [customReason, setCustomReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // Query both inventory and product catalog to guarantee 100% automatic synchronization
      const [invRes, prodRes, whRes] = await Promise.allSettled([
        inventoryApi.list({ limit: 500 }),
        productsApi.list({ limit: 500 }),
        warehousesApi.list().catch(() => ({ warehouses: [] })),
      ]);

      const invList =
        invRes.status === "fulfilled"
          ? invRes.value?.data?.inventory || invRes.value?.inventory || []
          : [];
      const prodList =
        prodRes.status === "fulfilled"
          ? prodRes.value?.products || prodRes.value?.data?.products || []
          : [];

      // Unify products by unique ID / SKU to guarantee zero duplicated records
      const map = new Map();

      // First insert products catalog
      for (const p of prodList) {
        const key = p.id || p._id || p.sku;
        if (key && (p.isActive === undefined || p.isActive)) {
          map.set(key, {
            ...p,
            id: p.id || p._id,
            stock: Number(p.stock ?? p.currentStock ?? 0),
            currentStock: Number(p.stock ?? p.currentStock ?? 0),
            sellingPrice: Number(p.sellingPrice ?? 0),
            purchasePrice: Number(p.purchasePrice ?? 0),
          });
        }
      }

      // Overlay inventory overview entries
      for (const item of invList) {
        const key = item.id || item._id || item.sku;
        if (key && (item.isActive === undefined || item.isActive)) {
          map.set(key, {
            ...(map.get(key) || {}),
            ...item,
            id: item.id || item._id,
            stock: Number(item.stock ?? item.currentStock ?? 0),
            currentStock: Number(item.stock ?? item.currentStock ?? 0),
            sellingPrice: Number(item.sellingPrice ?? 0),
            purchasePrice: Number(item.purchasePrice ?? 0),
          });
        }
      }

      const unified = Array.from(map.values());
      setInventory(unified);

      if (whRes.status === "fulfilled") {
        const whList = whRes.value?.warehouses || whRes.value?.data?.warehouses || [];
        setWarehouses(whList);
      }
    } catch (err) {
      console.error("Error loading inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await inventoryApi.history().catch(() => ({ data: [] }));
      const txs = res?.transactions || res?.data?.transactions || res?.data || [];
      setHistory(Array.isArray(txs) ? txs : []);
    } catch (err) {
      console.error("Error loading stock history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadHistory();

    const handleSync = () => {
      loadData();
      loadHistory();
    };

    // Automatic synchronization triggers on catalog updates, inventory changes, and store switches
    window.addEventListener("bilzet:inventory-changed", handleSync);
    window.addEventListener("bilzet:products-changed", handleSync);
    window.addEventListener("bilzet:store-changed", handleSync);
    return () => {
      window.removeEventListener("bilzet:inventory-changed", handleSync);
      window.removeEventListener("bilzet:products-changed", handleSync);
      window.removeEventListener("bilzet:store-changed", handleSync);
    };
  }, []);

  // Selected item object in modal
  const selectedProduct =
    inventory.find((p) => (p.id || p._id) === formProductId) || (inventory.length > 0 ? inventory[0] : null);
  const currentStock = Number(selectedProduct?.stock ?? selectedProduct?.currentStock ?? 0);
  const parsedQty = parseInt(adjustQty, 10) || 0;
  const isValidQty = parsedQty > 0 && Number.isInteger(parsedQty);

  // Automatically calculate projected new stock
  const newStock =
    adjustType === "ADD"
      ? currentStock + parsedQty
      : Math.max(0, currentStock - parsedQty);

  const isInvalidRemoval = adjustType === "REMOVE" && parsedQty > currentStock;

  const totalItems = inventory.reduce((acc, i) => acc + (i.stock || i.currentStock || 0), 0);
  const lowStockCount = inventory.filter((i) => (i.stock || i.currentStock || 0) <= (i.minimumStock || 5)).length;
  const totalValuation = inventory.reduce(
    (acc, i) => acc + (i.stock || i.currentStock || 0) * (i.sellingPrice || i.purchasePrice || 150),
    0
  );

  const getCategoryName = (cat) => {
    if (!cat) return "General";
    if (typeof cat === "string") return cat;
    if (typeof cat === "object" && cat.name) return cat.name;
    return "General";
  };

  const categories = ["All", ...new Set(inventory.map((i) => getCategoryName(i.category)))];

  const filtered = inventory.filter((item) => {
    const matchSearch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === "All" || getCategoryName(item.category) === selectedCat;
    return matchSearch && matchCat;
  });

  const openAdjustModalFor = (product) => {
    if (product) {
      setFormProductId(product.id || product._id);
    } else if (inventory.length > 0) {
      setFormProductId(inventory[0].id || inventory[0]._id);
    }
    setAdjustType("ADD");
    setAdjustQty("10");
    setReasonSelect("New Purchase");
    setCustomReason("");
    setNotification(null);
    setOpenModal(true);
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setNotification({ type: "error", message: "Please select a product." });
      return;
    }

    if (!isValidQty) {
      setNotification({ type: "error", message: "Please enter a positive whole number for quantity." });
      return;
    }

    if (isInvalidRemoval) {
      setNotification({
        type: "error",
        message: `Cannot remove ${parsedQty} units. Current stock is only ${currentStock}.`,
      });
      return;
    }

    const finalReason =
      reasonSelect === "Other"
        ? customReason.trim() || "Manual Adjustment"
        : reasonSelect;

    setSubmitting(true);
    setNotification(null);

    try {
      await inventoryApi.adjust({
        productId: selectedProduct.id || selectedProduct._id,
        type: adjustType,
        quantity: parsedQty,
        reason: finalReason,
      });

      // Update local state immediately
      setInventory((prev) =>
        prev.map((item) => {
          if ((item.id || item._id) === (selectedProduct.id || selectedProduct._id)) {
            return {
              ...item,
              stock: newStock,
              currentStock: newStock,
            };
          }
          return item;
        })
      );

      setNotification({
        type: "success",
        message: `Stock adjusted successfully! New stock for ${selectedProduct.name}: ${newStock} ${selectedProduct.unit || "pcs"}`,
      });

      window.dispatchEvent(new CustomEvent("bilzet:inventory-changed"));
      loadData();
      loadHistory();
      setOpenModal(false);
    } catch (err) {
      console.error("Stock adjustment failed:", err);
      setNotification({
        type: "error",
        message: err?.response?.data?.message || err?.message || "Failed to adjust stock. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0 shadow-2xs">
            <Boxes size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">
                Stock Overview
              </h1>
              <span className="badge badge-info uppercase tracking-wider">
                Inventory
              </span>
            </div>
            <p className="page-desc">
              Multi-warehouse inventory monitoring, live balance tracking and stock adjustments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Button
            variant="neutral"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={() => {
              loadData();
              loadHistory();
            }}
            title="Refresh Stock Data"
          >
            Sync
          </Button>

          <Button
            id="adjust-stock-btn"
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => openAdjustModalFor(null)}
          >
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SUCCESS / ERROR NOTIFICATION BANNER
      ══════════════════════════════════════════════════ */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          KPI SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card blue">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Products</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <PackageCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{inventory.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">{totalItems} total units available</p>
        </div>

        <div className="kpi-card rose">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Low Stock Alerts</p>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600">{lowStockCount}</p>
          <p className="text-xs text-rose-500 font-medium mt-1">
            {lowStockCount > 0 ? "Items require immediate replenishment" : "All product stock healthy"}
          </p>
        </div>

        <div className="kpi-card emerald">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Est. Inventory Value</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            ₹{totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Computed from wholesale &amp; retail rates</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABS (STOCK OVERVIEW vs AUDIT HISTORY)
      ══════════════════════════════════════════════════ */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Boxes size={14} />
          <span>Current Stock Overview ({filtered.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History size={14} />
          <span>Adjustment &amp; Stock History ({history.length})</span>
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by product name, SKU or barcode..."
              className="max-w-md"
            />

            <div className="seg-tabs overflow-x-auto max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`seg-tab ${selectedCat === cat ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* INVENTORY TABLE */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Product Name &amp; Category
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Stock Level
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Min Threshold
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                      Est. Value
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 px-4 text-center">
                        <div className="empty-state-icon mx-auto">
                          <Boxes size={20} />
                        </div>
                        <p className="font-semibold text-sm text-slate-800">No inventory products found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Try clearing search filters or add products in your catalog.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const stockVal = item.stock ?? item.currentStock ?? 0;
                      const isLow = stockVal <= (item.minimumStock || 5);
                      const percentage = Math.min(100, Math.round((stockVal / 50) * 100));

                      return (
                        <tr key={item.id || item._id || item.sku} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl grid place-items-center font-bold text-[10px] shrink-0 ${
                                  isLow
                                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                                    : "bg-blue-50 text-blue-600 border border-blue-200"
                                }`}
                              >
                                {item.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 leading-tight">{item.name}</p>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {getCategoryName(item.category)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-500">{item.sku || "—"}</td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5 w-32">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-bold text-xs ${
                                    isLow ? "text-rose-600 font-extrabold" : "text-slate-900"
                                  }`}
                                >
                                  {stockVal} {item.unit || "pcs"}
                                </span>
                                {isLow && (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                    LOW
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isLow ? "bg-rose-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            Min {item.minimumStock || 5} {item.unit || "pcs"}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                            ₹
                            {(
                              stockVal *
                              (item.sellingPrice || item.purchasePrice || item.value || 150)
                            ).toLocaleString("en-IN")}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <Button
                              variant="neutral"
                              size="xs"
                              icon={ArrowUpDown}
                              onClick={() => openAdjustModalFor(item)}
                            >
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* STOCK AUDIT HISTORY TAB */
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stock Transaction &amp; Audit Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every stock addition, reduction, sale, and adjustment is recorded with timestamp and reason
              </p>
            </div>
            <Button
              variant="neutral"
              size="sm"
              icon={RefreshCw}
              loading={historyLoading}
              onClick={loadHistory}
            >
              Refresh Log
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Date &amp; Time
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Quantity
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Stock Change
                  </th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Reason / Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center text-slate-400">
                      <History size={24} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">No stock history recorded yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Stock transactions and adjustments will appear here automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  history.map((tx) => {
                    const isPositive = Number(tx.quantity) > 0;
                    return (
                      <tr key={tx.id || tx._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(tx.createdAt || Date.now()).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {tx.product?.name || tx.productId || "Product"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPositive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {tx.type || "ADJUST"}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold font-mono ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? `+${tx.quantity}` : tx.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {tx.previousStock ?? "—"} → <span className="font-bold text-slate-900">{tx.newStock ?? "—"}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {tx.reason || "Manual adjustment"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ADJUST STOCK MODAL (FULLY SCROLLABLE, NEVER CUT OFF)
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="Adjust Stock Level"
        subtitle="Record inventory additions, deductions or physical count reconciliation"
        icon={Boxes}
        iconColor="text-blue-600 bg-blue-50 border-blue-100"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => setOpenModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="adjust-stock-form"
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              loading={submitting}
              disabled={submitting || !isValidQty || isInvalidRemoval || !selectedProduct}
            >
              Save Adjustment
            </Button>
          </>
        }
      >
        <form id="adjust-stock-form" onSubmit={handleSaveAdjust} className="space-y-4 text-xs">
          {/* Product */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Product <span className="text-rose-500">*</span>
            </label>
            <select
              value={formProductId || (selectedProduct?.id || selectedProduct?._id || "")}
              onChange={(e) => setFormProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
              required
            >
              {inventory.map((prod) => (
                <option key={prod.id || prod._id || prod.sku} value={prod.id || prod._id}>
                  {prod.name} ({prod.sku || "No SKU"}) — Current Stock: {prod.stock ?? prod.currentStock ?? 0} {prod.unit || "pcs"}
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Current Stock</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {currentStock} {selectedProduct?.unit || "pcs"}
            </span>
          </div>

          {/* Adjustment Type: Add Stock vs Remove Stock */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Adjustment Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setAdjustType("ADD")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition select-none ${
                  adjustType === "ADD"
                    ? "bg-emerald-50/80 border-emerald-400 text-emerald-900 font-bold shadow-xs"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="adjustType"
                  value="ADD"
                  checked={adjustType === "ADD"}
                  onChange={() => setAdjustType("ADD")}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>○ Add Stock</span>
              </label>

              <label
                onClick={() => setAdjustType("REMOVE")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition select-none ${
                  adjustType === "REMOVE"
                    ? "bg-rose-50/80 border-rose-400 text-rose-900 font-bold shadow-xs"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="adjustType"
                  value="REMOVE"
                  checked={adjustType === "REMOVE"}
                  onChange={() => setAdjustType("REMOVE")}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span>○ Remove Stock</span>
              </label>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="10"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono transition"
              required
            />
            {isInvalidRemoval && (
              <p className="text-rose-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                Quantity to remove cannot exceed current stock ({currentStock} available).
              </p>
            )}
            {!isValidQty && adjustQty !== "" && (
              <p className="text-rose-600 text-[11px] font-semibold mt-1">
                Quantity must be a positive whole number (&gt; 0).
              </p>
            )}
          </div>

          {/* New Stock (Auto-Calculated) */}
          <div
            className={`rounded-xl p-3.5 border flex items-center justify-between transition ${
              isInvalidRemoval
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : adjustType === "ADD"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                New Stock
              </span>
              <span className="text-xs font-medium">
                {currentStock} {adjustType === "ADD" ? `+ ${parsedQty}` : `- ${parsedQty}`} =
              </span>
            </div>
            <span className="text-xl font-extrabold font-mono">
              {newStock} {selectedProduct?.unit || "pcs"}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reason <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              <select
                value={reasonSelect}
                onChange={(e) => {
                  setReasonSelect(e.target.value);
                  if (e.target.value !== "Other") {
                    setCustomReason("");
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                required
              >
                <option value="New Purchase">New Purchase</option>
                <option value="Damaged Goods">Damaged Goods</option>
                <option value="Inventory Count Correction">Inventory Count Correction</option>
                <option value="Customer Return">Customer Return</option>
                <option value="Supplier Restock">Supplier Restock</option>
                <option value="Internal Store Consumption">Internal Store Consumption</option>
                <option value="Other">Other (Custom Reason)</option>
              </select>

              {reasonSelect === "Other" && (
                <input
                  type="text"
                  placeholder="Enter specific adjustment reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                  required
                />
              )}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
