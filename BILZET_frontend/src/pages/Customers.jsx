import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  IndianRupee,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { mockCustomers } from "../api/mockData";
import { customersApi } from "../api";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    email: "",
    balance: 0,
  });

  useEffect(() => {
    customersApi.list({ search }).then((res) => {
      const list = res?.customers || res?.data?.customers || [];
      setCustomers(list);
    }).catch(() => setCustomers([]));
  }, [search]);

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newCust.name) return;
    const added = {
      _id: "c-" + Date.now(),
      name: newCust.name,
      phone: newCust.phone || "—",
      email: newCust.email || "—",
      balance: Number(newCust.balance || 0),
      totalOrders: 0,
    };
    setCustomers([added, ...customers]);
    setNewCust({ name: "", phone: "", email: "", balance: 0 });
    setOpenModal(false);
  };

  return (
    <div className="space-y-5 pb-12 fade-up">

      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Customer Ledger &amp; Directory
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Track customer balances, auto-fill invoices, and monitor credit limits
            </p>
          </div>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="btn-primary text-xs self-start sm:self-center"
        >
          <UserPlus size={14} strokeWidth={2.5} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          KPI SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card blue">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registered Customers</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Active loyalty &amp; ledger profiles</p>
        </div>

        <div className="kpi-card rose">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Dues &amp; Outstanding</p>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 tabular-nums">₹{totalOutstanding.toLocaleString("en-IN")}</p>
          <p className="text-xs text-rose-500 font-medium mt-1">
            Pending from {customers.filter((c) => c.balance > 0).length} customers
          </p>
        </div>

        <div className="kpi-card emerald">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Credit Health</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">96%</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Healthy collection velocity</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SEARCH TOOLBAR
      ══════════════════════════════════════════════════ */}
      <div className="card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="search-field flex-1 max-w-md">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            placeholder="Search by customer name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {customers.length} customers
        </p>
      </div>

      {/* ══════════════════════════════════════════════════
          CUSTOMER DIRECTORY TABLE
      ══════════════════════════════════════════════════ */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Profile</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Orders</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="empty-state-icon mx-auto">
                      <Users size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No customers found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search ? `No customer matching "${search}". Try a different name or phone number.` : "Get started by adding your first customer."}
                    </p>
                    <button
                      onClick={() => setOpenModal(true)}
                      className="mt-4 btn-primary text-xs inline-flex items-center gap-1.5"
                    >
                      <UserPlus size={13} />
                      <span>Add Customer</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-xs grid place-items-center shrink-0">
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{c.name}</p>
                          <span className="text-[10px] text-slate-400">ID: {c._id.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        <span>{c.phone || "—"}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-400" />
                        <span>{c.email || "—"}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 tabular-nums">
                      {c.totalOrders || 0} bills
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-bold tabular-nums ${c.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        ₹{c.balance.toLocaleString("en-IN")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`badge ${c.balance > 0 ? "badge-due" : "badge-settled"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.balance > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
                        {c.balance > 0 ? "Pending Due" : "Settled"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ADD CUSTOMER MODAL
      ══════════════════════════════════════════════════ */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200/80 scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
                <p className="text-xs text-slate-500 mt-0.5">For automatic invoice lookup and credit tracking</p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. Ramesh Hardware"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number</label>
                  <input
                    placeholder="10-digit mobile"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Opening Balance (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newCust.balance}
                    onChange={(e) => setNewCust({ ...newCust, balance: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition tabular-nums"
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="flex-1 py-2.5 btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 btn-primary text-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
