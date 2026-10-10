import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
  Receipt,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { customersApi } from "../api";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDueOnly, setFilterDueOnly] = useState("all"); // 'all' | 'due' | 'settled'
  const [openAddModal, setOpenAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPurchases, setCustomerPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    balance: 0,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCustomers = () => {
    customersApi
      .list({ search })
      .then((res) => {
        const list = res?.customers || res?.data?.customers || [];
        setCustomers(list);
      })
      .catch(() => setCustomers([]));
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  // Load customer purchases when selected
  useEffect(() => {
    if (!selectedCustomer?._id && !selectedCustomer?.id) {
      setCustomerPurchases([]);
      return;
    }
    const custId = selectedCustomer._id || selectedCustomer.id;
    setLoadingPurchases(true);
    customersApi
      .purchases(custId)
      .then((res) => {
        const list = res?.purchases || res?.data?.purchases || [];
        setCustomerPurchases(list);
      })
      .catch(() => {
        setCustomerPurchases(selectedCustomer.recentPurchases || []);
      })
      .finally(() => {
        setLoadingPurchases(false);
      });
  }, [selectedCustomer]);

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const totalPurchasesVolume = customers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0);

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.address?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterDueOnly === "due") return (c.balance || 0) > 0;
    if (filterDueOnly === "settled") return (c.balance || 0) <= 0;
    return true;
  });

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        name: newCust.name.trim(),
        phone: newCust.phone.trim() || undefined,
        email: newCust.email.trim() || undefined,
        address: newCust.address.trim() || undefined,
        gstin: newCust.gstin.trim() || undefined,
        balance: Number(newCust.balance || 0),
      };
      await customersApi.create(payload);
      setNewCust({ name: "", phone: "", email: "", address: "", gstin: "", balance: 0 });
      setOpenAddModal(false);
      loadCustomers();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to create customer"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0 shadow-2xs">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">Customer Details</h1>
              <span className="badge badge-info uppercase tracking-wider">Directory</span>
            </div>
            <p className="page-desc">
              Customer profiles, contact info, purchase history, and outstanding balances
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={UserPlus}
          onClick={() => setOpenAddModal(true)}
        >
          Add Customer
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════
          KPI SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Registered Customers
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Active directory records</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Purchases Volume
            </p>
            <p className="text-2xl font-bold text-indigo-600 tabular-nums mt-1">
              ₹{totalPurchasesVolume.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-indigo-500 mt-0.5">Cumulative billing value</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Receipt size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Outstanding Dues
            </p>
            <p className="text-2xl font-bold text-rose-600 tabular-nums mt-1">
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-rose-500 mt-0.5">
              From {customers.filter((c) => (c.balance || 0) > 0).length} customers with dues
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <IndianRupee size={18} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SEARCH & FILTER TOOLBAR
      ══════════════════════════════════════════════════ */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search by customer name, phone, email, or address..."
          className="max-w-md"
        />

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterDueOnly("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterDueOnly === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setFilterDueOnly("due")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterDueOnly === "due"
                  ? "bg-white text-rose-600 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-rose-600"
              }`}
            >
              Has Dues ({customers.filter((c) => (c.balance || 0) > 0).length})
            </button>
            <button
              onClick={() => setFilterDueOnly("settled")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterDueOnly === "settled"
                  ? "bg-white text-emerald-600 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-emerald-600"
              }`}
            >
              Settled ({customers.filter((c) => (c.balance || 0) <= 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CUSTOMER DIRECTORY TABLE
      ══════════════════════════════════════════════════ */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Customer Profile
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Phone & Contact
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Address / GSTIN
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                  Total Purchases
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                  Orders
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                  Outstanding Due
                </th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="empty-state-icon mx-auto">
                      <Users size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No customers found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search
                        ? `No customer matching "${search}". Try a different name, phone, or address.`
                        : "Get started by adding your first customer."}
                    </p>
                    <button
                      onClick={() => setOpenAddModal(true)}
                      className="mt-4 btn-primary text-xs inline-flex items-center gap-1.5"
                    >
                      <UserPlus size={13} />
                      <span>Add Customer</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const custId = c._id || c.id || "";
                  const hasDue = (c.balance || 0) > 0;
                  return (
                    <tr
                      key={custId}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-xs grid place-items-center shrink-0 shadow-2xs">
                            {c.name ? c.name.slice(0, 1).toUpperCase() : "C"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition leading-tight">
                              {c.name}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              ID: {custId.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            <span>{c.phone || "—"}</span>
                          </div>
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Mail size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="space-y-0.5 max-w-[200px]">
                          {c.address ? (
                            <div className="flex items-center gap-1 text-slate-600 truncate">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">{c.address}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No address</span>
                          )}
                          {c.gstin && (
                            <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                              GSTIN: {c.gstin}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-semibold tabular-nums text-slate-900">
                          ₹{Number(c.totalPurchases || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold tabular-nums text-[11px]">
                          {c.totalOrders || 0} bills
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold tabular-nums ${
                            hasDue ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          ₹{Number(c.balance || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition inline-flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ArrowUpRight size={12} />
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

      {/* ══════════════════════════════════════════════════
          CUSTOMER DETAILS DRAWER / MODAL
      ══════════════════════════════════════════════════ */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={selectedCustomer.name}
          subtitle={`Customer ID: ${(selectedCustomer._id || selectedCustomer.id || "").toUpperCase()}`}
          icon={Users}
          iconColor="text-blue-600 bg-blue-50 border-blue-100"
          maxWidth="max-w-2xl"
          footer={
            <div className="w-full flex items-center justify-between">
              {(selectedCustomer.balance || 0) > 0 ? (
                <button
                  onClick={() => {
                    const custName = selectedCustomer.name;
                    setSelectedCustomer(null);
                    navigate("/sales/payments-in", { state: { prefillCustomer: custName } });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <IndianRupee size={14} />
                  <span>Record Payment-In</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <ShieldCheck size={16} />
                  <span>All accounts settled</span>
                </div>
              )}

              <Button
                variant="neutral"
                size="sm"
                icon={X}
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Contact Number
                </span>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span>{selectedCustomer.phone || "Not provided"}</span>
                  {selectedCustomer.phone && (
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="text-blue-600 hover:underline text-[11px] ml-1 font-semibold"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </span>
                <div className="flex items-center gap-2 text-slate-800 font-medium">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{selectedCustomer.email || "Not provided"}</span>
                  {selectedCustomer.email && (
                    <a
                      href={`mailto:${selectedCustomer.email}`}
                      className="text-blue-600 hover:underline text-[11px] ml-1 font-semibold"
                    >
                      Mail
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Billing Address
                </span>
                <div className="flex items-start gap-2 text-slate-800 font-medium">
                  <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedCustomer.address || "No physical address specified"}</span>
                </div>
              </div>

              {selectedCustomer.gstin && (
                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    GSTIN
                  </span>
                  <div className="flex items-center gap-2 text-slate-800 font-mono font-medium">
                    <Building2 size={13} className="text-slate-400 shrink-0" />
                    <span>{selectedCustomer.gstin}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Purchases
                </span>
                <p className="text-base font-bold text-indigo-600 mt-1 tabular-nums">
                  ₹{Number(selectedCustomer.totalPurchases || 0).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-slate-400">
                  {selectedCustomer.totalOrders || 0} total invoices
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Outstanding Due
                </span>
                <p
                  className={`text-base font-bold mt-1 tabular-nums ${
                    (selectedCustomer.balance || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  ₹{Number(selectedCustomer.balance || 0).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-slate-400">
                  {(selectedCustomer.balance || 0) > 0 ? "Pending collection" : "Clean balance"}
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Credit Limit
                </span>
                <p className="text-base font-bold text-slate-800 mt-1 tabular-nums">
                  ₹{Number(selectedCustomer.creditLimit || 0).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-slate-400">Max credit allowed</span>
              </div>
            </div>

            {/* Purchase History */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-600" />
                  <h4 className="font-bold text-slate-800">Purchase History</h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {customerPurchases.length} invoices recorded
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                {loadingPurchases ? (
                  <div className="p-6 text-center text-slate-400">Loading purchase records...</div>
                ) : customerPurchases.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-slate-600 font-semibold">No purchase history found</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Invoices generated for this customer in POS will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerPurchases.map((inv) => (
                        <tr key={inv._id || inv.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 font-mono">
                            {inv.invoiceNumber || inv.id?.slice(-8)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {inv.createdAt
                              ? new Date(inv.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {inv.paymentMethod || "CASH"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                            ₹{Number(inv.totalAmount || inv.total || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {inv.status || "COMPLETED"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════
          ADD CUSTOMER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openAddModal}
        onClose={() => setOpenAddModal(false)}
        title="Add New Customer"
        subtitle="For automatic invoice lookup and credit tracking"
        icon={Users}
        iconColor="text-blue-600 bg-blue-50 border-blue-100"
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="neutral"
              size="sm"
              icon={X}
              onClick={() => setOpenAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-customer-form"
              variant="primary"
              size="sm"
              icon={Check}
              loading={loading}
            >
              Save Customer
            </Button>
          </>
        }
      >
        <form id="add-customer-form" onSubmit={handleAddCustomer} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <input
              required
              placeholder="e.g. Ramesh Hardware"
              value={newCust.name}
              onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number</label>
              <input
                placeholder="10-digit mobile"
                value={newCust.phone}
                onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Opening Due (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={newCust.balance}
                onChange={(e) => setNewCust({ ...newCust, balance: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition tabular-nums text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="customer@domain.com"
              value={newCust.email}
              onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Physical Address</label>
            <input
              placeholder="Shop/Street, City, Pin Code"
              value={newCust.address}
              onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">GSTIN (Optional)</label>
            <input
              placeholder="22AAAAA0000A1Z5"
              value={newCust.gstin}
              onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value.toUpperCase() })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-mono font-medium transition text-slate-800 uppercase"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
