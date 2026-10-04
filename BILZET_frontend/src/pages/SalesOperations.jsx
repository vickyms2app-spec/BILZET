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
  CreditCard,
} from "lucide-react";
import { salesApi, customersApi, productsApi } from "../api";
import { useLocation } from "react-router-dom";
import Modal from "../components/common/Modal";

export default function SalesOperations({ defaultTab = "challans" }) {
  const location = useLocation();
  const activeTab = location.pathname.includes("returns")
    ? "returns"
    : location.pathname.includes("payments")
    ? "payments"
    : defaultTab;
  const [challans, setChallans] = useState([]);
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState([]);
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
      const [chRes, retRes, salesRes, custRes, prodRes] = await Promise.all([
        salesApi.challans(),
        salesApi.returns(),
        salesApi.list({ limit: 100 }),
        customersApi.list({ limit: 100 }),
        productsApi.list({ limit: 100 }),
      ]);
      setChallans(Array.isArray(chRes) ? chRes : chRes?.challans || []);
      setReturns(retRes?.returns || (Array.isArray(retRes) ? retRes : []));
      setSales(salesRes?.sales || salesRes?.data?.sales || []);
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
      await salesApi.createChallan({
        ...challanForm,
        transportDetails: challanForm.vehicleNumber,
      });
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

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    if (!returnForm.saleId) {
      notify("error", "Please select a sales invoice to return");
      return;
    }
    setSubmitting(true);
    try {
      await salesApi.return(returnForm.saleId, {
        reason: returnForm.reason,
        notes: returnForm.notes,
      });
      notify("success", "Sales return recorded and stock replenished!");
      setShowReturnModal(false);
      setReturnForm({ saleId: "", reason: "", notes: "" });
      loadData();
    } catch (err) {
      notify("error", err.response?.data?.error || err.message || "Failed to record sales return");
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
        method: paymentForm.paymentMode?.toUpperCase(),
        paymentMethod: paymentForm.paymentMode?.toUpperCase(),
        transactionId: paymentForm.referenceNumber,
        note: paymentForm.notes,
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Sale Invoice</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No sales returns recorded yet.
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {ret.returnNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-600">
                        {ret.sale?.invoiceNumber || "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {ret.sale?.customer?.name || "Direct Customer"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ₹{Number(ret.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {ret.reason || "Customer Return"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {ret.refundStatus || "COMPLETED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
      <Modal
        isOpen={showChallanModal}
        onClose={() => setShowChallanModal(false)}
        title="Create Delivery Challan"
        subtitle="Dispatch stock for delivery, job work or demo"
        icon={Truck}
        iconColor="text-blue-600 bg-blue-50 border-blue-100"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowChallanModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="challan-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-sm shadow-blue-500/20 transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Generate Challan</span>
            </button>
          </>
        }
      >
        <form id="challan-form" onSubmit={handleCreateChallan} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Recipient Customer *</label>
            <select
              required
              value={challanForm.customerId}
              onChange={(e) =>
                setChallanForm({ ...challanForm, customerId: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
            <label className="block font-semibold text-slate-700 mb-1.5">Delivery Destination</label>
            <input
              type="text"
              placeholder="Delivery address / Site location"
              value={challanForm.deliveryAddress}
              onChange={(e) =>
                setChallanForm({ ...challanForm, deliveryAddress: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Vehicle / Transporter #</label>
            <input
              type="text"
              placeholder="e.g. TN-09-AB-1234 / BlueDart"
              value={challanForm.vehicleNumber}
              onChange={(e) =>
                setChallanForm({ ...challanForm, vehicleNumber: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 uppercase font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Product Dispatched *</label>
            <select
              required
              value={challanForm.items[0].productId}
              onChange={(e) =>
                setChallanForm({
                  ...challanForm,
                  items: [{ ...challanForm.items[0], productId: e.target.value }],
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              <option value="">Choose item to dispatch</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Dispatch Quantity *</label>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Challan Type</label>
              <select className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition">
                <option>Outward Delivery</option>
                <option>Job Work</option>
                <option>Exhibition / Demo</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Record Sales Return Modal ── */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Process Sales Return"
        subtitle="Initiate return & refund against an issued invoice"
        icon={RotateCcw}
        iconColor="text-rose-600 bg-rose-50 border-rose-100"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowReturnModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="return-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 shadow-sm shadow-rose-500/20 transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Confirm Return</span>
            </button>
          </>
        }
      >
        <form id="return-form" onSubmit={handleCreateReturn} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Select Sale Invoice *
            </label>
            <select
              required
              value={returnForm.saleId}
              onChange={(e) => setReturnForm({ ...returnForm, saleId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            >
              <option value="">Choose invoice to refund/return</option>
              {sales
                .filter((s) => s.status !== "REFUNDED")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.invoiceNumber} - {s.customer?.name || "Cash Sale"} (₹{s.grandTotal})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Reason for Return *
            </label>
            <textarea
              rows="3"
              required
              placeholder="e.g. Defective item, customer changed mind"
              value={returnForm.reason}
              onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Additional Notes</label>
            <input
              type="text"
              placeholder="Optional remarks or courier tracking"
              value={returnForm.notes}
              onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>
        </form>
      </Modal>

      {/* ── Record Payment In Modal ── */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Customer Payment-In"
        subtitle="Record payments to reduce outstanding customer balance"
        icon={CreditCard}
        iconColor="text-emerald-600 bg-emerald-50 border-emerald-100"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 shadow-sm shadow-emerald-500/20 transition text-xs disabled:opacity-50"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Save Payment</span>
            </button>
          </>
        }
      >
        <form id="payment-form" onSubmit={handleCreatePayment} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Paying Customer *</label>
            <select
              required
              value={paymentForm.customerId}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, customerId: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
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
            <label className="block font-semibold text-slate-700 mb-1.5">Amount Received (₹) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Payment Mode</label>
              <select
                value={paymentForm.paymentMode}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, paymentMode: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              >
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">NEFT / RTGS</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Reference / UTR #</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Cheque #"
                value={paymentForm.referenceNumber}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
