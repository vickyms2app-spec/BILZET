import { useState, useEffect, useCallback } from "react";
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
  Flag,
  MessageSquare,
  Copy,
  Clock,
  UserPlus,
  UserCheck,
  ExternalLink,
  X,
  Building2,
  CheckSquare,
  Square,
  ChevronDown,
} from "lucide-react";
import { caConnectApi, caInvitationApi, subscriptionApi } from "../api";
import { useAuth } from "../store/auth";
import { useStore } from "../store/storeContext";
import useRealtimeSync from "../hooks/useRealtimeSync";
import Button, { CompactIconButton } from "../components/common/Button";

const AVAILABLE_PERMISSIONS = [
  { id: "sales", label: "Sales & Invoicing", desc: "Audit sales registers, tax invoices, and payment receipts" },
  { id: "purchases", label: "Purchase Records", desc: "View supplier bills, input tax credit, and purchase ledgers" },
  { id: "tax", label: "GST Returns (GSTR-1 / 3B)", desc: "Reconcile taxable turnovers, reverse charges, and tax slabs" },
  { id: "reconciliation", label: "Bank Reconciliation", desc: "Match settlement payouts, bank vouchers, and book balances" },
  { id: "reports", label: "Workpapers & Reports", desc: "Generate balance sheets, trial balances, and audit reports" },
  { id: "tasks", label: "Audit Tasks & Notes", desc: "Create, assign, and track compliance task checklists" },
  { id: "discrepancies", label: "Flag Discrepancies", desc: "Raise audit queries and track client resolution notes" },
];

