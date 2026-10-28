import { useState, useEffect, useRef } from "react";
import {
  ShoppingBag,
  Plus,
  ClipboardList,
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Eye,
  RefreshCw,
  X,
  FileText,
  DollarSign,
  Truck,
  Trash2,
  ArrowDownLeft,
  Building2,
  Phone,
  MapPin,
  Tag,
  Barcode,
  ExternalLink,
  ArrowUpRight,
  Check,
  Download,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { purchasesApi, suppliersApi, productsApi } from "../api";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Button, { CompactIconButton } from "../components/common/Button";
import { useRealtimeSync } from "../hooks/useRealtimeSync";
import { handleSmartFormKeyDown } from "../utils/keyboardNavigation";

export default function Purchases({ defaultTab = "invoices" }) {
  const location = useLocation();
  const activeTab = location.pathname.includes("orders")
    ? "orders"
    : location.pathname.includes("debit-notes")
    ? "debitNotes"
    : defaultTab;

  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeDebitNotes = Array.isArray(debitNotes) ? debitNotes : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeProducts = Array.isArray(products) ? products : [];

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const invoiceFormRef = useRef(null);

  // Supplier mode in forms ("existing" | "new")
  const [invoiceSupplierMode, setInvoiceSupplierMode] = useState("existing");
  const [orderSupplierMode, setOrderSupplierMode] = useState("existing");

  // Forms
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: "",
    newSupplier: {
      name: "",
      companyName: "",
      phone: "",
      email: "",
      gstin: "",
      address: "",
    },
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    items: [
      {
        productId: "",
        name: "",
        sku: "",
        barcode: "",
        quantity: 1,
        purchasePrice: 0,
        taxRate: 18,
      },
    ],
    paymentStatus: "PAID",
    notes: "",
  });

  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    newSupplier: {
      name: "",
      companyName: "",
      phone: "",
      email: "",
      gstin: "",
      address: "",
    },
    expectedDelivery: "",
    items: [
      {
        productId: "",
        name: "",
        sku: "",
        barcode: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
      },
    ],
    notes: "",
  });

  const [debitForm, setDebitForm] = useState({
    purchaseId: "",
    amount: "",
    reason: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const extractList = (res, key) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.[key])) return res[key];
    if (Array.isArray(res?.data?.[key])) return res.data[key];
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, ordRes, debRes, supRes, prodRes] = await Promise.all([
        purchasesApi.list(),
        purchasesApi.orders(),
        purchasesApi.debitNotes(),
        suppliersApi.list({ limit: 100 }),
        productsApi.list({ limit: 100 }),
      ]);
      setInvoices(extractList(invRes, "purchases"));
      const poList = extractList(ordRes, "purchaseOrders");
      setOrders(poList.length ? poList : extractList(ordRes, "orders"));
      setDebitNotes(extractList(debRes, "debitNotes"));
      setSuppliers(extractList(supRes, "suppliers"));
      setProducts(extractList(prodRes, "products"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization for Purchases
  useRealtimeSync(
    ["PURCHASE_CREATED", "STOCK_ADJUSTED", "PRODUCT_UPDATED", "PRODUCT_CREATED"],
    () => {
      loadData();
    }
  );

  // ── Helper: find supplier ──
  const getSupplierInfo = (supplierId) => {
    return safeSuppliers.find((s) => s.id === supplierId || s._id === supplierId) || null;
  };

  // ── INVOICE ITEMS dynamic rows ──
  const addInvoiceItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          name: "",
          sku: "",
          barcode: "",
          quantity: 1,
          purchasePrice: 0,
          taxRate: 18,
        },
      ],
    }));
  };

  const removeInvoiceItem = (index) => {
    if (invoiceForm.items.length <= 1) return;
    setInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateInvoiceItem = (index, field, val) => {
    setInvoiceForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], [field]: val };

      if (field === "productId") {
        if (val) {
          const prod = safeProducts.find((p) => p.id === val || p._id === val);
          if (prod) {
            next[index].name = prod.name || "";
            next[index].sku = prod.sku || "";
            next[index].barcode = prod.barcode || "";
            next[index].purchasePrice = Number(prod.purchasePrice || prod.price || 0);
            next[index].taxRate = Number(prod.gstRate || prod.taxRate || 18);
          }
        }
      }
      return { ...prev, items: next };
    });
  };

  // ── ORDER ITEMS dynamic rows ──
  const addOrderItem = () => {
    setOrderForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          name: "",
          sku: "",
          barcode: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 18,
        },
      ],
    }));
  };

  const removeOrderItem = (index) => {
    if (orderForm.items.length <= 1) return;
    setOrderForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateOrderItem = (index, field, val) => {
    setOrderForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], [field]: val };

      if (field === "productId") {
        if (val) {
          const prod = safeProducts.find((p) => p.id === val || p._id === val);
          if (prod) {
            next[index].name = prod.name || "";
            next[index].sku = prod.sku || "";
            next[index].barcode = prod.barcode || "";
            next[index].unitPrice = Number(prod.purchasePrice || prod.price || 0);
            next[index].taxRate = Number(prod.gstRate || prod.taxRate || 18);
          }
        }
      }
      return { ...prev, items: next };
    });
  };

  // ── Calculations ──
  const invoiceSubtotal = invoiceForm.items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
  }, 0);

  const invoiceTaxTotal = invoiceForm.items.reduce((sum, item) => {
    const cost = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
    return sum + (cost * (Number(item.taxRate) || 0)) / 100;
  }, 0);

  const invoiceTotal = invoiceSubtotal + invoiceTaxTotal;

  const orderSubtotal = orderForm.items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);

  const orderTaxTotal = orderForm.items.reduce((sum, item) => {
    const cost = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return sum + (cost * (Number(item.taxRate) || 0)) / 100;
  }, 0);

  const orderTotal = orderSubtotal + orderTaxTotal;

  // ── Submissions ──
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (invoiceSupplierMode === "existing" && !invoiceForm.supplierId) {
      notify("error", "Please select a supplier from the directory.");
      return;
    }
    if (invoiceSupplierMode === "new" && !invoiceForm.newSupplier.name.trim()) {
      notify("error", "Supplier Name is required when adding a new supplier.");
      return;
    }

    setSubmitting(true);
    try {
      const paid =
        invoiceForm.paymentStatus === "PAID"
          ? invoiceTotal
          : invoiceForm.paymentStatus === "PARTIAL"
          ? Number((invoiceTotal / 2).toFixed(2))
          : 0;

      const payload = {
        invoiceNumber: invoiceForm.invoiceNumber.trim() || undefined,
        invoiceDate: invoiceForm.invoiceDate,
        paymentStatus: invoiceForm.paymentStatus,
        paidAmount: paid,
        totalAmount: invoiceTotal,
        notes: invoiceForm.notes,
        items: invoiceForm.items.map((it) => ({
          productId: it.productId || undefined,
          name: it.name.trim() || "Item",
          sku: it.sku?.trim() || undefined,
          barcode: it.barcode?.trim() || undefined,
          purchasePrice: Number(it.purchasePrice) || 0,
          quantity: Number(it.quantity) || 1,
          gstRate: Number(it.taxRate) || 0,
          taxRate: Number(it.taxRate) || 0,
        })),
      };

      if (invoiceSupplierMode === "existing") {
        payload.supplierId = invoiceForm.supplierId;
      } else {
        payload.newSupplier = {
          name: invoiceForm.newSupplier.name.trim(),
          companyName: invoiceForm.newSupplier.companyName.trim() || undefined,
          phone: invoiceForm.newSupplier.phone.trim() || undefined,
          email: invoiceForm.newSupplier.email.trim() || undefined,
          gstin: invoiceForm.newSupplier.gstin.trim() || undefined,
          address: invoiceForm.newSupplier.address.trim() || undefined,
        };
      }

      await purchasesApi.create(payload);
      notify("success", "Purchase invoice recorded and inventory updated!");
      setShowInvoiceModal(false);
      setInvoiceForm({
        supplierId: "",
        newSupplier: { name: "", companyName: "", phone: "", email: "", gstin: "", address: "" },
        invoiceNumber: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        items: [{ productId: "", name: "", sku: "", barcode: "", quantity: 1, purchasePrice: 0, taxRate: 18 }],
        paymentStatus: "PAID",
        notes: "",
      });
      setInvoiceSupplierMode("existing");
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to record purchase");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (orderSupplierMode === "existing" && !orderForm.supplierId) {
      notify("error", "Please select a supplier from the directory.");
      return;
    }
    if (orderSupplierMode === "new" && !orderForm.newSupplier.name.trim()) {
      notify("error", "Supplier Name is required when adding a new supplier.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        expectedDelivery: orderForm.expectedDelivery || undefined,
        notes: orderForm.notes,
        items: orderForm.items.map((i) => ({
          productId: i.productId || undefined,
          name: i.name.trim() || "Item",
          sku: i.sku?.trim() || undefined,
          barcode: i.barcode?.trim() || undefined,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          rate: Number(i.unitPrice) || 0,
          expectedPrice: Number(i.unitPrice) || 0,
          taxRate: Number(i.taxRate) || 18,
          gstRate: Number(i.taxRate) || 18,
        })),
      };

      if (orderSupplierMode === "existing") {
        payload.supplierId = orderForm.supplierId;
      } else {
        payload.newSupplier = {
          name: orderForm.newSupplier.name.trim(),
          companyName: orderForm.newSupplier.companyName.trim() || undefined,
          phone: orderForm.newSupplier.phone.trim() || undefined,
          email: orderForm.newSupplier.email.trim() || undefined,
          gstin: orderForm.newSupplier.gstin.trim() || undefined,
          address: orderForm.newSupplier.address.trim() || undefined,
        };
      }

      await purchasesApi.createOrder(payload);
      notify("success", "Purchase Order created successfully!");
      setShowOrderModal(false);
      setOrderForm({
        supplierId: "",
        newSupplier: { name: "", companyName: "", phone: "", email: "", gstin: "", address: "" },
        expectedDelivery: "",
        items: [{ productId: "", name: "", sku: "", barcode: "", quantity: 1, unitPrice: 0, taxRate: 18 }],
        notes: "",
      });
      setOrderSupplierMode("existing");
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  };

  // ── DATA FLOW: Purchase Order → Purchase Invoice ──
  const handleConvertPO = (po) => {
    const rawItems = po.items && Array.isArray(po.items) && po.items.length > 0 ? po.items : [];
    const populatedItems = rawItems.map((i) => ({
      productId: i.productId || "",
      name: i.name || i.product?.name || "Purchased Item",
      sku: i.sku || i.product?.sku || "",
      barcode: i.barcode || i.product?.barcode || "",
      quantity: Number(i.quantity) || 1,
      purchasePrice: Number(i.unitPrice || i.rate || i.expectedPrice || i.purchasePrice || 0),
      taxRate: Number(i.taxRate || i.gstRate || 18),
    }));

    setInvoiceSupplierMode("existing");
    setInvoiceForm({
      supplierId: po.supplierId,
      newSupplier: { name: "", companyName: "", phone: "", email: "", gstin: "", address: "" },
      invoiceNumber: `INV-${po.poNumber || "PO-REC"}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      items:
        populatedItems.length > 0
          ? populatedItems
          : [{ productId: "", name: "", sku: "", barcode: "", quantity: 1, purchasePrice: 0, taxRate: 18 }],
      paymentStatus: "UNPAID",
      notes: `Converted from PO #${po.poNumber || po.id}`,
    });
    setShowInvoiceModal(true);
  };

  const handleCreateDebitNote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const targetInvoice = safeInvoices.find((inv) => inv.id === debitForm.purchaseId);
      await purchasesApi.createDebitNote({
        ...debitForm,
        supplierId: targetInvoice?.supplierId,
        referenceInvoice: targetInvoice?.invoiceNumber,
      });
      notify("success", "Debit note registered against supplier account!");
      setShowDebitModal(false);
      setDebitForm({ purchaseId: "", amount: "", reason: "", notes: "" });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to issue debit note");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedInvoiceSupplier = getSupplierInfo(invoiceForm.supplierId);
  const selectedOrderSupplier = getSupplierInfo(orderForm.supplierId);

  const pageMeta = {
    invoices: {
      icon: ShoppingBag,
      title: "Purchase Invoices",
      subtitle: "Manage incoming vendor bills, payment receipts, and inward inventory entries.",
      actionLabel: "Record Purchase",
      onAction: () => {
        setInvoiceSupplierMode("existing");
        setShowInvoiceModal(true);
      },
      searchPlaceholder: "Search bills by invoice #, supplier, or company...",
      count: safeInvoices.length,
    },
    orders: {
      icon: ClipboardList,
      title: "Purchase Orders",
      subtitle: "Create and track official purchase orders issued to suppliers & distributors.",
      actionLabel: "New Purchase Order",
      onAction: () => {
        setOrderSupplierMode("existing");
        setShowOrderModal(true);
      },
      searchPlaceholder: "Search PO #, supplier, or company...",
      count: safeOrders.length,
    },
    debitNotes: {
      icon: Receipt,
      title: "Debit Notes & Purchase Returns",
      subtitle: "Manage vendor debit notes, return adjustments, and credit balances.",
      actionLabel: "Issue Debit Note",
      onAction: () => setShowDebitModal(true),
      searchPlaceholder: "Search debit notes by reference invoice...",
      count: safeDebitNotes.length,
    },
  }[activeTab] || {
    icon: ShoppingBag,
    title: "Purchases",
    subtitle: "Vendor purchases and orders",
    actionLabel: "New Action",
    onAction: () => {},
    searchPlaceholder: "Search...",
    count: 0,
  };

  const PageIcon = pageMeta.icon;

  // Predefined palette of soft, professional colors for deterministic avatar assignment
  const SUPPLIER_AVATAR_PALETTES = [
    { bg: "#EBF5FF", text: "#007AFF", border: "#D0E2FF" }, // Blue
    { bg: "#F3E8FF", text: "#7C3AED", border: "#E9D5FF" }, // Purple
    { bg: "#E6FFFA", text: "#0D9488", border: "#B2F5EA" }, // Teal
    { bg: "#EDF8F0", text: "#248A3D", border: "#CCE8D4" }, // Green
    { bg: "#FFF4E5", text: "#C25E00", border: "#FFE2B8" }, // Orange
    { bg: "#FDF2F8", text: "#DB2777", border: "#FCE7F3" }, // Pink
    { bg: "#EEF2FF", text: "#4F46E5", border: "#E0E7FF" }, // Indigo
    { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" }, // Rose
  ];

  const getSupplierAvatarPalette = (idOrName) => {
    const str = String(idOrName || "supplier");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % SUPPLIER_AVATAR_PALETTES.length;
    return SUPPLIER_AVATAR_PALETTES[index];
  };

  // Date filter & pagination states for Purchase Invoices
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredInvoices = safeInvoices.filter((inv) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.supplier?.name?.toLowerCase().includes(term) ||
      inv.supplier?.companyName?.toLowerCase().includes(term) ||
      inv.supplier?.phone?.includes(term);

    if (!matchesSearch) return false;

    const invDateStr = inv.invoiceDate || inv.createdAt;
    if (dateFilter === "all" || !invDateStr) return true;
    const d = new Date(invDateStr);
    const now = new Date();
    if (dateFilter === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    }
    if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d >= monthAgo;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportInvoices = () => {
    const headers = [
      "Invoice #",
      "Supplier",
      "Company",
      "Date",
      "Total Amount",
      "Balance Due",
      "Status",
    ];
    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoiceNumber || `BILL-${inv.id?.slice(0, 6)}`}"`,
      `"${inv.supplier?.name || "Vendor"}"`,
      `"${inv.supplier?.companyName || ""}"`,
      `"${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString()}"`,
      Number(inv.totalAmount || inv.grandTotal || 0).toFixed(2),
      Number(
        inv.balanceDue ||
          Math.max(0, (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0))
      ).toFixed(2),
      `"${inv.paymentStatus || "PAID"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `purchase_invoices_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = safeOrders.filter((po) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      po.poNumber?.toLowerCase().includes(term) ||
      po.supplier?.name?.toLowerCase().includes(term) ||
      po.supplier?.companyName?.toLowerCase().includes(term)
    );
  });

  const filteredDebitNotes = safeDebitNotes.filter((dn) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      dn.debitNoteNumber?.toLowerCase().includes(term) ||
      dn.referenceInvoice?.toLowerCase().includes(term) ||
      dn.reason?.toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="space-y-6 max-w-7xl mx-auto pb-12 fade-up text-[#1D1D1F]"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] text-[#007AFF] border border-[#E5E5EA] flex items-center justify-center shrink-0">
            <PageIcon size={20} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-semibold text-[#1D1D1F] tracking-tight leading-tight">
              {pageMeta.title}
            </h1>
            <p className="text-[13.5px] text-[#6E6E73] font-normal mt-0.5">
              {pageMeta.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={pageMeta.onAction}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13.5px] font-medium bg-[#007AFF] hover:bg-[#0062CC] text-white transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)] self-start sm:self-auto"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>{pageMeta.actionLabel}</span>
        </button>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-[#EDF8F0] border border-[#CCE8D4] text-[#248A3D]"
              : "bg-[#FFF2F2] border border-[#FFD0D0] text-[#D70015]"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} className="text-[#248A3D] shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-[#D70015] shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Search Bar & Actions Toolbar ── */}
      <div className="p-4 rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search field */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]"
            />
            <input
              type="text"
              placeholder={pageMeta.searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-[13.5px] border border-[#E5E5EA] rounded-xl outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition bg-white text-[#1D1D1F] placeholder-[#6E6E73]/60"
            />
          </div>

          {/* Date Filter Dropdown (Active for Invoices) */}
          {activeTab === "invoices" && (
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-[13.5px] border border-[#E5E5EA] rounded-xl bg-white text-[#1D1D1F] outline-none focus:border-[#007AFF] cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          )}
        </div>

        {/* Export & Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {activeTab === "invoices" && (
            <button
              type="button"
              onClick={handleExportInvoices}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              title="Export filtered invoices as CSV"
            >
              <Download size={14} className="text-[#6E6E73]" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-xl transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            title="Refresh records"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin text-[#007AFF]" : "text-[#6E6E73]"}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Tab Views ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#007AFF]" />
          <p className="text-[13.5px] text-[#6E6E73]">Loading purchase records…</p>
        </div>
      ) : activeTab === "invoices" ? (
        /* Purchase Invoices Table — Apple macOS Typography & Design */
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[12px] font-medium text-[#6E6E73] uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier &amp; Company</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[13.5px] text-[#6E6E73]">
                      No purchase invoices found matching your filters. Click &quot;Record Purchase&quot; above to add your first vendor bill.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv, idx) => {
                    const dueAmount = Number(
                      inv.balanceDue ||
                        Math.max(
                          0,
                          (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0)
                        )
                    );
                    const status = inv.paymentStatus || "PAID";
                    const supplierName = inv.supplier?.name || "Vendor";
                    const supplierInitial = supplierName.trim().charAt(0).toUpperCase() || "S";
                    const palette = getSupplierAvatarPalette(
                      inv.invoiceNumber || inv.id || `${supplierName}-${idx}`
                    );
                    const invDateFormatted = inv.invoiceDate
                      ? new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : new Date(inv.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });

                    return (
                      <tr key={inv.id} className="hover:bg-[#F5F5F7]/60 transition">
                        {/* Invoice # */}
                        <td className="py-3 px-4 font-mono font-medium text-[13.5px] text-[#007AFF]">
                          <span
                            onClick={() => setSelectedInvoice(inv)}
                            className="hover:underline cursor-pointer"
                          >
                            {inv.invoiceNumber || `BILL-${inv.id.slice(0, 6)}`}
                          </span>
                        </td>

                        {/* Supplier & Company */}
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
                              {supplierInitial}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1D1D1F] text-[14px] leading-snug">
                                {supplierName}
                              </p>
                              <p className="text-[12.5px] text-[#6E6E73] font-normal leading-normal">
                                {inv.supplier?.companyName || inv.supplier?.phone || "No company on file"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-[#1D1D1F] text-[13.5px] font-normal">
                          {invDateFormatted}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 text-right font-semibold text-[#1D1D1F] text-[13.5px] font-mono tabular-nums">
                          ₹{Number(inv.totalAmount || inv.grandTotal || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Balance Due */}
                        <td className="py-3 px-4 text-right font-semibold text-[13.5px] font-mono tabular-nums">
                          <span className={dueAmount > 0 ? "text-[#D70015]" : "text-[#6E6E73]"}>
                            ₹{dueAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${
                              status === "PAID"
                                ? "bg-[#EDF8F0] text-[#248A3D] border-[#CCE8D4]"
                                : status === "PARTIAL"
                                ? "bg-[#FFF8EB] text-[#9A6700] border-[#FBE3B5]"
                                : "bg-[#FFF2F2] text-[#D70015] border-[#FFD0D0]"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        {/* Action: View Button */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-[13.5px] font-medium rounded-lg text-[#007AFF] hover:bg-[#EBF5FF] transition cursor-pointer"
                            title="View Invoice Details"
                          >
                            <span>View</span>
                            <span aria-hidden="true">&rarr;</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination and Footer Text */}
          {filteredInvoices.length > 0 && (
            <div className="px-4 py-3 border-t border-[#E5E5EA] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#6E6E73]">
              <div>
                Showing{" "}
                <strong className="text-[#1D1D1F] font-semibold">
                  {(currentPage - 1) * itemsPerPage + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-[#1D1D1F] font-semibold">
                  {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-[#1D1D1F] font-semibold">
                  {filteredInvoices.length}
                </strong>{" "}
                invoices
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-[12.5px] font-medium border border-[#E5E5EA] rounded-lg bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Previous
                </button>

                <span className="px-2.5 py-1 text-[12.5px] font-medium text-[#1D1D1F]">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-[12.5px] font-medium border border-[#E5E5EA] rounded-lg bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "orders" ? (
        /* Purchase Orders Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Supplier &amp; Company</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4 text-right">Estimated Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No purchase orders active. Generate a PO to dispatch to vendors.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po, idx) => {
                    const supName = po.supplier?.name || "Supplier";
                    const initial = supName.trim().charAt(0).toUpperCase();
                    const palette = getSupplierAvatarPalette(
                      po.poNumber || po.id || `${supName}-${idx}`
                    );
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                          {po.poNumber || `PO-${po.id.slice(0, 6)}`}
                        </td>
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
                              <p className="font-semibold text-slate-800 leading-tight">
                                {supName}
                              </p>
                              {po.supplier?.companyName ? (
                                <p className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                                  <Building2 size={11} className="shrink-0 text-indigo-500" />
                                  <span>{po.supplier.companyName}</span>
                                </p>
                              ) : (
                                <span className="text-[10px] text-slate-400">{po.supplier?.phone || ""}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      <td className="py-3 px-4 text-slate-500">
                        {po.expectedDelivery
                          ? new Date(po.expectedDelivery).toLocaleDateString()
                          : "Immediate"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {Array.isArray(po.items) ? po.items.length : 1} items
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 tabular-nums">
                        ₹{Number(po.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {po.status || "PENDING"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleConvertPO(po)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center gap-1"
                          title="Convert to Purchase Invoice"
                        >
                          <span>Convert to Bill</span>
                          <ArrowRight size={12} />
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
      ) : (
        /* Debit Notes Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-xs">Debit Notes &amp; Purchase Returns</h3>
              <p className="text-[11px] text-slate-400">Claims and return credits against vendor invoices</p>
            </div>
            <button
              onClick={() => setShowDebitModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              <Plus size={13} />
              <span>Issue Debit Note</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Note #</th>
                  <th className="py-3 px-4">Reference Invoice</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebitNotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No debit notes issued yet.
                    </td>
                  </tr>
                ) : (
                  filteredDebitNotes.map((dn) => (
                    <tr key={dn.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-rose-600">
                        {dn.debitNoteNumber || `DN-${dn.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {dn.referenceInvoice || "Direct Vendor Claim"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{dn.reason || dn.notes || "Damaged goods return"}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 tabular-nums">
                        ₹{Number(dn.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(dn.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          RECORD PURCHASE INVOICE MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Record Purchase Invoice (Vendor Bill)"
        subtitle="Record incoming goods, vendor liabilities, and update inventory"
        icon={FileText}
        iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
        maxWidth="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowInvoiceModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invoice-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-sm transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Save &amp; Update Inventory</span>
            </button>
          </>
        }
      >
        <form
          id="invoice-form"
          ref={invoiceFormRef}
          onKeyDown={(e) =>
            handleSmartFormKeyDown(e, invoiceFormRef.current, {
              onAddRow: () => addInvoiceItem(),
            })
          }
          onSubmit={handleCreateInvoice}
          className="space-y-4 text-xs"
        >
          {/* Supplier Section Header & Selector */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Truck size={14} className="text-indigo-600" />
                <span>Supplier Details</span>
              </span>

              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setInvoiceSupplierMode("existing")}
                  className={`px-2.5 py-1 rounded transition ${
                    invoiceSupplierMode === "existing"
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceSupplierMode("new")}
                  className={`px-2.5 py-1 rounded transition ${
                    invoiceSupplierMode === "new"
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  + Add New Supplier
                </button>
              </div>
            </div>

            {invoiceSupplierMode === "existing" ? (
              <div className="space-y-2">
                <select
                  required={invoiceSupplierMode === "existing"}
                  value={invoiceForm.supplierId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="">Select Supplier from Directory</option>
                  {safeSuppliers.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ""}
                    </option>
                  ))}
                </select>

                {selectedInvoiceSupplier && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Supplier Name</span>
                      <strong className="text-slate-800">{selectedInvoiceSupplier.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Company Name</span>
                      <strong className="text-indigo-600">
                        {selectedInvoiceSupplier.companyName || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phone</span>
                      <span className="text-slate-700">{selectedInvoiceSupplier.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">GSTIN</span>
                      <span className="text-slate-700 font-mono">
                        {selectedInvoiceSupplier.gstin || "—"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 bg-white p-3 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Supplier Name (Contact Person) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Raj Kumar"
                      value={invoiceForm.newSupplier.name}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          newSupplier: { ...invoiceForm.newSupplier, name: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Company Name (Business Entity)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABC Furniture Pvt Ltd"
                      value={invoiceForm.newSupplier.companyName}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          newSupplier: { ...invoiceForm.newSupplier, companyName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={invoiceForm.newSupplier.phone}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          newSupplier: { ...invoiceForm.newSupplier, phone: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="15-digit GSTIN"
                      value={invoiceForm.newSupplier.gstin}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          newSupplier: {
                            ...invoiceForm.newSupplier,
                            gstin: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="City / Address"
                      value={invoiceForm.newSupplier.address}
                      onChange={(e) =>
                        setInvoiceForm({
                          ...invoiceForm,
                          newSupplier: { ...invoiceForm.newSupplier, address: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vendor Bill / Invoice # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SUP-INV-904"
                value={invoiceForm.invoiceNumber}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceForm.invoiceDate}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Purchased Products &amp; Quantities</span>
                <p className="text-[10px] text-slate-400">
                  Select existing product or enter new item details manually
                </p>
              </div>
              <button
                type="button"
                onClick={addInvoiceItem}
                className="text-indigo-600 font-semibold text-[11px] flex items-center gap-1 hover:underline px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition"
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            {invoiceForm.items.map((row, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Select or Type Product
                    </label>
                    <select
                      value={row.productId}
                      onChange={(e) => updateInvoiceItem(idx, "productId", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-medium"
                    >
                      <option value="">Manual Entry / Custom Item</option>
                      {safeProducts.map((p) => (
                        <option key={p.id || p._id} value={p.id || p._id}>
                          {p.name} {p.sku ? `[${p.sku}]` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-7 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Item Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Product Name"
                        value={row.name}
                        onChange={(e) => updateInvoiceItem(idx, "name", e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                      />
                    </div>
                    {invoiceForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInvoiceItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition mt-4"
                        title="Remove row"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-slate-200/50">
                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-500">SKU / Code</label>
                    <input
                      type="text"
                      placeholder="SKU"
                      value={row.sku || ""}
                      onChange={(e) => updateInvoiceItem(idx, "sku", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono bg-white"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-500">Barcode</label>
                    <input
                      type="text"
                      placeholder="Barcode"
                      value={row.barcode || ""}
                      onChange={(e) => updateInvoiceItem(idx, "barcode", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">Qty</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={row.quantity}
                      onChange={(e) => updateInvoiceItem(idx, "quantity", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-right text-xs bg-white font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">Cost Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={row.purchasePrice}
                      onChange={(e) => updateInvoiceItem(idx, "purchasePrice", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-right text-xs bg-white font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">GST %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={row.taxRate}
                      onChange={(e) => updateInvoiceItem(idx, "taxRate", Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-right text-xs bg-white font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Calculated Totals Bar */}
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-600 block text-[11px]">
                Subtotal: <strong>₹{invoiceSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </span>
              <span className="text-slate-600 block text-[11px]">
                GST Tax: <strong>₹{invoiceTaxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                Total Bill Amount
              </span>
              <span className="text-lg font-bold text-indigo-700 tabular-nums">
                ₹{invoiceTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
              <select
                value={invoiceForm.paymentStatus}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, paymentStatus: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="PAID">Fully Paid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Credit / Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remarks / Godown</label>
              <input
                type="text"
                placeholder="e.g. Received at Central Warehouse"
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════
          CREATE PURCHASE ORDER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="Issue Purchase Order (PO)"
        subtitle="Official stock procurement order dispatched to suppliers"
        icon={ShoppingBag}
        iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
        maxWidth="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowOrderModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="order-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-sm transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Generate PO</span>
            </button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleCreateOrder} className="space-y-4 text-xs">
          {/* Supplier Section Header & Selector */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Truck size={14} className="text-indigo-600" />
                <span>Supplier Details</span>
              </span>

              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setOrderSupplierMode("existing")}
                  className={`px-2.5 py-1 rounded transition ${
                    orderSupplierMode === "existing"
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSupplierMode("new")}
                  className={`px-2.5 py-1 rounded transition ${
                    orderSupplierMode === "new"
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  + Add New Supplier
                </button>
              </div>
            </div>

            {orderSupplierMode === "existing" ? (
              <div className="space-y-2">
                <select
                  required={orderSupplierMode === "existing"}
                  value={orderForm.supplierId}
                  onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="">Select Supplier from Directory</option>
                  {safeSuppliers.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name} {s.companyName ? `(${s.companyName})` : ""}
                    </option>
                  ))}
                </select>

                {selectedOrderSupplier && (
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Supplier Name</span>
                      <strong className="text-slate-800">{selectedOrderSupplier.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Company Name</span>
                      <strong className="text-indigo-600">
                        {selectedOrderSupplier.companyName || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phone</span>
                      <span className="text-slate-700">{selectedOrderSupplier.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">GSTIN</span>
                      <span className="text-slate-700 font-mono">
                        {selectedOrderSupplier.gstin || "—"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 bg-white p-3 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Supplier Name (Contact Person) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Raj Kumar"
                      value={orderForm.newSupplier.name}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          newSupplier: { ...orderForm.newSupplier, name: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Company Name (Business Entity)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABC Furniture Pvt Ltd"
                      value={orderForm.newSupplier.companyName}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          newSupplier: { ...orderForm.newSupplier, companyName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={orderForm.newSupplier.phone}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          newSupplier: { ...orderForm.newSupplier, phone: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="15-digit GSTIN"
                      value={orderForm.newSupplier.gstin}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          newSupplier: {
                            ...orderForm.newSupplier,
                            gstin: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="City / Address"
                      value={orderForm.newSupplier.address}
                      onChange={(e) =>
                        setOrderForm({
                          ...orderForm,
                          newSupplier: { ...orderForm.newSupplier, address: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Expected Delivery Date
            </label>
            <input
              type="date"
              value={orderForm.expectedDelivery}
              onChange={(e) =>
                setOrderForm({ ...orderForm, expectedDelivery: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Order Items</span>
                <p className="text-[10px] text-slate-400">
                  Select existing product or enter new item details manually
                </p>
              </div>
              <button
                type="button"
                onClick={addOrderItem}
                className="text-indigo-600 font-semibold text-[11px] flex items-center gap-1 hover:underline px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition"
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            {orderForm.items.map((row, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Select or Type Product
                    </label>
                    <select
                      value={row.productId}
                      onChange={(e) => updateOrderItem(idx, "productId", e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-medium"
                    >
                      <option value="">Manual Entry / Custom Item</option>
                      {safeProducts.map((p) => (
                        <option key={p.id || p._id} value={p.id || p._id}>
                          {p.name} {p.sku ? `[${p.sku}]` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-7 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Item Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Product Name"
                        value={row.name}
                        onChange={(e) => updateOrderItem(idx, "name", e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                      />
                    </div>
                    {orderForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrderItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition mt-4"
                        title="Remove row"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-slate-200/50">
                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-500">SKU</label>
                    <input
                      type="text"
                      placeholder="SKU"
                      value={row.sku || ""}
                      onChange={(e) => updateOrderItem(idx, "sku", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono bg-white"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-500">Barcode</label>
                    <input
                      type="text"
                      placeholder="Barcode"
                      value={row.barcode || ""}
                      onChange={(e) => updateOrderItem(idx, "barcode", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono bg-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">Qty</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={row.quantity}
                      onChange={(e) => updateOrderItem(idx, "quantity", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-right text-xs bg-white font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">Unit Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={row.unitPrice}
                      onChange={(e) => updateOrderItem(idx, "unitPrice", e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-right text-xs bg-white font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500">GST %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={row.taxRate}
                      onChange={(e) => updateOrderItem(idx, "taxRate", Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-slate-200 text-right text-xs bg-white font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Calculated Totals Bar */}
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-600 block text-[11px]">
                Subtotal: <strong>₹{orderSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </span>
              <span className="text-slate-600 block text-[11px]">
                GST Tax: <strong>₹{orderTaxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                Estimated Total
              </span>
              <span className="text-lg font-bold text-indigo-700 tabular-nums">
                ₹{orderTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">PO Instructions / Notes</label>
            <input
              type="text"
              placeholder="e.g. Deliver before 5 PM, fragile items included"
              value={orderForm.notes}
              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════
          ISSUE DEBIT NOTE MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showDebitModal}
        onClose={() => setShowDebitModal(false)}
        title="Issue Debit Note / Purchase Return"
        subtitle="Record returns or supplier credit claims"
        icon={ArrowDownLeft}
        iconColor="text-rose-600 bg-rose-50 border-rose-100"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowDebitModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="debit-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 shadow-sm transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Issue Debit Note</span>
            </button>
          </>
        }
      >
        <form id="debit-form" onSubmit={handleCreateDebitNote} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Reference Purchase Invoice <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={debitForm.purchaseId}
              onChange={(e) => setDebitForm({ ...debitForm, purchaseId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            >
              <option value="">Select Invoice to debit</option>
              {safeInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.supplier?.name} {inv.supplier?.companyName ? `(${inv.supplier.companyName})` : ""} (₹{Number(inv.totalAmount || inv.grandTotal || 0).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Claim Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                value={debitForm.amount}
                onChange={(e) => setDebitForm({ ...debitForm, amount: e.target.value })}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Reason for Return *</label>
            <textarea
              rows="3"
              required
              placeholder="e.g. Defective items, rate difference, or damaged in transit"
              value={debitForm.reason}
              onChange={(e) => setDebitForm({ ...debitForm, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════
          VIEW INVOICE DETAILS MODAL
      ══════════════════════════════════════════════════ */}
      {selectedInvoice && (
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.invoiceNumber || selectedInvoice.id}`}
          subtitle={`Recorded on ${new Date(selectedInvoice.createdAt || selectedInvoice.invoiceDate).toLocaleDateString()}`}
          icon={FileText}
          iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
          maxWidth="max-w-2xl"
          footer={
            <div className="w-full flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                Payment Status:{" "}
                <span className="font-bold text-slate-800 uppercase">
                  {selectedInvoice.paymentStatus || "PAID"}
                </span>
              </div>
              <Button variant="neutral" size="sm" icon={X} onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Supplier Banner */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Supplier Name
                </span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedInvoice.supplier?.name || "—"}</p>
                {selectedInvoice.supplier?.companyName && (
                  <p className="text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                    <Building2 size={12} />
                    <span>{selectedInvoice.supplier.companyName}</span>
                  </p>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Contact Phone
                </span>
                <p className="font-medium text-slate-800 mt-0.5">{selectedInvoice.supplier?.phone || "—"}</p>
                {selectedInvoice.supplier?.gstin && (
                  <span className="text-[11px] font-mono text-slate-500 block">
                    GSTIN: {selectedInvoice.supplier.gstin}
                  </span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2">Invoice Line Items</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Tax (GST)</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedInvoice.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {it.product?.name || it.name || "Item"}
                          {it.product?.sku && (
                            <span className="text-[10px] font-mono text-slate-400 ml-1">
                              [{it.product.sku}]
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{it.quantity || 1}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          ₹{Number(it.purchasePrice || it.rate || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                          {it.gstRate || it.taxRate || 0}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                          ₹{Number(it.total || (it.quantity || 1) * (it.purchasePrice || 0)).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Financial Summary */}
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Total Purchase Value:</span>
              <span className="text-base font-bold text-indigo-700 tabular-nums">
                ₹{Number(selectedInvoice.totalAmount || selectedInvoice.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
