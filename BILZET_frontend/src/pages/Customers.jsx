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
} from "lucide-react";
import { mockCustomers } from "../api/mockData";
import { customersApi } from "../api";

export default function Customers() {
  const [customers, setCustomers] = useState(mockCustomers);
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
      const list = res?.customers || res?.data?.customers || mockCustomers;
      if (list && list.length > 0) {
        setCustomers(list);
      }
    });
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
    <div className="space-y-6 pb-12">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white grid place-items-center shadow-md shadow-indigo-500/20">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Customer Ledger & Directory
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Track customer balances, auto-fill invoices, and credit limits
            </p>
          </div>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-2 bg-[#1a5cff] hover:bg-[#1248cc] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95"
        >
          <UserPlus size={16} strokeWidth={2.5} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          ILLUSTRATIVE CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Registered Customers
          </p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">
            {customers.length}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Active loyalty & ledger profiles
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Dues & Outstanding
          </p>
          <h3 className="text-3xl font-black text-rose-600 mt-1">
            ₹{totalOutstanding.toLocaleString("en-IN")}
          </h3>
          <p className="text-xs text-rose-500 font-medium mt-1">
            Pending collection from {customers.filter((c) => c.balance > 0).length} customers
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Credit Health
          </p>
          <h3 className="text-3xl font-black text-emerald-600 mt-1">
            96%
          </h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Healthy collection velocity
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SEARCH BAR
      ══════════════════════════════════════════════════ */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-1 max-w-md">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            placeholder="Search by customer name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none w-full text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CREATIVE CUSTOMER LIST
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Customer Profile</th>
                <th className="py-3.5 px-4">Contact Phone</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Total Orders</th>
                <th className="py-3.5 px-4 text-right">Outstanding Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-sm grid place-items-center shadow-sm">
                        {c.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">
                          {c.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ID: {c._id.slice(-6).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 font-medium text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      <span>{c.phone || "—"}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" />
                      <span>{c.email || "—"}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 font-bold text-slate-900">
                    {c.totalOrders || 0} bills
                  </td>

                  <td className="py-4 px-4 text-right">
                    <span
                      className={`font-black text-sm ${
                        c.balance > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      ₹{c.balance.toLocaleString("en-IN")}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.balance > 0
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      }`}
                    >
                      {c.balance > 0 ? "Pending Due" : "Settled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ADD CUSTOMER MODAL
      ══════════════════════════════════════════════════ */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Add New Customer
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter customer details for automatic invoice lookup and credit tracking.
            </p>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Customer Name *
                </label>
                <input
                  required
                  placeholder="e.g. Ramesh Hardware"
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Mobile Number
                </label>
                <input
                  placeholder="10-digit mobile"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="customer@domain.com"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Opening Balance / Credit Due (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newCust.balance}
                  onChange={(e) => setNewCust({ ...newCust, balance: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4361ee] hover:bg-[#3751d8] text-white font-bold text-xs rounded-xl shadow-md transition"
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
