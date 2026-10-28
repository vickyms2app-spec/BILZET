import { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  RefreshCw,
  ArrowUpDown,
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  TrendingDown,
  Coins,
  Search,
  FileText,
} from "lucide-react";
import { inventoryApi, productsApi, warehousesApi } from "../api";
import { useAuth } from "../store/auth";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";

// Predefined palette of soft, professional colors for deterministic avatar assignment
const PRODUCT_AVATAR_PALETTES = [
  { bg: "#EBF5FF", text: "#007AFF", border: "#D0E2FF" }, // Blue
  { bg: "#F3E8FF", text: "#7C3AED", border: "#E9D5FF" }, // Purple
  { bg: "#E6FFFA", text: "#0D9488", border: "#B2F5EA" }, // Teal
  { bg: "#EDF8F0", text: "#248A3D", border: "#CCE8D4" }, // Green
  { bg: "#FFF4E5", text: "#C25E00", border: "#FFE2B8" }, // Orange
  { bg: "#FDF2F8", text: "#DB2777", border: "#FCE7F3" }, // Pink
  { bg: "#EEF2FF", text: "#4F46E5", border: "#E0E7FF" }, // Indigo
  { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" }, // Rose
];

const getProductAvatarPalette = (idOrName) => {
  const str = String(idOrName || "product");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PRODUCT_AVATAR_PALETTES.length;
  return PRODUCT_AVATAR_PALETTES[index];
};

export default function Inventory() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "history"
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
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

  const handleSyncData = async () => {
    setLoading(true);
    setNotification(null);
    try {
      await Promise.all([loadData(), loadHistory()]);
      setNotification({
        type: "success",
        message: "Inventory and stock history synchronized successfully.",
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: "Failed to synchronize inventory data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!history || history.length === 0) {
      setNotification({
        type: "error",
        message: "No stock history records available to export.",
      });
      return;
    }

    setPdfExporting(true);
    setNotification(null);

    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;

      // Clean Apple dark header banner
      doc.setFillColor(29, 29, 31);
      doc.rect(0, 0, pageWidth, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("BILZET — Stock Adjustment & Inventory Audit History", margin, 14);

      const generatedDate = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(200, 200, 205);
      doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 14, { align: "right" });

      // Sub-header summary info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(29, 29, 31);
      doc.text(`Total Transaction Records: ${history.length}`, margin, 30);

      const rows = history.map((tx, idx) => {
        const isPos = Number(tx.quantity) > 0;
        const formattedDate = new Date(tx.createdAt || Date.now()).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return [
          `#${idx + 1}`,
          formattedDate,
          tx.product?.name || tx.productId || "Product",
          tx.type || (isPos ? "ADD" : "REMOVE"),
          isPos ? `+${tx.quantity}` : String(tx.quantity),
          String(tx.previousStock ?? "—"),
          String(tx.newStock ?? "—"),
          tx.reason || "Manual adjustment",
        ];
      });

      autoTable(doc, {
        startY: 34,
        margin: { left: margin, right: margin, bottom: 15 },
        head: [
          [
            "#",
            "Date & Time",
            "Product Name",
            "Type",
            "Quantity",
            "Prev Stock",
            "New Stock",
            "Reason / Details",
          ],
        ],
        body: rows,
        theme: "grid",
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          textColor: [29, 29, 31],
          lineColor: [229, 229, 234],
          lineWidth: 0.1,
          font: "helvetica",
        },
        headStyles: {
          fillColor: [245, 245, 247],
          textColor: [110, 110, 115],
          fontStyle: "bold",
          fontSize: 8,
          lineWidth: 0.1,
          lineColor: [229, 229, 234],
        },
        alternateRowStyles: {
          fillColor: [253, 253, 254],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 38 },
          2: { cellWidth: 55, fontStyle: "bold" },
          3: { cellWidth: 22, halign: "center" },
          4: { cellWidth: 20, halign: "right", fontStyle: "bold" },
          5: { cellWidth: 24, halign: "right" },
          6: { cellWidth: 24, halign: "right", fontStyle: "bold" },
          7: { cellWidth: "auto" },
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(142, 142, 147);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount} • BILZET Business Management`,
            pageWidth / 2,
            pageHeight - 6,
            { align: "center" }
          );
        },
      });

      const todayStr = new Date().toISOString().split("T")[0];
      doc.save(`Stock_Adjustment_History_${todayStr}.pdf`);

      setNotification({
        type: "success",
        message: "Stock adjustment history exported to PDF successfully.",
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setNotification({
        type: "error",
        message: "Failed to generate PDF. Please try again.",
      });
    } finally {
      setPdfExporting(false);
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
    const s = search.toLowerCase().trim();
    const matchSearch =
      !s ||
      item.name?.toLowerCase().includes(s) ||
      item.sku?.toLowerCase().includes(s) ||
      item.barcode?.toLowerCase().includes(s);
    const matchCat = selectedCat === "All" || getCategoryName(item.category) === selectedCat;
    return matchSearch && matchCat;
  });

  const hasActiveFilters = Boolean(search.trim() || selectedCat !== "All");

  const clearFilters = () => {
    setSearch("");
    setSelectedCat("All");
  };

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
    <div
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      className="space-y-4 pb-12 fade-up text-[#1D1D1F]"
    >
      {/* ══════════════════════════════════════════════════
          PAGE HEADER — APPLE macOS COMPACT STYLE
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] tracking-tight">
              Stock Overview
            </h1>
            <span className="text-[11px] font-semibold text-[#007AFF] bg-[#EBF5FF] border border-[#D0E2FF] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Inventory
            </span>
          </div>
          <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
            Monitor stock levels, inventory value and adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleSyncData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-50"
            title="Sync Inventory Data"
          >
            <RefreshCw
              size={13}
              className={loading ? "animate-spin text-[#007AFF]" : "text-[#6E6E73]"}
            />
            <span>{loading ? "Syncing…" : "Sync"}</span>
          </button>

          <button
            type="button"
            id="adjust-stock-btn"
            onClick={() => openAdjustModalFor(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)]"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Adjust Stock</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          NOTIFICATIONS
      ══════════════════════════════════════════════════ */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
            notification.type === "success"
              ? "bg-[#EDF8F0] text-[#248A3D] border-[#CCE8D4]"
              : "bg-[#FFF1F2] text-[#D70015] border-[#FECDD3]"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 size={15} className="text-[#248A3D] shrink-0" />
            ) : (
              <AlertTriangle size={15} className="text-[#D70015] shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[#6E6E73] hover:text-[#1D1D1F] p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          INVENTORY SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <p className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
            Total Products
          </p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#1D1D1F] tracking-tight font-mono">
              {inventory.length}
            </p>
            <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
              {totalItems.toLocaleString("en-IN")} total units available
            </p>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <p className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
            Low Stock
          </p>
          <div className="mt-2">
            <p
              className={`text-2xl font-bold tracking-tight font-mono ${
                lowStockCount > 0 ? "text-[#D70015]" : "text-[#1D1D1F]"
              }`}
            >
              {lowStockCount}
            </p>
            <p
              className={`text-xs font-normal mt-0.5 ${
                lowStockCount > 0 ? "text-[#D70015]" : "text-[#6E6E73]"
              }`}
            >
              {lowStockCount > 0
                ? `${lowStockCount} items at or below minimum threshold`
                : "All product stock healthy"}
            </p>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <p className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
            Inventory Value
          </p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-[#1D1D1F] tracking-tight font-mono">
              ₹{totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
              Total valuation at current rates
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABS (STOCK OVERVIEW vs HISTORY)
      ══════════════════════════════════════════════════ */}
      <div className="flex items-center gap-6 border-b border-[#E5E5EA] pt-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "overview"
              ? "border-[#007AFF] text-[#007AFF]"
              : "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
          }`}
        >
          <Boxes size={14} />
          <span>Current Stock Overview</span>
          <span
            className={`text-[11px] px-2 py-0.2 rounded-full font-mono ${
              activeTab === "overview"
                ? "bg-[#EBF5FF] text-[#007AFF]"
                : "bg-[#F5F5F7] text-[#6E6E73]"
            }`}
          >
            {filtered.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "history"
              ? "border-[#007AFF] text-[#007AFF]"
              : "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
          }`}
        >
          <History size={14} />
          <span>Adjustment &amp; Stock History</span>
          <span
            className={`text-[11px] px-2 py-0.2 rounded-full font-mono ${
              activeTab === "history"
                ? "bg-[#EBF5FF] text-[#007AFF]"
                : "bg-[#F5F5F7] text-[#6E6E73]"
            }`}
          >
            {history.length}
          </span>
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          {/* ══════════════════════════════════════════════════
              COMPACT TOOLBAR: SEARCH & CATEGORY FILTER
          ══════════════════════════════════════════════════ */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
                placeholder="Search by product name, SKU or barcode…"
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-medium text-[#6E6E73] whitespace-nowrap hidden sm:inline">
                Category:
              </span>
              <div className="flex items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                      selectedCat === cat
                        ? "bg-[#007AFF] text-white shadow-xs font-semibold"
                        : "bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] border border-[#E5E5EA]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-2.5 py-1.5 text-xs text-[#007AFF] hover:underline whitespace-nowrap cursor-pointer font-medium ml-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              CURRENT STOCK TABLE — APPLE macOS DESIGN
          ══════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 min-w-[200px]">Product</th>
                    <th className="py-2.5 px-3 min-w-[120px]">SKU</th>
                    <th className="py-2.5 px-4 min-w-[150px]">Available Stock</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Minimum Stock</th>
                    <th className="py-2.5 px-4 text-right min-w-[130px]">Inventory Value</th>
                    <th className="py-2.5 px-3.5 text-center min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA] bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center">
                        <RefreshCw size={22} className="animate-spin text-[#007AFF] mx-auto mb-2" />
                        <p className="text-xs text-[#6E6E73]">Loading inventory records…</p>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 px-4 text-center">
                        <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] text-[#6E6E73] flex items-center justify-center mx-auto mb-2">
                          <Boxes size={20} />
                        </div>
                        <p className="text-sm font-semibold text-[#1D1D1F]">No inventory items found</p>
                        <p className="text-xs text-[#6E6E73] mt-1 max-w-sm mx-auto">
                          {hasActiveFilters
                            ? "No products match the selected filters or search keyword."
                            : "No items cataloged in inventory. Add products to get started."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA] transition cursor-pointer"
                          >
                            Reset filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item, idx) => {
                      const stockVal = item.stock ?? item.currentStock ?? 0;
                      const minStock = item.minimumStock || 5;
                      const isLow = stockVal <= minStock;
                      const isOut = stockVal <= 0;
                      const unit = item.unit || "PIECE";
                      const itemValuation =
                        stockVal *
                        (item.sellingPrice || item.purchasePrice || item.value || 150);

                      const initial = item.name ? item.name.trim().charAt(0).toUpperCase() : "P";
                      const palette = getProductAvatarPalette(
                        item.id || item._id || item.sku || `product-${idx}`
                      );

                      return (
                        <tr
                          key={item.id || item._id || item.sku || idx}
                          className="hover:bg-[#F5F5F7]/60 transition"
                        >
                          {/* 1. Product Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                style={{
                                  backgroundColor: palette.bg,
                                  color: palette.text,
                                  borderColor: palette.border,
                                }}
                                className="w-7 h-7 rounded-full border font-semibold text-xs flex items-center justify-center shrink-0 select-none"
                              >
                                {initial}
                              </div>
                              <div>
                                <p className="font-semibold text-[#1D1D1F] leading-snug text-xs">
                                  {item.name}
                                </p>
                                <span className="text-[11px] text-[#6E6E73] font-normal leading-none block mt-0.5">
                                  {getCategoryName(item.category)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. SKU */}
                          <td className="py-3 px-3 font-mono text-[11px] text-[#6E6E73]">
                            {item.sku || "—"}
                          </td>

                          {/* 3. Available Stock */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 font-semibold text-xs font-mono ${
                                  isOut
                                    ? "text-[#6E6E73]"
                                    : isLow
                                    ? "text-[#D70015]"
                                    : "text-[#248A3D]"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOut
                                      ? "bg-[#8E8E93]"
                                      : isLow
                                      ? "bg-[#D70015]"
                                      : "bg-[#248A3D]"
                                  }`}
                                />
                                {stockVal.toLocaleString("en-IN")} {unit}
                              </span>

                              {isOut ? (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-[#6E6E73] bg-[#F5F5F7] border border-[#E5E5EA] rounded uppercase tracking-wider">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-[#D70015] bg-[#FFF1F2] border border-[#FECDD3] rounded uppercase tracking-wider">
                                  Low Stock
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* 4. Minimum Stock */}
                          <td className="py-3 px-3 font-mono text-[11px] text-[#6E6E73]">
                            {minStock} {unit}
                          </td>

                          {/* 5. Inventory Value */}
                          <td className="py-3 px-4 text-right font-mono font-semibold text-[#1D1D1F] text-xs">
                            ₹{itemValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </td>

                          {/* 6. Actions */}
                          <td className="py-3 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => openAdjustModalFor(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-[#007AFF] hover:bg-[#EBF5FF] transition cursor-pointer"
                            >
                              <ArrowUpDown size={12} />
                              <span>Adjust</span>
                            </button>
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
        /* ══════════════════════════════════════════════════
            ADJUSTMENT & STOCK HISTORY TAB — macOS DESIGN
        ══════════════════════════════════════════════════ */
        <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-4 border-b border-[#E5E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div>
              <h3 className="text-xs font-semibold text-[#1D1D1F]">
                Stock Transaction &amp; Audit Log
              </h3>
              <p className="text-[11px] text-[#6E6E73] font-normal mt-0.5">
                Every stock addition, reduction, sale, and adjustment is recorded with timestamp and reason
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={history.length === 0 || pdfExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Export Stock Adjustment History as PDF"
              >
                <FileText
                  size={13}
                  className={pdfExporting ? "animate-spin text-[#007AFF]" : "text-[#007AFF]"}
                />
                <span>{pdfExporting ? "Exporting PDF…" : "Export PDF"}</span>
              </button>

              <button
                type="button"
                onClick={loadHistory}
                disabled={historyLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <RefreshCw
                  size={12}
                  className={historyLoading ? "animate-spin text-[#007AFF]" : "text-[#6E6E73]"}
                />
                <span>Refresh Log</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 min-w-[150px]">Date &amp; Time</th>
                  <th className="py-2.5 px-4 min-w-[180px]">Product</th>
                  <th className="py-2.5 px-3.5 min-w-[110px]">Type</th>
                  <th className="py-2.5 px-4 text-right min-w-[100px]">Quantity</th>
                  <th className="py-2.5 px-4 text-right min-w-[130px]">Stock Change</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] bg-white">
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#6E6E73]">
                      <RefreshCw size={20} className="animate-spin text-[#007AFF] mx-auto mb-2" />
                      <span>Loading stock transaction history…</span>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] text-[#6E6E73] flex items-center justify-center mx-auto mb-2">
                        <History size={18} />
                      </div>
                      <p className="text-xs font-semibold text-[#1D1D1F]">No stock history recorded yet</p>
                      <p className="text-[11px] text-[#6E6E73] mt-0.5">
                        Stock transactions and adjustments will appear here automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  history.map((tx, idx) => {
                    const isPositive = Number(tx.quantity) > 0;
                    return (
                      <tr key={tx.id || tx._id || idx} className="hover:bg-[#F5F5F7]/60 transition">
                        <td className="py-3 px-4 text-[#6E6E73] font-mono text-[11px]">
                          {new Date(tx.createdAt || Date.now()).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#1D1D1F]">
                          {tx.product?.name || tx.productId || "Product"}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isPositive
                                ? "bg-[#EDF8F0] text-[#248A3D] border-[#CCE8D4]"
                                : "bg-[#FFF1F2] text-[#D70015] border-[#FECDD3]"
                            }`}
                          >
                            {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                            {tx.type || "ADJUST"}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold font-mono ${
                            isPositive ? "text-[#248A3D]" : "text-[#D70015]"
                          }`}
                        >
                          {isPositive ? `+${tx.quantity}` : tx.quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#6E6E73]">
                          {tx.previousStock ?? "—"} →{" "}
                          <span className="font-semibold text-[#1D1D1F]">{tx.newStock ?? "—"}</span>
                        </td>
                        <td className="py-3 px-4 text-[#6E6E73] text-xs max-w-xs truncate">
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
          ADJUST STOCK MODAL — APPLE macOS DESIGN
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="Adjust Stock Level"
        subtitle="Record inventory additions, deductions or physical count reconciliation"
        icon={Boxes}
        iconColor="text-[#007AFF] bg-[#F5F5F7] border-[#E5E5EA]"
        maxWidth="max-w-lg"
        footer={
          <div className="w-full flex items-center justify-end gap-2">
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
              Confirm Adjustment
            </Button>
          </div>
        }
      >
        <form id="adjust-stock-form" onSubmit={handleSaveAdjust} className="space-y-4 text-xs">
          {/* Product selection */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
              Product <span className="text-[#D70015]">*</span>
            </label>
            <select
              value={formProductId || (selectedProduct?.id || selectedProduct?._id || "")}
              onChange={(e) => setFormProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs font-medium text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition"
              required
            >
              {inventory.map((prod) => (
                <option key={prod.id || prod._id || prod.sku} value={prod.id || prod._id}>
                  {prod.name} ({prod.sku || "No SKU"}) — Available: {prod.stock ?? prod.currentStock ?? 0} {prod.unit || "pcs"}
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock info display */}
          <div className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-medium text-[#6E6E73]">Current Available Stock</span>
            <span className="text-sm font-semibold text-[#1D1D1F] font-mono">
              {currentStock} {selectedProduct?.unit || "pcs"}
            </span>
          </div>

          {/* Adjustment Type: Add Stock vs Remove Stock */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
              Adjustment Type <span className="text-[#D70015]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                onClick={() => setAdjustType("ADD")}
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition select-none ${
                  adjustType === "ADD"
                    ? "bg-[#EDF8F0] border-[#CCE8D4] text-[#248A3D] font-semibold"
                    : "border-[#E5E5EA] text-[#6E6E73] hover:bg-[#F5F5F7]"
                }`}
              >
                <input
                  type="radio"
                  name="adjustType"
                  value="ADD"
                  checked={adjustType === "ADD"}
                  onChange={() => setAdjustType("ADD")}
                  className="text-[#248A3D] focus:ring-[#248A3D]"
                />
                <span className="text-xs">+ Add Stock</span>
              </label>

              <label
                onClick={() => setAdjustType("REMOVE")}
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition select-none ${
                  adjustType === "REMOVE"
                    ? "bg-[#FFF1F2] border-[#FECDD3] text-[#D70015] font-semibold"
                    : "border-[#E5E5EA] text-[#6E6E73] hover:bg-[#F5F5F7]"
                }`}
              >
                <input
                  type="radio"
                  name="adjustType"
                  value="REMOVE"
                  checked={adjustType === "REMOVE"}
                  onChange={() => setAdjustType("REMOVE")}
                  className="text-[#D70015] focus:ring-[#D70015]"
                />
                <span className="text-xs">− Remove Stock</span>
              </label>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
              Quantity to Adjust <span className="text-[#D70015]">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="10"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs font-semibold text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition"
              required
            />
            {isInvalidRemoval && (
              <p className="text-[#D70015] text-[11px] font-medium mt-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                Quantity to remove cannot exceed current stock ({currentStock} available).
              </p>
            )}
            {!isValidQty && adjustQty !== "" && (
              <p className="text-[#D70015] text-[11px] font-medium mt-1">
                Quantity must be a positive whole number (&gt; 0).
              </p>
            )}
          </div>

          {/* Resulting Stock Preview */}
          <div
            className={`rounded-xl p-3 border flex items-center justify-between transition ${
              isInvalidRemoval
                ? "bg-[#FFF1F2] border-[#FECDD3] text-[#D70015]"
                : adjustType === "ADD"
                ? "bg-[#EDF8F0] border-[#CCE8D4] text-[#248A3D]"
                : "bg-[#EBF5FF] border-[#D0E2FF] text-[#007AFF]"
            }`}
          >
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider block opacity-80">
                Resulting Stock Preview
              </span>
              <span className="text-xs font-normal">
                {currentStock} {adjustType === "ADD" ? `+ ${parsedQty}` : `- ${parsedQty}`} =
              </span>
            </div>
            <span className="text-base font-bold font-mono">
              {newStock} {selectedProduct?.unit || "pcs"}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
              Reason / Adjustment Notes <span className="text-[#D70015]">*</span>
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
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs font-medium text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition"
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
                  placeholder="Enter specific adjustment reason…"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition"
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
