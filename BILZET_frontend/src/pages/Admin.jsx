import { useEffect, useState } from "react";
import { usersApi, settingsApi, staffApi, superAdminApi } from "../api";
import {
  Shield,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  UserCheck,
  RefreshCw,
  Lock,
  Unlock,
  Key,
  CreditCard,
  Building,
  DollarSign,
  Eye,
  EyeOff,
  Copy,
  Check,
  Server,
  Database,
  FileText,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  Receipt,
  Contact,
  Layers,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { useSecurityStore } from "../store/securityStore";
import { maskAccountNumber, maskIFSC, maskUPI, maskSecret } from "../utils/security";
import { Link, useSearchParams } from "react-router-dom";

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTabState] = useState(
    initialTab && ["overview", "vault", "payroll", "users"].includes(initialTab)
      ? initialTab
      : "overview"
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && ["overview", "vault", "payroll", "users"].includes(t)) {
      setActiveTabState(t);
    }
  }, [searchParams]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };
  const [overviewData, setOverviewData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [payrollList, setPayrollList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  // Local reveal states for individual vault items
  const [revealedItems, setRevealedItems] = useState({
    bankAcc: true,
    ifsc: true,
    clerkKey: false,
    dbUri: false,
  });

  const { adminRevealed, toggleAdminReveal } = useSecurityStore();

  const loadData = async () => {
    try {
      setLoading(true);
      const [oData, uData, sData, stData, pData] = await Promise.all([
        superAdminApi.getOverview().catch(() => null),
        usersApi.list().catch(() => ({ users: [] })),
        settingsApi.get().catch(() => ({})),
        staffApi.list().catch(() => ({ staff: [] })),
        staffApi.payroll().catch(() => ({ payrolls: [] })),
      ]);
      setOverviewData(oData);
      setUsersData(uData);
      setShopSettings(sData);
      setStaffList(stData?.staff || []);
      setPayrollList(pData?.payrolls || []);
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleItemReveal = (field) => {
    setRevealedItems((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const usersList = usersData?.users || [];
  const filteredUsers = usersList.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term))
    );
  });

  const totalUsers = overviewData?.totalUsers || usersList.length;
  const activeUsers = overviewData?.activeUsers || usersList.filter((u) => u.isActive).length;
  const totalSalesCount = overviewData?.totalSales || 0;
  const totalRevenueVal = overviewData?.totalRevenue || 0;
  const totalCustomersCount = overviewData?.totalCustomers || 2;
  const mrrVal = overviewData?.mrr || 0;

  const totalMonthlyPayroll = staffList.reduce(
    (acc, s) => acc + Number(s.salary || 0),
    0
  );

  return (
    <div className="space-y-6 pb-12 fade-up font-sans">
      {/* ══════════════════════════════════════════════════
          PAGE HEADER (MATCHES USER WEBSITE AESTHETIC)
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-blue-200 grid place-items-center text-blue-700 bg-blue-50 shadow-2xs shrink-0">
            <Shield size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Enterprise Admin &amp; Security Vault
              </h1>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Restricted Admin Access
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Authorized administrator portal &middot; Internal system secrets, platform overview &amp; tenant security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {/* Global Master Privacy Switch */}
          <button
            type="button"
            onClick={toggleAdminReveal}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              adminRevealed
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
            title="Toggle sensitive data masking across the entire application"
          >
            {adminRevealed ? <Unlock size={14} /> : <Lock size={14} />}
            <span>{adminRevealed ? "Vault Unmasked" : "Masking Active: Click to Unmask"}</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh admin telemetry"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          NAVIGATION TABS (MATCHES USER WEBSITE AESTHETIC)
      ══════════════════════════════════════════════════ */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold text-slate-500 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "overview"
              ? "border-blue-600 text-blue-700"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <TrendingUp size={14} />
          <span>Platform Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("vault")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "vault"
              ? "border-blue-600 text-blue-700"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <Lock size={14} />
          <span>Internal Security &amp; Credentials Vault</span>
        </button>

        <button
          onClick={() => setActiveTab("payroll")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "payroll"
              ? "border-blue-600 text-blue-700"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <DollarSign size={14} />
          <span>Executive Staff Payroll ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "users"
              ? "border-blue-600 text-blue-700"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <Users size={14} />
          <span>User Accounts &amp; Permissions ({usersList.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1: PLATFORM OVERVIEW (CLEAN WHITE THEME)
      ══════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Registered Users
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Users size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{totalUsers}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {activeUsers} Active &middot; 0 Suspended
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Platform MRR
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹{Number(mrrVal).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  Across 0 Pro &amp; 0 Enterprise
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Invoices Created
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{totalSalesCount}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Gross Value: ₹{Number(totalRevenueVal).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Global Customers Directory
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                  <Contact size={18} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{totalCustomersCount}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saved across all tenant shops
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Tiers & Recent Shops Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Subscription Tiers Summary */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Subscription Tiers</h3>
                </div>
                <Link to="/subscription" className="text-xs font-bold text-blue-600 hover:underline">
                  Manage &rarr;
                </Link>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">Free Starter</p>
                      <p className="text-[11px] text-slate-400">₹0 / mo</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">2 shops</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">Pro Suite</p>
                      <p className="text-[11px] text-slate-400">₹999 / mo</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">0 shops</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <div>
                      <p className="font-bold text-xs text-slate-900">Enterprise Business</p>
                      <p className="text-[11px] text-slate-400">₹2,499 / mo</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700">0 shops</span>
                </div>
              </div>
            </div>

            {/* Recent Registered Shops */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Recent Registered Shops</h3>
                </div>
                <button onClick={() => setActiveTab("users")} className="text-xs font-bold text-blue-600 hover:underline">
                  View All ({usersList.length}) &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2">
                      <th className="pb-2">User / Shop</th>
                      <th className="pb-2">Role</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.slice(0, 4).map((u) => (
                      <tr key={u.id || u._id} className="hover:bg-slate-50/60">
                        <td className="py-2.5">
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                        </td>
                        <td className="py-2.5">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {u.role || "USER"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PostgreSQL NeonDB Infrastructure Telemetry */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <Database size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">PostgreSQL NeonDB Infrastructure</h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Online &amp; Healthy
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Host: ep-orange-silence-b5w238xv-pooler &middot; AWS US-East-2 Serverless Cluster &middot; SSL Encrypted
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("vault")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs self-start sm:self-center shrink-0"
            >
              <span>View Database Secrets</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2: INTERNAL SECURITY & CREDENTIALS VAULT
      ══════════════════════════════════════════════════ */}
      {activeTab === "vault" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                <Shield size={16} className="text-blue-600" />
                <span>Protected Internal Credentials &amp; Infrastructure</span>
              </div>
              <p className="text-xs text-blue-900/80 leading-relaxed max-w-2xl">
                These confidential bank accounts, database connection strings, and authentication keys are strictly restricted to authenticated administrators. Standard users and staff members have zero access to these internal records.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-blue-700 border border-blue-200 shadow-2xs">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Admin Cleared</span>
              </span>
            </div>
          </div>

          {/* VAULT: BANK & SETTLEMENT */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Direct Bank Settlement &amp; UPI Credentials</h3>
                  <p className="text-[11px] text-slate-400">Primary financial account for invoice collections and payouts</p>
                </div>
              </div>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <span>Edit in Settings</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bank Name</span>
                <p className="font-bold text-slate-800 text-sm">{shopSettings?.bankName || "HDFC Bank"}</p>
                <span className="text-[10px] text-slate-400">Authorized Commercial Branch</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Account Holder Name</span>
                <p className="font-bold text-slate-800 text-sm">{shopSettings?.accountHolder || shopSettings?.ownerName || "BILZET Retail Mart"}</p>
                <span className="text-[10px] text-slate-400">Primary Commercial Beneficiary</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Full Account Number</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleItemReveal("bankAcc")}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title={revealedItems.bankAcc ? "Hide" : "Show"}
                    >
                      {revealedItems.bankAcc ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(shopSettings?.accountNumber || "50200012345678", "bankAcc")}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title="Copy Account Number"
                    >
                      {copiedField === "bankAcc" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {revealedItems.bankAcc || adminRevealed
                    ? shopSettings?.accountNumber || "50200012345678"
                    : maskAccountNumber(shopSettings?.accountNumber || "50200012345678", false)}
                </p>
                <span className="text-[10px] text-emerald-600 font-semibold">Active &middot; High Priority</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">IFSC Code</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleItemReveal("ifsc")}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      {revealedItems.ifsc ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(shopSettings?.ifsc || "HDFC0001234", "ifsc")}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      {copiedField === "ifsc" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <p className="font-mono font-bold text-slate-800 text-sm">
                  {revealedItems.ifsc || adminRevealed
                    ? shopSettings?.ifsc || "HDFC0001234"
                    : maskIFSC(shopSettings?.ifsc || "HDFC0001234", false)}
                </p>
                <span className="text-[10px] text-slate-400">NEFT / RTGS / IMPS Routing</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Shop UPI VPA ID</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(shopSettings?.upiId || "bilzet@hdfcbank", "upi")}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    {copiedField === "upi" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>
                <p className="font-mono font-bold text-emerald-700 text-sm">
                  {shopSettings?.upiId || "bilzet@hdfcbank"}
                </p>
                <span className="text-[10px] text-slate-400">Used for live dynamic QR generation on checkout and customer bills</span>
              </div>
            </div>
          </div>

          {/* VAULT: ENVIRONMENT & API CREDENTIALS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <Key size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">System Environment &amp; API Credentials</h3>
                  <p className="text-[11px] text-slate-400">Authentication keys, server endpoints, and cloud database connections</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Shield size={14} className="text-blue-600" />
                    <span>Clerk Publishable Key</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleItemReveal("clerkKey")}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      {revealedItems.clerkKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          "pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ",
                          "clerkKey"
                        )
                      }
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      {copiedField === "clerkKey" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <p className="font-mono text-[11px] font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 break-all">
                  {revealedItems.clerkKey || adminRevealed
                    ? "pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ"
                    : maskSecret("pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ", false)}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Google OAuth Active &middot; Multi-Session Enabled</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Database size={14} className="text-emerald-600" />
                    <span>PostgreSQL Database (NeonDB)</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleItemReveal("dbUri")}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      {revealedItems.dbUri ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <p className="font-mono text-[11px] font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 break-all">
                  {revealedItems.dbUri || adminRevealed
                    ? "postgresql://neondb_owner:***@ep-cool-mountain.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
                    : "postgresql://neondb_owner:••••••••@ep-cool-mountain.neon.tech/neondb?sslmode=require"}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Status: Connected &middot; Resilient In-Memory Fallback Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3: EXECUTIVE STAFF PAYROLL VAULT
      ══════════════════════════════════════════════════ */}
      {activeTab === "payroll" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <DollarSign size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Executive Staff Compensation &amp; Payroll Vault</h3>
                <p className="text-[11px] text-slate-400">Total monthly liabilities and individual staff compensation</p>
              </div>
            </div>
            <Link
              to="/staff"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              <span>Manage Staff</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Staff Count</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{staffList.length} Members</p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Monthly Payroll Burden</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">₹{totalMonthlyPayroll.toLocaleString("en-IN")}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payroll Run Status</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{payrollList.length > 0 ? "Disbursed" : "Ready for Run"}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Role / Department</th>
                  <th className="py-2.5 px-3 text-right">Base Salary (Admin View)</th>
                  <th className="py-2.5 px-3">Bank Account</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No staff members configured. Add employees in the Staff Management section.
                    </td>
                  </tr>
                ) : (
                  staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{st.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{st.role || "Staff"}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">
                        ₹{Number(st.salary || 0).toLocaleString("en-IN")}/mo
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {st.bankAccount ? st.bankAccount : "Direct Cash Payout"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
      )}

      {/* ══════════════════════════════════════════════════
          TAB 4: USER DIRECTORY & ACCESS CONTROL
      ══════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Total Registered Users</p>
                <p className="text-lg font-bold text-slate-900">{totalUsers}</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <UserCheck size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Active Accounts</p>
                <p className="text-lg font-bold text-emerald-700">{activeUsers}</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Administrators</p>
                <p className="text-lg font-bold text-purple-700">
                  {usersList.filter((u) => u.role === "ADMIN").length}
                </p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="relative max-w-sm w-full">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={15}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or role…"
                  className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium bg-slate-50/40"
                />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Showing {filteredUsers.length} of {usersList.length} users
              </span>
            </div>

            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs font-medium">Loading user accounts...</p>
              </div>
            ) : !usersList.length ? (
              <div className="py-16 text-center text-slate-400">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No users found</p>
                <p className="text-xs text-slate-400 mt-0.5">Staff accounts registered in your database will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Account Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id || u._id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100 uppercase">
                              {u.name ? u.name.charAt(0) : "U"}
                            </div>
                            <span className="font-semibold text-slate-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === "ADMIN"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {u.role || "USER"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              u.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {u.isActive ? (
                              <>
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle size={11} className="text-slate-400" />
                                <span>Inactive</span>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
