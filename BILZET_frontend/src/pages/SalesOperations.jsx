import { useState, useEffect } from "react";
import {
  FileCheck,
  RotateCcw,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  X,
  Truck,
  Receipt,
  User,
  Trash2,
} from "lucide-react";
import { salesApi, customersApi, productsApi } from "../api";

import { useLocation } from "react-router-dom";

export default function SalesOperations({ defaultTab = "challans" }) {
  const location = useLocation();
  const activeTab = location.pathname.includes("returns")
    ? "returns"
    : location.pathname.includes("payments")
    ? "payments"
    : defaultTab;
  const [challans, setChallans] = useState([]);
  const [returns, setReturns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [showChallanModal, setShowChallanModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Forms
  const [challanForm, setChallanForm] = useState({
    customerId: "",
    deliveryAddress: "",
    vehicleNumber: "",
    items: [{ productId: "", quantity: 1 }],
    notes: "",
  });

  const [returnForm, setReturnForm] = useState({
    saleId: "",
    reason: "",
    refundAmount: "",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    customerId: "",
    amount: "",
    paymentMode: "UPI",
    referenceNumber: "",
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
      const [chRes, custRes, prodRes] = await Promise.all([
        salesApi.challans(),
        customersApi.list({ limit: 100 }),
        productsApi.list({ limit: 100 }),
      ]);
      setChallans(Array.isArray(chRes) ? chRes : chRes?.challans || []);
      setCustomers(custRes?.data?.customers || custRes?.customers || custRes || []);
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

  const handleCreateChallan = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await salesApi.createChallan(challanForm);
      notify("success", "Delivery Challan generated successfully!");
      setShowChallanModal(false);
      setChallanForm({
        customerId: "",
        deliveryAddress: "",
        vehicleNumber: "",
        items: [{ productId: "", quantity: 1 }],
        notes: "",
      });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to create challan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await salesApi.paymentIn({
        ...paymentForm,
        amount: Number(paymentForm.amount) || 0,
      });
      notify("success", "Payment received and customer account credited!");
      setShowPaymentModal(false);
      setPaymentForm({
        customerId: "",
        amount: "",
        paymentMode: "UPI",
        referenceNumber: "",
        notes: "",
      });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const pageMeta = {
    challans: {
      icon: FileCheck,
      title: "Delivery Challans",
      subtitle: "Track goods dispatch documentation, outward shipments and delivery notes.",
      actionLabel: "New Delivery Challan",
      onAction: () => setShowChallanModal(true),
      searchPlaceholder: "Search challan #, customer, vehicle...",
      count: challans.length,
    },
    returns: {
      icon: RotateCcw,
      title: "Sales Returns",
      subtitle: "Manage customer returned merchandise, reason logs and credit note adjustments.",
      actionLabel: "Record Sales Return",
      onAction: () => setShowReturnModal(true),
      searchPlaceholder: "Search returns by bill or reason...",
      count: returns.length,
    },
    payments: {
      icon: DollarSign,
      title: "Payment-In Ledger",
      subtitle: "Record customer inward collections, UPI settlements and cash receipts.",
      actionLabel: "Record Payment-In",
      onAction: () => setShowPaymentModal(true),
      searchPlaceholder: "Search payments by customer or ref #...",
      count: customers.length,
    },
  }[activeTab] || {
    icon: Truck,
    title: "Dispatch Operations",
    subtitle: "Delivery challans and sales returns",
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
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
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
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition shadow-2xs self-start sm:self-center"
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
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>


      {/* ── Content View ── */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-blue-600" />
          <p className="text-xs text-slate-500">Loading sales operations records…</p>
        </div>
      ) : activeTab === "challans" ? (
        /* Challans Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Challan #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Delivery Location</th>
                  <th className="py-3 px-4">Vehicle / Transporter</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Issue Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {challans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No delivery challans issued yet. Click "New Delivery Challan" to dispatch goods.
                    </td>
                  </tr>
                ) : (
                  challans.map((ch) => (
                    <tr key={ch.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600">
                        {ch.challanNumber || `DC-${ch.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {ch.customer?.name || "Customer"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {ch.deliveryAddress || "Standard Address"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {ch.vehicleNumber || "Local Dispatch"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {ch.status || "DISPATCHED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(ch.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "returns" ? (
        /* Sales Returns View */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3">
          <RotateCcw size={32} className="mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700 text-sm">Customer Sales Returns & Credit Notes</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Sales returns can be processed directly from any invoice under{" "}
            <a href="/invoices" className="text-blue-600 underline font-medium">
              Sales Invoices
            </a>{" "}
            using the return button to reverse stock and issue customer credit balance.
          </p>
        </div>
      ) : (
        /* Payments In View */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-3">
          <DollarSign size={32} className="mx-auto text-emerald-400" />
          <h3 className="font-bold text-slate-700 text-sm">Customer Payment Collection Ledger</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Record customer advance payments and settlement collections using the "Record Payment-In"
            button above to reduce outstanding client balance.
          </p>
        </div>
      )}

      {/* ── New Delivery Challan Modal ── */}
      {showChallanModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Create Delivery Challan</h3>
              <button
                onClick={() => setShowChallanModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateChallan} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
                <select
                  required
                  value={challanForm.customerId}
                  onChange={(e) =>
                    setChallanForm({ ...challanForm, customerId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">Select Recipient Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || "No phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Destination</label>
                <input
                  type="text"
                  placeholder="Delivery address / Site location"
                  value={challanForm.deliveryAddress}
                  onChange={(e) =>
                    setChallanForm({ ...challanForm, deliveryAddress: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle / Transporter #</label>
                <input
                  type="text"
                  placeholder="e.g. TN-09-AB-1234 / BlueDart"
                  value={challanForm.vehicleNumber}
                  onChange={(e) =>
                    setChallanForm({ ...challanForm, vehicleNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Dispatched</label>
                <select
                  required
                  value={challanForm.items[0].productId}
                  onChange={(e) =>
                    setChallanForm({
                      ...challanForm,
                      items: [{ ...challanForm.items[0], productId: e.target.value }],
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">Choose item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dispatch Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={challanForm.items[0].quantity}
                    onChange={(e) =>
                      setChallanForm({
                        ...challanForm,
                        items: [{ ...challanForm.items[0], quantity: Number(e.target.value) }],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Challan Type</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
                    <option>Outward Delivery</option>
                    <option>Job Work</option>
                    <option>Exhibition / Demo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChallanModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Generate Challan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Payment In Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md my-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Record Customer Payment-In</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer *</label>
                <select
                  required
                  value={paymentForm.customerId}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, customerId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">Select Paying Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || "No phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="Amount in Rupees"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentMode: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">NEFT / RTGS</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference / UTR #</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref # / Cheque #"
                    value={paymentForm.referenceNumber}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
                >
                  {submitting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