export default function CaConnect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateSubscription = useAuth((s) => s.updateSubscription);
  const refreshUser = useAuth((s) => s.refreshUser);
  const { currentStore } = useStore();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  useEffect(() => {
    if (user?.role === "CA") {
      navigate("/ca-portal", { replace: true });
    }
  }, [user, navigate]);

  // Subscription state determination
  const [subscription, setSubscription] = useState(() => {
    let plan = user?.subscription?.planTier || user?.currentPlan || "FREE";
    let status = user?.subscription?.status || "Active";
    let isExpired = !!user?.subscription?.isExpired;

    try {
      const savedData = localStorage.getItem("bilzet_subscription_data");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.planTier) plan = parsedData.planTier;
        else if (parsedData.currentPlan) plan = parsedData.currentPlan;
        if (parsedData.status) status = parsedData.status;
        if (parsedData.isExpired !== undefined) isExpired = !!parsedData.isExpired;
      }
    } catch (_) {}

    return { plan, status, isExpired };
  });

  const [checkingPlan, setCheckingPlan] = useState(true);

  // CA Portal operational states
  const [activeTab, setActiveTab] = useState("invitations"); // "invitations" | "activity" | "discrepancies"

  // Connected CAs and Invitations
  const [connectedCas, setConnectedCas] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loadingCas, setLoadingCas] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  // Invite Modal / Form state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteExpiryHours, setInviteExpiryHours] = useState(168); // 7 days
  const [selectedPermissions, setSelectedPermissions] = useState(
    AVAILABLE_PERMISSIONS.map((p) => p.id)
  );
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccessData, setInviteSuccessData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Action status feedback
  const [actionMessage, setActionMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Authoritative CA Activity Ledger synchronization
  const [activityList, setActivityList] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // CA Audit Discrepancies & Merchant Resolutions
  const [discrepanciesList, setDiscrepanciesList] = useState([]);
  const [loadingDiscrepancies, setLoadingDiscrepancies] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [submittingResolution, setSubmittingResolution] = useState(false);

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

    const handleSubUpdate = (e) => {
      if (e?.detail) {
        const tier = e.detail.planTier || e.detail.currentPlan || "Free";
        setSubscription({
          plan: tier,
          status: e.detail.status || "Active",
          isExpired: !!e.detail.isExpired,
          isUnlocked: String(tier).toUpperCase() === "PREMIUM" || String(tier).toUpperCase() === "ENTERPRISE",
        });
      }
    };
    window.addEventListener("bilzet:subscription_updated", handleSubUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("bilzet:subscription_updated", handleSubUpdate);
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
    user?.isOwner ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "OWNER" ||
    user?.isSuperAdmin ||
    (subscription.isUnlocked !== undefined
      ? subscription.isUnlocked
      : isPremiumOrEnterprise && isStatusValid);

  // Load Connected CAs
  const loadConnectedCas = useCallback(async () => {
    setLoadingCas(true);
    try {
      const res = await caInvitationApi.getConnected({ storeId: currentStore?.id });
      setConnectedCas(res?.connectedCas || []);
    } catch (err) {
      console.warn("Could not load connected CAs from API, trying legacy list:", err);
      try {
        const legacy = await caConnectApi.list();
        setConnectedCas(legacy?.accountants || []);
      } catch (_) {}
    } finally {
      setLoadingCas(false);
    }
  }, [currentStore?.id]);

  // Load CA Invitations
  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const res = await caInvitationApi.list({ storeId: currentStore?.id });
      setInvitations(res?.invitations || []);
    } catch (err) {
      console.warn("Could not load invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  }, [currentStore?.id]);

  // Load CA Sync Activity
  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await caConnectApi.getActivity({ limit: 100 });
      setActivityList(res?.activity || []);
    } catch (err) {
      console.error("Failed to load CA sync activity:", err);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  // Load Discrepancies
  const loadDiscrepancies = useCallback(async () => {
    setLoadingDiscrepancies(true);
    try {
      const res = await caConnectApi.getDiscrepancies();
      setDiscrepanciesList(res?.discrepancies || []);
    } catch (err) {
      console.error("Failed to load discrepancies:", err);
    } finally {
      setLoadingDiscrepancies(false);
    }
  }, []);

  // Instant Upgrade to Premium Handler
  const handleInstantUpgrade = async () => {
    if (upgradingPlan) return;
    setUpgradingPlan(true);
    setUpgradeError("");
    try {
      const paymentRef = `PAY-${Date.now().toString().slice(-6)}`;
      const res = await subscriptionApi.verifyPayment({
        planTier: "PREMIUM",
        amount: 2999,
        billingCycle: "ANNUAL",
        paymentReference: paymentRef,
        paymentMethod: "UPI",
      });

      if (updateSubscription && res) {
        updateSubscription(res);
      }
      if (refreshUser) {
        refreshUser().catch(() => {});
      }

      setUpgradeSuccess(true);
      setSubscription({
        plan: "Premium",
        status: "Active",
        isExpired: false,
        isUnlocked: true,
      });

      setTimeout(() => {
        setUpgradingPlan(false);
        setUpgradeSuccess(false);
        setShowUpgradeModal(false);
        loadConnectedCas();
        loadInvitations();
      }, 1200);
    } catch (err) {
      setUpgradingPlan(false);
      setUpgradeError(err?.message || "Failed to activate Premium. Please try again.");
    }
  };

  // Initial load
  useEffect(() => {
    if (isUnlocked) {
      loadConnectedCas();
      loadInvitations();
    }
  }, [isUnlocked, loadConnectedCas, loadInvitations]);

  // Real-time synchronization for instant status updates
  useRealtimeSync({
    onEvent: (type) => {
      if (
        type === "CA_INVITATION_CREATED" ||
        type === "CA_INVITATION_ACCEPTED" ||
        type === "CA_INVITATION_REVOKED" ||
        type === "CA_ACCESS_REVOKED" ||
        type === "INVOICE_CREATED" ||
        type === "SALE_CREATED"
      ) {
        loadConnectedCas();
        loadInvitations();
        if (activeTab === "activity") loadActivity();
        if (activeTab === "discrepancies") loadDiscrepancies();
      }
    },
  });

  // Handle Send Invitation Submit
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Please enter a valid CA email address");
      return;
    }

    setSubmittingInvite(true);
    setInviteError("");
    setInviteSuccessData(null);

    try {
      const targetStoreId =
        currentStore?.id ||
        user?.businessId ||
        user?.business?.id ||
        (typeof localStorage !== "undefined" ? localStorage.getItem("bilzet_active_store_id") : null);

      const payload = {
        email: inviteEmail.trim().toLowerCase(),
        caName: inviteName.trim() || undefined,
        message: inviteMessage.trim() || undefined,
        expiryHours: Number(inviteExpiryHours) || 168,
        permissions: selectedPermissions,
        storeId: targetStoreId || undefined,
        businessId: targetStoreId || undefined,
      };

      const res = await caInvitationApi.invite(payload);
      setInviteSuccessData(res);
      setInviteEmail("");
      setInviteName("");
      setInviteMessage("");
      loadInvitations();
      loadConnectedCas();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to dispatch invitation";
      setInviteError(msg);
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (invitationId) => {
    setActionLoadingId(invitationId);
    setActionMessage(null);
    try {
      const res = await caInvitationApi.resend(invitationId);
      if (res?.emailSent) {
        setActionMessage({
          type: "success",
          text: `Fresh invitation email dispatched to ${res?.invitation?.email || res?.invitation?.invitedEmail || "CA"}. New token active.`,
        });
      } else {
        setActionMessage({
          type: "warning",
          text: res?.warning || "Invitation refreshed with active token, but automatic email delivery was not sent (SMTP not configured).",
        });
      }
      loadInvitations();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to resend invitation",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Revoke Invitation
  const handleRevokeInvite = async (invitationId) => {
    if (!window.confirm("Are you sure you want to revoke this pending invitation? The invite link will become invalid immediately.")) {
      return;
    }
    setActionLoadingId(invitationId);
    setActionMessage(null);
    try {
      await caInvitationApi.revoke(invitationId);
      setActionMessage({
        type: "success",
        text: "Invitation revoked successfully. Token invalidated.",
      });
      loadInvitations();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to revoke invitation",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Disconnect CA
  const handleDisconnectCa = async (caUserId, caName) => {
    if (!caUserId) {
      setActionMessage({
        type: "error",
        text: "Cannot disconnect CA: Missing user ID reference.",
      });
      return;
    }
    if (!window.confirm(`Are you sure you want to disconnect ${caName || "this Chartered Accountant"}? They will lose access to your financial records immediately.`)) {
      return;
    }
    setActionLoadingId(caUserId);
    setActionMessage(null);
    try {
      await caInvitationApi.disconnect(caUserId, { storeId: currentStore?.id });
      setActionMessage({
        type: "success",
        text: `Successfully disconnected ${caName || "CA"}. Access has been revoked.`,
      });
      loadConnectedCas();
      loadInvitations();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to disconnect CA",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Copy Link to clipboard
  const handleCopyLink = (link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Toggle permission selection
  const togglePermission = (permId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // Handle Resolve Discrepancy
  const handleResolveDiscrepancy = async (id) => {
    if (!resolutionNote.trim()) return;
    setSubmittingResolution(true);
    try {
      await caConnectApi.resolveDiscrepancy(id, { correctionResponse: resolutionNote.trim() });
      setResolvingId(null);
      setResolutionNote("");
      loadDiscrepancies();
    } catch (err) {
      alert("Failed to submit resolution note: " + (err.message || "Unknown error"));
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Business context
  const businessName = currentStore?.name || currentStore?.storeName || user?.business?.name || "Bilzet Store";
  const businessGstin = currentStore?.gstin || user?.business?.gstin || "GSTIN Not Specified";

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
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-indigo-600" />

          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Lock size={30} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-3">
            <Sparkles size={13} className="text-amber-600" />
            <span>Premium Feature</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2.5">
            {isExpired
              ? "Your Premium Subscription Has Expired"
              : isPro
              ? "Upgrade to Premium to access CA Connect."
              : "CA Connect is available exclusively with the Premium plan."}
          </h2>

          <p className="text-sm text-slate-500 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
            {isExpired
              ? "Your access to the CA Connect portal is locked because your Premium subscription has expired. Renew your plan to re-enable secure tax audit and ledger access for your accountant."
              : isPro
              ? "Upgrade to Premium to access CA Connect. Invite your Chartered Accountant or tax consultant with dedicated read-only access for GSTR-1, GSTR-3B, HSN reconciliation, and audit ledgers."
              : "CA Connect is available exclusively with the Premium plan. Invite your Chartered Accountant or tax consultant with dedicated read-only access for GSTR-1, GSTR-3B, HSN reconciliation, and audit ledgers."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto mb-9 text-left">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900">Zero Credential Sharing</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Accountants receive verified email invitations with cryptographic single-use tokens.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900">Granular Permissions</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Choose exactly what records your CA can access, from GST reports to bank reconciliations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900">Instant Revocation</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Revoke pending invitations or disconnect an active CA at any second with complete audit safety.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => setShowUpgradeModal(true)}
              variant="primary"
              icon={Sparkles}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold shadow-md shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600"
            >
              Upgrade to Premium
            </Button>
            <Button
              onClick={() => navigate("/plans?tier=PREMIUM&redirect=/ca-connect")}
              variant="neutral"
              icon={ArrowRight}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium"
            >
              Compare All Plans
            </Button>
          </div>
        </div>

        {/* INLINE INSTANT UPGRADE MODAL */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900 text-sm">Upgrade to Premium Plan</h3>
                </div>
                <CompactIconButton
                  icon={X}
                  variant="neutral"
                  onClick={() => setShowUpgradeModal(false)}
                  title="Close"
                />
              </div>

              <div className="py-4 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Premium Enterprise</p>
                    <p className="text-[11px] text-slate-600">365 Days Full Access &middot; Unlimited Bills</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-900">₹2,999.00</p>
                    <span className="text-[10px] text-emerald-600 font-bold">18% GST Included</span>
                  </div>
                </div>

                <div className="space-y-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Instant access to CA Connect collaboration portal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Granular CA workpaper permissions (GSTR-1, 3B, Audit)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Unlimited team sub-users &amp; custom roles studio</span>
                  </div>
                </div>

                {upgradeSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Premium Activated! Unlocking CA Connect...</span>
                  </div>
                )}

                {upgradeError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium text-xs flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0 text-red-600" />
                    <span>{upgradeError}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="neutral"
                  disabled={upgradingPlan}
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  icon={ArrowRight}
                  disabled={upgradingPlan}
                  loading={upgradingPlan}
                  onClick={handleInstantUpgrade}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-amber-600"
                >
                  {upgradeSuccess ? "Plan Activated!" : "Pay ₹2,999 & Activate"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // 2. UNLOCKED UI (PREMIUM SUBSCRIBERS)
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0 shadow-2xs">
            <Briefcase size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">CA Connect Workspace</h1>
              <span className="badge badge-info uppercase tracking-wider text-[10px]">Compliance &amp; Audit</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles size={11} className="text-amber-500" /> Premium Active
              </span>
            </div>
            <p className="page-desc">
              Invite your Chartered Accountant via verified email with cryptographically secured, single-use token access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => {
              setShowInviteModal(true);
              setInviteSuccessData(null);
              setInviteError("");
            }}
            className="shadow-sm font-bold"
          >
            Invite Chartered Accountant
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          FEEDBACK ALERTS
      ══════════════════════════════════════════════════ */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium transition ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert size={16} className="text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          CA CONNECT AUDIT SUITE WORKSPACE BANNER
      ══════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
              <ShieldCheck size={14} /> Chartered Accountant Workspace
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Direct Auditor Collaboration &amp; Client Access
            </h2>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              Active Store: <strong className="text-white">{businessName}</strong> • GSTIN: <strong className="text-white">{businessGstin}</strong>.
              Connected CAs receive instant, authorized access to audit ledgers, GSTR filing packs, and discrepancy workflows.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={ArrowRight}
            onClick={() => navigate("/ca-portal/dashboard")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shrink-0"
          >
            Preview CA Workspace
          </Button>
        </div>

        {/* Pillar links */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          {[
            { label: "CA Dashboard", path: "/ca-portal/dashboard" },
            { label: "Client Portfolio", path: "/ca-portal/clients" },
            { label: "Audit Pipeline", path: "/ca-portal/pipeline" },
            { label: "Sales & Tax Audit", path: "/ca-portal/sales" },
            { label: "Bank Reconciliation", path: "/ca-portal/reconciliation" },
            { label: "Audit Workpapers", path: "/ca-portal/reports" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-semibold text-center border border-white/10 transition"
            >
              {item.label} →
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABS SWITCHER
      ══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab("invitations")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "invitations"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <UserCheck size={16} /> Connected CAs &amp; Invitations ({connectedCas.length + invitations.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("activity");
              loadActivity();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "activity"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Activity size={16} /> Real-Time CA Activity Ledger ({activityList.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("discrepancies");
              loadDiscrepancies();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "discrepancies"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Flag size={16} /> CA Correction Requests ({discrepanciesList.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "invitations" && (
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              loading={loadingCas || loadingInvitations}
              onClick={() => {
                loadConnectedCas();
                loadInvitations();
              }}
            >
              Refresh
            </Button>
          )}
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
          {activeTab === "discrepancies" && (
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              loading={loadingDiscrepancies}
              onClick={loadDiscrepancies}
            >
              Refresh Corrections
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1: INVITATIONS & CONNECTED CAs
      ══════════════════════════════════════════════════ */}
      {activeTab === "invitations" && (
        <div className="space-y-6">
          {/* 1. CONNECTED CHARTERED ACCOUNTANTS */}
          <div className="card p-6 border border-slate-200/80 shadow-xs bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck size={18} className="text-emerald-600" />
                  Connected Chartered Accountants ({connectedCas.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Professionals with authorized, real-time access to your store's sales, purchases, and GST returns.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {connectedCas.length} Active Connection{connectedCas.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loadingCas ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading connected accountants...</div>
            ) : connectedCas.length === 0 ? (
              <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Briefcase size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Chartered Accountant Connected Yet</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Click the "Invite Chartered Accountant" button above to send a secure, single-use invitation link to your tax auditor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectedCas.map((ca) => {
                  const caUser = ca.caUser || {};
                  const perms = Array.isArray(ca.permissions) ? ca.permissions : [];
                  const isDisconnecting = actionLoadingId === (caUser.id || ca.caUserId);

                  return (
                    <div
                      key={ca.id}
                      className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 hover:bg-slate-50 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 grid place-items-center font-black text-sm shrink-0">
                            {(caUser.name || "CA").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-slate-900">{caUser.name || "Chartered Accountant"}</h3>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                              <Mail size={11} className="text-slate-400" /> {caUser.email || ca.email}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="xs"
                          variant="danger"
                          icon={Trash2}
                          loading={isDisconnecting}
                          disabled={isDisconnecting}
                          onClick={() => handleDisconnectCa(caUser.id || ca.caUserId, caUser.name)}
                          title="Revoke access and disconnect this CA"
                        >
                          Disconnect
                        </Button>
                      </div>

                      {/* Connection details */}
                      <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <div>
                          <span className="font-semibold block text-slate-700">Connected Since</span>
                          {new Date(ca.connectedAt || ca.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div>
                          <span className="font-semibold block text-slate-700">Client Scope</span>
                          {ca.store?.name || businessName}
                        </div>
                      </div>

                      {/* Permissions badges */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                          Permitted Modules ({perms.length || "All"}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {perms.length === 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-semibold">
                              Full CA Audit Access
                            </span>
                          ) : (
                            perms.map((p) => (
                              <span
                                key={p}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium capitalize"
                              >
                                {p}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. CA INVITATION MANAGEMENT TABLE */}
          <div className="card p-0 overflow-hidden border border-slate-200/80 shadow-xs bg-white">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  Invitation Lifecycle &amp; Security Auditing
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track cryptographic single-use invitation tokens, delivery status, and verification history.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {invitations.length} Total Invitation{invitations.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">CA Recipient</th>
                    <th className="py-3 px-4">Business / GSTIN</th>
                    <th className="py-3 px-4">Token Status</th>
                    <th className="py-3 px-4">Delivery</th>
                    <th className="py-3 px-4">Invited Date</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingInvitations ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading invitation records...
                      </td>
                    </tr>
                  ) : invitations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No invitations sent yet. Click "Invite Chartered Accountant" to invite your auditor.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => {
                      const isPending = inv.status === "PENDING";
                      const isAccepted = inv.status === "ACCEPTED";
                      const isExpired = inv.status === "EXPIRED" || new Date(inv.expiresAt) < new Date();
                      const isRevoked = inv.status === "REVOKED";
                      const isDeclined = inv.status === "DECLINED";
                      const isOperating = actionLoadingId === inv.id;

                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={11} /> Invitation Pending
                        </span>
                      );

                      if (isAccepted) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} /> Accepted
                          </span>
                        );
                      } else if (isRevoked) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <X size={11} /> Revoked
                          </span>
                        );
                      } else if (isDeclined) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            Declined
                          </span>
                        );
                      } else if (isExpired) {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Expired
                          </span>
                        );
                      }

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{inv.caName || "Chartered Accountant"}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Mail size={11} className="text-slate-400" /> {inv.invitedEmail}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{inv.business?.name || businessName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{inv.business?.gstin || businessGstin}</div>
                          </td>

                          <td className="py-3 px-4">{statusBadge}</td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                inv.deliveryStatus === "SENT"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : inv.deliveryStatus === "FAILED"
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {inv.deliveryStatus || "SENT"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600 text-[11px] font-mono">
                            {new Date(inv.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3 px-4 text-slate-600 text-[11px] font-mono">
                            {new Date(inv.expiresAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && !isExpired && (
                                <>
                                  <Button
                                    size="xs"
                                    variant="secondary"
                                    icon={Send}
                                    loading={isOperating}
                                    disabled={isOperating}
                                    onClick={() => handleResendInvite(inv.id)}
                                    title="Resend invitation email with refreshed expiry"
                                  >
                                    Resend
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="danger"
                                    icon={X}
                                    loading={isOperating}
                                    disabled={isOperating}
                                    onClick={() => handleRevokeInvite(inv.id)}
                                    title="Revoke invitation"
                                  >
                                    Revoke
                                  </Button>
                                </>
                              )}

                              {isExpired && !isAccepted && !isRevoked && (
                                <Button
                                  size="xs"
                                  variant="secondary"
                                  icon={Send}
                                  loading={isOperating}
                                  disabled={isOperating}
                                  onClick={() => handleResendInvite(inv.id)}
                                  title="Renew and resend expired invitation"
                                >
                                  Re-invite
                                </Button>
                              )}

                              {isAccepted && (
                                <span className="text-[10px] text-emerald-600 font-bold px-2 py-1">
                                  Active in CA Workspace
                                </span>
                              )}
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2: REAL-TIME CA ACTIVITY LEDGER
      ══════════════════════════════════════════════════ */}
      {activeTab === "activity" && (
        <div className="card p-0 overflow-hidden border border-slate-200/80 shadow-xs bg-white">
          <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <History size={16} className="text-indigo-600" />
                Authoritative CA Synchronized Activity Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every bill movement, partial payment, product return, credit note, and GST adjustment is permanently logged and visible to your authorized CA.
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
                            {d.invoiceNumber || (log.entityType === "SALE" && log.entityId ? `#${String(log.entityId).slice(0, 8)}` : "—")}
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

      {/* ══════════════════════════════════════════════════
          TAB 3: CA AUDIT DISCREPANCIES
      ══════════════════════════════════════════════════ */}
      {activeTab === "discrepancies" && (
        <div className="card p-0 overflow-hidden border border-slate-200/80 shadow-xs bg-white">
          <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Flag size={16} className="text-rose-600" />
                Chartered Accountant Correction Requests &amp; Discrepancies
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review issues flagged by your auditor (missing bills, tax rate mismatches, over-returns) and submit clarification notes or corrections.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              {discrepanciesList.filter((d) => d.status === "CORRECTION_REQUESTED").length} Action Required
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {loadingDiscrepancies ? (
              <div className="p-12 text-center text-slate-400">Loading auditor discrepancies...</div>
            ) : discrepanciesList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No discrepancies flagged by your auditor. All reconciled!
              </div>
            ) : (
              discrepanciesList.map((d) => (
                <div key={d.id} className="p-5 hover:bg-slate-50/50 transition space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{d.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : d.status === "RESOLVED"
                              ? "bg-teal-50 text-teal-700 border border-teal-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {d.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {d.discrepancyType}
                        </span>
                        {d.referenceNumber && (
                          <span className="font-mono text-xs text-blue-600 font-bold">Ref: {d.referenceNumber}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{d.description}</p>
                    </div>

                    {d.status === "CORRECTION_REQUESTED" && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={MessageSquare}
                        onClick={() => {
                          setResolvingId(d.id);
                          setResolutionNote("");
                        }}
                      >
                        Respond / Resolve
                      </Button>
                    )}
                  </div>

                  {d.correctionResponse && (
                    <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-900 space-y-1">
                      <span className="font-bold block text-[10px] uppercase text-teal-700">Your Submitted Resolution / Explanation:</span>
                      <p>{d.correctionResponse}</p>
                    </div>
                  )}

                  {resolvingId === d.id && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 mt-2">
                      <label className="font-bold text-xs text-slate-800 block">
                        Clarification / Correction Notes for CA:
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="e.g. Attached corrected purchase voucher #PV-102. Credit note reconciled with GST portal."
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setResolvingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          loading={submittingResolution}
                          onClick={() => handleResolveDiscrepancy(d.id)}
                        >
                          Submit Resolution Note
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          INVITE CHARTERED ACCOUNTANT MODAL
      ══════════════════════════════════════════════════ */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Invite Chartered Accountant</h3>
                  <p className="text-xs text-slate-300">
                    Connect your auditor via email with secure, single-use workspace authorization.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Success Result View */}
              {inviteSuccessData ? (
                (() => {
                  const targetEmail = inviteSuccessData.invitation?.email || inviteSuccessData.invitation?.invitedEmail || "";
                  const caName = inviteSuccessData.invitation?.name || "Chartered Accountant";
                  const inviteUrl = inviteSuccessData.inviteLink || "";
                  const isDelivered = Boolean(inviteSuccessData.emailSent || inviteSuccessData.invitation?.deliveryStatus === "DELIVERED");
                  const mailSubject = encodeURIComponent("BILZET CA Connect — Workspace Invitation");
                  const mailBody = encodeURIComponent(
                    `Hello ${caName},\n\nYou have been invited to access the CA Connect workspace on BILZET to review invoices, audit sales/purchases, and reconcile GST.\n\nPlease click the link below to accept the invitation and connect:\n${inviteUrl}\n\nThis secure invitation link is active for 7 days.\n\nRegards,\nBILZET Business Team`
                  );
                  const mailtoHref = `mailto:${targetEmail}?subject=${mailSubject}&body=${mailBody}`;
                  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Hello ${caName}, here is your secure link to connect to our BILZET CA Connect workspace: ${inviteUrl}`
                  )}`;

                  return (
                    <div className="space-y-5 animate-fade-in">
                      {isDelivered ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                            <h4 className="font-bold text-sm">Invitation Dispatched Successfully!</h4>
                          </div>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            A verified invitation has been generated and dispatched for{" "}
                            <strong>{targetEmail}</strong>.
                            The secure access token is cryptographically protected and valid for{" "}
                            {Math.max(1, Math.round(
                              (new Date(inviteSuccessData.invitation?.expiresAt || Date.now() + 7 * 86400000) - new Date()) / (1000 * 60 * 60 * 24)
                            ))}{" "}
                            days.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-blue-600 shrink-0" />
                            <h4 className="font-bold text-sm">Invitation Created with Secure Token</h4>
                          </div>
                          <p className="text-xs text-blue-800 leading-relaxed">
                            The invitation has been successfully created for <strong>{targetEmail}</strong>.
                            You can share the secure single-use access link directly via Email, WhatsApp, or by copying the link below.
                          </p>
                        </div>
                      )}

                      {/* Copy Link Section */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <label className="text-xs font-bold text-slate-700 block">
                          Direct Single-Use Invitation Link:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={inviteUrl}
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-700 outline-none select-all"
                          />
                          <Button
                            size="sm"
                            variant={copiedLink ? "secondary" : "primary"}
                            icon={copiedLink ? Check : Copy}
                            onClick={() => handleCopyLink(inviteUrl)}
                            className="shrink-0"
                          >
                            {copiedLink ? "Copied!" : "Copy"}
                          </Button>
                        </div>

                        {/* Direct Share Options */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <a
                            href={mailtoHref}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <Mail size={13} className="text-blue-600" />
                            Open in Email App
                          </a>
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition"
                          >
                            <MessageSquare size={13} className="text-emerald-600" />
                            Share on WhatsApp
                          </a>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Recipients can immediately accept and synchronize with your store records with authorized read/audit privileges.
                        </p>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="primary"
                          onClick={() => {
                            setShowInviteModal(false);
                            setInviteSuccessData(null);
                          }}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Form View */
                <form onSubmit={handleSendInvite} className="space-y-4">
                  {inviteError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                      <ShieldAlert size={16} className="text-red-500 shrink-0" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  {/* Business Context (Auto-populated & displayed) */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Client / Business Name
                      </span>
                      <span className="font-bold text-slate-900 mt-0.5 block flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-500" />
                        {businessName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Business GSTIN
                      </span>
                      <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                        {businessGstin}
                      </span>
                    </div>
                  </div>

                  {/* CA Email & Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CA Official Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="auditor@cafirm.in"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CA / Firm Name <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh &amp; Associates, CA"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium"
                      />
                    </div>
                  </div>

                  {/* Custom Message & Expiry */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Invitation Note <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Please audit Q3 sales and GSTR-1 filings."
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Link Expiry Window
                      </label>
                      <select
                        value={inviteExpiryHours}
                        onChange={(e) => setInviteExpiryHours(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium bg-white"
                      >
                        <option value={24}>24 Hours (1 Day)</option>
                        <option value={72}>72 Hours (3 Days)</option>
                        <option value={168}>7 Days (Recommended)</option>
                        <option value={336}>14 Days (2 Weeks)</option>
                        <option value={720}>30 Days (1 Month)</option>
                      </select>
                    </div>
                  </div>

                  {/* Granular Permissions Config */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Configure Module Permissions
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedPermissions(AVAILABLE_PERMISSIONS.map((p) => p.id))}
                          className="text-indigo-600 font-bold hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPermissions(["sales", "tax"])}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          Read-Only Tax Only
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                      {AVAILABLE_PERMISSIONS.map((p) => {
                        const isChecked = selectedPermissions.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePermission(p.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 select-none ${
                              isChecked
                                ? "bg-white border-indigo-200 shadow-2xs"
                                : "bg-transparent border-transparent hover:bg-slate-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{p.label}</span>
                              <span className="text-[10px] text-slate-500 leading-tight block">{p.desc}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Security Highlights */}
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
                    <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Security Guarantee:</strong> The CA receives a cryptographically hashed, single-use token.
                      Access is only granted when the CA accepts from an account matching the invited email. You can revoke access at any time.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowInviteModal(false)}
                      disabled={submittingInvite}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      icon={Send}
                      loading={submittingInvite}
                      disabled={submittingInvite}
                      className="px-6 font-bold"
                    >
                      Dispatch Invitation
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
