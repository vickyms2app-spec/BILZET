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
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";

// Predefined palette of soft, professional colors for deterministic avatar assignment
const SUPPLIER_AVATAR_PALETTES = [
  { bg: "#DFFFE6", text: "#0E2A16", border: "#5BF07B" }, // Mint
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

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [form, setForm] = useState({
    name: "",
    companyName: "",
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
        companyName: form.companyName.trim() || undefined,
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
        companyName: "",
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
      s.companyName?.toLowerCase().includes(term) ||
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F6F6F8] p-6 rounded-[28px] border border-[#E7E8EC] shadow-fintech">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-xs">
            <Truck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#111318] tracking-tight font-heading">
                Suppliers &amp; Vendors
              </h1>
              <span className="text-[10px] font-bold text-[#111318] bg-[#FAFAFB] border border-[#E7E8EC] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                Procurement
              </span>
            </div>
            <p className="text-xs text-[#7C7F8A] font-medium mt-1">
              Manage vendors, purchase records, and outstanding payable balances
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setOpenModal(true)}
        >
          Add Supplier
        </Button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-full text-xs font-semibold flex items-center gap-2.5 ${
            notification.type === "success"
              ? "bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16]"
              : "bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D]"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-[#E5484D] shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          KPI SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="bg-[#F6F6F8] rounded-[24px] border border-[#E7E8EC] p-5 shadow-fintech flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EDEDEF] text-[#111318] flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#7C7F8A] uppercase tracking-wider">Total Suppliers</p>
            <p className="text-2xl font-black text-[#111318] font-mono">{suppliers.length}</p>
          </div>
        </div>

        <div className="bg-[#F6F6F8] rounded-[24px] border border-[#E7E8EC] p-5 shadow-fintech flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#EDEDEF] text-[#E5484D] flex items-center justify-center shrink-0">
            <IndianRupee size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#7C7F8A] uppercase tracking-wider">Payable Balance</p>
            <p className="text-2xl font-black text-[#111318] font-mono">
              ₹{totalBalance.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="bg-[#F6F6F8] rounded-[24px] border border-[#E7E8EC] p-5 shadow-fintech flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#7C7F8A] uppercase tracking-wider">Active Vendors</p>
            <p className="text-2xl font-black text-[#0E2A16] font-mono">
              {suppliers.filter((s) => s.isActive !== false).length}
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABLE CARD & SEARCH
      ══════════════════════════════════════════════════ */}
      <div className="bg-[#F6F6F8] rounded-[28px] border border-[#E7E8EC] shadow-fintech overflow-hidden">
        <div className="p-4 border-b border-[#E7E8EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFAFB]">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search by vendor name, phone, GSTIN..."
            className="max-w-md"
          />

          <button
            type="button"
            onClick={loadSuppliers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E8EC] bg-white text-[#111318] hover:bg-[#EDEDEF] text-xs font-semibold transition cursor-pointer self-start sm:self-auto shadow-xs"
            title="Refresh Suppliers"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#111318]" : "text-[#7C7F8A]"} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Supplier & Company</th>
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
                  <td colSpan={7} className="py-12 text-center text-[#7C7F8A]">
                    <RefreshCw size={18} className="animate-spin text-[#111318] mx-auto mb-2" />
                    <span>Loading suppliers catalog…</span>
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7C7F8A]">
                    <Truck size={28} className="text-[#C3C5CE] mx-auto mb-2" />
                    <p className="font-semibold text-[#111318]">No suppliers found</p>
                    <p className="text-[11px] text-[#7C7F8A] mt-0.5">
                      Click &quot;Add Supplier&quot; to catalog your first distributor or vendor.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s, idx) => {
                  const initial = s.name ? s.name.trim().charAt(0).toUpperCase() : "S";
                  const palette = getSupplierAvatarPalette(s.id || s._id || s.name || `supplier-${idx}`);
                  return (
                    <tr key={s.id || s._id} className="hover:bg-[#EDEDEF]/60 transition">
                      <td className="py-3 px-4 font-semibold text-[#111318]">
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
                          <p className="font-semibold text-[#111318] leading-tight">{s.name}</p>
                          {s.companyName ? (
                            <p className="text-[11px] text-[#7C7F8A] font-medium flex items-center gap-1 mt-0.5">
                              <Building2 size={11} className="shrink-0 text-[#7C7F8A]" />
                              <span>{s.companyName}</span>
                            </p>
                          ) : (
                            <span className="text-[10px] text-[#7C7F8A]">Individual Supplier</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#7C7F8A]">
                      {s.phone || "—"}
                    </td>
                    <td className="py-3 px-4 text-[#7C7F8A]">
                      {s.email || "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#7C7F8A]">
                      {s.gstin || "—"}
                    </td>
                    <td className="py-3 px-4 text-[#7C7F8A] max-w-xs truncate">
                      {s.address || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#111318]">
                      ₹{Number(s.balance ?? s.currentBalance ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40">
                        Active
                      </span>
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
          ADD SUPPLIER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title="Add New Supplier"
        subtitle="Record vendor details, company name, GSTIN, and opening balances"
        icon={Truck}
        iconColor="text-[#5BF07B] bg-[#12151C] border-[#12151C]"
        maxWidth="max-w-lg"
        footer={
          <>
            <Button
              variant="neutral"
              size="sm"
              icon={X}
              onClick={() => setOpenModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="supplier-form"
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              loading={submitting}
            >
              Save Supplier
            </Button>
          </>
        }
      >
        <form
          id="supplier-form"
          onSubmit={handleCreateSupplier}
          className="space-y-3.5 text-xs pt-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111318] mb-1">
                Supplier Name (Contact Person) <span className="text-[#E5484D]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Raj Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-medium text-[#111318]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111318] mb-1">
                Company Name (Business Entity)
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Furniture Pvt Ltd"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-medium text-[#111318]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111318] mb-1">
                Phone Number <span className="text-[#E5484D]">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-mono text-[#111318]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111318] mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="orders@vendor.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-medium text-[#111318]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#111318] mb-1">
                GSTIN (15-digit)
              </label>
              <input
                type="text"
                placeholder="33AAAAA0000A1Z5"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-mono uppercase text-[#111318]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#111318] mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-mono text-[#111318]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#111318] mb-1">
              Business Address
            </label>
            <textarea
              rows={2}
              placeholder="Shop / Unit address, City, State"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-[#E7E8EC] bg-white rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-medium text-[#111318]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
