import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Calendar,
  Percent,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  RotateCcw,
  Printer,
  History,
  X,
  ChevronRight,
  Info,
  DollarSign,
  PackageCheck,
  Scale,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { caPortalApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import Button, { CompactIconButton } from "../components/common/Button";

export default function CaPortal() {
  const { user } = useAuth();
  const isCAUser = user?.role === "CA" || user?.role === "SUPER_ADMIN" || user?.isSuperAdmin;

  // Stores State
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);

  // Data State
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("invoices"); // "invoices" | "returns" | "gst"
  const [searchQuery, setSearchQuery] = useState("");
  const [creditNoteSearch, setCreditNoteSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [returnFilter, setReturnFilter] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCreditNote, setSelectedCreditNote] = useState(null);
  const [auditTrailInvoice, setAuditTrailInvoice] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // 1. Fetch authorized stores for this CA
  useEffect(() => {
    if (!isCAUser) return;
    setLoadingStores(true);
    caPortalApi
      .getStores()
      .then((res) => {
        const list = res?.stores || [];
        setStores(list);
        if (list.length > 0) {
          setSelectedStoreId(list[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load authorized stores for CA:", err);
        setStores([]);
      })
      .finally(() => setLoadingStores(false));
  }, [isCAUser]);

  // 2. Fetch invoices and financial summary
  const loadStoreData = async () => {
    if (!selectedStoreId) return;
    setLoadingData(true);
    try {
      const params = { storeId: selectedStoreId };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== "ALL") params.paymentStatus = statusFilter;
      if (returnFilter !== "ALL") params.returnStatus = returnFilter;
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [invRes, sumRes] = await Promise.all([
        caPortalApi.getInvoices(params),
        caPortalApi.getFinancialSummary({
          storeId: selectedStoreId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          month: selectedMonth || undefined,
          year: selectedYear || undefined,
        }),
      ]);

      setInvoices(invRes?.invoices || []);
      setSummary(sumRes?.summary || null);
    } catch (err) {
      console.error("Failed to fetch store data for CA:", err);
      setInvoices([]);
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Fetch credit notes
  const loadCreditNotesData = async () => {
    if (!selectedStoreId) return;
    setLoadingCreditNotes(true);
    try {
      const params = { storeId: selectedStoreId };
      if (creditNoteSearch.trim()) params.search = creditNoteSearch.trim();
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await caPortalApi.getCreditNotes(params);
      setCreditNotes(res?.creditNotes || []);
    } catch (err) {
      console.error("Failed to fetch credit notes for CA:", err);
      setCreditNotes([]);
    } finally {
      setLoadingCreditNotes(false);
    }
  };

  useEffect(() => {
    if (selectedStoreId) {
      loadStoreData();
      loadCreditNotesData();
    }
  }, [selectedStoreId, statusFilter, returnFilter, selectedMonth, selectedYear, startDate, endDate]);

  // Debounced search for invoices
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedStoreId) loadStoreData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced search for credit notes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedStoreId) loadCreditNotesData();
    }, 350);
    return () => clearTimeout(timer);
  }, [creditNoteSearch]);

  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  // Handle opening an invoice modal
  const handleOpenInvoice = (inv) => {
    caPortalApi
      .getInvoice(inv.id || inv._id)
      .then((res) => {
        setSelectedInvoice(res?.invoice || res || inv);
      })
      .catch(() => {
        setSelectedInvoice(inv);
      });
  };

  // Handle opening audit trail
  const handleOpenAuditTrail = async (inv, e) => {
    if (e) e.stopPropagation();
    setAuditTrailInvoice(inv);
    setLoadingAudit(true);
    try {
      const res = await caPortalApi.getAuditTrail(inv.id || inv._id);
      setAuditLogs(res?.auditTrail || []);
    } catch (err) {
      console.error("Failed to fetch audit trail:", err);
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Quick preset period filter
  const handleSetQuickPeriod = (preset) => {
    const now = new Date();
    if (preset === "ALL") {
      setSelectedMonth("");
      setSelectedYear("");
      setStartDate("");
      setEndDate("");
    } else if (preset === "THIS_MONTH") {
      setSelectedMonth(String(now.getMonth() + 1));
      setSelectedYear(String(now.getFullYear()));
      setStartDate("");
      setEndDate("");
    } else if (preset === "THIS_YEAR") {
      setSelectedMonth("");
      setSelectedYear(String(now.getFullYear()));
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = now.toISOString().split("T")[0];
      setSelectedMonth("");
      setSelectedYear("");
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  };

  // ══════════════════════════════════════════════════
  // EXPORT & REPORT GENERATORS (Req 6)
  // ══════════════════════════════════════════════════

  // Export Invoices to CSV
  const handleExportInvoicesCSV = () => {
    if (!invoices || invoices.length === 0) return;

    const headers = [
      "Invoice #",
      "Date",
      "Customer Name",
      "Customer GSTIN",
      "Supply Type",
      "Taxable Value (₹)",
      "CGST (₹)",
      "SGST (₹)",
      "IGST (₹)",
      "Total GST (₹)",
      "Gross Invoice Total (₹)",
      "Returned Amount (₹)",
      "Net Payable (₹)",
      "Paid Amount (₹)",
      "Balance Due (₹)",
      "Payment Status",
      "Return Status",
    ];

    const rows = invoices.map((inv) => [
      `"${inv.invoiceNumber || ""}"`,
      `"${new Date(inv.date || inv.createdAt).toLocaleDateString("en-IN")}"`,
      `"${inv.customer?.name || "Walk-in Retail Customer"}"`,
      `"${inv.customer?.gstin || "N/A"}"`,
      `"${inv.customer?.isB2B ? "B2B" : "B2C"}"`,
      inv.taxableAmount || 0,
      inv.cgst || 0,
      inv.sgst || 0,
      inv.igst || 0,
      inv.taxTotal || 0,
      inv.grandTotal || 0,
      inv.totalReturnedAmount || 0,
      inv.netPayable || inv.grandTotal || 0,
      inv.paidAmount || 0,
      inv.balanceDue || 0,
      `"${inv.paymentStatus || ""}"`,
      `"${inv.returnStatus || (inv.returns?.length > 0 ? "PARTIALLY_RETURNED" : "NONE")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CA_Invoices_Register_${activeStore?.name?.replace(/\s+/g, "_") || "Store"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Credit Notes to CSV
  const handleExportCreditNotesCSV = () => {
    if (!creditNotes || creditNotes.length === 0) return;

    const headers = [
      "Credit Note #",
      "Return Date",
      "Original Invoice #",
      "Original Invoice Date",
      "Customer Name",
      "Customer GSTIN",
      "Return Reason",
      "Returned Items Count",
      "Taxable Value Reversal (₹)",
      "CGST Reversal (₹)",
      "SGST Reversal (₹)",
      "IGST Reversal (₹)",
      "Total GST Adjustment (₹)",
      "Total Credit Note Value (₹)",
      "Refund Status",
      "Settlement Method",
    ];

    const rows = creditNotes.map((cn) => [
      `"${cn.creditNoteNumber || cn.returnNumber || ""}"`,
      `"${new Date(cn.returnDate || cn.createdAt).toLocaleDateString("en-IN")}"`,
      `"${cn.invoiceNumber || ""}"`,
      `"${cn.originalInvoiceDate ? new Date(cn.originalInvoiceDate).toLocaleDateString("en-IN") : "N/A"}"`,
      `"${cn.customer?.name || "Walk-in Retail Customer"}"`,
      `"${cn.customer?.gstin || "N/A"}"`,
      `"${cn.reason || "Customer Return"}"`,
      cn.items?.length || 0,
      cn.taxableAmount || 0,
      cn.cgstAdjustment || 0,
      cn.sgstAdjustment || 0,
      cn.igstAdjustment || 0,
      cn.gstAdjustment || 0,
      cn.totalAmount || 0,
      `"${cn.refundStatus || "COMPLETED"}"`,
      `"${cn.settlementDetails?.method || "CASH"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CA_CreditNotes_Register_${activeStore?.name?.replace(/\s+/g, "_") || "Store"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF Report Generator
  const handlePrintAuditReport = () => {
    window.print();
  };

  // ── Access Denied Screen (Strict Role Guard Req 5) ──
  if (!isCAUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 fade-up">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-100 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl mx-auto grid place-items-center border border-red-200">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Restricted Access</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            The Chartered Accountant Portal is reserved exclusively for authenticated users
            holding the <strong>CA (Chartered Accountant)</strong> role. Your current account
            does not have CA auditing privileges.
          </p>
          <div className="pt-2">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate Metrics (Req 1)
  const metrics = summary?.metrics || {
    totalInvoices: invoices.length,
    totalSalesBeforeReturns: invoices.reduce((s, i) => s + (i.grandTotal || 0), 0),
    totalReturnsAmount: invoices.reduce((s, i) => s + Number(i.totalReturnedAmount || 0), 0),
    totalReturnsAndCreditNotes: invoices.reduce((s, i) => s + Number(i.totalReturnedAmount || 0), 0),
    netSalesAfterReturns: invoices.reduce((s, i) => s + (i.netPayable || i.grandTotal || 0), 0),
    gstCollectedOnSales: invoices.reduce((s, i) => s + (i.originalTaxTotal || i.taxTotal || 0), 0),
    gstAdjustmentsFromReturns: invoices.reduce((s, i) => s + (i.gstAdjustment || 0), 0),
    paymentsReceived: invoices.reduce((s, i) => s + (i.paidAmount || 0), 0),
    outstandingBalances: invoices.reduce((s, i) => s + (i.balanceDue || 0), 0),
    totalTaxable: invoices.reduce((s, i) => s + (i.taxableAmount || 0), 0),
    totalCgst: invoices.reduce((s, i) => s + (i.cgst || 0), 0),
    totalSgst: invoices.reduce((s, i) => s + (i.sgst || 0), 0),
    totalIgst: invoices.reduce((s, i) => s + (i.igst || 0), 0),
  };

  return (
    <div className="space-y-6 pb-16 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER & STORE SWITCHER (Req 5 Multi-tenant)
      ══════════════════════════════════════════════════ */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 print:border-none print:shadow-none print:p-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 grid place-items-center shrink-0 shadow-2xs print:hidden">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Chartered Accountant (CA) Portal
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 print:hidden">
                <CheckCircle2 size={12} /> Certified CA Auditor Workspace
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Multi-store invoice verification, product return audit, and GST reconciliation
            </p>
          </div>
        </div>

        {/* Store Selection & Actions Dropdown */}
        <div className="flex items-center gap-3 self-stretch md:self-auto print:hidden">
          <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
            <Building2 size={18} className="text-slate-500 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Authorized Store
              </span>
              {loadingStores ? (
                <span className="text-xs text-slate-400 font-medium">Loading stores...</span>
              ) : stores.length === 0 ? (
                <span className="text-xs text-rose-600 font-medium">No stores assigned</span>
              ) : (
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gstin ? `(${s.gstin})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              loadStoreData();
              loadCreditNotesData();
            }}
            title="Refresh Store Data"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs"
          >
            <RefreshCw size={16} className={loadingData || loadingCreditNotes ? "animate-spin text-blue-600" : ""} />
          </button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={handlePrintAuditReport}
            title="Print Audit Report or Save as PDF"
            className="hidden sm:inline-flex"
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Empty State when no stores are connected */}
      {stores.length === 0 && !loadingStores && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
          <Building2 size={36} className="mx-auto text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">No Stores Authorized Yet</h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            You do not currently have audit authorization for any shop accounts. Shop owners must explicitly authorize your CA account ({user?.email}) through their <strong>CA Connect</strong> settings before you can inspect their records.
          </p>
        </div>
      )}

      {stores.length > 0 && (
        <>
          {/* ══════════════════════════════════════════════════
              REQ 1: COMPREHENSIVE CA DASHBOARD (7 REQUIRED METRICS)
          ══════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-3.5 print:grid-cols-4">
            {/* Metric 1: Total Invoices */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Invoices</span>
                <FileText size={15} className="text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5">
                {metrics.totalInvoices}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Audit Invoices</span>
            </div>

            {/* Metric 2: Total Sales Before Returns */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Sales Before Returns</span>
                <TrendingUp size={15} className="text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 font-mono">
                ₹{Number(metrics.totalSalesBeforeReturns || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Gross Sales Value</span>
            </div>

            {/* Metric 3: Total Returns and Credit Notes */}
            <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-xs">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Returns &amp; Credit Notes</span>
                <RotateCcw size={15} className="text-purple-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1.5 font-mono">
                ₹{Number(metrics.totalReturnsAmount || metrics.totalReturnsAndCreditNotes || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-purple-600 mt-0.5 block">
                {metrics.totalReturnsCount || creditNotes.length} Credit Notes Issued
              </span>
            </div>

            {/* Metric 4: Net Sales After Returns */}
            <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs">
              <div className="flex items-center justify-between text-indigo-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Net Sales After Returns</span>
                <Scale size={15} className="text-indigo-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-1.5 font-mono">
                ₹{Number(metrics.netSalesAfterReturns || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-indigo-600 mt-0.5 block">Reconciled Turnover</span>
            </div>

            {/* Metric 5: GST Collected on Sales */}
            <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs">
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">GST Collected</span>
                <Percent size={15} className="text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1.5 font-mono">
                ₹{Number(metrics.gstCollectedOnSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-blue-600 mt-0.5 block">
                Gross Output Tax
              </span>
            </div>

            {/* Metric 6: GST Adjustments from Returns */}
            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">GST Adjustments</span>
                <RotateCcw size={15} className="text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1.5 font-mono">
                -₹{Number(metrics.gstAdjustmentsFromReturns || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-amber-600 mt-0.5 block">
                Net GST: ₹{Number(metrics.netGst || (metrics.gstCollectedOnSales - metrics.gstAdjustmentsFromReturns) || 0).toFixed(0)}
              </span>
            </div>

            {/* Metric 7: Payments Received & Outstanding Balances */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-[10px] font-bold uppercase tracking-wider">Payments &amp; Dues</span>
                <CreditCard size={15} className="text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1.5 font-mono">
                ₹{Number(metrics.paymentsReceived || metrics.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-rose-600 font-bold mt-0.5 font-mono">
                Due: ₹{Number(metrics.outstandingBalances || metrics.totalBalanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Quick Period Selector (Req 4) */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50/80 p-3 rounded-2xl border border-slate-200 text-xs print:hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Calendar size={14} /> Quick Filter:
              </span>
              {[
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "THIS_MONTH", label: "This Month" },
                { id: "THIS_YEAR", label: "This Year" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSetQuickPeriod(p.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    (!selectedMonth && !selectedYear && !startDate && p.id === "ALL") ||
                    (selectedMonth === String(new Date().getMonth() + 1) && p.id === "THIS_MONTH") ||
                    (selectedYear === String(new Date().getFullYear()) && !selectedMonth && p.id === "THIS_YEAR")
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                Authorized GSTIN: <strong className="font-mono text-slate-800">{activeStore?.gstin || "Unregistered / Composition"}</strong>
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              MAIN SECTION TABS
          ══════════════════════════════════════════════════ */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:hidden">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab("invoices")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "invoices"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <FileText size={16} /> Invoices Register ({invoices.length})
              </button>
              <button
                onClick={() => setActiveTab("returns")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "returns"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <RotateCcw size={16} /> Returns &amp; Credit Notes ({creditNotes.length})
              </button>
              <button
                onClick={() => setActiveTab("gst")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "gst"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Percent size={16} /> GST Tax Filing &amp; Slabs Analysis
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "invoices" && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={handleExportInvoicesCSV}
                  title="Export Invoices to CSV"
                >
                  Export Invoices CSV
                </Button>
              )}
              {activeTab === "returns" && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Download}
                  onClick={handleExportCreditNotesCSV}
                  title="Export Credit Notes to CSV"
                >
                  Export Credit Notes CSV
                </Button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              TAB 1: INVOICE MANAGEMENT REGISTER (Req 2)
          ══════════════════════════════════════════════════ */}
          {activeTab === "invoices" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {/* Filter Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Invoice #, Customer, GSTIN, Phone..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Payment Status Filter (Paid, Unpaid, Pending, Partially Paid) */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
                    {[
                      { id: "ALL", label: "All" },
                      { id: "PAID", label: "Paid" },
                      { id: "PARTIALLY_PAID", label: "Partial" },
                      { id: "PENDING", label: "Pending" },
                      { id: "UNPAID", label: "Unpaid" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setStatusFilter(st.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                          statusFilter === st.id
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Return Status Filter (Returned, Partially Returned, None) */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-600">
                    <RotateCcw size={13} className="text-slate-400" />
                    <select
                      value={returnFilter}
                      onChange={(e) => setReturnFilter(e.target.value)}
                      className="bg-transparent font-medium text-slate-800 outline-hidden cursor-pointer"
                    >
                      <option value="ALL">All Return Status</option>
                      <option value="NONE">No Returns</option>
                      <option value="PARTIALLY_RETURNED">Partially Returned</option>
                      <option value="RETURNED">Fully Returned</option>
                    </select>
                  </div>

                  {/* Month & Year Filter */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent font-medium text-slate-700 outline-hidden cursor-pointer"
                    >
                      <option value="">Month</option>
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map((m, idx) => (
                        <option key={m} value={m}>
                          {new Date(2026, idx, 1).toLocaleString("en-US", { month: "short" })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent font-medium text-slate-700 outline-hidden cursor-pointer"
                    >
                      <option value="">Year</option>
                      {["2026", "2025", "2024"].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Pickers */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
                    <Calendar size={14} className="text-slate-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs text-slate-700 bg-transparent outline-hidden cursor-pointer"
                    />
                    <span className="text-xs text-slate-300">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs text-slate-700 bg-transparent outline-hidden cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4 text-right">Taxable (₹)</th>
                      <th className="py-3 px-4 text-right">CGST (₹)</th>
                      <th className="py-3 px-4 text-right">SGST (₹)</th>
                      <th className="py-3 px-4 text-right">IGST (₹)</th>
                      <th className="py-3 px-4 text-right">Total (₹)</th>
                      <th className="py-3 px-4 text-right">Paid (₹)</th>
                      <th className="py-3 px-4 text-right">Due (₹)</th>
                      <th className="py-3 px-4 text-center">Payment Status</th>
                      <th className="py-3 px-4 text-center">Return Status</th>
                      <th className="py-3 px-4 text-center">Audit &amp; View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingData ? (
                      <tr>
                        <td colSpan="13" className="py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-blue-600" />
                            <span>Loading synchronized invoices...</span>
                          </div>
                        </td>
                      </tr>
                    ) : invoices.length === 0 ? (
                      <tr>
                        <td colSpan="13" className="py-12 text-center text-slate-400">
                          No invoices matching the current filter.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const rawPS = (inv.paymentStatus || "").toUpperCase();
                        const isPaid = rawPS === "PAID" || inv.balanceDue === 0;
                        const isPartial = rawPS === "PARTIALLY_PAID" || rawPS === "PARTIALLY PAID" || rawPS === "PARTIAL";
                        const isPending = rawPS === "PENDING";

                        const retStatus = (inv.returnStatus || (inv.returns?.length > 0 ? "PARTIALLY_RETURNED" : "NONE")).toUpperCase();

                        return (
                          <tr
                            key={inv.id || inv._id}
                            className="hover:bg-slate-50/80 transition group cursor-pointer"
                            onClick={() => handleOpenInvoice(inv)}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-blue-600">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {new Date(inv.date || inv.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {inv.customer?.name || "Walk-in Retail Customer"}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                {inv.customer?.phone && <span>{inv.customer.phone}</span>}
                                {inv.customer?.gstin && (
                                  <span className="font-mono px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                    {inv.customer.gstin}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              ₹{(inv.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              ₹{(inv.cgst || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              ₹{(inv.sgst || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              ₹{(inv.igst || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              ₹{(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                              ₹{(inv.paidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                              ₹{(inv.balanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isPaid
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isPartial
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : isPending
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {isPaid ? "Paid" : isPartial ? "Partial" : isPending ? "Pending" : "Unpaid"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {retStatus === "RETURNED" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                  Returned
                                </span>
                              ) : retStatus === "PARTIALLY_RETURNED" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                  Partial Ret.
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px] font-medium">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <CompactIconButton
                                  variant="primary"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => handleOpenInvoice(inv)}
                                  title="View Tax Invoice & Product Breakdown"
                                />
                                <CompactIconButton
                                  variant="outline"
                                  size="sm"
                                  icon={History}
                                  onClick={(e) => handleOpenAuditTrail(inv, e)}
                                  title="Inspect Lifecycle Audit Trail"
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
              TAB 2: RETURNS AND CREDIT NOTES (Req 3)
          ══════════════════════════════════════════════════ */}
          {activeTab === "returns" && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              {/* Header & Filter Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={creditNoteSearch}
                    onChange={(e) => setCreditNoteSearch(e.target.value)}
                    placeholder="Search by Credit Note #, Return #, Invoice #, Reason..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Total Credit Notes:</span> {creditNotes.length}
                </div>
              </div>

              {/* Credit Notes Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Credit Note #</th>
                      <th className="py-3 px-4">Return Date</th>
                      <th className="py-3 px-4">Original Invoice #</th>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4 text-center">Items Returned</th>
                      <th className="py-3 px-4 text-right">Taxable Reversal (₹)</th>
                      <th className="py-3 px-4 text-right">CGST Rev. (₹)</th>
                      <th className="py-3 px-4 text-right">SGST Rev. (₹)</th>
                      <th className="py-3 px-4 text-right">IGST Rev. (₹)</th>
                      <th className="py-3 px-4 text-right">Total Refund (₹)</th>
                      <th className="py-3 px-4 text-center">Settlement Info</th>
                      <th className="py-3 px-4 text-center">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingCreditNotes ? (
                      <tr>
                        <td colSpan="12" className="py-12 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-purple-600" />
                            <span>Loading credit notes and GST adjustments...</span>
                          </div>
                        </td>
                      </tr>
                    ) : creditNotes.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="py-12 text-center text-slate-400">
                          No product returns or credit notes recorded for this store in the selected period.
                        </td>
                      </tr>
                    ) : (
                      creditNotes.map((cn) => {
                        const itemsCount = (cn.items || []).reduce((acc, it) => acc + Number(it.quantity || 1), 0);
                        const isInter = Boolean(cn.isInterState);

                        return (
                          <tr
                            key={cn.id || cn._id}
                            className="hover:bg-slate-50/80 transition cursor-pointer"
                            onClick={() => setSelectedCreditNote(cn)}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-purple-700">
                              {cn.creditNoteNumber || cn.returnNumber}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {new Date(cn.returnDate || cn.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                              {cn.invoiceNumber}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {cn.customer?.name || "Walk-in Retail Customer"}
                              </div>
                              {cn.customer?.gstin && (
                                <div className="text-[10px] font-mono text-slate-500">
                                  GSTIN: {cn.customer.gstin}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                {itemsCount} units ({cn.items?.length || 0} items)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700 font-semibold">
                              ₹{Number(cn.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              {isInter ? "—" : `₹${Number(cn.cgstAdjustment || 0).toFixed(2)}`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              {isInter ? "—" : `₹${Number(cn.sgstAdjustment || 0).toFixed(2)}`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">
                              {isInter ? `₹${Number(cn.igstAdjustment || cn.gstAdjustment || 0).toFixed(2)}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                              ₹{Number(cn.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {cn.settlementDetails?.method || "CASH"} / {cn.refundStatus || "COMPLETED"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <CompactIconButton
                                variant="primary"
                                size="sm"
                                icon={Eye}
                                onClick={() => setSelectedCreditNote(cn)}
                                title="Inspect Credit Note & Line-Item Reversal"
                              />
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
              TAB 3: GST REPORTS & TAX FILING ANALYSIS (Req 4)
          ══════════════════════════════════════════════════ */}
          {activeTab === "gst" && (
            <div className="space-y-6">
              {/* B2B vs B2C Supplies Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Building2 size={16} className="text-indigo-600" /> B2B Supplies (Registered)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700">
                      GSTR-1 Table 4A, 4B, 4C
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Invoices Count:</span>
                      <strong className="text-slate-900 font-mono">{summary?.gstFiling?.b2b?.count || 0}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Taxable Value:</span>
                      <strong className="font-mono text-slate-900">
                        ₹{(summary?.gstFiling?.b2b?.taxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Output Tax (CGST + SGST + IGST):</span>
                      <strong className="font-mono text-blue-600">
                        ₹{(summary?.gstFiling?.b2b?.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <CreditCard size={16} className="text-blue-600" /> B2C Supplies (Retail &amp; Walk-ins)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700">
                      GSTR-1 Table 7
                    </span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Invoices Count:</span>
                      <strong className="text-slate-900 font-mono">{summary?.gstFiling?.b2c?.count || 0}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Taxable Value:</span>
                      <strong className="font-mono text-slate-900">
                        ₹{(summary?.gstFiling?.b2c?.taxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Output Tax:</span>
                      <strong className="font-mono text-blue-600">
                        ₹{(summary?.gstFiling?.b2c?.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate-Wise Slab Summary */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">GST Rate Slab Classification (0%, 5%, 12%, 18%, 28%)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Statutory tax breakdown by GST slab for direct input into GSTR-3B and GSTR-1
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                    Tax-component Totals
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Rate Slab</th>
                        <th className="py-3 px-4 text-right">Taxable Turnover (₹)</th>
                        <th className="py-3 px-4 text-right">CGST (₹)</th>
                        <th className="py-3 px-4 text-right">SGST (₹)</th>
                        <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {["0", "5", "12", "18", "28"].map((rate) => {
                        const slab = summary?.gstFiling?.slabs?.[rate] || { taxable: 0, tax: 0 };
                        const halfTax = (slab.tax / 2).toFixed(2);
                        return (
                          <tr key={rate} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-sans font-bold text-slate-900">
                              GST {rate}% Slab
                            </td>
                            <td className="py-3 px-4 text-right text-slate-800">
                              ₹{Number(slab.taxable || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-600">₹{halfTax}</td>
                            <td className="py-3 px-4 text-right text-slate-600">₹{halfTax}</td>
                            <td className="py-3 px-4 text-right font-bold text-blue-600">
                              ₹{Number(slab.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL 1: TAX INVOICE DETAIL & PRODUCT BREAKDOWN (Req 2)
      ══════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <TaxInvoice
          invoice={selectedInvoice}
          shopSettings={activeStore}
          isModal={true}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          MODAL 2: CREDIT NOTE & GST REVERSAL AUDIT (Req 3)
      ══════════════════════════════════════════════════ */}
      {selectedCreditNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs fade-up">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 grid place-items-center">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Credit Note: {selectedCreditNote.creditNoteNumber || selectedCreditNote.returnNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Linked to Invoice #{selectedCreditNote.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCreditNote(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">
              {/* Key Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Return Date</span>
                  <div className="font-bold text-slate-800 mt-1">
                    {new Date(selectedCreditNote.returnDate || selectedCreditNote.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Taxable Reversal</span>
                  <div className="font-mono font-bold text-slate-800 mt-1">
                    ₹{Number(selectedCreditNote.taxableAmount || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <span className="text-[10px] text-purple-700 uppercase font-semibold">GST Reversal</span>
                  <div className="font-mono font-bold text-purple-700 mt-1">
                    ₹{Number(selectedCreditNote.gstAdjustment || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <span className="text-[10px] text-purple-700 uppercase font-semibold">Total Credit Value</span>
                  <div className="font-mono font-bold text-purple-700 mt-1">
                    ₹{Number(selectedCreditNote.totalAmount || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Settlement & Reversal Information */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Settlement &amp; Reversal Workflow</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Settlement Method:</span>
                    <strong className="text-slate-800">{selectedCreditNote.settlementDetails?.method || "CASH"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Refund Status:</span>
                    <strong className="text-emerald-700">{selectedCreditNote.refundStatus || "COMPLETED"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Reason:</span>
                    <strong className="text-slate-800">{selectedCreditNote.reason || "Customer Return"}</strong>
                  </div>
                </div>
              </div>

              {/* Returned Items Breakdown Table */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-2 uppercase tracking-wider">Returned Products Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-center">HSN</th>
                        <th className="py-2.5 px-3 text-center">Qty Ret.</th>
                        <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                        <th className="py-2.5 px-3 text-right">GST Rate</th>
                        <th className="py-2.5 px-3 text-right">GST Adj. (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(selectedCreditNote.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                            {it.name || "Returned Item"}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{it.hsn || it.hsnCode || "1904"}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-purple-700">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">₹{Number(it.taxableAmount || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{it.gstRate || 0}%</td>
                          <td className="py-2.5 px-3 text-right text-purple-600">₹{Number(it.gstAdjustment || it.taxAmount || 0).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(it.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button variant="secondary" size="sm" onClick={() => setSelectedCreditNote(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL 3: AUDIT TRAIL MODAL (Req 6)
      ══════════════════════════════════════════════════ */}
      {auditTrailInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs fade-up">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Immutable Audit Log: {auditTrailInvoice.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete lifecycle events and verification timestamps
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditTrailInvoice(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Log list */}
            <div className="p-6 space-y-4">
              {loadingAudit ? (
                <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={18} className="animate-spin text-blue-600" />
                  <span>Loading audit logs...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No subsequent modification logs found. Invoice is in original creation state.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {log.performedBy && (
                      <div className="text-[11px] text-slate-600">
                        Performed by: <strong>{log.performedBy.name || log.performedBy.email}</strong> ({log.performedBy.role})
                      </div>
                    )}
                    {log.changes && (
                      <pre className="mt-1 p-2 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-700 overflow-x-auto">
                        {typeof log.changes === "string" ? log.changes : JSON.stringify(log.changes, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button variant="secondary" size="sm" onClick={() => setAuditTrailInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
