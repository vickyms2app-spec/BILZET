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
} from "lucide-react";
import { useLocation } from "react-router-dom";
import Modal from "../components/common/Modal";

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

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Forms
  const [invoiceForm, setInvoiceForm] = useState({
    supplierId: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    items: [{ productId: "", name: "", quantity: 1, purchasePrice: 0, taxRate: 18 }],
    paymentStatus: "PAID",
    notes: "",
  });

  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    expectedDelivery: "",
    items: [{ productId: "", name: "", quantity: 1, unitPrice: 0 }],
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
      setInvoices(invRes?.purchases || invRes?.data || []);
      setOrders(ordRes?.purchaseOrders || ordRes?.orders || []);
      setDebitNotes(debRes?.debitNotes || []);
      setSuppliers(supRes?.data?.suppliers || supRes?.suppliers || supRes || []);
      setProducts(prodRes?.data?.products || prodRes?.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Invoice Items dynamic rows
  const addInvoiceItem = () => {
    setInvoiceForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: "", name: "", quantity: 1, purchasePrice: 0, taxRate: 18 },
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
        const prod = products.find((p) => p.id === val);
        if (prod) {
          next[index].name = prod.name;
          next[index].purchasePrice = prod.purchasePrice || prod.price || 0;
          next[index].taxRate = prod.taxRate || 18;
        }
      }
      return { ...prev, items: next };
    });
  };

  // Calculations
  const invoiceTotal = invoiceForm.items.reduce((sum, item) => {
    const cost = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
    const tax = cost * ((Number(item.taxRate) || 0) / 100);
    return sum + cost + tax;
  }, 0);

  // Submissions
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.supplierId) {
      notify("error", "Please select a supplier");
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

      await purchasesApi.create({
        ...invoiceForm,
        paidAmount: paid,
        totalAmount: invoiceTotal,
        items: invoiceForm.items.map((it) => ({
          ...it,
          purchasePrice: Number(it.purchasePrice) || 0,
          quantity: Number(it.quantity) || 1,
          gstRate: Number(it.taxRate) || 0,
          taxRate: Number(it.taxRate) || 0,
        })),
      });
      notify("success", "Purchase invoice recorded and inventory updated!");
      setShowInvoiceModal(false);
      setInvoiceForm({
        supplierId: "",
        invoiceNumber: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        items: [{ productId: "", name: "", quantity: 1, purchasePrice: 0, taxRate: 18 }],
        paymentStatus: "PAID",
        notes: "",
      });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to record purchase");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await purchasesApi.createOrder({
        ...orderForm,
        items: orderForm.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          rate: Number(i.unitPrice) || 0,
          expectedPrice: Number(i.unitPrice) || 0,
        })),
      });
      notify("success", "Purchase Order created!");
      setShowOrderModal(false);
      setOrderForm({
        supplierId: "",
        expectedDelivery: "",
        items: [{ productId: "", name: "", quantity: 1, unitPrice: 0 }],
        notes: "",
      });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertPO = (po) => {
    setInvoiceForm({
      supplierId: po.supplierId,
      invoiceNumber: `INV-${po.poNumber || "PO-REC"}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      items: po.items?.length
        ? po.items.map((i) => ({
            productId: i.productId || "",
            name: i.product?.name || "Item",
            quantity: i.quantity,
            purchasePrice: i.unitPrice || 0,
            taxRate: 18,
          }))
        : [{ productId: "", name: "", quantity: 1, purchasePrice: 0, taxRate: 18 }],
      paymentStatus: "UNPAID",
      notes: `Converted from PO #${po.poNumber || po.id}`,
    });
    setShowInvoiceModal(true);
  };

  const handleCreateDebitNote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedInvoice = invoices.find((inv) => inv.id === debitForm.purchaseId);
      await purchasesApi.createDebitNote({
        ...debitForm,
        supplierId: selectedInvoice?.supplierId,
        referenceInvoice: selectedInvoice?.invoiceNumber,
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

  const pageMeta = {
    invoices: {
      icon: ShoppingBag,
      title: "Purchase Invoices",
      subtitle: "Manage incoming vendor bills, payment receipts and inward stock entries.",
      actionLabel: "Record Purchase",
      onAction: () => setShowInvoiceModal(true),
      searchPlaceholder: "Search bills by invoice # or supplier...",
      count: invoices.length,
    },
    orders: {
      icon: ClipboardList,
      title: "Purchase Orders",
      subtitle: "Create and track official purchase orders issued to vendors.",
      actionLabel: "New Purchase Order",
      onAction: () => setShowOrderModal(true),
      searchPlaceholder: "Search PO # or supplier...",
      count: orders.length,
    },
    debitNotes: {
      icon: Receipt,
      title: "Debit Notes & Purchase Returns",
      subtitle: "Manage vendor debit notes, return adjustments and credit balances.",
      actionLabel: "Issue Debit Note",
      onAction: () => setShowDebitModal(true),
      searchPlaceholder: "Search debit notes by purchase ID...",
      count: debitNotes.length,
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto fade-up">
      {/* ── Page Header (Single Responsibility) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <PageIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {pageMeta.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {pageMeta.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={pageMeta.onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-2xs self-start sm:self-center"
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

      {/* ── Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={pageMeta.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-slate-500 font-medium">
            Total Records: <strong className="text-slate-800">{pageMeta.count}</strong>
          </span>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh records"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} />
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
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No purchase invoices recorded yet. Click "Record Purchase" above to add your first vendor bill.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                        {inv.invoiceNumber || `BILL-${inv.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">
                          {inv.supplier?.name || "Vendor"}
                        </p>
                        <p className="text-[10px] text-slate-400">{inv.supplier?.phone || ""}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {inv.invoiceDate
                          ? new Date(inv.invoiceDate).toLocaleDateString()
                          : new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        ₹{Number(inv.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600">
                        ₹{Number(inv.balanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No purchase orders active. Generate a PO to dispatch to vendors.
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                        {po.poNumber || `PO-${po.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {po.supplier?.name || "Supplier"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {po.expectedDelivery
                          ? new Date(po.expectedDelivery).toLocaleDateString()
                          : "Immediate"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {po.items?.length || 1} items
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {po.status || "SENT"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleConvertPO(po)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          <span>Convert to Invoice</span>
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
              <h3 className="font-bold text-slate-800 text-xs">Debit Notes & Purchase Returns</h3>
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
                {debitNotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No debit notes issued yet.
                    </td>
                  </tr>
                ) : (
                  debitNotes.map((dn) => (
                    <tr key={dn.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-rose-600">
                        {dn.debitNoteNumber || `DN-${dn.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {dn.purchase?.invoiceNumber || "Direct Vendor Claim"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{dn.reason || dn.notes || "Damaged goods return"}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
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

      {/* ── Record Purchase Invoice Modal ── */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Record Purchase Invoice (Vendor Bill)"
        subtitle="Record incoming inventory goods & vendor accounts payable"
        icon={FileText}
        iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
        maxWidth="max-w-2xl"
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-sm shadow-indigo-500/20 transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Save & Update Inventory</span>
            </button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Supplier / Vendor *</label>
              <select
                required
                value={invoiceForm.supplierId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Vendor Invoice # *</label>
              <input
                type="text"
                required
                placeholder="e.g. SUP-INV-904"
                value={invoiceForm.invoiceNumber}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Bill Date</label>
              <input
                type="date"
                value={invoiceForm.invoiceDate}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Line Items & Quantities</span>
              <button
                type="button"
                onClick={addInvoiceItem}
                className="text-indigo-600 font-semibold text-[11px] flex items-center gap-1 hover:underline px-2 py-1 rounded-lg hover:bg-indigo-50 transition"
              >
                <Plus size={13} />
                <span>Add Item</span>
              </button>
            </div>

            {invoiceForm.items.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl items-center"
              >
                <div className="col-span-5">
                  <select
                    required
                    value={row.productId}
                    onChange={(e) => updateInvoiceItem(idx, "productId", e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateInvoiceItem(idx, "quantity", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-right text-xs text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Rate (₹)"
                    value={row.purchasePrice}
                    onChange={(e) => updateInvoiceItem(idx, "purchasePrice", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-right text-xs text-slate-800"
                  />
                </div>

                <div className="col-span-2">
                  <select
                    value={row.taxRate}
                    onChange={(e) => updateInvoiceItem(idx, "taxRate", e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeInvoiceItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary / Total */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Calculated Total (incl. GST):</span>
            <span className="text-base font-bold text-indigo-700">
              ₹{invoiceTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Payment Status</label>
              <select
                value={invoiceForm.paymentStatus}
                onChange={(e) =>
                  setInvoiceForm({ ...invoiceForm, paymentStatus: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="PAID">Fully Paid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Credit / Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Remarks</label>
              <input
                type="text"
                placeholder="e.g. Received at Central Godown"
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Create Purchase Order Modal ── */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="Issue Purchase Order (PO)"
        subtitle="Official stock procurement order for suppliers"
        icon={ShoppingBag}
        iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
        maxWidth="max-w-md"
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-sm shadow-indigo-500/20 transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Generate PO</span>
            </button>
          </>
        }
      >
        <form id="order-form" onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Supplier *</label>
            <select
              required
              value={orderForm.supplierId}
              onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">Select Vendor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Expected Delivery Date</label>
            <input
              type="date"
              value={orderForm.expectedDelivery}
              onChange={(e) =>
                setOrderForm({ ...orderForm, expectedDelivery: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Product</label>
            <select
              required
              value={orderForm.items[0].productId}
              onChange={(e) => {
                const id = e.target.value;
                const p = products.find((x) => x.id === id);
                setOrderForm({
                  ...orderForm,
                  items: [
                    {
                      productId: id,
                      name: p?.name || "",
                      quantity: orderForm.items[0].quantity,
                      unitPrice: p?.purchasePrice || p?.price || 0,
                    },
                  ],
                });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">Choose item</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Order Quantity</label>
            <input
              type="number"
              min="1"
              required
              value={orderForm.items[0].quantity}
              onChange={(e) =>
                setOrderForm({
                  ...orderForm,
                  items: [{ ...orderForm.items[0], quantity: Number(e.target.value) }],
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </form>
      </Modal>

      {/* ── Issue Debit Note Modal ── */}
      <Modal
        isOpen={showDebitModal}
        onClose={() => setShowDebitModal(false)}
        title="Issue Debit Note / Purchase Return"
        subtitle="Record returns or supplier credit notes"
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
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 shadow-sm shadow-rose-500/20 transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Issue Debit Note</span>
            </button>
          </>
        }
      >
        <form id="debit-form" onSubmit={handleCreateDebitNote} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Reference Purchase Invoice *
            </label>
            <select
              required
              value={debitForm.purchaseId}
              onChange={(e) => setDebitForm({ ...debitForm, purchaseId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            >
              <option value="">Select Invoice to debit</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} - {inv.supplier?.name} (₹{inv.totalAmount})
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
              placeholder="e.g. Expired batch or rate difference"
              value={debitForm.reason}
              onChange={(e) => setDebitForm({ ...debitForm, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
