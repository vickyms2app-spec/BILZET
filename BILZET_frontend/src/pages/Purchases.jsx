import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { purchasesApi, suppliersApi, productsApi } from "../api";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Button, { CompactIconButton } from "../components/common/Button";

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

  const filteredInvoices = safeInvoices.filter((inv) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.supplier?.name?.toLowerCase().includes(term) ||
      inv.supplier?.companyName?.toLowerCase().includes(term) ||
      inv.supplier?.phone?.includes(term)
    );
  });

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
    <div className="space-y-6 max-w-7xl mx-auto fade-up">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <PageIcon size={22} />
          </div>
          <div>
            <h1 className="page-title">{pageMeta.title}</h1>
            <p className="page-desc">{pageMeta.subtitle}</p>
          </div>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={pageMeta.onAction}>
          {pageMeta.actionLabel}
        </Button>
      </div>

      {/* Notifications */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Search Bar & Actions ── */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder={pageMeta.searchPlaceholder}
          className="max-w-md"
        />

        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs text-slate-500 font-medium">
            Total Records: <strong className="text-slate-800">{pageMeta.count}</strong>
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary"
            title="Refresh records"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Tab Views ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500">Loading purchase records…</p>
        </div>
      ) : activeTab === "invoices" ? (
        /* Purchase Invoices Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier &amp; Company</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No purchase invoices recorded yet. Click &quot;Record Purchase&quot; above to add your first vendor bill.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                        {inv.invoiceNumber || `BILL-${inv.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 leading-tight">
                          {inv.supplier?.name || "Vendor"}
                        </p>
                        {inv.supplier?.companyName ? (
                          <p className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 size={11} className="shrink-0 text-indigo-500" />
                            <span>{inv.supplier.companyName}</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400">{inv.supplier?.phone || ""}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {inv.invoiceDate
                          ? new Date(inv.invoiceDate).toLocaleDateString()
                          : new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 tabular-nums">
                        ₹{Number(inv.totalAmount || inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600 tabular-nums">
                        ₹{Number(inv.balanceDue || Math.max(0, (inv.grandTotal || inv.totalAmount || 0) - (inv.paidAmount || 0))).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : inv.paymentStatus === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {inv.paymentStatus || "PAID"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                  filteredOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                        {po.poNumber || `PO-${po.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 leading-tight">
                          {po.supplier?.name || "Supplier"}
                        </p>
                        {po.supplier?.companyName ? (
                          <p className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 size={11} className="shrink-0 text-indigo-500" />
                            <span>{po.supplier.companyName}</span>
                          </p>
                        ) : (
                          <span className="text-[10px] text-slate-400">{po.supplier?.phone || ""}</span>
                        )}
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
                  ))
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
        <form id="invoice-form" onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
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
