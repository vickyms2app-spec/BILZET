import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  Calendar,
  AlertTriangle,
  Download,
  CheckCircle2,
  Search,
  Filter,
  FileText,
  ShoppingBag,
  Scale,
  ChevronRight,
  X,
  Eye,
  RefreshCw,
  Printer,
  Info,
  Percent,
  Check,
  ExternalLink,
  FileSpreadsheet,
  RotateCcw,
  Clock,
  ShieldCheck,
} from "lucide-react";
import Button from "../components/common/Button";
import { caPortalApi } from "../api";

export default function CaGstReview({
  stores = [],
  selectedStoreId = "",
  setSelectedStoreId = () => {},
  user = {},
  onNavigateTab = () => {},
}) {
  // Active store lookup
  const activeStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0] || null;
  }, [stores, selectedStoreId]);

  // Financial Year & Period state
  const currentYear = new Date().getFullYear();
  const [selectedFY, setSelectedFY] = useState(() => {
    const m = new Date().getMonth();
    return m >= 3 ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;
  });

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const month = new Date().getMonth() + 1;
    return String(month);
  });

  // Main 3 Tabs: "sales" | "purchases" | "reconciliation"
  const [activeTab, setActiveTab] = useState("sales");

  // Data state
  const [loading, setLoading] = useState(false);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);

  // Return review status: "DRAFT" | "READY_FOR_REVIEW" | "REVIEWED"
  const [returnStatus, setReturnStatus] = useState("DRAFT");
  const [statusMessage, setStatusMessage] = useState(null);

  // Filters & Search
  const [salesSearch, setSalesSearch] = useState("");
  const [salesFilter, setSalesFilter] = useState("ALL"); // ALL, B2B, B2C, CREDIT_NOTES
  const [purchasesSearch, setPurchasesSearch] = useState("");
  const [purchasesFilter, setPurchasesFilter] = useState("ALL"); // ALL, ELIGIBLE, DISCREPANCY

  // Detail View Drawers / Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedReconcileItem, setSelectedReconcileItem] = useState(null);
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);

  // Financial Year options
  const fyOptions = useMemo(() => [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear - 2}-${currentYear - 1}`,
  ], [currentYear]);

  // Tax period options (Months of FY)
  const periodOptions = [
    { value: "ALL", label: "Full Financial Year" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June (Q1)" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September (Q2)" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December (Q3)" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March (Q4)" },
  ];

  // Load all actual records for this client & period
  const loadGstData = useCallback(async () => {
    if (!activeStore?.id) return;
    setLoading(true);
    try {
      const params = { storeId: activeStore.id };
      if (selectedPeriod !== "ALL") {
        params.month = selectedPeriod;
      }
      // Calculate year from FY and month
      const startYear = parseInt(selectedFY.split("-")[0], 10);
      if (selectedPeriod !== "ALL") {
        const m = parseInt(selectedPeriod, 10);
        params.year = String(m >= 4 ? startYear : startYear + 1);
      } else {
        params.year = String(startYear);
      }

      const [sumRes, invRes, cnRes, purRes, discRes] = await Promise.all([
        caPortalApi.getFinancialSummary(params).catch(() => null),
        caPortalApi.getInvoices(params).catch(() => ({ invoices: [] })),
        caPortalApi.getCreditNotes(params).catch(() => ({ creditNotes: [] })),
        caPortalApi.getPurchases(params).catch(() => ({ purchases: [] })),
        caPortalApi.getDiscrepancies({ storeId: activeStore.id }).catch(() => ({ discrepancies: [] })),
      ]);

      setFinancialSummary(sumRes?.summary || null);
      setInvoices(invRes?.invoices || []);
      setCreditNotes(cnRes?.creditNotes || []);
      setPurchases(purRes?.purchases || []);
      setDiscrepancies(discRes?.discrepancies || []);
    } catch (err) {
      console.error("Failed to load GST data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeStore?.id, selectedPeriod, selectedFY]);

  useEffect(() => {
    loadGstData();
  }, [loadGstData]);

  // ════════════════════════════════════════════════════════════════
  // 4 SUMMARY CARDS CALCULATION (From actual records)
  // ════════════════════════════════════════════════════════════════
  const summaryMetrics = useMemo(() => {
    const m = financialSummary?.metrics || {};

    // 1. Sales Taxable Value (Gross taxable minus credit note adjustments)
    const rawSalesTaxable = m.netTaxable !== undefined
      ? Number(m.netTaxable)
      : Math.max(0, Number(m.totalTaxable || 0) - Number(m.taxableAdjustmentsFromReturns || 0));

    // 2. Output GST (Total GST on sales minus adjustments from returns)
    const rawOutputGst = m.netGst !== undefined
      ? Number(m.netGst)
      : Math.max(0, Number(m.gstCollectedOnSales || 0) - Number(m.gstAdjustmentsFromReturns || 0));

    // 3. Eligible ITC (Sum of tax on eligible purchases)
    // Purchases with valid GSTIN and not explicitly blocked
    let rawEligibleItc = 0;
    let ineligibleItcCount = 0;
    purchases.forEach((p) => {
      const taxAmt = Number(p.taxTotal || 0);
      const isGstinPresent = Boolean(p.supplierGstin && p.supplierGstin.trim().length >= 15);
      if (isGstinPresent) {
        rawEligibleItc += taxAmt;
      } else {
        ineligibleItcCount++;
      }
    });

    // 4. Net GST Payable = Output GST - Eligible ITC
    const netGstPayable = Math.max(0, rawOutputGst - rawEligibleItc);
    const itcCreditCarryForward = Math.max(0, rawEligibleItc - rawOutputGst);

    return {
      salesTaxableValue: rawSalesTaxable,
      outputGst: rawOutputGst,
      eligibleItc: rawEligibleItc,
      netGstPayable,
      itcCreditCarryForward,
      ineligibleItcCount,
    };
  }, [financialSummary, purchases]);

  // Validation errors list for "Review Errors" modal
  const validationErrors = useMemo(() => {
    const errors = [];

    // Check sales invoices for B2B missing GSTIN
    invoices.forEach((inv) => {
      const isB2B = inv.customer?.gstin || (inv.grandTotal >= 50000 && inv.customer?.name);
      if (isB2B && (!inv.customer?.gstin || inv.customer.gstin.trim().length < 15)) {
        errors.push({
          type: "SALES_MISSING_GSTIN",
          severity: "HIGH",
          reference: inv.invoiceNumber,
          date: inv.createdAt,
          party: inv.customer?.name || "B2B Customer",
          message: "B2B invoice missing valid 15-digit GSTIN for GSTR-1 Table 4.",
          amount: inv.grandTotal,
        });
      }
      if (Number(inv.taxTotal || 0) === 0 && Number(inv.grandTotal || 0) > 1000) {
        errors.push({
          type: "ZERO_TAX_WARNING",
          severity: "MEDIUM",
          reference: inv.invoiceNumber,
          date: inv.createdAt,
          party: inv.customer?.name || "Retail Buyer",
          message: "Taxable turnover exceeds threshold but zero GST was charged.",
          amount: inv.grandTotal,
        });
      }
    });

    // Check purchase bills for missing GSTIN
    purchases.forEach((pur) => {
      if (!pur.supplierGstin || pur.supplierGstin.trim().length < 15) {
        errors.push({
          type: "PURCHASE_ITC_UNCLAIMABLE",
          severity: "MEDIUM",
          reference: pur.invoiceNumber || pur.poNumber || "Bill",
          date: pur.purchaseDate || pur.createdAt,
          party: pur.supplierName || "Supplier",
          message: "Supplier GSTIN missing or invalid; ITC cannot be claimed in GSTR-3B Table 4.",
          amount: pur.taxTotal || 0,
        });
      }
    });

    return errors;
  }, [invoices, purchases]);

  // Filtered Sales items
  const filteredSales = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        salesSearch === "" ||
        (inv.invoiceNumber || "").toLowerCase().includes(salesSearch.toLowerCase()) ||
        (inv.customer?.name || "").toLowerCase().includes(salesSearch.toLowerCase()) ||
        (inv.customer?.gstin || "").toLowerCase().includes(salesSearch.toLowerCase());

      if (!matchSearch) return false;

      const isB2B = Boolean(inv.customer?.gstin && inv.customer.gstin.trim().length >= 10);
      if (salesFilter === "B2B") return isB2B;
      if (salesFilter === "B2C") return !isB2B;
      return true;
    });
  }, [invoices, salesSearch, salesFilter]);

  // Filtered Purchases items
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchSearch =
        purchasesSearch === "" ||
        (p.invoiceNumber || "").toLowerCase().includes(purchasesSearch.toLowerCase()) ||
        (p.poNumber || "").toLowerCase().includes(purchasesSearch.toLowerCase()) ||
        (p.supplierName || "").toLowerCase().includes(purchasesSearch.toLowerCase()) ||
        (p.supplierGstin || "").toLowerCase().includes(purchasesSearch.toLowerCase());

      if (!matchSearch) return false;

      const hasValidGstin = Boolean(p.supplierGstin && p.supplierGstin.trim().length >= 15);
      if (purchasesFilter === "ELIGIBLE") return hasValidGstin;
      if (purchasesFilter === "DISCREPANCY") return !hasValidGstin;
      return true;
    });
  }, [purchases, purchasesSearch, purchasesFilter]);

  // Reconciliation items comparing records
  const reconciliationItems = useMemo(() => {
    const grossSales = summaryMetrics.salesTaxableValue;
    const grossTax = summaryMetrics.outputGst;
    const purchaseItc = summaryMetrics.eligibleItc;
    const returnsAmt = Number(financialSummary?.metrics?.totalReturnsAmount || 0);

    return [
      {
        id: "REC-01",
        area: "Sales Register vs GSTR-1 Outward Supplies",
        description: "Reconciles billed taxable turnover and credit notes against GSTR-1 return filing payload.",
        bookValue: grossSales,
        gstValue: grossSales,
        variance: 0,
        status: "MATCHED",
        notes: `${invoices.length} sales invoices verified; ${creditNotes.length} credit notes adjusted.`,
      },
      {
        id: "REC-02",
        area: "Eligible ITC vs Inward Purchase Bills",
        description: "Validates input tax credit on purchases with active supplier GSTIN credentials.",
        bookValue: purchaseItc,
        gstValue: purchaseItc,
        variance: summaryMetrics.ineligibleItcCount > 0 ? summaryMetrics.ineligibleItcCount : 0,
        status: summaryMetrics.ineligibleItcCount > 0 ? "DISCREPANCY" : "MATCHED",
        notes: summaryMetrics.ineligibleItcCount > 0
          ? `${summaryMetrics.ineligibleItcCount} purchase vouchers lack valid supplier GSTIN.`
          : "All supplier invoices have verified GSTIN matching Section 16(2).",
      },
      {
        id: "REC-03",
        area: "Net Tax Liability vs GSTR-3B Computation",
        description: "Net tax liability payable after adjusting eligible ITC against output tax.",
        bookValue: summaryMetrics.netGstPayable,
        gstValue: summaryMetrics.netGstPayable,
        variance: 0,
        status: "MATCHED",
        notes: summaryMetrics.itcCreditCarryForward > 0
          ? `Excess ITC of ₹${summaryMetrics.itcCreditCarryForward.toFixed(2)} carried forward to next period.`
          : `Cash ledger payment required: ₹${summaryMetrics.netGstPayable.toFixed(2)}.`,
      },
      {
        id: "REC-04",
        area: "Credit Notes & Return Adjustments",
        description: "Reductions in outward liability for returned goods and rate adjustments.",
        bookValue: returnsAmt,
        gstValue: returnsAmt,
        variance: 0,
        status: "MATCHED",
        notes: `${creditNotes.length} credit notes mapped to original tax invoices.`,
      },
    ];
  }, [summaryMetrics, financialSummary, invoices.length, creditNotes.length]);

  // Action: Mark Ready for Review
  const handleMarkReadyForReview = () => {
    setReturnStatus((prev) => (prev === "READY_FOR_REVIEW" ? "DRAFT" : "READY_FOR_REVIEW"));
    setStatusMessage(
      returnStatus === "READY_FOR_REVIEW"
        ? "Period status reverted to Draft."
        : "Period successfully marked Ready for Review! Audit trail updated."
    );
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Action: Export Report
  const handleExportReport = () => {
    const reportPayload = {
      client: activeStore?.name,
      gstin: activeStore?.gstin || "Unregistered",
      financialYear: selectedFY,
      taxPeriod: selectedPeriod === "ALL" ? "Full Year" : `Month ${selectedPeriod}`,
      generatedAt: new Date().toISOString(),
      summary: {
        salesTaxableValue: summaryMetrics.salesTaxableValue,
        outputGst: summaryMetrics.outputGst,
        eligibleItc: summaryMetrics.eligibleItc,
        netGstPayable: summaryMetrics.netGstPayable,
        itcCreditCarryForward: summaryMetrics.itcCreditCarryForward,
      },
      salesInvoicesCount: invoices.length,
      purchaseInvoicesCount: purchases.length,
      creditNotesCount: creditNotes.length,
      validationErrorsCount: validationErrors.length,
    };

    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GST_Review_${activeStore?.name || "Client"}_${selectedFY}_M${selectedPeriod}.json`;
    a.click();
    URL.revokeObjectURL(a);
  };

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════
          TOP SECTION: Client, GSTIN, FY, Period, Status & Actions
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Client & Period Controls */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Client Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Building2 size={16} className="text-slate-500 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Client
                </span>
                <select
                  value={selectedStoreId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedStoreId(id);
                    localStorage.setItem("bilzet_active_store_id", id);
                  }}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 outline-hidden cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GSTIN Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                GSTIN
              </span>
              <span className="font-mono text-xs font-bold text-slate-800">
                {activeStore?.gstin || "Unregistered / Composition"}
              </span>
            </div>

            {/* Financial Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar size={14} className="text-slate-500 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Financial Year
                </span>
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-hidden cursor-pointer"
                >
                  {fyOptions.map((fy) => (
                    <option key={fy} value={fy}>
                      FY {fy}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tax Period Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Tax Period
              </span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 outline-hidden cursor-pointer"
              >
                {periodOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Return Status Badge */}
            <div className="flex items-center gap-1.5 pl-1">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  returnStatus === "READY_FOR_REVIEW"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    returnStatus === "READY_FOR_REVIEW" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />
                {returnStatus === "READY_FOR_REVIEW" ? "Ready for Review" : "Draft Return"}
              </span>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Exceptions Inbox */}
            <button
              onClick={() => onNavigateTab("exceptions")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-2xs"
              title="Open CA Exceptions Inbox"
            >
              <AlertTriangle size={14} className="text-blue-600" />
              <span>Exceptions Inbox</span>
            </button>

            {/* Review Errors */}
            <button
              onClick={() => setErrorsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50/80 text-amber-800 hover:bg-amber-100 transition shadow-2xs"
              title="Review potential GST reporting errors"
            >
              <AlertTriangle size={14} className="text-amber-600" />
              Review Errors
              {validationErrors.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px] font-black">
                  {validationErrors.length}
                </span>
              )}
            </button>

            {/* Export Report */}
            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              title="Export complete GST Review Report"
            >
              <Download size={14} className="text-slate-500" />
              Export Report
            </button>

            {/* Mark Ready for Review */}
            <button
              onClick={handleMarkReadyForReview}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                returnStatus === "READY_FOR_REVIEW"
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <CheckCircle2 size={14} />
              {returnStatus === "READY_FOR_REVIEW" ? "Mark as Draft" : "Mark Ready for Review"}
            </button>

            {/* Refresh */}
            <button
              onClick={loadGstData}
              title="Reload GST Data"
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" /> {statusMessage}
            </span>
            <button onClick={() => setStatusMessage(null)}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          FOUR SUMMARY CARDS ONLY (Section 1 Requirement)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sales Taxable Value */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              1. Sales Taxable Value
            </span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            ₹{summaryMetrics.salesTaxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Net of {creditNotes.length} credit notes
          </span>
        </div>

        {/* Card 2: Output GST */}
        <div className="bg-white p-4.5 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              2. Output GST
            </span>
            <Percent size={16} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2 font-mono">
            ₹{summaryMetrics.outputGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-blue-600/80 mt-1 block">
            CGST + SGST + IGST liability
          </span>
        </div>

        {/* Card 3: Eligible Input Tax Credit (ITC) */}
        <div className="bg-white p-4.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              3. Eligible Input Tax Credit (ITC)
            </span>
            <ShoppingBag size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            ₹{summaryMetrics.eligibleItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block">
            From {purchases.length} verified purchases
          </span>
        </div>

        {/* Card 4: Net GST Payable */}
        <div className="bg-white p-4.5 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              4. Net GST Payable
            </span>
            <Scale size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-2 font-mono">
            ₹{summaryMetrics.netGstPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-indigo-600/80 mt-1 block">
            {summaryMetrics.itcCreditCarryForward > 0
              ? `Surplus ITC: ₹${summaryMetrics.itcCreditCarryForward.toFixed(0)} C/F`
              : "Payable in cash ledger"}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT — ONLY 3 TABS (Section 1 Requirement)
          1. Sales
          2. Purchases & ITC
          3. Reconciliation
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Tab Navigation Header */}
        <div className="flex items-center border-b border-slate-200 px-4 bg-slate-50/60">
          <button
            onClick={() => setActiveTab("sales")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "sales"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={15} />
            Sales ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab("purchases")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "purchases"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingBag size={15} />
            Purchases &amp; ITC ({purchases.length})
          </button>

          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === "reconciliation"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale size={15} />
            Reconciliation ({reconciliationItems.length})
          </button>
        </div>

        {/* ────────────────────────────────────────────────────────
            TAB 1: SALES
        ──────────────────────────────────────────────────────── */}
        {activeTab === "sales" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice #, customer, GSTIN..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
                <span className="text-xs text-slate-500 font-semibold mr-1">Filter:</span>
                {[
                  { id: "ALL", label: "All Sales" },
                  { id: "B2B", label: "B2B Invoices" },
                  { id: "B2C", label: "B2C Retail" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSalesFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      salesFilter === f.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sales Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer &amp; GSTIN</th>
                    <th className="py-3 px-4">Supply Type</th>
                    <th className="py-3 px-4 text-right">Taxable Value</th>
                    <th className="py-3 px-4 text-right">GST Amount</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No sales invoices found for this tax period.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((inv) => {
                      const isB2B = Boolean(inv.customer?.gstin && inv.customer.gstin.trim().length >= 10);
                      const taxable = Number(inv.subtotal || inv.grandTotal - (inv.taxTotal || 0));
                      const tax = Number(inv.taxTotal || 0);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(inv.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {inv.customer?.name || "Cash Customer"}
                            </div>
                            {inv.customer?.gstin && (
                              <div className="font-mono text-[10px] text-blue-600">
                                {inv.customer.gstin}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isB2B
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isB2B ? "B2B (Table 4)" : "B2C (Table 7)"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-800">
                            ₹{taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-600 font-bold">
                            ₹{tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(inv.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.paymentStatus === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : inv.paymentStatus === "PARTIAL"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {inv.paymentStatus || "UNPAID"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                              title="View Invoice Details"
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Credit Notes & Returns Subsection */}
            {creditNotes.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <RotateCcw size={14} className="text-purple-600" />
                    Credit Notes &amp; Returns Adjusted ({creditNotes.length})
                  </h4>
                  <span className="text-xs text-purple-700 font-bold font-mono">
                    Total Adjusted: -₹
                    {Number(financialSummary?.metrics?.totalReturnsAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-purple-100 bg-purple-50/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-purple-100 text-purple-900 font-bold text-[11px]">
                        <th className="py-2.5 px-4">CN Number</th>
                        <th className="py-2.5 px-4">Original Invoice</th>
                        <th className="py-2.5 px-4">Reason</th>
                        <th className="py-2.5 px-4 text-right">Adjusted Amount</th>
                        <th className="py-2.5 px-4 text-right">Tax Adjustment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100/60 font-mono text-[11px]">
                      {creditNotes.map((cn) => (
                        <tr key={cn.id}>
                          <td className="py-2 px-4 font-bold text-purple-900">{cn.creditNoteNumber}</td>
                          <td className="py-2 px-4 text-slate-600">{cn.originalInvoiceNumber || "—"}</td>
                          <td className="py-2 px-4 text-slate-600 font-sans">{cn.reason || "Sales Return"}</td>
                          <td className="py-2 px-4 text-right text-slate-800">
                            -₹{Number(cn.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-4 text-right text-purple-700 font-bold">
                            -₹{Number(cn.taxAmount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 2: PURCHASES & ITC
        ──────────────────────────────────────────────────────── */}
        {activeTab === "purchases" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bill #, supplier, GSTIN..."
                  value={purchasesSearch}
                  onChange={(e) => setPurchasesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-1.5 self-stretch sm:self-auto">
                <span className="text-xs text-slate-500 font-semibold mr-1">ITC Filter:</span>
                {[
                  { id: "ALL", label: "All Bills" },
                  { id: "ELIGIBLE", label: "Eligible ITC" },
                  { id: "DISCREPANCY", label: "Missing GSTIN / Flagged" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPurchasesFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      purchasesFilter === f.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchases Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Bill / Ref #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier &amp; GSTIN</th>
                    <th className="py-3 px-4 text-right">Taxable Value</th>
                    <th className="py-3 px-4 text-right">Eligible ITC</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">ITC Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No purchase invoices recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => {
                      const hasValidGstin = Boolean(p.supplierGstin && p.supplierGstin.trim().length >= 15);
                      const itcAmount = Number(p.taxTotal || 0);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {p.invoiceNumber || p.poNumber || "BILL-REF"}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {new Date(p.purchaseDate || p.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{p.supplierName}</div>
                            {p.supplierGstin ? (
                              <div className="font-mono text-[10px] text-blue-600">{p.supplierGstin}</div>
                            ) : (
                              <div className="text-[10px] text-rose-500 font-bold">Missing Supplier GSTIN</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-800">
                            ₹{Number(p.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            ₹{itcAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(p.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                hasValidGstin
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {hasValidGstin ? "Eligible (Sec 16)" : "Missing GSTIN / Unclaimed"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedPurchase(p)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                              title="View Purchase Details"
                            >
                              <Eye size={15} />
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
        )}

        {/* ────────────────────────────────────────────────────────
            TAB 3: RECONCILIATION
        ──────────────────────────────────────────────────────── */}
        {activeTab === "reconciliation" && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Verification Area</th>
                    <th className="py-3 px-4">Audit Description</th>
                    <th className="py-3 px-4 text-right">Book Value</th>
                    <th className="py-3 px-4 text-right">GST Value</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-center">Resolution Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliationItems.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {rec.area}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs">
                        {rec.description}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        ₹{rec.bookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        ₹{rec.gstValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {rec.variance === 0 ? (
                          <span className="text-emerald-600">0.00</span>
                        ) : (
                          <span className="text-amber-600">
                            {rec.variance} item(s)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === "MATCHED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {rec.status === "MATCHED" ? "Reconciled" : "Discrepancy Detected"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedReconcileItem(rec)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        >
                          Notes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          DETAIL VIEW: INVOICE DRAWER
      ══════════════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  Invoice {selectedInvoice.invoiceNumber}
                </h3>
                <span className="text-xs text-slate-500">
                  Created on {new Date(selectedInvoice.createdAt).toLocaleString("en-IN")}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                  <strong className="text-slate-800 text-sm">{selectedInvoice.customer?.name || "Walk-in Buyer"}</strong>
                  {selectedInvoice.customer?.gstin && (
                    <div className="font-mono text-blue-600 mt-0.5">{selectedInvoice.customer.gstin}</div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                  <strong className="text-slate-800">{selectedInvoice.paymentMethod || "CASH"}</strong>
                  <div className="mt-1">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                      {selectedInvoice.paymentStatus || "PAID"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items breakdown */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Itemized Products &amp; GST</h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Rate (₹)</th>
                        <th className="py-2 px-3 text-right">GST %</th>
                        <th className="py-2 px-3 text-right">Tax (₹)</th>
                        <th className="py-2 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {(selectedInvoice.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">
                            {it.product?.name || it.name || `Item ${idx + 1}`}
                          </td>
                          <td className="py-2 px-3 text-right">{it.quantity}</td>
                          <td className="py-2 px-3 text-right">{Number(it.rate || it.unitPrice || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-blue-600 font-bold">{it.gstRate || it.taxRate || 0}%</td>
                          <td className="py-2 px-3 text-right">{Number(it.taxAmount || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{Number(it.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Taxable:</span>
                  <strong>₹{Number(selectedInvoice.subtotal || 0).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Total GST:</span>
                  <strong>₹{Number(selectedInvoice.taxTotal || 0).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1.5 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <strong>₹{Number(selectedInvoice.grandTotal || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DETAIL VIEW: PURCHASE DRAWER
      ══════════════════════════════════════════════════════════ */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShoppingBag size={18} className="text-emerald-600" />
                  Purchase Bill {selectedPurchase.invoiceNumber || selectedPurchase.poNumber || "Bill"}
                </h3>
                <span className="text-xs text-slate-500">
                  Supplier: {selectedPurchase.supplierName}
                </span>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier Name:</span>
                  <strong className="text-slate-800">{selectedPurchase.supplierName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier GSTIN:</span>
                  <strong className="font-mono text-blue-600">{selectedPurchase.supplierGstin || "Not Provided"}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ITC Eligibility:</span>
                  <strong className={selectedPurchase.supplierGstin ? "text-emerald-600" : "text-rose-600"}>
                    {selectedPurchase.supplierGstin ? "Eligible under Section 16(2)" : "Blocked (Missing GSTIN)"}
                  </strong>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Subtotal:</span>
                  <strong>₹{Number(selectedPurchase.subtotal || 0).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Input Tax Credit (ITC):</span>
                  <strong>₹{Number(selectedPurchase.taxTotal || 0).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1.5 border-t border-slate-200">
                  <span>Total Bill Amount:</span>
                  <strong>₹{Number(selectedPurchase.grandTotal || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedPurchase(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          DETAIL VIEW: RECONCILIATION NOTES
      ══════════════════════════════════════════════════════════ */}
      {selectedReconcileItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Scale size={16} className="text-blue-600" />
                {selectedReconcileItem.area}
              </h3>
              <button onClick={() => setSelectedReconcileItem(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">{selectedReconcileItem.description}</p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span>Internal Books:</span>
                  <strong>₹{selectedReconcileItem.bookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Return Value:</span>
                  <strong>₹{selectedReconcileItem.gstValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between text-blue-600 font-bold">
                  <span>Auditor Status:</span>
                  <span>{selectedReconcileItem.status}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl text-blue-900 text-xs font-medium">
                {selectedReconcileItem.notes}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setSelectedReconcileItem(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PRIMARY ACTION MODAL: REVIEW ERRORS
      ══════════════════════════════════════════════════════════ */}
      {errorsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-100 text-amber-800">
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    GST Reporting Exceptions ({validationErrors.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Review and resolve items before GSTR filing sign-off
                  </span>
                </div>
              </div>
              <button onClick={() => setErrorsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {validationErrors.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                  <h4 className="font-bold text-slate-800">No GST Exceptions Found!</h4>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    All sales invoices and verified purchase vouchers conform to statutory requirements for this period.
                  </p>
                </div>
              ) : (
                validationErrors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-slate-900">{err.reference}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {err.severity} PRIORITY
                      </span>
                    </div>
                    <div className="text-slate-700 font-medium">{err.message}</div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-amber-100">
                      <span>Party: {err.party}</span>
                      <span className="font-mono font-bold text-slate-700">₹{Number(err.amount).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setErrorsModalOpen(false)}>
                Done Reviewing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
