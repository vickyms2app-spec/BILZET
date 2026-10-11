import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Send,
  ShieldCheck,
  Check,
  Trash2,
  Mail,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Activity,
  History,
  RotateCcw,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { caConnectApi, staffApi } from "../api";
import { useAuth } from "../store/auth";
import Button, { CompactIconButton } from "../components/common/Button";

export default function CaConnect() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "CA") {
      navigate("/ca-portal", { replace: true });
    }
  }, [user, navigate]);

  // Subscription state determination
  const [subscription, setSubscription] = useState(() => {
    let plan = "Free";
    let status = "Active";
    let isExpired = false;

    try {
      const saved = localStorage.getItem("bilzet_subscription");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentPlan) plan = parsed.currentPlan;
        if (parsed.status) status = parsed.status;
        if (parsed.validUntil) {
          const dt = new Date(parsed.validUntil);
          if (!isNaN(dt.getTime()) && dt < new Date()) {
            isExpired = true;
          }
        }
      }
      const savedData = localStorage.getItem("bilzet_subscription_data");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.currentPlan) plan = parsedData.currentPlan;
        if (parsedData.status) status = parsedData.status;
      }
    } catch (_) {}

    return { plan, status, isExpired };
  });

  const [checkingPlan, setCheckingPlan] = useState(true);

  // CA Portal operational states (only accessible for Premium)
  const [caEmail, setCaEmail] = useState("");
  const [caName, setCaName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [invitedList, setInvitedList] = useState([]);

  // Phase 2: Authoritative CA Activity Ledger synchronization
  const [activeTab, setActiveTab] = useState("consultants"); // "consultants" | "activity"
  const [activityList, setActivityList] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const loadActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await caConnectApi.getActivity({ limit: 100 });
      setActivityList(res?.activity || []);
    } catch (err) {
      console.error("Failed to load CA sync activity:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Fetch verified subscription status from backend
  useEffect(() => {
    let isMounted = true;

    const verifySubscription = async () => {
      try {
        const res = await caConnectApi.getStatus();
        if (isMounted && res) {
          setSubscription({
            plan: res.currentPlan || "Free",
            status: res.status || "Active",
            isExpired: !!res.isExpired,
            isUnlocked: !!res.isUnlocked,
          });
        }
      } catch {
        // Retain local subscription state if offline
      } finally {
        if (isMounted) setCheckingPlan(false);
      }
    };

    verifySubscription();
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedPlan = (subscription.plan || "").toLowerCase();
  const isPremiumOrEnterprise =
    normalizedPlan === "premium" ||
    normalizedPlan === "enterprise" ||
    normalizedPlan.includes("admin");

  const isStatusValid =
    !subscription.isExpired &&
    subscription.status?.toLowerCase() !== "expired" &&
    subscription.status?.toLowerCase() !== "cancelled" &&
    subscription.status?.toLowerCase() !== "inactive";

  const isUnlocked =
    subscription.isUnlocked !== undefined
      ? subscription.isUnlocked
      : isPremiumOrEnterprise && isStatusValid;

  const loadAccountants = async () => {
    try {
      const res = await caConnectApi.list();
      const accountants = res?.accountants || [];
      const local = JSON.parse(localStorage.getItem("bilzet_ca_invites") || "[]");
      const combined = [...accountants];
      for (const loc of local) {
        if (!combined.some((c) => c.email === loc.email)) {
          combined.push(loc);
        }
      }
      setInvitedList(combined);
    } catch {
      try {
        const staffRes = await staffApi.list();
        const staffMembers = staffRes?.staff || [];
        const accountants = staffMembers.filter(
          (s) => s.role === "Accountant" || s.role === "CA" || s.department === "Finance & Taxation"
        );
        const local = JSON.parse(localStorage.getItem("bilzet_ca_invites") || "[]");
        const combined = [...accountants];
        for (const loc of local) {
          if (!combined.some((c) => c.email === loc.email)) {
            combined.push(loc);
          }
        }
        setInvitedList(combined);
      } catch {
        const local = JSON.parse(localStorage.getItem("bilzet_ca_invites") || "[]");
        setInvitedList(local);
      }
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadAccountants();
    }
  }, [isUnlocked]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!caEmail) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const name = caName.trim() || "CA / Tax Consultant";
      const payload = {
        name,
        email: caEmail.trim(),
        role: "Accountant",
        department: "Finance & Taxation",
        status: "ACTIVE",
      };

      try {
        await caConnectApi.invite(payload);
      } catch (apiErr) {
        if (apiErr?.status === 403 || apiErr?.statusCode === 403) {
          throw new Error("403 — Premium subscription required");
        }
        try {
          await staffApi.create(payload);
        } catch {
          // Fallback for offline/demo mode
        }
      }

      const newInvite = {
        id: `ca-${Date.now()}`,
        name,
        email: caEmail.trim(),
        role: "Accountant",
        status: "INVITED",
        createdAt: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem("bilzet_ca_invites") || "[]");
      const updated = [newInvite, ...existing.filter((i) => i.email !== caEmail.trim())];
      localStorage.setItem("bilzet_ca_invites", JSON.stringify(updated));

      setCaEmail("");
      setCaName("");
      setSuccessMsg(`Invitation successfully dispatched to ${caEmail.trim()}!`);
      loadAccountants();
    } catch (err) {
      setError(err?.message || "Failed to send invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item) => {
    try {
      if (item.id && !item.id.startsWith("ca-")) {
        await caConnectApi.remove(item.id).catch(() => {});
      }
    } catch (_) {}

    const email = item.email;
    const existing = JSON.parse(localStorage.getItem("bilzet_ca_invites") || "[]");
    const updated = existing.filter((i) => i.email !== email);
    localStorage.setItem("bilzet_ca_invites", JSON.stringify(updated));
    loadAccountants();
  };

  // ═════════════════════════════════════════════════════════════════════
  // 1. LOCKED UI (FREE OR PRO OR EXPIRED SUBSCRIBERS)
  // ═════════════════════════════════════════════════════════════════════
  if (!isUnlocked) {
    const isPro = normalizedPlan === "pro";
    const isExpired = subscription.isExpired || subscription.status?.toLowerCase() === "expired";

    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto fade-up">
        {/* TOP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 grid place-items-center shrink-0 shadow-2xs">
              <Lock size={22} className="text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title">CA Connect</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Lock size={11} /> Premium Feature
                </span>
              </div>
              <p className="page-desc">
                Secure read-only and tax report access for your Chartered Accountant or Tax Consultant
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-center">
            <Lock size={13} className="text-slate-500" />
            <span>Plan Locked</span>
          </span>
        </div>

        {/* LOCKED FEATURE PRESENTATION CARD */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 shadow-xs text-center relative overflow-hidden">
          {/* Top accent bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-indigo-600" />

          {/* Lock Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Lock size={30} />
          </div>

          {/* Premium Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-3">
            <Sparkles size={13} className="text-amber-600" />
            <span>Premium Feature</span>
          </div>

          {/* Headline */}
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2.5">
            {isExpired
              ? "Your Premium Subscription Has Expired"
              : isPro
              ? "Upgrade to Premium to access CA Connect."
              : "CA Connect is available exclusively with the Premium plan."}
          </h2>

          {/* Short Explanation */}
          <p className="text-sm text-slate-500 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
            {isExpired
              ? "Your access to the CA Connect portal is locked because your Premium subscription has expired. Renew your plan to re-enable secure tax audit and ledger access for your accountant."
              : isPro
              ? "Upgrade to Premium to access CA Connect. Invite your Chartered Accountant or tax consultant with dedicated read-only access for GSTR-1, GSTR-3B, HSN reconciliation, and audit ledgers."
              : "CA Connect is available exclusively with the Premium plan. Invite your Chartered Accountant or tax consultant with dedicated read-only access for GSTR-1, GSTR-3B, HSN reconciliation, and audit ledgers."}
          </p>

          {/* Key Value Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto mb-9 text-left">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900">Zero Credential Sharing</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Accountants get dedicated read-only access without accessing passwords or master data.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900">Direct GST Reconciliation</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                One-click export of GSTR-1, GSTR-3B, and CMP-08 filing packs.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900">Instant Revocation</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Revoke consultant access at any moment with a single click.
              </p>
            </div>
          </div>

          {/* Upgrade to Premium Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/subscription")}
              variant="primary"
              icon={ArrowRight}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold shadow-md shadow-blue-500/20"
            >
              Upgrade to Premium
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // 2. UNLOCKED UI (PREMIUM SUBSCRIBERS)
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-12 max-w-5xl fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0 shadow-2xs">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">CA Connect</h1>
              <span className="badge badge-info uppercase tracking-wider">Compliance</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles size={11} className="text-amber-500" /> Premium Unlocked
              </span>
            </div>
            <p className="page-desc">
              Secure read-only and tax report access for your Chartered Accountant or Tax Consultant
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 self-start sm:self-center">
          <ShieldCheck size={14} />
          <span>Encrypted Tax Portal</span>
        </span>
      </div>

      {/* ══════════════════════════════════════════════════
          TABS SWITCHER
      ══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("consultants")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "consultants"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Briefcase size={16} /> CA Access &amp; Consultants ({invitedList.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("activity");
              loadActivity();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "activity"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Activity size={16} /> Real-Time CA Activity Ledger ({activityList.length})
          </button>
        </div>

        {activeTab === "activity" && (
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            loading={loadingActivity}
            onClick={loadActivity}
          >
            Refresh Ledger
          </Button>
        )}
      </div>

      {activeTab === "consultants" ? (
        <>
          {/* Invite Form Card */}
          <div className="card p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Briefcase size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Invite Chartered Accountant</h2>
                <p className="text-xs text-slate-400 font-normal mt-0.5">
                  They receive dedicated portal access to export GSTR-1, GSTR-3B, HSN summaries, and audit ledgers.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium flex items-center gap-2">
                <ShieldAlert size={15} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Accountant / Firm Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh &amp; Associates, CA"
                  value={caName}
                  onChange={(e) => setCaName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="accountant@cafirm.in"
                  value={caEmail}
                  onChange={(e) => setCaEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  icon={Send}
                  className="w-full"
                >
                  Invite
                </Button>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={13} className="text-emerald-500" /> Read-only GST access
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={13} className="text-emerald-500" /> No access to staff salaries or master deletion
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check size={13} className="text-emerald-500" /> Instant revocable token
              </span>
            </div>
          </div>

          {/* Connected Accounts List */}
          <div className="card p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Active Tax Consultants &amp; Invited CAs</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {invitedList.length} Connected
                </span>
                <CompactIconButton
                  icon={RefreshCw}
                  variant="secondary"
                  title="Refresh list"
                  onClick={loadAccountants}
                />
              </div>
            </div>

            {invitedList.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Mail size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No CA or Tax Consultant Connected Yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enter their email above to invite them to access your tax reconciliation reports.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {invitedList.map((item, idx) => (
                  <div key={item.id || idx} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center font-bold text-xs shrink-0">
                        {item.name ? item.name.slice(0, 2).toUpperCase() : "CA"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name || "Chartered Accountant"}</p>
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                          <Mail size={11} className="text-slate-400" />
                          {item.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 size={11} /> Read Access
                      </span>
                      <CompactIconButton
                        icon={Trash2}
                        variant="danger"
                        title="Revoke Access"
                        onClick={() => handleRemove(item)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Real-Time CA Activity Ledger View */
        <div className="card p-0 overflow-hidden border border-slate-200/80 shadow-xs bg-white">
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <History size={16} className="text-indigo-600" />
                Authoritative CA Synchronized Activity Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every bill movement, partial payment, product return, credit note, and GST adjustment is permanently logged in PostgreSQL and visible to your authorized CA.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              <ShieldCheck size={13} /> PostgreSQL Immutable Ledger
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Invoice # &amp; Customer</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Financial State (Before → After)</th>
                  <th className="py-3 px-4">Adjustment / Notes</th>
                  <th className="py-3 px-4 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingActivity ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading synchronized CA activity records...
                    </td>
                  </tr>
                ) : activityList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No synchronized invoice movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  activityList.map((log) => {
                    const d = log.details || {};
                    const action = log.action || d.eventType || "INVOICE_EVENT";
                    const isCreate = action === "INVOICE_CREATED";
                    const isPay = action === "PAYMENT_RECEIVED" || action === "PARTIAL_PAYMENT";
                    const isRet = action === "SALE_RETURNED" || action === "PRODUCT_RETURN";
                    const isVoid = action === "INVOICE_VOIDED" || action === "INVOICE_CANCELLED";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCreate
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isPay
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isRet
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : isVoid
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isCreate && <FileText size={11} />}
                            {isPay && <CreditCard size={11} />}
                            {isRet && <RotateCcw size={11} />}
                            {isVoid && <AlertTriangle size={11} />}
                            {action.replace(/_/g, " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">
                            {d.invoiceNumber || (log.entityType === "SALE" ? `#${log.entityId.slice(0, 8)}` : "—")}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {d.customerName || "Walk-in Customer"}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {new Date(log.timestamp || log.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {d.before && d.after ? (
                            <div className="space-y-0.5">
                              <div>
                                <span className="text-slate-400">Total: </span>
                                <span className="line-through text-slate-400">₹{Number(d.before.grandTotal || 0).toFixed(0)}</span>
                                <span className="text-slate-900 font-bold"> → ₹{Number(d.after.grandTotal || 0).toFixed(0)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Paid: </span>
                                <span className="line-through text-slate-400">₹{Number(d.before.paidAmount || 0).toFixed(0)}</span>
                                <span className="text-emerald-700 font-bold"> → ₹{Number(d.after.paidAmount || 0).toFixed(0)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Due: </span>
                                <span className="line-through text-slate-400">₹{Number(d.before.balanceDue || 0).toFixed(0)}</span>
                                <span className="text-rose-600 font-bold"> → ₹{Number(d.after.balanceDue || 0).toFixed(0)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div>
                                <span className="text-slate-400">Total: </span>
                                <span className="font-bold text-slate-900">₹{Number(d.grandTotal || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Paid: </span>
                                <span className="font-semibold text-emerald-700">₹{Number(d.paidAmount || 0).toFixed(2)}</span>
                                <span className="text-slate-400 ml-2">Due: </span>
                                <span className="font-semibold text-rose-600">₹{Number(d.balanceDue || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[11px]">
                          {d.creditNoteNumber && (
                            <div className="text-purple-700 font-semibold">
                              CN #{d.creditNoteNumber} (GST Adj: ₹{Number(d.gstAdjustment || 0).toFixed(2)})
                            </div>
                          )}
                          {d.returnNumber && (
                            <div className="text-slate-600">
                              Return #{d.returnNumber}
                            </div>
                          )}
                          {d.reason && (
                            <div className="text-slate-500 italic">
                              Reason: {d.reason}
                            </div>
                          )}
                          {!d.creditNoteNumber && !d.returnNumber && !d.reason && (
                            <span className="text-slate-400 font-mono text-[10px]">Normal Transaction</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-medium text-slate-800">
                            {log.user?.name || log.user?.email || "System"}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {log.user?.role || "SYSTEM"}
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
      )}
    </div>
  );
}
