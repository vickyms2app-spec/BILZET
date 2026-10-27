import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  Sliders,
  FileText,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  History,
  X,
  CreditCard,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Share2,
  Trash2,
  Edit,
} from "lucide-react";
import { salesApi, settingsApi, quotationsApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import ReturnModal from "../components/invoice/ReturnModal";
import DateNavigator from "../components/common/DateNavigator";
import SearchBar from "../components/common/SearchBar";
import Button, { CompactIconButton } from "../components/common/Button";
import useRealtimeSync from "../hooks/useRealtimeSync";

// Predefined palette of soft, professional colors for deterministic avatar assignment
const AVATAR_PALETTES = [
  { bg: "#EBF5FF", text: "#007AFF", border: "#D0E2FF" }, // Blue
  { bg: "#F3E8FF", text: "#7C3AED", border: "#E9D5FF" }, // Purple
  { bg: "#E6FFFA", text: "#0D9488", border: "#B2F5EA" }, // Teal
  { bg: "#EDF8F0", text: "#248A3D", border: "#CCE8D4" }, // Green
  { bg: "#FFF4E5", text: "#C25E00", border: "#FFE2B8" }, // Orange
  { bg: "#FDF2F8", text: "#DB2777", border: "#FCE7F3" }, // Pink
  { bg: "#EEF2FF", text: "#4F46E5", border: "#E0E7FF" }, // Indigo
  { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" }, // Rose
];

const getAvatarPalette = (idOrName) => {
  const str = String(idOrName || "customer");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

export default function Invoices() {
  const nav = useNavigate();
  const location = useLocation();

  // Active Tab: 'invoices' | 'quotations'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "quotations" ? "quotations" : "invoices";
  });

  // Sync tab with URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam === "quotations" || tabParam === "invoices") {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Common filters & states
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);

  // Invoices specific states
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [returnFilter, setReturnFilter] = useState("ALL");
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnModalInvoice, setReturnModalInvoice] = useState(null);
  const [auditModalInvoice, setAuditModalInvoice] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Quotations specific states
  const [quotations, setQuotations] = useState([]);
  const [quotationStatusFilter, setQuotationStatusFilter] = useState("ALL");
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [quotationError, setQuotationError] = useState(null);

  const handleOpenAudit = async (inv, e) => {
    if (e) e.stopPropagation();
    setAuditModalInvoice(inv);
    setLoadingAudit(true);
    try {
      const res = await salesApi.getActivity(inv.id || inv._id);
      setAuditLogs(res?.activity || res?.auditTrail || []);
    } catch (err) {
      console.error("Failed to load invoice audit:", err);
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    // Load shop settings for invoice formatting
    const local = localStorage.getItem("bilzet_invoice_settings");
    if (local) {
      try {
        const raw = JSON.parse(local);
        setShopSettings(raw?.settings ? { ...raw, ...raw.settings } : raw);
      } catch (e) {}
    } else {
      settingsApi
        .get()
        .then((res) => {
          if (res) setShopSettings(res?.settings || res);
        })
        .catch(() => {});
    }

    loadInvoices();
    loadQuotations();
  }, []);

  const { status: realtimeStatus } = useRealtimeSync({
    onEvent: (type) => {
      if (
        type === "SALE_CREATED" ||
        type === "INVOICE_CREATED" ||
        type === "PAYMENT_RECORDED" ||
        type === "RETURN_PROCESSED" ||
        type === "INVOICE_VOIDED" ||
        type === "INVOICE_CORRECTION_APPLIED"
      ) {
        loadInvoices();
      }
      if (
        type === "QUOTATION_CREATED" ||
        type === "QUOTATION_UPDATED" ||
        type === "QUOTATION_CONVERTED"
      ) {
        loadQuotations();
      }
    },
  });

  const loadInvoices = () => {
    setLoading(true);
    setLoadError(null);
    salesApi
      .list({ limit: 200 })
      .then((res) => {
        let salesList = [];
        if (Array.isArray(res)) salesList = res;
        else if (Array.isArray(res?.sales)) salesList = res.sales;
        else if (Array.isArray(res?.data?.sales)) salesList = res.data.sales;
        else if (Array.isArray(res?.data)) salesList = res.data;
        setInvoices(salesList);
      })
      .catch((err) => {
        console.error("Failed to load invoices:", err);
        setLoadError(err?.response?.data?.message || err?.message || "Failed to fetch invoices");
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  };

  const loadQuotations = () => {
    setLoadingQuotations(true);
    setQuotationError(null);
    quotationsApi
      .list({ limit: 200 })
      .then((res) => {
        let quotesList = [];
        if (Array.isArray(res)) quotesList = res;
        else if (Array.isArray(res?.quotations)) quotesList = res.quotations;
        else if (Array.isArray(res?.data?.quotations)) quotesList = res.data.quotations;
        else if (Array.isArray(res?.data)) quotesList = res.data;
        setQuotations(quotesList);
      })
      .catch((err) => {
        console.error("Failed to load quotations:", err);
        setQuotationError(err?.response?.data?.message || err?.message || "Failed to fetch quotations");
        setQuotations([]);
      })
      .finally(() => setLoadingQuotations(false));
  };

  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeQuotations = Array.isArray(quotations) ? quotations : [];

  // Filter Invoices
  const filteredInvoices = safeInvoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      inv.invoiceNumber?.toLowerCase().includes(s) ||
      inv.customer?.name?.toLowerCase().includes(s) ||
      inv.customer?.phone?.includes(s) ||
      inv.customer?.gstin?.toLowerCase().includes(s);

    const rawPS = (inv.paymentStatus || (inv.paidAmount >= inv.grandTotal ? "PAID" : "UNPAID")).toUpperCase();
    let normPS = "UNPAID";
    if (rawPS === "PENDING") normPS = "PENDING";
    else if (rawPS === "PAID" || rawPS === "COMPLETED") normPS = "PAID";
    else if (rawPS === "PARTIALLY_PAID" || rawPS === "PARTIALLY PAID" || rawPS === "PARTIAL") normPS = "PARTIALLY_PAID";
    else normPS = "UNPAID";

    let matchesStatus = true;
    if (statusFilter !== "ALL") {
      matchesStatus = normPS === statusFilter;
    }

    const rawRS = (inv.returnStatus || (inv.returns && inv.returns.length > 0 ? "PARTIALLY_RETURNED" : "NONE")).toUpperCase();
    let matchesReturn = true;
    if (returnFilter !== "ALL") {
      if (returnFilter === "NONE") {
        matchesReturn = !rawRS || rawRS === "NONE";
      } else {
        matchesReturn = rawRS === returnFilter;
      }
    }

    let matchesDate = true;
    if (dateFilter?.startDate && dateFilter?.endDate) {
      const invDate = new Date(inv.createdAt || inv.date || inv.invoiceDate || Date.now());
      matchesDate = invDate >= dateFilter.startDate && invDate <= dateFilter.endDate;
    }

    return matchesSearch && matchesStatus && matchesReturn && matchesDate;
  });

  // Filter Quotations
  const filteredQuotations = safeQuotations.filter((q) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      q.quotationNumber?.toLowerCase().includes(s) ||
      q.customerName?.toLowerCase().includes(s) ||
      q.customerPhone?.includes(s) ||
      q.customerGstin?.toLowerCase().includes(s);

    let matchesStatus = true;
    if (quotationStatusFilter !== "ALL") {
      matchesStatus = (q.status || "DRAFT").toUpperCase() === quotationStatusFilter;
    }

    let matchesDate = true;
    if (dateFilter?.startDate && dateFilter?.endDate) {
      const qDate = new Date(q.quotationDate || q.createdAt || Date.now());
      matchesDate = qDate >= dateFilter.startDate && qDate <= dateFilter.endDate;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleOpenInvoice = (inv) => {
    salesApi
      .get(inv.id || inv._id)
      .then((res) => {
        const fullInv = res?.sale || res || inv;
        setSelectedInvoice(fullInv);
      })
      .catch(() => {
        setSelectedInvoice(inv);
      });
  };

  const handleOpenQuotation = (q) => {
    // Format quote structure into TaxInvoice component compatible format
    const formatted = {
      ...q,
      documentType: "quotation",
      type: "quotation",
      isQuotation: true,
      invoiceNumber: q.quotationNumber,
      billNumber: q.quotationNumber,
      date: q.quotationDate || q.createdAt,
      createdAt: q.quotationDate || q.createdAt,
      validUntil: q.expiryDate,
      expiryDate: q.expiryDate,
      customer: {
        name: q.customerName || "Prospective Client",
        phone: q.customerPhone || "",
        address: q.customerAddress || "",
        gstin: q.customerGstin || "",
      },
      items: (q.items || []).map((it) => ({
        ...it,
        name: it.name || "Item",
        qty: it.quantity !== undefined ? it.quantity : (it.qty || 1),
        rate: it.rate !== undefined ? it.rate : (it.unitPrice || 0),
        gst: it.gstRate !== undefined ? it.gstRate : 18,
        taxable: it.taxable !== undefined ? it.taxable : ((Number(it.rate || 0) * Number(it.quantity || 1)) - Number(it.discount || 0)),
        total: it.total !== undefined ? it.total : (Number(it.rate || 0) * Number(it.quantity || 1)),
      })),
      subtotal: Number(q.subtotal || 0),
      discountTotal: Number(q.discountTotal || 0),
      taxTotal: Number(q.taxTotal || 0),
      grandTotal: Number(q.grandTotal || 0),
      notes: q.notes,
      terms: q.terms,
    };
    setSelectedInvoice(formatted);
  };

  const handleConvertQuotation = (q, e) => {
    if (e) e.stopPropagation();
    nav("/billing", { state: { quotationToConvert: q } });
  };

  const handleEditQuotation = (q, e) => {
    if (e) e.stopPropagation();
    nav("/billing", { state: { editQuotation: q } });
  };

  const handleUpdateQuotationStatus = async (qId, status, e) => {
    if (e) e.stopPropagation();
    try {
      await quotationsApi.updateStatus(qId, status);
      loadQuotations();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteQuotation = async (qId, qNum, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete Quotation #${qNum}?`)) {
      try {
        await quotationsApi.remove(qId);
        loadQuotations();
      } catch (err) {
        console.error("Failed to delete quotation:", err);
      }
    }
  };

  const handleShareQuotation = (q, e) => {
    if (e) e.stopPropagation();
    const text = `Quotation #${q.quotationNumber}\nCustomer: ${q.customerName || "Customer"}\nTotal Quoted: ₹${Number(q.grandTotal || 0).toFixed(2)}\nValidity: Valid until ${q.expiryDate ? q.expiryDate.split("T")[0] : "15 days"}`;
    if (navigator.share) {
      navigator.share({ title: `Quotation #${q.quotationNumber}`, text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("Quotation details copied to clipboard!");
    }
  };

  const handleSwitchTab = (tab) => {
    setActiveTab(tab);
    nav(`/invoices?tab=${tab}`, { replace: true });
  };

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER WITH DOCUMENT TYPE SWITCHER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl border grid place-items-center shrink-0 shadow-2xs transition ${
              activeTab === "quotations"
                ? "bg-purple-50 text-purple-600 border-purple-200"
                : "bg-blue-50 text-blue-600 border-blue-100"
            }`}
          >
            {activeTab === "quotations" ? (
              <FileSpreadsheet size={22} />
            ) : (
              <FileText size={22} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">
                {activeTab === "quotations" ? "Quotations & Proposals" : "Invoices & Sales History"}
              </h1>
              {activeTab === "quotations" ? (
                <span className="badge font-mono bg-purple-50 text-purple-700 border border-purple-200">
                  {filteredQuotations.length} {filteredQuotations.length === 1 ? "Quote" : "Quotes"}
                </span>
              ) : (
                <span className="badge badge-info font-mono">
                  {filteredInvoices.length} {filteredInvoices.length === 1 ? "Bill" : "Bills"}
                </span>
              )}
            </div>
            <p className="page-desc">
              {activeTab === "quotations"
                ? "Manage customer cost proposals, track approvals, and convert accepted quotes into tax invoices"
                : "Complete invoice lifecycle tracking, GST adjustments, partial payments & returns"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          {/* Top Document Tab Switcher (Sales Invoices vs Quotations) */}
          <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              id="invoices-tab-btn"
              onClick={() => handleSwitchTab("invoices")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "invoices"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText size={13} />
              <span>Invoices</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                {safeInvoices.length}
              </span>
            </button>
            <button
              type="button"
              id="quotations-tab-btn"
              onClick={() => handleSwitchTab("quotations")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "quotations"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>Quotations</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
                {safeQuotations.length}
              </span>
            </button>
          </div>

          <Button
            variant="neutral"
            size="sm"
            icon={RefreshCw}
            loading={activeTab === "quotations" ? loadingQuotations : loading}
            onClick={activeTab === "quotations" ? loadQuotations : loadInvoices}
            title={activeTab === "quotations" ? "Refresh Quotations" : "Refresh Invoices List"}
          >
            Refresh
          </Button>

          {activeTab === "quotations" ? (
            <button
              type="button"
              onClick={() => nav("/billing?type=quotation")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Create Quotation</span>
            </button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => nav("/billing")}
            >
              Create Bill
            </Button>
          )}
        </div>
      </div>

      {/* Error state if load failed */}
      {loadError && activeTab === "invoices" && (
        <div className="p-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadInvoices}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {quotationError && activeTab === "quotations" && (
        <div className="p-3.5 rounded-xl text-xs font-medium flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{quotationError}</span>
          </div>
          <button
            type="button"
            onClick={loadQuotations}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          DATE NAVIGATOR (DAY / MONTH / YEAR / RANGE)
      ══════════════════════════════════════════════════ */}
      <DateNavigator
        initialView="month"
        onChange={setDateFilter}
      />

      {/* ══════════════════════════════════════════════════
          FILTER & SEARCH TOOLBAR
      ══════════════════════════════════════════════════ */}
      <div className="card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder={
            activeTab === "quotations"
              ? "Search by quotation #, customer, phone, or GSTIN..."
              : "Search by invoice #, customer name, mobile, or GSTIN..."
          }
          className="max-w-md w-full"
        />

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "invoices" ? (
            <>
              {/* Payment Status Tabs */}
              <div className="seg-tabs flex-wrap">
                {[
                  { id: "ALL", label: "All Bills" },
                  { id: "PAID", label: "Paid" },
                  { id: "PARTIALLY_PAID", label: "Partially Paid" },
                  { id: "PENDING", label: "Pending" },
                  { id: "UNPAID", label: "Unpaid" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setStatusFilter(pill.id)}
                    className={`seg-tab ${statusFilter === pill.id ? "active" : ""}`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Return Status Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
                <RotateCcw size={13} className="text-slate-400" />
                <select
                  value={returnFilter}
                  onChange={(e) => setReturnFilter(e.target.value)}
                  className="bg-transparent font-medium text-slate-800 outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Returns</option>
                  <option value="NONE">No Returns</option>
                  <option value="PARTIALLY_RETURNED">Partially Returned</option>
                  <option value="RETURNED">Fully Returned</option>
                </select>
              </div>
            </>
          ) : (
            /* Quotations Status Filter Tabs */
            <div className="seg-tabs flex-wrap">
              {[
                { id: "ALL", label: "All Quotations" },
                { id: "DRAFT", label: "Draft" },
                { id: "SENT", label: "Sent" },
                { id: "ACCEPTED", label: "Accepted" },
                { id: "REJECTED", label: "Rejected" },
                { id: "EXPIRED", label: "Expired" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setQuotationStatusFilter(pill.id)}
                  className={`seg-tab ${quotationStatusFilter === pill.id ? "active" : ""}`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABLE: INVOICES OR QUOTATIONS
      ══════════════════════════════════════════════════ */}
      {activeTab === "invoices" ? (
        /* ── INVOICES TABLE ── */
        <div className="card p-0 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Payment Status</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Return Status</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">GST Output</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Net Payable</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Balance Due</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading invoice history records...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 px-4 text-center">
                      <div className="empty-state-icon mx-auto">
                        <FileText size={20} />
                      </div>
                      <p className="font-semibold text-sm text-slate-800">No invoices match your search</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Try clearing search filters or create a new invoice to get started.
                      </p>
                      <button
                        onClick={() => nav("/billing")}
                        className="btn-primary mt-4 text-xs inline-flex items-center gap-1.5"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Create New Bill</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => {
                    const custName = inv.customer?.name || "Cash Customer";
                    const initial = custName.trim().charAt(0).toUpperCase();
                    const palette = getAvatarPalette(
                      inv.customer?.id || inv.customer?._id || inv.invoiceNumber || `${custName}-${idx}`
                    );
                    const rawPS = (inv.paymentStatus || (inv.paidAmount >= inv.grandTotal ? "PAID" : "UNPAID")).toUpperCase();
                    const isPaid = rawPS === "PAID" || rawPS === "COMPLETED";
                    const isPartial = rawPS === "PARTIALLY_PAID" || rawPS === "PARTIALLY PAID" || rawPS === "PARTIAL";
                    const isPending = rawPS === "PENDING";

                    const retStatus = (inv.returnStatus || (inv.returns?.length > 0 ? "PARTIALLY_RETURNED" : "NONE")).toUpperCase();

                    const netPayable = inv.netPayable !== undefined ? Number(inv.netPayable) : Number(inv.grandTotal || 0);
                    const balanceDue = inv.balanceDue !== undefined ? Number(inv.balanceDue) : Math.max(0, netPayable - Number(inv.paidAmount || 0));
                    const gstTotal = inv.taxTotal !== undefined ? Number(inv.taxTotal) : 0;

                    return (
                      <tr
                        key={inv._id || inv.id || inv.invoiceNumber}
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                        onClick={() => handleOpenInvoice(inv)}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold text-blue-600 block">
                            {inv.invoiceNumber}
                          </span>
                          {inv.referenceQuotationNumber && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.2 mt-0.5" title="Generated from Quotation">
                              From Quote #{inv.referenceQuotationNumber}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
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
                              <p className="font-semibold text-slate-800 leading-tight">{custName}</p>
                              {inv.customer?.phone && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{inv.customer.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {new Date(inv.createdAt || Date.now()).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isPartial
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isPending
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPaid
                                  ? "bg-emerald-500"
                                  : isPartial
                                  ? "bg-blue-500"
                                  : isPending
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            {isPaid ? "PAID" : isPartial ? "PARTIAL" : isPending ? "PENDING" : "UNPAID"}
                          </span>
                        </td>

                        {/* Return Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {retStatus === "RETURNED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                              Returned
                            </span>
                          ) : retStatus === "PARTIALLY_RETURNED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              Partial Ret.
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          ₹{gstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                          ₹{netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className={balanceDue > 0 ? "font-bold text-rose-600" : "text-slate-400"}>
                            ₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {retStatus !== "RETURNED" && (
                              <CompactIconButton
                                variant="danger"
                                size="sm"
                                icon={RotateCcw}
                                onClick={() => setReturnModalInvoice(inv)}
                                title="Initiate Return & Issue Credit Note"
                              />
                            )}
                            <CompactIconButton
                              variant="secondary"
                              size="sm"
                              icon={History}
                              onClick={(e) => handleOpenAudit(inv, e)}
                              title="View CA Synchronized Audit Trail"
                            />
                            <CompactIconButton
                              variant="primary"
                              size="sm"
                              icon={Eye}
                              onClick={() => handleOpenInvoice(inv)}
                              title="View Product Breakdown & Audit Trail"
                            />
                            <CompactIconButton
                              variant="success"
                              size="sm"
                              icon={Printer}
                              onClick={() => handleOpenInvoice(inv)}
                              title="Print Tax Invoice"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── QUOTATIONS TABLE ── */
        <div className="card p-0 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quotation #</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Issue Date</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Valid Until</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Tax Total</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Quoted Total</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Linked Invoice</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loadingQuotations ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Loading quotation records...
                    </td>
                  </tr>
                ) : filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 px-4 text-center">
                      <div className="empty-state-icon mx-auto bg-purple-50 text-purple-600">
                        <FileSpreadsheet size={20} />
                      </div>
                      <p className="font-semibold text-sm text-slate-800">No quotations match your criteria</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Create a formal price proposal for prospective clients from the billing screen.
                      </p>
                      <button
                        onClick={() => nav("/billing?type=quotation")}
                        className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Create Quotation</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((q, idx) => {
                    const custName = q.customerName || "Prospective Client";
                    const initial = custName.trim().charAt(0).toUpperCase();
                    const palette = getAvatarPalette(
                      q.id || q._id || q.quotationNumber || `${custName}-${idx}`
                    );
                    const qStatus = (q.status || "DRAFT").toUpperCase();
                    const isAccepted = qStatus === "ACCEPTED";
                    const isSent = qStatus === "SENT";
                    const isRejected = qStatus === "REJECTED";
                    const isExpired = qStatus === "EXPIRED";

                    const issueDate = q.quotationDate
                      ? new Date(q.quotationDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    const validDate = q.expiryDate
                      ? new Date(q.expiryDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "15 Days";

                    const isConverted = Boolean(q.convertedToInvoiceId || q.convertedInvoice);
                    const convertedInvNum = q.convertedInvoice?.invoiceNumber || (q.convertedToInvoiceId ? "Invoice Created" : null);

                    return (
                      <tr
                        key={q._id || q.id || q.quotationNumber}
                        className="hover:bg-purple-50/30 transition cursor-pointer"
                        onClick={() => handleOpenQuotation(q)}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-purple-700">
                          {q.quotationNumber}
                        </td>

                        <td className="py-3.5 px-4">
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
                              <p className="font-semibold text-slate-800 leading-tight">{custName}</p>
                              {q.customerPhone && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{q.customerPhone}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {issueDate}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {validDate}
                        </td>

                        {/* Status Badge & Selector */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isSent
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : isRejected
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : isExpired
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isAccepted
                                    ? "bg-emerald-500"
                                    : isSent
                                    ? "bg-blue-500"
                                    : isRejected
                                    ? "bg-rose-500"
                                    : isExpired
                                    ? "bg-amber-500"
                                    : "bg-slate-500"
                                }`}
                              />
                              {qStatus}
                            </span>
                            <select
                              value={qStatus}
                              onChange={(e) => handleUpdateQuotationStatus(q.id || q._id, e.target.value, e)}
                              className="text-[10px] text-slate-500 bg-white border border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer"
                              title="Update quotation status"
                            >
                              <option value="DRAFT">Draft</option>
                              <option value="SENT">Sent</option>
                              <option value="ACCEPTED">Accepted</option>
                              <option value="REJECTED">Rejected</option>
                              <option value="EXPIRED">Expired</option>
                            </select>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          ₹{Number(q.taxTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                          ₹{Number(q.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Linked Invoice status */}
                        <td className="py-3.5 px-4 text-center">
                          {isConverted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCircle2 size={11} className="text-blue-600" />
                              <span>{convertedInvNum}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Pending Conversion</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Convert to Invoice button */}
                            <button
                              type="button"
                              onClick={(e) => handleConvertQuotation(q, e)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] border border-blue-200 transition cursor-pointer"
                              title="Convert this quotation into an official Tax Invoice"
                            >
                              <ArrowRight size={12} />
                              <span>Convert</span>
                            </button>

                            {/* Preview */}
                            <CompactIconButton
                              variant="secondary"
                              size="sm"
                              icon={Eye}
                              onClick={() => handleOpenQuotation(q)}
                              title="Preview Quotation Document"
                            />

                            {/* Edit in Billing */}
                            <CompactIconButton
                              variant="neutral"
                              size="sm"
                              icon={Edit}
                              onClick={(e) => handleEditQuotation(q, e)}
                              title="Edit Quotation in POS"
                            />

                            {/* Share */}
                            <CompactIconButton
                              variant="neutral"
                              size="sm"
                              icon={Share2}
                              onClick={(e) => handleShareQuotation(q, e)}
                              title="Share Quotation"
                            />

                            {/* Delete */}
                            <CompactIconButton
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={(e) => handleDeleteQuotation(q.id || q._id, q.quotationNumber, e)}
                              title="Delete Quotation"
                            />
                          </div>
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
          TAX INVOICE / QUOTATION MODAL
      ══════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <TaxInvoice
          invoice={selectedInvoice}
          shopSettings={shopSettings}
          isModal={true}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          PRODUCT RETURN & CREDIT NOTE MODAL
      ══════════════════════════════════════════════════ */}
      {returnModalInvoice && (
        <ReturnModal
          invoice={returnModalInvoice}
          onClose={() => setReturnModalInvoice(null)}
          onSuccess={(updatedSale) => {
            loadInvoices();
            setSelectedInvoice(updatedSale);
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════
          CA AUDIT TRAIL MODAL (IMMUTABLE DATABASE LOGS)
      ══════════════════════════════════════════════════ */}
      {auditModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs fade-up">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Audit Trail: {auditModalInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Authoritative PostgreSQL ledger synchronized with CA Connect
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditModalInvoice(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {loadingAudit ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={18} className="animate-spin text-indigo-600" />
                  <span>Loading audit trail...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No subsequent modification logs found. Invoice is in original creation state.
                </div>
              ) : (
                auditLogs.map((log) => {
                  const d = log.details || {};
                  return (
                    <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          {log.action || d.eventType}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestamp || log.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {log.user && (
                        <div className="text-[11px] text-slate-600">
                          Performed by: <strong>{log.user.name || log.user.email}</strong> ({log.user.role})
                        </div>
                      )}
                      {d.before && d.after && (
                        <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono space-y-1">
                          <div className="text-slate-500 font-bold uppercase text-[9px]">Financial Transition:</div>
                          <div>Total: ₹{Number(d.before.grandTotal || 0).toFixed(0)} → ₹{Number(d.after.grandTotal || 0).toFixed(0)}</div>
                          <div>Paid: ₹{Number(d.before.paidAmount || 0).toFixed(0)} → ₹{Number(d.after.paidAmount || 0).toFixed(0)}</div>
                          <div>Due: ₹{Number(d.before.balanceDue || 0).toFixed(0)} → ₹{Number(d.after.balanceDue || 0).toFixed(0)}</div>
                        </div>
                      )}
                      {d.creditNoteNumber && (
                        <div className="text-purple-700 font-semibold text-[11px]">
                          Issued Credit Note: #{d.creditNoteNumber} (GST Reversal: ₹{Number(d.gstAdjustment || 0).toFixed(2)})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button variant="secondary" size="sm" onClick={() => setAuditModalInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
