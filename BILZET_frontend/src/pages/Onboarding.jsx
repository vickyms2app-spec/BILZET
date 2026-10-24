import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Store,
  Users,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Check,
  X,
  ArrowRight,
  Copy,
  Inbox,
  ExternalLink,
  Receipt,
  Package,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { roleInvitationApi, storesApi } from "../api";
import { useStore } from "../store/storeContext";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import Logo from "../components/common/Logo";
import NotificationBell from "../components/common/NotificationBell";

export default function Onboarding() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const { switchStore } = useStore();

  const [invitations, setInvitations] = useState([]);
  const [authorizedStores, setAuthorizedStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showInvitationsSection, setShowInvitationsSection] = useState(false);

  const invitationsRef = useRef(null);

  // If user already has an active business role (not NONE/UNASSIGNED) and is assigned to a store, forward them automatically
  useEffect(() => {
    if (
      user &&
      user.role &&
      user.role !== "NONE" &&
      user.role !== "UNASSIGNED" &&
      (user.businessId || user.isOwner || user.isSuperAdmin)
    ) {
      navigate(getWorkspaceRedirectPath(user), { replace: true });
    }
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, storeRes] = await Promise.allSettled([
        roleInvitationApi.getMyInvitations(),
        storesApi.list(),
      ]);

      if (invRes.status === "fulfilled") {
        const list = invRes.value?.data?.invitations || invRes.value?.invitations || [];
        setInvitations(list);
        if (list.length > 0) {
          setShowInvitationsSection(true);
        }
      }
      if (storeRes.status === "fulfilled") {
        const stores = storeRes.value?.stores || [];
        setAuthorizedStores(stores);
      }
    } catch (err) {
      console.warn("Failed to fetch onboarding data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const onFocus = () => fetchData();
    const onRefresh = () => fetchData();
    const onRealtime = (e) => {
      const type = e?.detail?.type;
      if (
        type === "INVITATION_CREATED" ||
        type === "CA_INVITATION_CREATED" ||
        type === "NOTIFICATION_RECEIVED" ||
        type === "ROLE_ASSIGNED" ||
        type === "CA_INVITATION_ACCEPTED"
      ) {
        fetchData();
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("bilzet:refresh-notifications", onRefresh);
    window.addEventListener("bilzet:realtime", onRealtime);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("bilzet:refresh-notifications", onRefresh);
      window.removeEventListener("bilzet:realtime", onRealtime);
    };
  }, [fetchData]);

  const handleCopyEmail = async () => {
    if (user?.email) {
      try {
        await navigator.clipboard.writeText(user.email);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } catch (_) {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
    }
  };

  const handleViewInvitations = () => {
    setShowInvitationsSection(true);
    setTimeout(() => {
      invitationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleAccept = async (invite) => {
    setActionLoadingId(invite.id);
    setStatusMessage(null);
    try {
      await roleInvitationApi.accept({
        token: invite.token || invite.id,
      });

      setStatusMessage({
        type: "success",
        text: `Invitation accepted! Role ${invite.role} assigned for ${invite.business?.name || "the business"}. Opening workspace…`,
      });

      if (refreshUser) {
        await refreshUser();
      }

      window.dispatchEvent(
        new CustomEvent("bilzet:store-changed", { detail: { businessId: invite.businessId } })
      );

      setTimeout(() => {
        const targetPath = getWorkspaceRedirectPath({
          role: invite.role,
          businessId: invite.businessId,
        });
        navigate(targetPath, { replace: true });
      }, 800);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to accept invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (invite) => {
    if (!window.confirm(`Decline the invitation to join ${invite.business?.name || "this business"}?`)) {
      return;
    }
    setActionLoadingId(invite.id);
    setStatusMessage(null);
    try {
      await roleInvitationApi.decline({
        token: invite.token || invite.id,
      });
      setStatusMessage({
        type: "info",
        text: "Invitation declined.",
      });
      await fetchData();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to decline invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSwitchStore = async (store) => {
    try {
      await switchStore(store.id);
      if (refreshUser) await refreshUser();
      const updatedUser = useAuth.getState().user;
      navigate(getWorkspaceRedirectPath(updatedUser || { businessId: store.id }), { replace: true });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: "Failed to switch to store: " + (err.message || "Unknown error"),
      });
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined" && window.Clerk?.signOut) {
        await window.Clerk.signOut();
      }
    } catch (_) {}
    if (logout) await logout();
    navigate("/sign-in");
  };

  // User display metadata
  const displayName = user?.name || user?.fullName || "Account User";
  const userInitials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "BZ";

  const isVerified = Boolean(
    user?.emailVerified ||
      user?.isEmailVerified ||
      user?.email ||
      (typeof window !== "undefined" && window.Clerk?.user?.primaryEmailAddress?.verification?.status === "verified")
  );

  return (
    <div
      className="min-h-screen bg-[#F7F8FA] text-[#172033] flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
    >
      {/* 1. Header (Clean White Navigation Bar) */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Left: BILZET Logo */}
          <div className="flex items-center">
            <Logo theme="light" size="sm" />
          </div>

          {/* Right: Notification, Profile, Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell theme="light" />

            {/* Profile Snippet */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
              <div
                className="w-7 h-7 rounded-full bg-slate-100 border border-[#E2E8F0] text-slate-700 text-xs font-medium flex items-center justify-center shrink-0 select-none"
                aria-hidden="true"
              >
                {userInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-[#172033] leading-tight">
                  {displayName}
                </span>
                <span className="text-[11px] text-[#64748B] leading-tight font-mono truncate max-w-[170px]" title={user?.email}>
                  {user?.email || "verified@bilzet.com"}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E2E8F0] hover:bg-slate-50 text-xs font-medium text-[#172033] transition cursor-pointer"
              title="Sign out of your account"
            >
              <LogOut size={13} className="text-[#64748B]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col justify-center">
        {/* Status Message Feedback */}
        {statusMessage && (
          <div
            className={`mb-6 p-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2.5 border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-slate-100 text-[#172033] border-[#E2E8F0]"
            }`}
            role="status"
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-[#059669] shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Authorized Workspaces (If returning user possesses active store memberships) */}
        {authorizedStores.length > 0 && (
          <section className="mb-8 bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-[#2563EB]" />
                <h2 className="text-sm font-semibold text-[#172033]">Your Authorized Workspaces</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-[#E2E8F0]">
                {authorizedStores.length} {authorizedStores.length === 1 ? "store" : "stores"}
              </span>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {authorizedStores.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 rounded-lg border border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50/50 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#172033] truncate">
                      {st.name}
                    </h3>
                    <p className="text-xs text-[#64748B] truncate mt-0.5">{st.address || "Main Branch"}</p>
                    {st.isOwner && (
                      <span className="inline-block mt-1 text-[10px] font-medium text-[#059669] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Owner / Admin
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchStore(st)}
                    className="px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Open</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. Welcome Section (Purposeful, Centered, Clean) */}
        <section className="text-center mb-8 sm:mb-10">
          {isVerified && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#059669] text-xs font-medium mb-3">
              <CheckCircle2 size={12} className="text-[#059669]" />
              <span>Verified Account</span>
            </div>
          )}

          <h1 className="text-3xl sm:text-[32px] font-semibold text-[#172033] tracking-tight">
            Welcome to BILZET
          </h1>
          <p className="text-[15px] text-[#64748B] mt-2 max-w-md mx-auto">
            Your account is ready. Review invitations to join a business team, or switch accounts.
          </p>
        </section>

        {/* 4. Join a Team Card (Centered, Clean 1px Neutral Border, Balanced Padding) */}
        <section className="max-w-xl mx-auto w-full">
          {/* Card — Join a Team */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 sm:p-7 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              {/* Team Icon */}
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-slate-50 text-[#172033] border border-[#E2E8F0] flex items-center justify-center">
                  <Users size={18} />
                </div>
                {invitations.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {invitations.length} invite{invitations.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-semibold text-[#172033] mt-4">
                Join a Team
              </h2>
              <p className="text-[14px] text-[#64748B] mt-1.5 leading-relaxed min-h-[42px]">
                Join a business that has invited you to work as a staff member, manager, cashier, or another authorized role.
              </p>

              {/* Three Compact Benefits */}
              <ul className="mt-5 space-y-2.5 pt-4 border-t border-[#E2E8F0] text-[13px] text-[#172033]">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#64748B] shrink-0" />
                  <span>Use your verified account email.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#64748B] shrink-0" />
                  <span>Review invitations from your business administrator.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#64748B] shrink-0" />
                  <span>Access your workspace after authorization.</span>
                </li>
              </ul>

              {/* Understated Email Row with Copy Email Action */}
              <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Mail size={13} className="text-[#64748B] shrink-0" />
                  <span className="font-mono text-[12px] text-[#172033] truncate" title={user?.email}>
                    {user?.email || "verified@bilzet.com"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-2 py-1 rounded text-[11px] font-medium text-[#172033] hover:bg-white transition inline-flex items-center gap-1 cursor-pointer shrink-0 border border-transparent hover:border-[#E2E8F0]"
                  title="Copy email to clipboard"
                  aria-label="Copy verified account email"
                >
                  {copiedEmail ? (
                    <>
                      <Check size={12} className="text-[#059669]" />
                      <span className="text-[#059669] font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="mt-7 pt-4">
              <button
                type="button"
                onClick={handleViewInvitations}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#172033] hover:bg-slate-800 text-white text-[14px] font-medium transition cursor-pointer"
              >
                <span>View Team Invitations</span>
                {invitations.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[11px] font-semibold bg-white/20 text-white">
                    {invitations.length}
                  </span>
                )}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* 5. Compact Capabilities Row */}
        <section className="mt-8 pt-6 border-t border-[#E2E8F0]" aria-label="Platform capabilities">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="flex items-start gap-2.5">
              <Receipt size={16} className="text-[#2563EB] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[13px] font-semibold text-[#172033]">Smart Billing</h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">Invoices, quotations and payments.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Package size={16} className="text-[#64748B] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[13px] font-semibold text-[#172033]">Inventory Control</h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">Product and stock management.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <BarChart3 size={16} className="text-[#64748B] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-[13px] font-semibold text-[#172033]">Business Insights</h3>
                <p className="text-[12px] text-[#64748B] mt-0.5">Sales and expense reports.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Team Invitations Workflow Section (Appears when toggled or when invitations exist) */}
        {showInvitationsSection && (
          <section
            ref={invitationsRef}
            className="mt-8 bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 shadow-xs transition-all"
            aria-labelledby="invitations-heading"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-[#2563EB]" />
                <div>
                  <h2 id="invitations-heading" className="text-sm font-semibold text-[#172033]">
                    Team Invitations
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Invitations sent to your verified email address ({user?.email})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#172033] transition cursor-pointer"
                title="Check for new invitations"
              >
                <RefreshCw size={12} className={loading ? "animate-spin text-[#2563EB]" : "text-[#64748B]"} />
                <span>{loading ? "Checking…" : "Refresh"}</span>
              </button>
            </div>

            {/* Content: List or Clean Empty State */}
            {invitations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-lg border border-[#E2E8F0] bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Store size={15} className="text-slate-600 shrink-0" />
                        <h3 className="text-sm font-semibold text-[#172033]">
                          {inv.business?.name || "Business Store"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          Role: {inv.role}
                        </span>
                        {inv.department && (
                          <span className="text-xs text-[#64748B]">• {inv.department}</span>
                        )}
                        {inv.designation && (
                          <span className="text-xs text-[#64748B]">({inv.designation})</span>
                        )}
                      </div>
                      {inv.message && (
                        <p className="text-xs text-[#64748B] mt-1.5 italic bg-white p-2 rounded border border-[#E2E8F0]">
                          &quot;{inv.message}&quot;
                        </p>
                      )}
                      <p className="text-[11px] text-[#64748B] mt-1.5">
                        Invited by {inv.inviter?.name || inv.inviter?.email || "Store Owner"} on{" "}
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAccept(inv)}
                        disabled={actionLoadingId === inv.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#059669] hover:bg-emerald-700 text-white text-xs font-medium transition disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoadingId === inv.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        <span>Accept Invitation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(inv)}
                        disabled={actionLoadingId === inv.id}
                        className="px-2.5 py-1.5 rounded-md bg-white hover:bg-rose-50 hover:text-rose-600 text-[#64748B] text-xs font-medium transition border border-[#E2E8F0] disabled:opacity-50 cursor-pointer"
                        title="Decline invitation"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 py-6 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-[#64748B] flex items-center justify-center mx-auto mb-2.5">
                  <Inbox size={18} />
                </div>
                <h3 className="text-sm font-semibold text-[#172033]">No Pending Invitations</h3>
                <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto leading-relaxed">
                  No active invitations were found for <span className="font-mono text-[#172033]">{user?.email}</span>.
                  Ask your store administrator to invite your verified email address.
                </p>
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={fetchData}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 text-xs font-medium text-[#172033] transition cursor-pointer"
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin text-[#2563EB]" : "text-[#64748B]"} />
                    <span>Check Again</span>
                  </button>
                  <Link
                    to="/join-team"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-medium text-[#172033] transition"
                  >
                    <span>Have an invitation token?</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* 6. Restrained Footer */}
      <footer className="py-4 border-t border-[#E2E8F0] bg-white text-[12px] text-[#64748B]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span>Need assistance setting up your workspace? </span>
            <a
              href="mailto:support@bilzet.com"
              className="text-[#2563EB] hover:underline font-medium"
            >
              Contact BILZET Support
            </a>
          </div>
          <div className="text-[11px] text-slate-400">
            BILZET Multi-Tenant Cloud ERP • Role-Aware Authorization
          </div>
        </div>
      </footer>
    </div>
  );
}
