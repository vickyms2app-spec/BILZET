import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  FileCheck,
  FileText,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  X,
  CreditCard,
  AlertTriangle,
  Send,
  Eye,
  Printer,
  Download,
  Share2,
  Trash2,
  Edit3,
  ArrowRight,
  User,
  Phone,
  Building2,
  Percent,
  ChevronDown,
  Layers,
  Check,
} from "lucide-react";
import { quotationsApi, productsApi, customersApi, settingsApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import SearchBar from "../components/common/SearchBar";
import DateNavigator from "../components/common/DateNavigator";
import Button, { CompactIconButton } from "../components/common/Button";
import { calculateLineItemTax } from "../utils/taxCalculation";

// Available units consistent across Bilzet
const UNITS = [
  { value: "piece", label: "Piece (pc)" },
  { value: "nos", label: "Numbers (Nos)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "gram", label: "Gram (g)" },
  { value: "litre", label: "Litre (L)" },
  { value: "ml", label: "Millilitre (ml)" },
  { value: "metre", label: "Metre (m)" },
  { value: "box", label: "Box (bx)" },
  { value: "pack", label: "Pack (pk)" },
  { value: "dozen", label: "Dozen (dz)" },
  { value: "roll", label: "Roll (rl)" },
  { value: "set", label: "Set (st)" },
  { value: "bundle", label: "Bundle (bd)" },
];

const GST_RATES = [0, 3, 5, 12, 18, 28];

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    bg: "bg-slate-50 text-slate-700 border-slate-200",
    badge: "bg-slate-100 text-slate-700",
    icon: Clock,
  },
  SENT: {
    label: "Sent",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    icon: Send,
  },
  ACCEPTED: {
    label: "Accepted",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    icon: AlertCircle,
  },
  EXPIRED: {
    label: "Expired",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
  },
};

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState(null);
  const [previewQuotation, setPreviewQuotation] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);

  // New / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [successToast, setSuccessToast] = useState("");

  // Product catalog & customer suggestions
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [customerList, setCustomerList] = useState([]);

  // Form State
  const initialForm = {
    quotationNumber: `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    quotationDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerGstin: "",
    billingAddress: "",
    placeOfSupply: "33-TN",
    items: [
      {
        id: `item-${Date.now()}-1`,
        productId: "",
        name: "",
        sku: "",
        hsn: "",
        quantity: 1,
        unit: "piece",
        rate: 0,
        isTaxInclusive: true,
        gstRate: 18,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 0,
        gstAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
      },
    ],
    notes: "Thank you for considering our proposal. Valid for 15 days from issue date.",
    termsAndConditions: "1. Goods once supplied against quotation are subject to standard warranty.\n2. Payment terms: 50% advance, balance on delivery.\n3. Taxes as applicable at time of invoicing.",
    status: "DRAFT",
  };

  const [form, setForm] = useState(initialForm);

  // Load Initial Data
  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [quotesRes, prodsRes, custsRes, setsRes] = await Promise.all([
        quotationsApi.list().catch(() => ({ data: [] })),
        productsApi.list().catch(() => ({ products: [] })),
        customersApi.list().catch(() => ({ customers: [] })),
        settingsApi.get().catch(() => null),
      ]);

      const quotesList = Array.isArray(quotesRes)
        ? quotesRes
        : quotesRes?.data || quotesRes?.quotations || [];
      setQuotations(quotesList);

      const prods = prodsRes?.products || (Array.isArray(prodsRes) ? prodsRes : []);
      setCatalogProducts(prods);

      const custs = custsRes?.customers || (Array.isArray(custsRes) ? custsRes : []);
      setCustomerList(custs);

      if (setsRes) {
        setShopSettings(setsRes.settings ? { ...setsRes, ...setsRes.settings } : setsRes);
      }
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show Toast Auto-dismiss
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Recalculate single item line totals using shared taxCalculation service
  const recalculateItem = (item, placeOfSupply = form.placeOfSupply) => {
    const qty = Math.max(0.001, parseFloat(item.quantity) || 0);
    const rate = Math.max(0, parseFloat(item.rate) || 0);
    const gstRate = Math.max(0, parseFloat(item.gstRate) || 0);
    const discPct = Math.min(100, Math.max(0, parseFloat(item.discountPercent) || 0));

    let gross = qty * rate;
    let discAmt = (gross * discPct) / 100;

    const taxResult = calculateLineItemTax({
      rate,
      qty,
      discount: discAmt,
      gstRate,
      isTaxInclusive: Boolean(item.isTaxInclusive),
      placeOfSupply,
    });

    return {
      ...item,
      discountAmount: Number(discAmt.toFixed(2)),
      taxableAmount: taxResult.taxable,
      gstAmount: taxResult.tax,
      cgst: taxResult.cgst,
      sgst: taxResult.sgst,
      igst: taxResult.igst,
      total: taxResult.total,
    };
  };

  // Summary totals calculation
  const summary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let grandTotal = 0;

    (form.items || []).forEach((it) => {
      const qty = parseFloat(it.quantity) || 0;
      const rate = parseFloat(it.rate) || 0;
      subtotal += qty * rate;
      totalDiscount += parseFloat(it.discountAmount) || 0;
      taxableAmount += parseFloat(it.taxableAmount) || 0;
      cgst += parseFloat(it.cgst) || 0;
      sgst += parseFloat(it.sgst) || 0;
      igst += parseFloat(it.igst) || 0;
      grandTotal += parseFloat(it.total) || 0;
    });

    const rounded = Math.round(grandTotal);
    const roundOff = Number((rounded - grandTotal).toFixed(2));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      igst: Number(igst.toFixed(2)),
      taxAmount: Number((cgst + sgst + igst).toFixed(2)),
      roundOff,
      grandTotal: rounded,
    };
  }, [form.items]);

  // Open New Quotation Modal
  const handleOpenNew = () => {
    setEditingId(null);
    setForm({
      ...initialForm,
      quotationNumber: `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [
        {
          id: `item-${Date.now()}-1`,
          productId: "",
          name: "",
          sku: "",
          hsn: "",
          quantity: 1,
          unit: "piece",
          rate: 0,
          isTaxInclusive: true,
          gstRate: 18,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 0,
          gstAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
        },
      ],
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleEdit = (quote) => {
    setEditingId(quote.id || quote._id);
    setForm({
      quotationNumber: quote.quotationNumber || quote.number,
      quotationDate: quote.quotationDate ? quote.quotationDate.split("T")[0] : quote.date?.split("T")[0],
      expiryDate: quote.expiryDate ? quote.expiryDate.split("T")[0] : "",
      customerName: quote.customerName || quote.customer?.name || "",
      customerPhone: quote.customerPhone || quote.customer?.phone || "",
      customerEmail: quote.customerEmail || quote.customer?.email || "",
      customerGstin: quote.customerGstin || quote.customer?.gstin || "",
      billingAddress: quote.billingAddress || quote.customer?.address || "",
      placeOfSupply: quote.placeOfSupply || "33-TN",
      items: (quote.items || []).map((it, idx) => ({
        id: it.id || `item-${idx}`,
        productId: it.productId || "",
        name: it.name || it.productName || "",
        sku: it.sku || "",
        hsn: it.hsn || "",
        quantity: it.quantity || 1,
        unit: it.unit || "piece",
        rate: it.unitPrice || it.rate || 0,
        isTaxInclusive: it.isTaxInclusive !== false,
        gstRate: it.gstRate !== undefined ? it.gstRate : 18,
        discountPercent: it.discountPercent || 0,
        discountAmount: it.discountAmount || 0,
        taxableAmount: it.taxableAmount || 0,
        gstAmount: it.gstAmount || it.taxAmount || 0,
        cgst: it.cgst || 0,
        sgst: it.sgst || 0,
        igst: it.igst || 0,
        total: it.total || it.lineTotal || 0,
      })),
      notes: quote.notes || "",
      termsAndConditions: quote.termsAndConditions || "",
      status: quote.status || "DRAFT",
    });
    setShowModal(true);
  };

  // Update item field and recalculate
  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      let updated = { ...items[index], [field]: value };

      // If product chosen from catalog, auto-populate details
      if (field === "productId") {
        const prod = catalogProducts.find((p) => p.id === value || p._id === value);
        if (prod) {
          updated.name = prod.name;
          updated.sku = prod.sku || "";
          updated.hsn = prod.hsn || prod.hsnSac || "";
          updated.rate = prod.sellingPrice || prod.price || 0;
          updated.unit = prod.unit || "piece";
          updated.gstRate = prod.gstRate !== undefined ? prod.gstRate : 18;
          updated.isTaxInclusive = prod.isTaxInclusive !== undefined ? prod.isTaxInclusive : true;
        }
      }

      items[index] = recalculateItem(updated, prev.placeOfSupply);
      return { ...prev, items };
    });
  };

  // Add line item
  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${prev.items.length + 1}`,
          productId: "",
          name: "",
          sku: "",
          hsn: "",
          quantity: 1,
          unit: "piece",
          rate: 0,
          isTaxInclusive: true,
          gstRate: 18,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 0,
          gstAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
        },
      ],
    }));
  };

  // Remove line item
  const handleRemoveItem = (index) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Save Quotation (Create / Update)
  const handleSaveQuotation = async (e) => {
    if (e) e.preventDefault();
    if (!form.customerName.trim()) {
      alert("Please enter customer name");
      return;
    }
    if (form.items.some((it) => !it.name.trim() || Number(it.quantity) <= 0)) {
      alert("Please ensure all items have valid names and positive quantities");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        subtotal: summary.subtotal,
        discountTotal: summary.totalDiscount,
        taxableAmount: summary.taxableAmount,
        cgst: summary.cgst,
        sgst: summary.sgst,
        igst: summary.igst,
        taxAmount: summary.taxAmount,
        roundOff: summary.roundOff,
        grandTotal: summary.grandTotal,
        totalAmount: summary.grandTotal,
      };

      if (editingId) {
        await quotationsApi.update(editingId, payload);
        setSuccessToast(`Quotation ${form.quotationNumber} updated successfully!`);
      } else {
        await quotationsApi.create(payload);
        setSuccessToast(`Quotation ${form.quotationNumber} created successfully!`);
      }

      setShowModal(false);
      loadData(true);
    } catch (err) {
      console.error("Save quotation error:", err);
      alert(err.message || "Failed to save quotation");
    } finally {
      setSubmitting(false);
    }
  };

  // Convert Quotation to Invoice
  const handleConvertToInvoice = async (quote, e) => {
    if (e) e.stopPropagation();
    const id = quote.id || quote._id;
    if (!window.confirm(`Convert Quotation ${quote.quotationNumber || quote.number} to an Official Tax Invoice?\n\nThis will transfer all customer and product details and finalize the sale without duplicate stock deductions.`)) {
      return;
    }

    setConvertingId(id);
    try {
      const res = await quotationsApi.convertToInvoice(id);
      const invoiceNumber = res?.sale?.invoiceNumber || res?.invoiceNumber || "New Invoice";
      setSuccessToast(`Quotation converted to Invoice #${invoiceNumber} successfully!`);
      loadData(true);
    } catch (err) {
      console.error("Convert to invoice error:", err);
      alert(err.message || "Failed to convert quotation to invoice");
    } finally {
      setConvertingId(null);
    }
  };

  // Change Status
  const handleStatusChange = async (quote, newStatus, e) => {
    if (e) e.stopPropagation();
    const id = quote.id || quote._id;
    try {
      await quotationsApi.updateStatus(id, newStatus);
      setSuccessToast(`Quotation marked as ${newStatus}`);
      setQuotations((prev) =>
        prev.map((q) => ((q.id || q._id) === id ? { ...q, status: newStatus } : q))
      );
    } catch (err) {
      alert("Failed to update status");
    }
  };

  // Delete Quotation
  const handleDelete = async (quote, e) => {
    if (e) e.stopPropagation();
    const id = quote.id || quote._id;
    if (!window.confirm(`Are you sure you want to delete quotation ${quote.quotationNumber}?`)) {
      return;
    }

    try {
      await quotationsApi.remove(id);
      setQuotations((prev) => prev.filter((q) => (q.id || q._id) !== id));
      setSuccessToast("Quotation deleted");
    } catch (err) {
      alert("Failed to delete quotation");
    }
  };

  // Share Quotation
  const handleShare = (quote, e) => {
    if (e) e.stopPropagation();
    const shareText = `Quotation ${quote.quotationNumber} from ${shopSettings?.shopName || "BILZET"}\nTotal Amount: ₹${(quote.grandTotal || quote.totalAmount || 0).toLocaleString("en-IN")}\nStatus: ${quote.status}`;
    if (navigator.share) {
      navigator.share({
        title: `Quotation ${quote.quotationNumber}`,
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setSuccessToast("Quotation summary copied to clipboard!");
    }
  };

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const qNum = (q.quotationNumber || q.number || "").toLowerCase();
      const cName = (q.customerName || q.customer?.name || "").toLowerCase();
      const cPhone = (q.customerPhone || q.customer?.phone || "").toLowerCase();
      const matchSearch =
        !search ||
        qNum.includes(search.toLowerCase()) ||
        cName.includes(search.toLowerCase()) ||
        cPhone.includes(search.toLowerCase());

      const matchStatus = statusFilter === "ALL" || q.status === statusFilter;

      let matchDate = true;
      if (dateFilter?.start && dateFilter?.end) {
        const d = new Date(q.quotationDate || q.createdAt).getTime();
        matchDate = d >= dateFilter.start.getTime() && d <= dateFilter.end.getTime();
      }

      return matchSearch && matchStatus && matchDate;
    });
  }, [quotations, search, statusFilter, dateFilter]);

  // Counts by status
  const counts = useMemo(() => {
    const map = { ALL: quotations.length, DRAFT: 0, SENT: 0, ACCEPTED: 0, REJECTED: 0, EXPIRED: 0 };
    quotations.forEach((q) => {
      if (map[q.status] !== undefined) map[q.status]++;
    });
    return map;
  }, [quotations]);

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl font-medium text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Quotations & Estimates</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                  {quotations.length} Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Generate professional proposals, manage client approvals, and seamlessly convert accepted quotes into tax invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            title="Refresh Quotations"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === st
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                }`}
              >
                <span>{st === "ALL" ? "All Quotations" : st.charAt(0) + st.slice(1).toLowerCase()}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === st ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {counts[st] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Showing <strong className="text-slate-700">{filteredQuotations.length}</strong> of {quotations.length} records
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by quotation #, client name, phone..."
            />
          </div>
          <DateNavigator onDateChange={setDateFilter} />
        </div>
      </div>

      {/* Quotations List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-sm font-medium">Loading quotations & proposals...</p>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Quotations Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
              {search || statusFilter !== "ALL"
                ? "No quotations match your current search or status filter."
                : "Create your first professional quotation to send to prospective clients and convert to sales."}
            </p>
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Quotation #</th>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Quote Date</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Linked Invoice</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((quote) => {
                  const statusConf = STATUS_CONFIG[quote.status] || STATUS_CONFIG.DRAFT;
                  const isConverted = quote.convertedToInvoice || !!quote.invoiceNumber;
                  const isExpired =
                    quote.status === "EXPIRED" ||
                    (quote.expiryDate && new Date(quote.expiryDate).getTime() < Date.now() && quote.status === "DRAFT");

                  return (
                    <tr
                      key={quote.id || quote._id}
                      onClick={() => setPreviewQuotation(quote)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Quotation # */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            QT
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {quote.quotationNumber || quote.number}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              POS/Sale Quote
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {quote.customerName || quote.customer?.name || "Walk-in Client"}
                        </div>
                        <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                          {quote.customerPhone ? (
                            <>
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{quote.customerPhone}</span>
                            </>
                          ) : (
                            <span>No phone provided</span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {quote.quotationDate
                          ? new Date(quote.quotationDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4">
                        {quote.expiryDate ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              isExpired ? "text-amber-600 font-semibold" : "text-slate-600"
                            }`}
                          >
                            {new Date(quote.expiryDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                            {isExpired && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 px-1 rounded border border-amber-200">
                                Expired
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                          {quote.items?.length || 0} items
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          ₹{Number(quote.grandTotal || quote.totalAmount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Tax ₹{Number(quote.taxAmount || 0).toFixed(2)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs"
                             style={{
                               borderColor: "currentColor",
                             }}
                        >
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusConf.bg}`}>
                            {statusConf.label}
                          </span>
                        </div>
                      </td>

                      {/* Linked Invoice */}
                      <td className="py-3.5 px-4">
                        {isConverted ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{quote.invoiceNumber || "Converted"}</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleConvertToInvoice(quote, e)}
                            disabled={convertingId === (quote.id || quote._id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors shadow-2xs"
                            title="Convert to Sales Tax Invoice"
                          >
                            <span>Convert to Invoice</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setPreviewQuotation(quote)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Preview / Print Quotation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleShare(quote, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Share Quotation"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {!isConverted && (
                            <button
                              onClick={() => handleEdit(quote)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Edit Quotation"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Quick Status Dropdown */}
                          <select
                            value={quote.status}
                            onChange={(e) => handleStatusChange(quote, e.target.value, e)}
                            className="text-xs bg-transparent border border-slate-200 rounded-md px-1 py-1 text-slate-600 hover:border-slate-300 focus:outline-none"
                            title="Change Status"
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="EXPIRED">Expired</option>
                          </select>

                          <button
                            onClick={(e) => handleDelete(quote, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* NEW / EDIT QUOTATION MODAL                                               */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingId ? "Edit Quotation" : "Create New Quotation"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Specify client details, products, GST rates, and terms of proposal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Row 1: Document Details */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quotation Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.quotationNumber}
                    onChange={(e) => setForm({ ...form, quotationNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quotation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.quotationDate}
                    onChange={(e) => setForm({ ...form, quotationDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry / Valid Date
                  </label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent to Client</option>
                    <option value="ACCEPTED">Accepted</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Customer Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Customer / Client Information
                  </h3>
                  {customerList.length > 0 && (
                    <select
                      onChange={(e) => {
                        const cust = customerList.find((c) => (c.id || c._id) === e.target.value);
                        if (cust) {
                          setForm((prev) => ({
                            ...prev,
                            customerName: cust.name || "",
                            customerPhone: cust.phone || "",
                            customerEmail: cust.email || "",
                            customerGstin: cust.gstin || "",
                            billingAddress: cust.address || "",
                          }));
                        }
                      }}
                      defaultValue=""
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 hover:border-slate-300"
                    >
                      <option value="" disabled>
                        Auto-fill from saved client...
                      </option>
                      {customerList.map((c) => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phone / Mobile
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={form.customerPhone}
                      onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer GSTIN (B2B)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      value={form.customerGstin}
                      onChange={(e) => setForm({ ...form, customerGstin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street, City, State, PIN"
                      value={form.billingAddress}
                      onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Place of Supply
                    </label>
                    <select
                      value={form.placeOfSupply}
                      onChange={(e) => {
                        const newPos = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          placeOfSupply: newPos,
                          items: prev.items.map((it) => recalculateItem(it, newPos)),
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="33-TN">33-Tamil Nadu (Intra-State CGST+SGST)</option>
                      <option value="29-KA">29-Karnataka (Inter-State IGST)</option>
                      <option value="27-MH">27-Maharashtra (Inter-State IGST)</option>
                      <option value="07-DL">07-Delhi (Inter-State IGST)</option>
                      <option value="32-KL">32-Kerala (Inter-State IGST)</option>
                      <option value="36-TS">36-Telangana (Inter-State IGST)</option>
                      <option value="37-AP">37-Andhra Pradesh (Inter-State IGST)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Product Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Quotation Line Items & GST Calculations
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3 min-w-[200px]">Product / Service</th>
                          <th className="py-2.5 px-3 min-w-[90px]">Unit</th>
                          <th className="py-2.5 px-3 min-w-[90px] text-center">Qty</th>
                          <th className="py-2.5 px-3 min-w-[100px] text-right">Unit Price (₹)</th>
                          <th className="py-2.5 px-3 min-w-[110px] text-center">Tax Mode</th>
                          <th className="py-2.5 px-3 min-w-[80px] text-center">GST %</th>
                          <th className="py-2.5 px-3 min-w-[70px] text-center">Disc %</th>
                          <th className="py-2.5 px-3 min-w-[90px] text-right">Taxable</th>
                          <th className="py-2.5 px-3 min-w-[80px] text-right">GST</th>
                          <th className="py-2.5 px-3 min-w-[100px] text-right">Line Total</th>
                          <th className="py-2.5 px-2 text-center w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {form.items.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50">
                            {/* Product Name & Catalog Select */}
                            <td className="py-2 px-3">
                              <div className="space-y-1">
                                {catalogProducts.length > 0 && (
                                  <select
                                    value={item.productId || ""}
                                    onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                                    className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700"
                                  >
                                    <option value="">-- Choose from Catalog or Type Below --</option>
                                    {catalogProducts.map((p) => (
                                      <option key={p.id || p._id} value={p.id || p._id}>
                                        {p.name} (₹{p.sellingPrice || p.price})
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <input
                                  type="text"
                                  required
                                  placeholder="Item Name / Description"
                                  value={item.name}
                                  onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                                  className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </td>

                            {/* Unit */}
                            <td className="py-2 px-3">
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                              >
                                {UNITS.map((u) => (
                                  <option key={u.value} value={u.value}>
                                    {u.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Qty with buttons */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleItemChange(idx, "quantity", Math.max(1, Number(item.quantity) - 1))
                                  }
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  required
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                  className="w-12 text-center px-1 py-1 rounded border border-slate-200 text-xs font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleItemChange(idx, "quantity", Number(item.quantity) + 1)
                                  }
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* Unit Price */}
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                required
                                value={item.rate}
                                onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                className="w-20 text-right px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold"
                              />
                            </td>

                            {/* Tax Mode: Inclusive / Exclusive */}
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, "isTaxInclusive", !item.isTaxInclusive)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                  item.isTaxInclusive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}
                                title="Click to toggle Inclusive vs Exclusive"
                              >
                                {item.isTaxInclusive ? "Inc (MRP)" : "Exc (Std)"}
                              </button>
                            </td>

                            {/* GST Rate Quick Select */}
                            <td className="py-2 px-3 text-center">
                              <select
                                value={item.gstRate}
                                onChange={(e) => handleItemChange(idx, "gstRate", Number(e.target.value))}
                                className="px-1.5 py-1 rounded border border-slate-200 text-xs font-semibold bg-white"
                              >
                                {GST_RATES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}%
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Discount % */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={item.discountPercent}
                                onChange={(e) => handleItemChange(idx, "discountPercent", e.target.value)}
                                className="w-12 text-center px-1 py-1 rounded border border-slate-200 text-xs"
                              />
                            </td>

                            {/* Taxable */}
                            <td className="py-2 px-3 text-right text-slate-700 font-medium">
                              ₹{Number(item.taxableAmount || 0).toFixed(2)}
                            </td>

                            {/* GST */}
                            <td className="py-2 px-3 text-right text-slate-700 font-medium">
                              ₹{Number(item.gstAmount || 0).toFixed(2)}
                            </td>

                            {/* Line Total */}
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              ₹{Number(item.total || 0).toFixed(2)}
                            </td>

                            {/* Remove button */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                disabled={form.items.length <= 1}
                                onClick={() => handleRemoveItem(idx)}
                                className={`text-slate-400 hover:text-rose-600 transition-colors ${
                                  form.items.length <= 1 ? "opacity-30 cursor-not-allowed" : ""
                                }`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Row 4: Notes, Terms, and Totals Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notes for Client
                    </label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Special offer, delivery timeframe, etc."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Terms & Conditions (Printed on Quotation)
                    </label>
                    <textarea
                      rows={3}
                      value={form.termsAndConditions}
                      onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
                      placeholder="Payment terms, validity, warranty..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Subtotal</span>
                    <span className="font-semibold text-slate-800">₹{summary.subtotal.toFixed(2)}</span>
                  </div>
                  {summary.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Total Discount</span>
                      <span className="font-semibold">- ₹{summary.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2">
                    <span>Taxable Value</span>
                    <span className="font-semibold text-slate-800">₹{summary.taxableAmount.toFixed(2)}</span>
                  </div>

                  {summary.igst > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Integrated GST (IGST)</span>
                      <span className="font-semibold text-slate-800">₹{summary.igst.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Central GST (CGST)</span>
                        <span className="font-semibold text-slate-800">₹{summary.cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>State GST (SGST)</span>
                        <span className="font-semibold text-slate-800">₹{summary.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {summary.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off</span>
                      <span>{summary.roundOff > 0 ? `+₹${summary.roundOff}` : `-₹${Math.abs(summary.roundOff)}`}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t-2 border-slate-300 pt-2">
                    <span>Grand Total (INR)</span>
                    <span className="text-base text-blue-700">₹{summary.grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all"
                >
                  {submitting ? "Saving..." : editingId ? "Update Quotation" : "Save Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUOTATION PREVIEW & PRINT MODAL (Uses Master TaxInvoice Component)         */}
      {/* ========================================================================= */}
      {previewQuotation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Sub-Header with Status & Conversion Option */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Quotation Preview
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {previewQuotation.quotationNumber || previewQuotation.number}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!previewQuotation.convertedToInvoice && !previewQuotation.invoiceNumber && (
                  <button
                    onClick={(e) => {
                      handleConvertToInvoice(previewQuotation, e);
                      setPreviewQuotation(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Convert to Invoice
                  </button>
                )}
                <button
                  onClick={() => setPreviewQuotation(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded Live TaxInvoice renderer */}
            <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
              <TaxInvoice
                invoice={{
                  ...previewQuotation,
                  isQuotation: true,
                  invoiceNumber: previewQuotation.quotationNumber || previewQuotation.number,
                  invoiceDate: previewQuotation.quotationDate || previewQuotation.date,
                  customer: previewQuotation.customer || {
                    name: previewQuotation.customerName,
                    phone: previewQuotation.customerPhone,
                    email: previewQuotation.customerEmail,
                    gstin: previewQuotation.customerGstin,
                    address: previewQuotation.billingAddress,
                  },
                }}
                shopSettings={shopSettings}
                isModal={false}
                showActions={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
