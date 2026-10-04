import { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  IndianRupee,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  FileText,
  MapPin,
} from "lucide-react";
import { suppliersApi } from "../api";
import Modal from "../components/common/Modal";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    address: "",
    openingBalance: 0,
  });

  const notify = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.list({ limit: 100 });
      const list = res?.suppliers || res?.data?.suppliers || [];
      setSuppliers(list);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify("error", "Supplier name is required.");
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 5) {
      notify("error", "Valid phone number is required (min 5 digits).");
      return;
    }

    setSubmitting(true);
    try {
      await suppliersApi.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        gstin: form.gstin.trim() || undefined,
        address: form.address.trim() || undefined,
        openingBalance: Number(form.openingBalance) || 0,
      });

      notify("success", `Supplier "${form.name.trim()}" added successfully!`);
      setOpenModal(false);
      setForm({
        name: "",
        phone: "",
        email: "",
        gstin: "",
        address: "",
        openingBalance: 0,
      });
      loadSuppliers();
    } catch (err) {
      notify(
        "error",
        err?.response?.data?.message || err?.message || "Failed to create supplier"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.phone?.includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.gstin?.toLowerCase().includes(term) ||
      s.address?.toLowerCase().includes(term)
    );
  });

  const totalBalance = suppliers.reduce(
    (acc, s) => acc + Number(s.balance ?? s.currentBalance ?? 0),
    0
  );

  return (
    <div className="space-y-5 pb-12 fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-indigo-100 grid place-items-center text-indigo-600 bg-indigo-50/70 shadow-2xs shrink-0">
            <Truck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Suppliers &amp; Vendors
              </h1>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Procurement
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Manage vendors, purchase ledgers, and outstanding payable balances
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 self-start sm:self-center shadow-xs"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          KPI SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Suppliers</p>
            <p className="text-xl font-bold text-slate-900">{suppliers.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <IndianRupee size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Payable Balance</p>
            <p className="text-xl font-bold text-amber-700">
              ₹{totalBalance.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Active Vendors</p>
            <p className="text-xl font-bold text-emerald-700">
              {suppliers.filter((s) => s.isActive !== false).length}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABLE CARD & SEARCH
      ══════════════════════════════════════════════════ */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="relative max-w-sm w-full">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor name, phone, GSTIN..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium bg-slate-50/40"
            />
          </div>

          <button
            type="button"
            onClick={loadSuppliers}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition text-xs flex items-center gap-1.5 self-start sm:self-auto"
            title="Refresh Suppliers"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-indigo-600" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4">Location / Address</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw size={18} className="animate-spin text-indigo-600 mx-auto mb-2" />
                    <span>Loading suppliers catalog…</span>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Truck size={28} className="text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No suppliers found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;Add Supplier&quot; to catalog your first distributor or vendor.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id || s._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[11px]">
                          {s.name?.[0]?.toUpperCase() || "S"}
                        </div>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.phone || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.email || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.gstin || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {s.address || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ₹{Number(s.balance ?? s.currentBalance ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
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
          ADD SUPPLIER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="Add New Supplier"
        subtitle="Record vendor details, GSTIN, and credit balance ledger"
        icon={Truck}
        iconColor="text-indigo-600 bg-indigo-50 border-indigo-100"
        maxWidth="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-100 transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="supplier-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition text-xs flex items-center gap-2"
            >
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              <span>Save Supplier</span>
            </button>
          </>
        }
      >
        <form
          id="supplier-form"
          onSubmit={handleCreateSupplier}
          className="space-y-3.5 text-xs pt-1"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Supplier / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex FMCG Distributors"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="orders@vendor.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GSTIN (15-digit)
              </label>
              <input
                type="text"
                placeholder="33AAAAA0000A1Z5"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono uppercase text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Business Address
            </label>
            <textarea
              rows={2}
              placeholder="Shop / Unit address, City, State"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium text-slate-800"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
