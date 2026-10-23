import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Receipt,
  FileText,
  Building2,
  ShieldCheck,
  X,
  Check,
  Search,
  Globe,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { customersApi } from "../api";
import Modal from "../components/common/Modal";
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";
import { useRealtimeSync } from "../hooks/useRealtimeSync";
import { handleSmartFormKeyDown } from "../utils/keyboardNavigation";
import {
  getCountries,
  getStatesForCountry,
  isValidStateForCountry,
  getDefaultStateForCountry,
} from "../utils/countryStateData";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDueOnly, setFilterDueOnly] = useState("all"); // 'all' | 'due' | 'settled'
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerPurchases, setCustomerPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    email: "",
    country: "India",
    state: "Tamil Nadu",
    address: "",
    gstin: "",
    balance: 0,
  });

  const [editCust, setEditCust] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    country: "India",
    state: "Tamil Nadu",
    address: "",
    gstin: "",
    balance: 0,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const addCustomerFormRef = useRef(null);

  const handleOpenEdit = (c) => {
    if (!c) return;
    const custCountry = c.country || "India";
    let custState = c.state || "";
    // Requirement 3: If populated from saved customer data, validate that the saved state belongs to the selected country
    if (custState && !isValidStateForCountry(custCountry, custState)) {
      custState = "";
    }
    setEditCust({
      id: c.id || c._id,
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      country: custCountry,
      state: custState,
      address: c.address || "",
      gstin: c.gstin || "",
      balance: c.balance || 0,
    });
    setErrorMsg("");
    setOpenEditModal(true);
  };

  const handleNewCustCountryChange = (newCountry) => {
    setNewCust((prev) => ({
      ...prev,
      country: newCountry,
      state: "", // Requirement 2: clear previously selected state immediately
    }));
  };

  const handleEditCustCountryChange = (newCountry) => {
    setEditCust((prev) => ({
      ...prev,
      country: newCountry,
      state: "", // Requirement 2: clear previously selected state immediately
    }));
  };

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

  // Real-time synchronization for Customers & Ledger
  useRealtimeSync(
    ["CUSTOMER_CREATED", "CUSTOMER_UPDATED", "SALE_CREATED", "PAYMENT_RECORDED"],
    () => {
      loadCustomers();
    }
  );

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
      c.address?.toLowerCase().includes(search.toLowerCase()) ||
      c.state?.toLowerCase().includes(search.toLowerCase()) ||
      c.country?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterDueOnly === "due") return (c.balance || 0) > 0;
    if (filterDueOnly === "settled") return (c.balance || 0) <= 0;
    return true;
  });

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.name.trim()) return;
    if (newCust.state && !isValidStateForCountry(newCust.country, newCust.state)) {
      setErrorMsg(`Selected state "${newCust.state}" is not valid for ${newCust.country}`);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        name: newCust.name.trim(),
        phone: newCust.phone.trim() || undefined,
        email: newCust.email.trim() || undefined,
        country: newCust.country,
        state: newCust.state || undefined,
        address: newCust.address.trim() || undefined,
        gstin: newCust.gstin.trim() || undefined,
        balance: Number(newCust.balance || 0),
      };
      await customersApi.create(payload);
      setNewCust({
        name: "",
        phone: "",
        email: "",
        country: "India",
        state: "Tamil Nadu",
        address: "",
        gstin: "",
        balance: 0,
      });
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

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!editCust.name.trim()) return;
    if (editCust.state && !isValidStateForCountry(editCust.country, editCust.state)) {
      setErrorMsg(`Selected state "${editCust.state}" is not valid for ${editCust.country}`);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const payload = {
        name: editCust.name.trim(),
        phone: editCust.phone.trim() || undefined,
        email: editCust.email.trim() || undefined,
        country: editCust.country,
        state: editCust.state || undefined,
        address: editCust.address.trim() || undefined,
        gstin: editCust.gstin.trim() || undefined,
        balance: Number(editCust.balance || 0),
      };
      const res = await customersApi.update(editCust.id, payload);
      const updated = res?.customer || res?.data?.customer;
      if (
        updated &&
        selectedCustomer &&
        (selectedCustomer.id === editCust.id || selectedCustomer._id === editCust.id)
      ) {
        setSelectedCustomer((prev) => ({ ...prev, ...updated }));
      }
      setOpenEditModal(false);
      loadCustomers();
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to update customer"
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper to format customer ID
  const getDisplayId = (c) => {
    if (c.customerId) return c.customerId;
    const rawId = c.id || c._id || "";
    if (rawId.startsWith("cust-")) return rawId.toUpperCase();
    if (rawId.startsWith("UST-") || rawId.startsWith("CUS-")) return rawId;
    if (rawId.length > 8) return `CUS-${rawId.slice(-4).toUpperCase()}`;
    return rawId ? `CUS-${rawId.toUpperCase()}` : "CUS-001";
  };

  // Predefined palette of soft, professional colors for deterministic avatar assignment
  const AVATAR_PALETTES = [
    { bg: "#EBF5FF", text: "#007AFF", border: "#D0E2FF" }, // Blue
    { bg: "#F3E8FF", text: "#7C3AED", border: "#E9D5FF" }, // Purple
    { bg: "#E6FFFA", text: "#0D9488", border: "#B2F5EA" }, // Teal
    { bg: "#EDF8F0", text: "#248A3D", border: "#CCE8D4" }, // Green
    { bg: "#FFF4E5", text: "#C25E00", border: "#FFE2B8" }, // Orange
    { bg: "#FDF2F8", text: "#DB2777", border: "#FCE7F3" }, // Pink
    { bg: "#EEF2FF", text: "#4F46E5", border: "#E0E7FF" }, // Indigo
    { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" }, // Rose
  ];

  const getAvatarPalette = (idOrName) => {
    const str = String(idOrName || "customer");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % AVATAR_PALETTES.length;
    return AVATAR_PALETTES[index];
  };

  return (
    <div className="space-y-5 pb-12 fade-up font-sans text-[#1D1D1F]">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] text-[#007AFF] border border-[#E5E5EA] flex items-center justify-center shrink-0">
            <Users size={20} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] tracking-tight">
                Customer Details
              </h1>
              <span className="text-[11px] font-medium text-[#007AFF] bg-[#EBF5FF] border border-[#D0E2FF] px-2.5 py-0.5 rounded-full">
                Directory
              </span>
            </div>
            <p className="text-xs text-[#6E6E73] font-normal mt-0.5">
              Customer profiles, contact info, purchase history, and outstanding balances
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpenAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#007AFF] hover:bg-[#0062CC] text-white transition cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)]"
        >
          <UserPlus size={15} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          KPI SUMMARY CARDS
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
              Registered Customers
            </p>
            <p className="text-2xl font-bold text-[#1D1D1F] mt-1">{customers.length}</p>
            <p className="text-xs text-[#6E6E73] mt-0.5">Active directory records</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-[#007AFF] border border-[#E5E5EA] flex items-center justify-center shrink-0">
            <Users size={17} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
              Total Purchases Volume
            </p>
            <p className="text-2xl font-bold text-[#1D1D1F] font-mono mt-1">
              ₹{totalPurchasesVolume.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-[#6E6E73] mt-0.5">Cumulative billing value</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-[#248A3D] border border-[#E5E5EA] flex items-center justify-center shrink-0">
            <Receipt size={17} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-[#6E6E73] uppercase tracking-wider">
              Total Outstanding Dues
            </p>
            <p
              className={`text-2xl font-bold font-mono mt-1 ${
                totalOutstanding > 0 ? "text-[#D70015]" : "text-[#1D1D1F]"
              }`}
            >
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              From {customers.filter((c) => (c.balance || 0) > 0).length} customers with dues
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] text-[#D70015] border border-[#E5E5EA] flex items-center justify-center shrink-0">
            <IndianRupee size={17} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SEARCH & FILTER TOOLBAR
      ══════════════════════════════════════════════════ */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search by customer name, phone, email, or address..."
          className="max-w-md"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] text-xs font-medium">
            <button
              onClick={() => setFilterDueOnly("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterDueOnly === "all"
                  ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setFilterDueOnly("due")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterDueOnly === "due"
                  ? "bg-white text-[#D70015] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                  : "text-[#6E6E73] hover:text-[#D70015]"
              }`}
            >
              Has Dues ({customers.filter((c) => (c.balance || 0) > 0).length})
            </button>
            <button
              onClick={() => setFilterDueOnly("settled")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterDueOnly === "settled"
                  ? "bg-white text-[#248A3D] shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-semibold"
                  : "text-[#6E6E73] hover:text-[#248A3D]"
              }`}
            >
              Settled ({customers.filter((c) => (c.balance || 0) <= 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CUSTOMER DETAILS TABLE — macOS INSPIRED
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[#6E6E73] font-medium text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3.5 min-w-[180px]">Customer</th>
                <th className="py-2.5 px-3.5 min-w-[150px]">Contact</th>
                <th className="py-2.5 px-3.5 min-w-[180px]">Address / GSTIN</th>
                <th className="py-2.5 px-3.5 text-right min-w-[120px]">Total Purchases</th>
                <th className="py-2.5 px-3 text-center min-w-[90px]">Orders</th>
                <th className="py-2.5 px-3.5 text-right min-w-[120px]">Outstanding Due</th>
                <th className="py-2.5 px-3.5 text-center min-w-[95px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA] bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] border border-[#E5E5EA] text-[#6E6E73] flex items-center justify-center mx-auto mb-2">
                      <Users size={20} />
                    </div>
                    <p className="text-sm font-semibold text-[#1D1D1F]">No customers found</p>
                    <p className="text-xs text-[#6E6E73] mt-1 max-w-sm mx-auto">
                      {search
                        ? `No customer matching "${search}". Try a different name, phone, or address.`
                        : "Get started by adding your first customer."}
                    </p>
                    <button
                      onClick={() => setOpenAddModal(true)}
                      className="mt-4 px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-[0_1px_2px_rgba(0,122,255,0.25)]"
                    >
                      <UserPlus size={13} />
                      <span>Add Customer</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => {
                  const custId = c.customerId || c._id || c.id || "";
                  const displayId = getDisplayId(c);
                  const hasDue = (c.balance || 0) > 0;
                  const initial = c.name ? c.name.trim().charAt(0).toUpperCase() : "C";
                  const palette = getAvatarPalette(custId || c.name || `customer-${idx}`);

                  return (
                    <tr
                      key={custId || idx}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-[#F5F5F7]/60 transition cursor-pointer group"
                    >
                      {/* # Column */}
                      <td className="py-3 px-3 text-center text-[11px] text-[#6E6E73] font-mono">
                        {idx + 1}
                      </td>

                      {/* Customer Column */}
                      <td className="py-3 px-3.5">
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
                            <p className="font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition leading-snug">
                              {c.name}
                            </p>
                            <span className="text-[11px] text-[#6E6E73] font-mono leading-none block mt-0.5">
                              {displayId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Column */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-[#1D1D1F] font-medium">
                            <Phone size={12} className="text-[#6E6E73] shrink-0" />
                            <span>{c.phone || "—"}</span>
                          </div>
                          {c.email ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#6E6E73]">
                              <Mail size={12} className="text-[#6E6E73] shrink-0" />
                              <span className="truncate max-w-[145px]" title={c.email}>
                                {c.email}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#6E6E73]/60 italic pl-4">
                              No email
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Address / GSTIN Column */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5 max-w-[210px]">
                          {c.address ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#1D1D1F]">
                              <MapPin size={12} className="text-[#6E6E73] shrink-0" />
                              <span className="truncate" title={c.address}>
                                {c.address}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs text-[#6E6E73]/60 italic">
                              <MapPin size={12} className="text-[#6E6E73]/60 shrink-0" />
                              <span>No address</span>
                            </div>
                          )}
                          {c.gstin ? (
                            <div className="text-[11px] font-mono text-[#6E6E73] pl-4 tracking-wider">
                              GSTIN: {c.gstin}
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#6E6E73]/60 italic pl-4">
                              No GSTIN
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Purchases Column */}
                      <td className="py-3 px-3.5 text-right">
                        <span className="font-semibold tabular-nums text-[#1D1D1F] font-mono">
                          ₹{Number(c.totalPurchases || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Orders Column */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] rounded-md text-[11px] font-medium tabular-nums">
                          {c.totalOrders || 0} {(c.totalOrders === 1) ? "bill" : "bills"}
                        </span>
                      </td>

                      {/* Outstanding Due Column */}
                      <td className="py-3 px-3.5 text-right">
                        <span
                          className={`font-semibold tabular-nums font-mono ${
                            hasDue ? "text-[#D70015]" : "text-[#6E6E73]"
                          }`}
                        >
                          ₹{Number(c.balance || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Action Column */}
                      <td
                        className="py-3 px-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Customer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-[#6E6E73] hover:text-[#007AFF] hover:bg-[#EBF5FF] transition cursor-pointer"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-[#007AFF] hover:bg-[#EBF5FF] transition cursor-pointer"
                          >
                            <span>Details</span>
                            <span aria-hidden="true">&rarr;</span>
                          </button>
                        </div>
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
          subtitle={`Customer ID: ${getDisplayId(selectedCustomer)}`}
          icon={Users}
          iconColor="text-[#007AFF] bg-[#F5F5F7] border-[#E5E5EA]"
          maxWidth="max-w-2xl"
          footer={
            <div className="w-full flex items-center justify-between">
              {(selectedCustomer.balance || 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const custName = selectedCustomer.name;
                    setSelectedCustomer(null);
                    navigate("/sales/payments-in", { state: { prefillCustomer: custName } });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#248A3D] hover:bg-[#1E7433] text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <IndianRupee size={14} />
                  <span>Record Payment-In</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-[#248A3D] font-medium">
                  <ShieldCheck size={16} />
                  <span>All accounts settled</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedCustomer)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E5E5EA] text-[#1D1D1F] font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Pencil size={13} className="text-[#007AFF]" />
                  <span>Edit</span>
                </button>
                <Button
                  variant="neutral"
                  size="sm"
                  icon={X}
                  onClick={() => setSelectedCustomer(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F5F5F7] p-4 rounded-xl border border-[#E5E5EA]">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                  Contact Number
                </span>
                <div className="flex items-center gap-2 text-[#1D1D1F] font-medium">
                  <Phone size={13} className="text-[#6E6E73] shrink-0" />
                  <span>{selectedCustomer.phone || "Not provided"}</span>
                  {selectedCustomer.phone && (
                    <a
                      href={`tel:${selectedCustomer.phone}`}
                      className="text-[#007AFF] hover:underline text-[11px] ml-1 font-semibold"
                    >
                      Call
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                  Email Address
                </span>
                <div className="flex items-center gap-2 text-[#1D1D1F] font-medium">
                  <Mail size={13} className="text-[#6E6E73] shrink-0" />
                  <span className="truncate">{selectedCustomer.email || "Not provided"}</span>
                  {selectedCustomer.email && (
                    <a
                      href={`mailto:${selectedCustomer.email}`}
                      className="text-[#007AFF] hover:underline text-[11px] ml-1 font-semibold"
                    >
                      Mail
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2 pt-2 border-t border-[#E5E5EA]">
                <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                  Region & State
                </span>
                <div className="flex items-center gap-2 text-[#1D1D1F] font-medium">
                  <Globe size={13} className="text-[#6E6E73] shrink-0" />
                  <span>
                    {selectedCustomer.state
                      ? `${selectedCustomer.state}, ${selectedCustomer.country || "India"}`
                      : selectedCustomer.country || "India"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2 pt-2 border-t border-[#E5E5EA]">
                <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                  Billing Address
                </span>
                <div className="flex items-start gap-2 text-[#1D1D1F] font-medium">
                  <MapPin size={13} className="text-[#6E6E73] shrink-0 mt-0.5" />
                  <span>{selectedCustomer.address || "No physical address specified"}</span>
                </div>
              </div>

              {selectedCustomer.gstin && (
                <div className="space-y-1 sm:col-span-2 pt-2 border-t border-[#E5E5EA]">
                  <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                    GSTIN
                  </span>
                  <div className="flex items-center gap-2 text-[#1D1D1F] font-mono font-medium">
                    <Building2 size={13} className="text-[#6E6E73] shrink-0" />
                    <span>{selectedCustomer.gstin}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-[#E5E5EA] rounded-xl">
                <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                  Total Purchases
                </span>
                <p className="text-base font-bold text-[#1D1D1F] font-mono mt-1">
                  ₹{Number(selectedCustomer.totalPurchases || 0).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-[#6E6E73]">
                  {selectedCustomer.totalOrders || 0} total invoices
                </span>
              </div>

              <div className="p-3 bg-white border border-[#E5E5EA] rounded-xl">
                <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                  Outstanding Due
                </span>
                <p
                  className={`text-base font-bold font-mono mt-1 ${
                    (selectedCustomer.balance || 0) > 0 ? "text-[#D70015]" : "text-[#1D1D1F]"
                  }`}
                >
                  ₹{Number(selectedCustomer.balance || 0).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-[#6E6E73]">
                  {(selectedCustomer.balance || 0) > 0 ? "Pending collection" : "Clean balance"}
                </span>
              </div>

              <div className="p-3 bg-white border border-[#E5E5EA] rounded-xl">
                <span className="text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider block">
                  Credit Limit
                </span>
                <p className="text-base font-bold text-[#1D1D1F] font-mono mt-1">
                  ₹{Number(selectedCustomer.creditLimit || 0).toLocaleString("en-IN")}
                </p>
                <span className="text-[10px] text-[#6E6E73]">Max credit allowed</span>
              </div>
            </div>

            {/* Purchase History */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#6E6E73]" />
                  <h4 className="font-semibold text-[#1D1D1F]">Purchase History</h4>
                </div>
                <span className="text-[11px] text-[#6E6E73] font-medium">
                  {customerPurchases.length} invoices recorded
                </span>
              </div>

              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-white">
                {loadingPurchases ? (
                  <div className="p-6 text-center text-[#6E6E73]">Loading purchase records...</div>
                ) : customerPurchases.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-[#1D1D1F] font-semibold">No purchase history found</p>
                    <p className="text-[#6E6E73] text-[11px] mt-0.5">
                      Invoices generated for this customer in POS will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[10px] font-medium text-[#6E6E73] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      {customerPurchases.map((inv) => (
                        <tr key={inv._id || inv.id} className="hover:bg-[#F5F5F7]/50">
                          <td className="py-2.5 px-3 font-semibold text-[#1D1D1F] font-mono">
                            {inv.invoiceNumber || inv.id?.slice(-8)}
                          </td>
                          <td className="py-2.5 px-3 text-[#6E6E73]">
                            {inv.createdAt
                              ? new Date(inv.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#F5F5F7] text-[#1D1D1F] text-[10px] font-medium border border-[#E5E5EA]">
                              {inv.paymentMethod || "CASH"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#1D1D1F] tabular-nums font-mono">
                            ₹{Number(inv.totalAmount || inv.total || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EDF8F0] text-[#248A3D] border border-[#CCE8D4]">
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
        iconColor="text-[#007AFF] bg-[#F5F5F7] border-[#E5E5EA]"
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
        <form
          id="add-customer-form"
          ref={addCustomerFormRef}
          onKeyDown={(e) => handleSmartFormKeyDown(e, addCustomerFormRef.current)}
          onSubmit={handleAddCustomer}
          className="space-y-4 text-xs font-sans"
        >
          {errorMsg && (
            <div className="p-3 bg-[#FFF2F2] border border-[#FFD0D0] text-[#D70015] text-xs rounded-xl">
              {errorMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
              Customer Name <span className="text-[#D70015]">*</span>
            </label>
            <input
              required
              placeholder="e.g. Ramesh Hardware"
              value={newCust.name}
              onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Mobile Number</label>
              <input
                placeholder="10-digit mobile"
                value={newCust.phone}
                onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Opening Due (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={newCust.balance}
                onChange={(e) => setNewCust({ ...newCust, balance: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition tabular-nums text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="customer@domain.com"
              value={newCust.email}
              onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
            />
          </div>

          {/* Country & State Dependent Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Country</label>
              <div className="relative">
                <select
                  id="customer-country"
                  value={newCust.country}
                  onChange={(e) => handleNewCustCountryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white cursor-pointer appearance-none pr-7"
                >
                  {getCountries().map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label || c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#6E6E73]">
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">State / Region</label>
              <div className="relative">
                <select
                  id="customer-state"
                  value={newCust.state}
                  onChange={(e) => setNewCust({ ...newCust, state: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white cursor-pointer appearance-none pr-7"
                >
                  <option value="" disabled>
                    {getStatesForCountry(newCust.country).length > 0 ? "Select State / Region" : "No regions available"}
                  </option>
                  {getStatesForCountry(newCust.country).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#6E6E73]">
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Physical Address</label>
            <input
              placeholder="Shop/Street, City, Pin Code"
              value={newCust.address}
              onChange={(e) => setNewCust({ ...newCust, address: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">GSTIN (Optional)</label>
            <input
              placeholder="33AAAAA0000A1Z5"
              value={newCust.gstin}
              onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition text-[#1D1D1F] bg-white uppercase placeholder-[#6E6E73]/60"
            />
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════
          EDIT CUSTOMER MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={openEditModal}
        onClose={() => setOpenEditModal(false)}
        title="Edit Customer"
        subtitle="Update customer profile, address, and state/region"
        icon={Users}
        iconColor="text-[#007AFF] bg-[#F5F5F7] border-[#E5E5EA]"
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="neutral"
              size="sm"
              icon={X}
              onClick={() => setOpenEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-customer-form"
              variant="primary"
              size="sm"
              icon={Check}
              loading={loading}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form
          id="edit-customer-form"
          onSubmit={handleUpdateCustomer}
          className="space-y-4 text-xs font-sans"
        >
          {errorMsg && (
            <div className="p-3 bg-[#FFF2F2] border border-[#FFD0D0] text-[#D70015] text-xs rounded-xl">
              {errorMsg}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">
              Customer Name <span className="text-[#D70015]">*</span>
            </label>
            <input
              required
              placeholder="e.g. Ramesh Hardware"
              value={editCust.name}
              onChange={(e) => setEditCust({ ...editCust, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Mobile Number</label>
              <input
                placeholder="10-digit mobile"
                value={editCust.phone}
                onChange={(e) => setEditCust({ ...editCust, phone: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Opening Due (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={editCust.balance}
                onChange={(e) => setEditCust({ ...editCust, balance: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition tabular-nums text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="customer@domain.com"
              value={editCust.email}
              onChange={(e) => setEditCust({ ...editCust, email: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
            />
          </div>

          {/* Country & State Dependent Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Country</label>
              <div className="relative">
                <select
                  id="edit-customer-country"
                  value={editCust.country}
                  onChange={(e) => handleEditCustCountryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white cursor-pointer appearance-none pr-7"
                >
                  {getCountries().map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label || c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#6E6E73]">
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">State / Region</label>
              <div className="relative">
                <select
                  id="edit-customer-state"
                  value={editCust.state}
                  onChange={(e) => setEditCust({ ...editCust, state: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white cursor-pointer appearance-none pr-7"
                >
                  <option value="" disabled>
                    {getStatesForCountry(editCust.country).length > 0 ? "Select State / Region" : "No regions available"}
                  </option>
                  {getStatesForCountry(editCust.country).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#6E6E73]">
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">Physical Address</label>
            <input
              placeholder="Shop/Street, City, Pin Code"
              value={editCust.address}
              onChange={(e) => setEditCust({ ...editCust, address: e.target.value })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition text-[#1D1D1F] bg-white placeholder-[#6E6E73]/60"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1.5">GSTIN (Optional)</label>
            <input
              placeholder="33AAAAA0000A1Z5"
              value={editCust.gstin}
              onChange={(e) => setEditCust({ ...editCust, gstin: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-[#E5E5EA] rounded-xl text-xs outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition text-[#1D1D1F] bg-white uppercase placeholder-[#6E6E73]/60"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
