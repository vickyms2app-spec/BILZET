import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Building2,
  ExternalLink,
  Plus,
  Send,
  Upload,
  RotateCcw,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  ChevronLeft,
  Check,
  UserCheck,
  Briefcase,
  HelpCircle,
  FileCheck2,
  DollarSign
} from "lucide-react";
import { caPortalApi } from "../api";

export default function CaExceptionsInbox({
  stores = [],
  selectedStoreId = "",
  setSelectedStoreId = () => {},
  loadingStores = false,
  user = null,
  onNavigateTab = () => {},
}) {
  // Store Selection
  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0] || null;
  }, [stores, selectedStoreId]);

  // Financial Year Selection
  const currentYear = new Date().getFullYear();
  const [selectedFY, setSelectedFY] = useState(() => {
    const m = new Date().getMonth();
    return m >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  });

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL"); // ALL, GST_MISMATCH, RETURNS_CREDIT_NOTE, MISSING_INVOICE, PENDING_DOCUMENT
  const [customerTypeFilters, setCustomerTypeFilters] = useState(["B2B", "B2C", "SEZ", "UNCLASSIFIED"]);
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, OPEN, IN_REVIEW, RESOLVED, REOPENED
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [amountRange, setAmountRange] = useState({ min: "", max: "" });

  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Data State
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    gstMismatches: 0,
    returnsCreditNotes: 0,
    missingInvoices: 0,
    pendingDocuments: 0,
  });
  const [customerTypeCounts, setCustomerTypeCounts] = useState({
    b2b: 0,
    b2c: 0,
    sez: 0,
    unclassified: 0,
  });
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [notification, setNotification] = useState(null);

  // Selected Row & Drawer State
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedException, setSelectedException] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("details"); // details, gst_impact, documents, history
  const [selectedCheckboxes, setSelectedCheckboxes] = useState(new Set());

  // Drawer Action Forms
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveReason, setResolveReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [docRequestModalOpen, setDocRequestModalOpen] = useState(false);
  const [docRequestForm, setDocRequestForm] = useState({ documentType: "Tax Invoice Voucher", message: "" });
  const [reclassifyModalOpen, setReclassifyModalOpen] = useState(false);
  const [reclassifyForm, setReclassifyForm] = useState({ customerType: "B2B", sezTaxTreatment: "WITH_PAYMENT", reason: "" });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Exceptions
  const loadExceptions = useCallback(async () => {
    if (!activeStore?.id) return;
    setLoading(true);
    try {
      const params = {
        storeId: activeStore.id,
        category: activeCategory,
        customerType: customerTypeFilters.length === 4 ? "ALL" : customerTypeFilters.join(","),
        status: statusFilter,
        search: searchQuery.trim() || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        minAmount: amountRange.min || undefined,
        maxAmount: amountRange.max || undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      };

      const res = await caPortalApi.getExceptions(params);
      const data = res?.data || res || {};
      setExceptions(data.exceptions || []);
      if (data.counts) setCounts(data.counts);
      if (data.customerTypeCounts) setCustomerTypeCounts(data.customerTypeCounts);
      if (data.meta) setMeta(data.meta);
      if (data.lastSync) setLastSyncTime(data.lastSync);
    } catch (err) {
      console.error("Failed to load exceptions:", err);
      showNotification(err.message || "Failed to load exceptions", "error");
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id, activeCategory, customerTypeFilters, statusFilter, searchQuery, dateRange, amountRange, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  // Sync Now Handler
  const handleSyncNow = async () => {
    if (!activeStore?.id || syncing) return;
    setSyncing(true);
    try {
      const res = await caPortalApi.syncExceptions({ storeId: activeStore.id });
      const data = res?.data || res || {};
      showNotification(
        `Synchronized ${data.exceptionsSynced || 0} transactions with BILZET billing!`,
        "success"
      );
      if (data.lastSync) setLastSyncTime(data.lastSync);
      await loadExceptions();
    } catch (err) {
      console.error("Sync failed:", err);
      showNotification(err.message || "Billing synchronization failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  // Row Click: Open Drawer
  const handleRowClick = async (exc) => {
    setSelectedRowId(exc.id);
    setSelectedException(exc);
    setDrawerOpen(true);
    setDrawerTab("details");
    // Fetch full detail with backing invoice if available
    try {
      const res = await caPortalApi.getException(exc.id);
      if (res?.data?.exception) {
        setSelectedException(res.data.exception);
      }
    } catch (_) {}
  };

  // Toggle Checkbox
  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedCheckboxes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCheckboxes.size === exceptions.length && exceptions.length > 0) {
      setSelectedCheckboxes(new Set());
    } else {
      setSelectedCheckboxes(new Set(exceptions.map((e) => e.id)));
    }
  };

  // Add Review Note Action
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedException?.id || !noteInput.trim()) return;
    setSavingNote(true);
    try {
      const res = await caPortalApi.addExceptionNote(selectedException.id, { note: noteInput.trim() });
      showNotification("Review note added to exception audit trail", "success");
      setNoteInput("");
      if (res?.data?.exception) {
        setSelectedException((prev) => ({
          ...prev,
          reviewNotes: res.data.exception.reviewNotes || prev.reviewNotes,
          history: res.data.exception.history || prev.history,
        }));
      }
      loadExceptions();
    } catch (err) {
      showNotification(err.message || "Failed to add note", "error");
    } finally {
      setSavingNote(false);
    }
  };

  // Mark as Resolved Action
  const handleMarkResolved = async () => {
    if (!selectedException?.id) return;
    setActionLoading(true);
    try {
      const res = await caPortalApi.updateExceptionStatus(selectedException.id, {
        status: "RESOLVED",
        reason: resolveReason.trim() || "Resolved after CA inspection",
      });
      showNotification(`Exception #${selectedException.referenceNumber} marked as Resolved`, "success");
      setResolveModalOpen(false);
      setResolveReason("");
      if (res?.data?.exception) {
        setSelectedException((prev) => ({ ...prev, ...res.data.exception }));
      }
      loadExceptions();
    } catch (err) {
      showNotification(err.message || "Failed to resolve exception", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reopen Action
  const handleReopen = async () => {
    if (!selectedException?.id) return;
    setActionLoading(true);
    try {
      const res = await caPortalApi.updateExceptionStatus(selectedException.id, {
        status: "REOPENED",
        reason: reopenReason.trim() || "Reopened for further investigation",
      });
      showNotification(`Exception #${selectedException.referenceNumber} reopened`, "info");
      setReopenModalOpen(false);
      setReopenReason("");
      if (res?.data?.exception) {
        setSelectedException((prev) => ({ ...prev, ...res.data.exception }));
      }
      loadExceptions();
    } catch (err) {
      showNotification(err.message || "Failed to reopen exception", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Request Document Action
  const handleRequestDocument = async () => {
    if (!selectedException?.id) return;
    setActionLoading(true);
    try {
      const res = await caPortalApi.requestExceptionDocument(selectedException.id, docRequestForm);
      showNotification(`Document requested: ${docRequestForm.documentType}`, "success");
      setDocRequestModalOpen(false);
      setDocRequestForm({ documentType: "Tax Invoice Voucher", message: "" });
      if (res?.data?.exception) {
        setSelectedException((prev) => ({ ...prev, ...res.data.exception }));
      }
      loadExceptions();
    } catch (err) {
      showNotification(err.message || "Failed to request document", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reclassify Customer Type Action
  const handleReclassify = async () => {
    if (!selectedException?.id) return;
    setActionLoading(true);
    try {
      const res = await caPortalApi.classifyExceptionCustomer(selectedException.id, reclassifyForm);
      showNotification(`Classification updated to ${reclassifyForm.customerType}`, "success");
      setReclassifyModalOpen(false);
      if (res?.data?.exception) {
        setSelectedException((prev) => ({ ...prev, ...res.data.exception }));
      }
      loadExceptions();
    } catch (err) {
      showNotification(err.message || "Failed to update classification", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Format Currency
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format Date
  const formatDate = (dateVal) => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch (_) {
      return String(dateVal);
    }
  };

  // Customer Type Badge Renderer
  const renderCustomerTypeBadge = (type, sezTreatment = null) => {
    switch (type) {
      case "B2B":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
            B2B
          </span>
        );
      case "B2C":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            B2C
          </span>
        );
      case "SEZ":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200" title={sezTreatment === "WITHOUT_PAYMENT_UNDER_LUT" ? "SEZ under LUT" : "SEZ with IGST"}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
            SEZ
            {sezTreatment === "WITHOUT_PAYMENT_UNDER_LUT" ? (
              <span className="text-[10px] uppercase font-bold text-purple-500">(LUT)</span>
            ) : (
              <span className="text-[10px] uppercase font-bold text-purple-500">(IGST)</span>
            )}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Unclassified
          </span>
        );
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status) => {
    switch (status) {
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Resolved
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} /> In Review
          </span>
        );
      case "REOPENED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw size={12} /> Reopened
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={12} /> Open
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 fade-up">
      {/* ══════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════ */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 grid place-items-center shrink-0">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Exceptions Inbox
                </h1>
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                  {meta.total} Total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">
                Transactions and records that need your attention.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Search, Store Selector, FY, Sync */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global Search */}
          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search invoices, GSTINs, clients..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Client/Store Selector */}
          <div className="relative">
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                setPage(1);
              }}
              className="appearance-none bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium rounded-xl pl-3.5 pr-8 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.gstin ? s.gstin.slice(0, 10) + "..." : "No GSTIN"})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          {/* FY Selector */}
          <div className="relative">
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium rounded-xl pl-3 pr-7 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="2026-2027">FY 2026-27</option>
              <option value="2025-2026">FY 2025-26</option>
              <option value="2024-2025">FY 2024-25</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>

          {/* Sync Status & Action */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Billing</span>
              </div>
              <p className="text-[10px] text-slate-400 font-normal">
                {lastSyncTime ? `Synced ${formatDate(lastSyncTime)}` : "Sync Ready"}
              </p>
            </div>

            <button
              id="sync-now-button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Syncing..." : "Sync Now"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs transition-all ${
            notification.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : notification.type === "info"
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "error" ? (
              <AlertTriangle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          COMPACT HORIZONTAL FILTER BAR WITH ACTUAL COUNTS
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Horizontal Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All Exceptions", count: counts.all },
            { id: "GST_MISMATCH", label: "GST Mismatches", count: counts.gstMismatches },
            { id: "RETURNS_CREDIT_NOTE", label: "Returns & Credit Notes", count: counts.returnsCreditNotes },
            { id: "MISSING_INVOICE", label: "Missing Invoices", count: counts.missingInvoices },
            { id: "PENDING_DOCUMENT", label: "Pending Documents", count: counts.pendingDocuments },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            id="filters-button"
            onClick={() => setFilterDrawerOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              customerTypeFilters.length < 4 || statusFilter !== "ALL" || dateRange.start || amountRange.min
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={13} />
            <span>Filters</span>
            {customerTypeFilters.length < 4 || statusFilter !== "ALL" ? (
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Selected Items Bulk Actions Bar */}
      {selectedCheckboxes.size > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-md">
              {selectedCheckboxes.size} Selected
            </span>
            <span className="text-slate-300">Choose action for selected transactions:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                showNotification(`Bulk action applied to ${selectedCheckboxes.size} exceptions`, "success");
                setSelectedCheckboxes(new Set());
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors"
            >
              Mark In Review
            </button>
            <button
              onClick={() => setSelectedCheckboxes(new Set())}
              className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          EXCEPTIONS TABLE
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                {/* 1. Selection Checkbox */}
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedCheckboxes.size === exceptions.length && exceptions.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>

                {/* 2. Date */}
                <th
                  onClick={() => {
                    if (sortBy === "createdAt") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else {
                      setSortBy("createdAt");
                      setSortOrder("desc");
                    }
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown size={11} className={sortBy === "createdAt" ? "text-blue-600" : "text-slate-300"} />
                  </div>
                </th>

                {/* 3. Exception Type */}
                <th className="py-3 px-3 whitespace-nowrap">Exception Type</th>

                {/* 4. Reference / Invoice Number */}
                <th
                  onClick={() => {
                    if (sortBy === "referenceNumber") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else {
                      setSortBy("referenceNumber");
                      setSortOrder("asc");
                    }
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Reference / Invoice</span>
                    <ArrowUpDown size={11} className={sortBy === "referenceNumber" ? "text-blue-600" : "text-slate-300"} />
                  </div>
                </th>

                {/* 5. Client / Store */}
                <th className="py-3 px-3 whitespace-nowrap">Client / Store</th>

                {/* 6. Customer Type (Required) */}
                <th
                  onClick={() => {
                    if (sortBy === "customerType") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else {
                      setSortBy("customerType");
                      setSortOrder("asc");
                    }
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Customer Type</span>
                    <ArrowUpDown size={11} className={sortBy === "customerType" ? "text-blue-600" : "text-slate-300"} />
                  </div>
                </th>

                {/* 7. Issue Description */}
                <th className="py-3 px-4 min-w-[240px]">Issue Description</th>

                {/* 8. Amount (₹) & GST */}
                <th
                  onClick={() => {
                    if (sortBy === "amount") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else {
                      setSortBy("amount");
                      setSortOrder("desc");
                    }
                  }}
                  className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount (₹)</span>
                    <ArrowUpDown size={11} className={sortBy === "amount" ? "text-blue-600" : "text-slate-300"} />
                  </div>
                </th>

                {/* 9. Status */}
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-blue-600" />
                      <span>Loading exceptions...</span>
                    </div>
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">No Exceptions Found</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery || activeCategory !== "ALL"
                          ? "Try adjusting your category or customer type filters."
                          : "All billing transactions and GST records for this client match statutory rules."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                exceptions.map((exc) => {
                  const isSelected = selectedRowId === exc.id;
                  const isChecked = selectedCheckboxes.has(exc.id);

                  return (
                    <tr
                      key={exc.id}
                      onClick={() => handleRowClick(exc)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${
                        isSelected ? "bg-blue-50/70 ring-1 ring-blue-500/30" : isChecked ? "bg-slate-50/60" : ""
                      }`}
                    >
                      {/* 1. Checkbox */}
                      <td className="py-3 px-3.5 text-center" onClick={(e) => toggleSelectRow(exc.id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* 2. Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                        {formatDate(exc.invoiceDate || exc.createdAt)}
                      </td>

                      {/* 3. Exception Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {exc.exceptionType.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* 4. Reference Number */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-slate-900 font-semibold hover:text-blue-600 transition-colors">
                          <FileText size={13} className="text-slate-400 shrink-0" />
                          <span>{exc.referenceNumber || "—"}</span>
                        </div>
                      </td>

                      {/* 5. Client / Store */}
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        <div className="font-medium">{exc.customerName || activeStore?.name}</div>
                        {exc.customerGstin && (
                          <div className="text-[10px] font-mono text-slate-400">{exc.customerGstin}</div>
                        )}
                      </td>

                      {/* 6. Customer Type (B2B, B2C, SEZ) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderCustomerTypeBadge(exc.customerType, exc.sezTaxTreatment)}
                      </td>

                      {/* 7. Issue Description */}
                      <td className="py-3 px-4 text-slate-600 max-w-sm">
                        <p className="line-clamp-2 leading-relaxed" title={exc.description}>
                          {exc.description}
                        </p>
                      </td>

                      {/* 8. Amount (₹) & GST */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatCurrency(exc.amount)}</div>
                        {exc.gstAmount > 0 && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            GST: {formatCurrency(exc.gstAmount)}
                          </div>
                        )}
                      </td>

                      {/* 9. Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {renderStatusBadge(exc.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        <div className="py-3 px-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing {meta.total > 0 ? (page - 1) * limit + 1 : 0} to{" "}
              {Math.min(page * limit, meta.total)} of {meta.total} exceptions
            </span>
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          RIGHT-SIDE DETAIL DRAWER (4 TABS)
      ══════════════════════════════════════════════════ */}
      {drawerOpen && selectedException && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl md:max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slideLeft">
          {/* Drawer Top Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                  {selectedException.referenceNumber}
                </span>
                {renderCustomerTypeBadge(selectedException.customerType, selectedException.sezTaxTreatment)}
                {renderStatusBadge(selectedException.status)}
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                {selectedException.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{selectedException.customerName || activeStore?.name}</span>
                {selectedException.customerGstin && (
                  <span className="font-mono text-slate-400">GSTIN: {selectedException.customerGstin}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer 4 Tabs Navigation */}
          <div className="flex items-center border-b border-slate-200 px-5 bg-white">
            {[
              { id: "details", label: "Details" },
              { id: "gst_impact", label: "GST Impact" },
              { id: "documents", label: "Documents" },
              { id: "history", label: "History" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setDrawerTab(t.id)}
                className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
                  drawerTab === t.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Drawer Body Scroll Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* ── Tab 1: Details ── */}
            {drawerTab === "details" && (
              <div className="space-y-4 text-xs">
                {/* Issue Description Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <Info size={14} className="text-blue-600" />
                    <span>Issue Description</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-normal">
                    {selectedException.description}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Invoice Total</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatCurrency(selectedException.amount)}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Billed GST</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatCurrency(selectedException.gstAmount)}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Taxable Value</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatCurrency(selectedException.taxableAmount)}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">Difference</span>
                    <p
                      className={`text-sm font-bold mt-0.5 ${
                        selectedException.differenceAmount !== 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(selectedException.differenceAmount)}
                    </p>
                  </div>
                </div>

                {/* Customer & Supply Profile */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Customer & Supply Profile</span>
                    <button
                      onClick={() => {
                        setReclassifyForm({
                          customerType: selectedException.customerType || "B2B",
                          sezTaxTreatment: selectedException.sezTaxTreatment || "WITH_PAYMENT",
                          reason: "",
                        });
                        setReclassifyModalOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Re-classify Customer Type
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Customer / Recipient</span>
                      <span className="font-medium text-slate-800">{selectedException.customerName || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">GSTIN</span>
                      <span className="font-mono font-medium text-slate-800">
                        {selectedException.customerGstin || "Unregistered (None)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Place of Supply</span>
                      <span className="font-medium text-slate-800">{selectedException.placeOfSupply || "Tamil Nadu (33)"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Customer Classification</span>
                      <span className="font-semibold text-slate-800">
                        {selectedException.customerType}
                        {selectedException.sezTaxTreatment
                          ? ` (${selectedException.sezTaxTreatment === "WITHOUT_PAYMENT_UNDER_LUT" ? "LUT Zero-Rated" : "With IGST"})`
                          : ""}
                      </span>
                    </div>
                  </div>

                  {selectedException.customerType === "SEZ" && (
                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-purple-900 text-xs space-y-1">
                      <span className="font-bold block">Special Economic Zone (SEZ) Classification</span>
                      <p className="text-[11px] leading-relaxed">
                        Supplies to SEZ Units/Developers are governed by Section 7(5)(b) of the IGST Act, 2017.
                        Treatment is {selectedException.sezTaxTreatment === "WITHOUT_PAYMENT_UNDER_LUT" ? "without payment of IGST under valid LUT / Bond" : "with payment of IGST"}.
                      </p>
                    </div>
                  )}
                </div>

                {/* Source Links */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => onNavigateTab("invoices")}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <ExternalLink size={13} />
                    <span>View Original Invoice</span>
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => onNavigateTab("clients")}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <ExternalLink size={13} />
                    <span>View Client</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Tab 2: GST Impact ── */}
            {drawerTab === "gst_impact" && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <FileCheck2 size={14} /> GST Return vs BILZET Recorded Variance
                  </span>
                  <p className="text-[11px] text-blue-700 leading-relaxed font-normal">
                    Compares actual recorded invoice figures against statutory GST schedules and integrated return filings.
                    Figures are derived strictly from authoritative database records.
                  </p>
                </div>

                {/* GST Comparison Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Tax Component</th>
                        <th className="py-2.5 px-3 text-right">Recorded (₹)</th>
                        <th className="py-2.5 px-3 text-right">Expected / Return (₹)</th>
                        <th className="py-2.5 px-3 text-right">Variance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-700">Taxable Value</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(selectedException.taxableAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {selectedException.portalTaxable !== null ? formatCurrency(selectedException.portalTaxable) : formatCurrency(selectedException.taxableAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">₹0.00</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-700">Central GST (CGST)</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(selectedException.cgst)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {selectedException.portalCgst !== null ? formatCurrency(selectedException.portalCgst) : formatCurrency(selectedException.expectedGst / 2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                          {selectedException.differenceAmount !== 0 ? formatCurrency(selectedException.differenceAmount / 2) : "₹0.00"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-700">State GST (SGST)</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(selectedException.sgst)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {selectedException.portalSgst !== null ? formatCurrency(selectedException.portalSgst) : formatCurrency(selectedException.expectedGst / 2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                          {selectedException.differenceAmount !== 0 ? formatCurrency(selectedException.differenceAmount / 2) : "₹0.00"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-700">Integrated GST (IGST)</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(selectedException.igst)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {selectedException.portalIgst !== null ? formatCurrency(selectedException.portalIgst) : "₹0.00"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">₹0.00</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="py-2.5 px-3 text-slate-900">Total GST</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(selectedException.gstAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900">{formatCurrency(selectedException.expectedGst)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">{formatCurrency(selectedException.differenceAmount)}</td>
                      </tr>
                      <tr className="bg-blue-50/40 font-bold">
                        <td className="py-2.5 px-3 text-blue-900">Invoice Grand Total</td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-900">{formatCurrency(selectedException.amount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-900">
                          {formatCurrency(Number(selectedException.taxableAmount || 0) + Number(selectedException.expectedGst || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600">{formatCurrency(selectedException.differenceAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Calculation Basis Explanation */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 text-xs">Difference Calculation Basis</span>
                  <p className="text-slate-600 text-xs leading-relaxed font-normal">
                    Variance is computed as <strong>Recorded GST ({formatCurrency(selectedException.gstAmount)}) - Expected GST ({formatCurrency(selectedException.expectedGst)}) = {formatCurrency(selectedException.differenceAmount)}</strong>.
                    {selectedException.customerType === "SEZ"
                      ? " For SEZ recipients, tax treatment requires either full zero-rating under valid LUT or Inter-State IGST."
                      : " Discrepancy may affect GSTR-1 vs GSTR-3B monthly reconciliation."}
                  </p>
                </div>
              </div>
            )}

            {/* ── Tab 3: Documents ── */}
            {drawerTab === "documents" && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Attached Documents & Evidence</span>
                  <button
                    onClick={() => setDocRequestModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold transition-colors"
                  >
                    <Plus size={13} />
                    <span>Request Document</span>
                  </button>
                </div>

                {(!selectedException.documents || selectedException.documents.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <FileText size={24} className="text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No Documents Attached</p>
                    <p className="text-xs text-slate-400">
                      Request vouchers, bills, or LUT declarations from the client store.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedException.documents.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                            <FileText size={16} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{doc.name || doc.documentType}</p>
                            <p className="text-[10px] text-slate-400">
                              {doc.status === "REQUESTED" ? "Requested from Client Store" : "Attached Voucher"}
                            </p>
                          </div>
                        </div>

                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                            Pending Upload
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab 4: History & Review Notes ── */}
            {drawerTab === "history" && (
              <div className="space-y-5 text-xs">
                {/* Add Review Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <label className="font-bold text-slate-800 block">Add Review Note</label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      placeholder="Type review observations, reconciliation comments, or adjustments..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={savingNote || !noteInput.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold self-end disabled:opacity-50 transition-colors shrink-0"
                    >
                      {savingNote ? "Saving..." : "Add"}
                    </button>
                  </div>
                </form>

                {/* Audit Timeline */}
                <div className="space-y-3">
                  <span className="font-bold text-slate-800 block">Audit Trail & Timeline</span>

                  {(!selectedException.history || selectedException.history.length === 0) ? (
                    <p className="text-slate-400 text-xs italic">No history logged yet.</p>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {selectedException.history.map((hist, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></span>
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-900">{hist.actor || "System Audit"}</span>
                              <span className="text-slate-400">{formatDate(hist.timestamp)}</span>
                            </div>
                            <p className="text-slate-600 text-xs leading-relaxed">{hist.note}</p>
                            {hist.action && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-200 text-slate-700 rounded-sm">
                                {hist.action}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Actions Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDocRequestModalOpen(true)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
              >
                Request Document
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedException.status === "RESOLVED" ? (
                <button
                  onClick={() => setReopenModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Reopen Exception</span>
                </button>
              ) : (
                <button
                  onClick={() => setResolveModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Mark as Resolved</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          FILTER DRAWER / MODAL (Req 3 Customer Type Filters)
      ══════════════════════════════════════════════════ */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col justify-between animate-slideLeft">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">Filter Exceptions</h3>
                </div>
                <button onClick={() => setFilterDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {/* Customer Type Multi-Select (Req 3) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Customer Type
                </label>
                <div className="space-y-2">
                  {[
                    { id: "B2B", label: "B2B (Business-to-Business)", count: customerTypeCounts.b2b },
                    { id: "B2C", label: "B2C (Business-to-Consumer)", count: customerTypeCounts.b2c },
                    { id: "SEZ", label: "SEZ (Special Economic Zone)", count: customerTypeCounts.sez },
                    { id: "UNCLASSIFIED", label: "Unclassified (Needs Review)", count: customerTypeCounts.unclassified },
                  ].map((ct) => {
                    const isChecked = customerTypeFilters.includes(ct.id);
                    return (
                      <label
                        key={ct.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                if (customerTypeFilters.length > 1) {
                                  setCustomerTypeFilters(customerTypeFilters.filter((t) => t !== ct.id));
                                }
                              } else {
                                setCustomerTypeFilters([...customerTypeFilters, ct.id]);
                              }
                            }}
                            className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-800">{ct.label}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                          {ct.count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REOPENED">Reopened</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="p-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="p-2 text-xs border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setCustomerTypeFilters(["B2B", "B2C", "SEZ", "UNCLASSIFIED"]);
                  setStatusFilter("ALL");
                  setDateRange({ start: "", end: "" });
                  setAmountRange({ min: "", max: "" });
                  setFilterDrawerOpen(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Reset All
              </button>
              <button
                onClick={() => {
                  setFilterDrawerOpen(false);
                  setPage(1);
                  loadExceptions();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: MARK AS RESOLVED
      ══════════════════════════════════════════════════ */}
      {resolveModalOpen && selectedException && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Mark as Resolved</h3>
                <p className="text-xs text-slate-500">Record resolution for {selectedException.referenceNumber}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Resolution Reason / Note</label>
              <textarea
                rows={3}
                placeholder="Explain how the variance was addressed (e.g. Rate adjustment in October return, credit note issued, etc.)..."
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolveModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkResolved}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Resolving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: REOPEN EXCEPTION
      ══════════════════════════════════════════════════ */}
      {reopenModalOpen && selectedException && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reopen Exception</h3>
                <p className="text-xs text-slate-500">Reopen {selectedException.referenceNumber} for review</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reason for Reopening</label>
              <textarea
                rows={3}
                placeholder="State why this exception requires reopened scrutiny..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReopenModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Reopening..." : "Reopen Exception"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: REQUEST DOCUMENT
      ══════════════════════════════════════════════════ */}
      {docRequestModalOpen && selectedException && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Request Supporting Document</h3>
                <p className="text-xs text-slate-500">Request missing voucher for {selectedException.referenceNumber}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Document Type</label>
                <select
                  value={docRequestForm.documentType}
                  onChange={(e) => setDocRequestForm({ ...docRequestForm, documentType: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="Tax Invoice Voucher">Tax Invoice Voucher</option>
                  <option value="Letter of Undertaking (LUT)">Letter of Undertaking (LUT)</option>
                  <option value="Credit Note Declaration">Credit Note Declaration</option>
                  <option value="Bank Statement Slip">Bank Statement Slip</option>
                  <option value="Goods Receipt Note (GRN)">Goods Receipt Note (GRN)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Message to Store Client</label>
                <textarea
                  rows={2}
                  placeholder="Additional instructions..."
                  value={docRequestForm.message}
                  onChange={(e) => setDocRequestForm({ ...docRequestForm, message: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDocRequestModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDocument}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Requesting..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: RE-CLASSIFY CUSTOMER TYPE (B2B, B2C, SEZ)
      ══════════════════════════════════════════════════ */}
      {reclassifyModalOpen && selectedException && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 grid place-items-center">
                <Briefcase size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Update Customer Classification</h3>
                <p className="text-xs text-slate-500">Statutory GST reporting classification</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Classification</label>
                <select
                  value={reclassifyForm.customerType}
                  onChange={(e) => setReclassifyForm({ ...reclassifyForm, customerType: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                >
                  <option value="B2B">B2B — Business-to-Business (Registered)</option>
                  <option value="B2C">B2C — Business-to-Consumer (Retail)</option>
                  <option value="SEZ">SEZ — Special Economic Zone Recipient</option>
                  <option value="UNCLASSIFIED">Unclassified / Needs Review</option>
                </select>
              </div>

              {reclassifyForm.customerType === "SEZ" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">SEZ Tax Treatment</label>
                  <select
                    value={reclassifyForm.sezTaxTreatment}
                    onChange={(e) => setReclassifyForm({ ...reclassifyForm, sezTaxTreatment: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="WITH_PAYMENT">With Payment of IGST</option>
                    <option value="WITHOUT_PAYMENT_UNDER_LUT">Without Payment of IGST under LUT / Bond</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Reason / Evidence for Classification</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Client provided valid SEZ developer certificate, or verified 15-digit GSTIN..."
                  value={reclassifyForm.reason}
                  onChange={(e) => setReclassifyForm({ ...reclassifyForm, reason: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReclassifyModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReclassify}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Save Classification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
