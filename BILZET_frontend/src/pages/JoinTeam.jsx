import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Store,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ArrowRight,
  Copy,
  Check,
  X,
  Users,
  KeyRound,
  Inbox,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { roleInvitationApi, caInvitationApi } from "../api";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import Logo from "../components/common/Logo";
import NotificationBell from "../components/common/NotificationBell";

export default function JoinTeam() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // If URL has ?token=... pre-populate token input
  const initialToken = searchParams.get("token") || "";
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenMessage, setTokenMessage] = useState(null);

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // If user already has an active business role and store, redirect automatically
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

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await roleInvitationApi.getMyInvitations();
      const list = res?.data?.invitations || res?.invitations || [];
      setInvitations(list);
    } catch (err) {
      console.warn("Failed to fetch pending invitations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 15000);
    const onFocus = () => fetchInvitations();
    const onRefresh = () => fetchInvitations();
    const onRealtime = (e) => {
      const type = e?.detail?.type;
      if (
        type === "INVITATION_CREATED" ||
        type === "CA_INVITATION_CREATED" ||
        type === "NOTIFICATION_RECEIVED" ||
        type === "ROLE_ASSIGNED" ||
        type === "CA_INVITATION_ACCEPTED"
      ) {
        fetchInvitations();
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
  }, [fetchInvitations]);

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

  // Accept an invitation from the list
  const handleAcceptInvite = async (invite) => {
    const inviteId = invite.id;
    setActionLoadingId(inviteId);
    setStatusMessage(null);
    try {
      const token = invite.token || invite.id;
      await roleInvitationApi.accept({ token });

      setStatusMessage({
        type: "success",
        text: `Invitation accepted! Joined ${invite.business?.name || "the business"} as ${invite.role}.`,
      });

      if (refreshUser) {
        await refreshUser();
      }

      const businessId = invite.businessId;
      if (businessId) {
        localStorage.setItem("bilzet_active_store_id", businessId);
        window.dispatchEvent(
          new CustomEvent("bilzet:store-changed", { detail: { businessId } })
        );
      }

      setTimeout(() => {
        const targetPath = getWorkspaceRedirectPath({
          role: invite.role,
          businessId,
        });
        navigate(targetPath, { replace: true });
      }, 900);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to accept invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Decline an invitation from the list
  const handleDeclineInvite = async (invite) => {
    if (!window.confirm(`Decline the invitation to join ${invite.business?.name || "this business"}?`)) {
      return;
    }
    setActionLoadingId(invite.id);
    setStatusMessage(null);
    try {
      const token = invite.token || invite.id;
      await roleInvitationApi.decline({ token });
      setStatusMessage({
        type: "info",
        text: "Invitation declined.",
      });
      await fetchInvitations();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Failed to decline invitation.",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Redeem manual token or link
  const handleRedeemToken = async (e) => {
    e.preventDefault();
    let raw = tokenInput.trim();
    if (!raw) {
      return setTokenMessage({ type: "error", text: "Please enter an invitation token or link." });
    }

    // Extract token if user pasted a full URL
    if (raw.includes("token=")) {
      try {
        const url = new URL(raw.startsWith("http") ? raw : `http://dummy.com/${raw}`);
        raw = url.searchParams.get("token") || raw;
      } catch (_) {}
    }

    setTokenLoading(true);
    setTokenMessage(null);
    try {
      let accepted = false;
      let targetRole = "STAFF";
      let businessId = null;

      try {
        const res = await roleInvitationApi.accept({ token: raw });
        accepted = true;
        targetRole = res?.data?.member?.role || res?.role || "STAFF";
        businessId = res?.storeId || res?.data?.member?.businessId;
      } catch (roleErr) {
        // If not role invitation, try CA invitation
        try {
          const caRes = await caInvitationApi.accept({ token: raw });
          accepted = true;
          targetRole = "CA";
          businessId = caRes?.storeId || caRes?.data?.businessId;
        } catch (_) {
          throw roleErr;
        }
      }

      if (accepted) {
        setTokenMessage({
          type: "success",
          text: "Invitation accepted successfully! Entering your workspace…",
        });

        if (refreshUser) await refreshUser();
        if (businessId) {
          localStorage.setItem("bilzet_active_store_id", businessId);
          window.dispatchEvent(
            new CustomEvent("bilzet:store-changed", { detail: { businessId } })
          );
        }

        setTimeout(() => {
          navigate(getWorkspaceRedirectPath({ role: targetRole, businessId }), { replace: true });
        }, 1000);
      }
    } catch (err) {
      setTokenMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Invalid or expired invitation token.",
      });
    } finally {
      setTokenLoading(false);
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
      className="min-h-screen bg-slate-50/80 text-[#172033] flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* Subtle Background Lighting for warmth & depth */}
      <div className="absolute inset-0 pointer-events-none -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[750px] h-[340px] bg-gradient-to-b from-blue-100/40 via-teal-50/20 to-transparent blur-3xl rounded-full" />
        <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* 1. Header (Clean White Navigation Bar) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Left: BILZET Logo */}
          <div className="flex items-center">
            <Logo theme="light" size="sm" />
          </div>

          {/* Right: Notifications, Profile, Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationBell theme="light" />

            {/* Profile Snippet */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div
                className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0 select-none shadow-2xs"
                aria-hidden="true"
              >
                {userInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#172033] leading-tight">
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#172033] transition cursor-pointer shadow-2xs active:scale-95"
              title="Sign out of your account"
            >
              <LogOut size={13} className="text-[#64748B]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container (Centered, ~840px max width) */}
      <main className="relative z-10 flex-1 max-w-[840px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs text-[#64748B] hover:text-[#172033] transition font-medium shadow-2xs"
          >
            <ChevronLeft size={14} className="text-slate-400" />
            <span>Back to Onboarding Selection</span>
          </Link>
        </div>

        {/* Status Message Feedback */}
        {statusMessage && (
          <div
            className={`mb-6 p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 border shadow-2xs ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-slate-100 text-[#172033] border-slate-200"
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

        {/* 3. Title Section */}
        <div className="mb-7">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 shrink-0">
              <Users size={20} />
            </div>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#172033] tracking-[-0.8px] leading-tight">
              Join Our Team
            </h1>
          </div>
          <p className="text-[14px] sm:text-[15px] text-[#64748B] mt-1 leading-[1.6]">
            Connect to an existing business workspace using an invitation from your store administrator.
          </p>
        </div>

        {/* 4. Verified Email Section (Lightly tinted, tasteful panel) */}
        <div className="bg-gradient-to-r from-blue-50/50 via-white to-white rounded-2xl border border-blue-200/80 p-5 sm:p-6 shadow-xs mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 mt-0.5">
                <Mail size={17} />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                  Your Verified Account Email
                </span>
                <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-sm font-mono font-bold text-slate-900 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{user?.email || "verified@bilzet.com"}</span>
                </div>
                <p className="text-[13px] text-[#64748B] mt-1.5">
                  Share this email with your store owner or manager so they can invite you.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200 transition shadow-2xs cursor-pointer shrink-0 self-start sm:self-center active:scale-95"
              aria-label="Copy verified account email"
            >
              {copiedEmail ? (
                <>
                  <Check size={13} className="text-[#059669]" />
                  <span className="text-[#059669]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 5. Invitation Link / Token Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <KeyRound size={15} />
            </div>
            <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#172033]">
              Have an invitation code or link?
            </h2>
          </div>
          <p className="text-[13px] text-[#64748B] mb-4 leading-normal">
            Paste the code or invitation link provided by your business owner to instantly join their workspace.
          </p>

          <form onSubmit={handleRedeemToken} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your invitation code or link"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-[14px] text-[#172033] placeholder-[#94A3B8] focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition font-mono"
              />
              <button
                type="submit"
                disabled={tokenLoading || !tokenInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-[14px] font-semibold transition shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
              >
                {tokenLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <ArrowRight size={14} />
                )}
                <span>{tokenLoading ? "Joining…" : "Join Store"}</span>
              </button>
            </div>

            {tokenMessage && (
              <p
                className={`text-[13px] font-medium ${
                  tokenMessage.type === "success" ? "text-[#059669]" : "text-rose-600"
                }`}
              >
                {tokenMessage.text}
              </p>
            )}
          </form>
        </div>

        {/* 6. Pending Invitations Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <Inbox size={15} />
              </div>
              <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#172033]">
                Pending Store Invitations
              </h2>
              {invitations.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#059669] border border-emerald-200">
                  {invitations.length} ready
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={fetchInvitations}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#172033] transition cursor-pointer shadow-2xs"
              title="Check for new invitations"
            >
              <RefreshCw size={12} className={loading ? "animate-spin text-blue-600" : "text-slate-500"} />
              <span>{loading ? "Checking…" : "Refresh"}</span>
            </button>
          </div>

          {/* Invitation Rows or Friendly Empty State */}
          {invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-blue-600 shrink-0" />
                      <h3 className="text-[15px] font-semibold text-[#172033]">
                        {inv.business?.name || "Business Store"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        Role: {inv.role}
                      </span>
                      {inv.department && (
                        <span className="text-[12px] text-[#64748B]">• {inv.department}</span>
                      )}
                      {inv.designation && (
                        <span className="text-[12px] text-[#64748B]">({inv.designation})</span>
                      )}
                    </div>
                    {inv.message && (
                      <p className="text-[12px] text-[#64748B] mt-1.5 italic bg-white p-2.5 rounded-lg border border-slate-200">
                        &quot;{inv.message}&quot;
                      </p>
                    )}
                    <p className="text-[11px] text-[#64748B] mt-1.5">
                      Invited by {inv.inviter?.name || inv.inviter?.email || "Store Owner"} on{" "}
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Accept & Decline Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAcceptInvite(inv)}
                      disabled={actionLoadingId === inv.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-sm shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoadingId === inv.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      <span>Accept Invitation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineInvite(inv)}
                      disabled={actionLoadingId === inv.id}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-[#64748B] text-xs font-medium transition border border-slate-200 disabled:opacity-50 cursor-pointer"
                      title="Decline invitation"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center px-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                <Mail size={18} className="text-slate-500" />
              </div>
              <h3 className="text-[14px] font-semibold text-[#172033]">
                No pending invitations yet
              </h3>
              <p className="text-[13px] text-[#64748B] mt-1 max-w-sm mx-auto leading-normal">
                Invitations sent to your verified email will appear here automatically.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 7. Clean Restrained Footer */}
      <footer className="py-4 border-t border-slate-200/90 bg-white text-[12px] text-[#64748B]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span>Need assistance setting up your workspace? </span>
            <a
              href="mailto:support@bilzet.com"
              className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
            >
              Contact BILZET Support
            </a>
          </div>
          <div className="text-[11px] text-slate-400">
            BILZET Multi-Tenant Cloud ERP • Role-Aware Team Onboarding
          </div>
        </div>
      </footer>
    </div>
  );
}
