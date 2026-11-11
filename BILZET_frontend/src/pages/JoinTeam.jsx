import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Store,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ArrowRight,
  Copy,
  Check,
  X,
  Users,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { roleInvitationApi, caInvitationApi } from "../api";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import Logo from "../components/common/Logo";

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

  // If user already has an active business role and store, redirect automatically.
  // Exception: if there is a token in the URL, stay on this page so the user can redeem it.
  useEffect(() => {
    if (
      !initialToken &&
      user &&
      user.role &&
      user.role !== "NONE" &&
      user.role !== "UNASSIGNED" &&
      (user.businessId || user.isOwner || user.isSuperAdmin)
    ) {
      navigate(getWorkspaceRedirectPath(user), { replace: true });
    }
  }, [user, navigate, initialToken]);

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
    const emailToCopy = user?.email || "";
    if (emailToCopy) {
      try {
        await navigator.clipboard.writeText(emailToCopy);
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
      return setTokenMessage({ type: "error", text: "Please enter an invitation code or link." });
    }

    // Extract token if user pasted a full URL
    if (raw.includes("token=")) {
      try {
        const url = new URL(raw.startsWith("http") ? raw : `http://dummy.com/${raw}`);
        raw = url.searchParams.get("token") || raw;
      } catch (_) {}
    } else if (raw.includes("/invite/") || raw.includes("/join-team/")) {
      const parts = raw.split("/");
      raw = parts[parts.length - 1] || raw;
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

  const userEmail =
    user?.email ||
    (typeof window !== "undefined" && window.Clerk?.user?.primaryEmailAddress?.emailAddress) ||
    "verified@bilzet.in";

  return (
    <div
      className="min-h-screen text-[#202B3C] flex flex-col justify-between selection:bg-[#91C5FF]/30 selection:text-[#1E40AF] relative"
      style={{
        background:
          "radial-gradient(ellipse at 10% 10%, #E6F1FF 0%, transparent 40%), radial-gradient(ellipse at 90% 85%, #F0EAFE 0%, transparent 40%), #F2F6FC",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
      }}
    >
      {/* 1. Header Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-[#E1E9F4] sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Top-left BILZET Logo */}
          <div className="flex items-center">
            <Logo theme="light" size="sm" />
          </div>

          {/* Top-right Profile & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full bg-[#91C5FF]/30 border border-[#91C5FF]/60 text-[#1E40AF] text-xs font-semibold flex items-center justify-center shrink-0 select-none shadow-xs"
                aria-hidden="true"
              >
                {userInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#202B3C] leading-tight">
                  {displayName}
                </span>
                <span
                  className="text-[11px] text-[#64748B] leading-tight font-mono truncate max-w-[170px]"
                  title={userEmail}
                >
                  {userEmail}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E1E9F4] bg-white hover:bg-slate-50 text-xs font-medium text-[#202B3C] transition cursor-pointer shadow-xs active:scale-95"
              title="Sign out of your account"
            >
              <LogOut size={13} className="text-[#64748B]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container (max-w-[1180px], centered, balanced vertical spacing) */}
      <main className="flex-1 max-w-[1180px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        {/* Global Feedback Banner */}
        {statusMessage && (
          <div
            className={`mb-5 p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2.5 border shadow-xs transition-all ${
              statusMessage.type === "success"
                ? "bg-[#91D9C0]/30 text-[#0A6C45] border-[#91D9C0]/60"
                : statusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-[#91C5FF]/30 text-[#1D4ED8] border-[#91C5FF]/50"
            }`}
            role="status"
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-[#0A6C45] shrink-0" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            ) : (
              <Sparkles size={16} className="text-[#1D4ED8] shrink-0" />
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

        {/* 3. Welcome Section */}
        <section className="text-center mb-6 sm:mb-8">
          <h1 className="text-[34px] sm:text-[38px] font-semibold text-[#202B3C] tracking-tight leading-tight">
            Welcome to{" "}
            <span className="text-[#3977F6] bg-gradient-to-r from-[#3977F6] to-[#69B5FF] bg-clip-text text-transparent">
              BILZET
            </span>
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#64748B] mt-1.5 max-w-xl mx-auto font-normal">
            Choose how you want to get started with your business workspace.
          </p>
        </section>

        {/* 4. Verified Email Section (Light sky-blue tinted card background) */}
        <section
          className="rounded-[18px] border p-4 sm:p-5 shadow-[0_4px_16px_rgba(145,197,255,0.12)] mb-6 transition-all"
          style={{
            background: "linear-gradient(120deg, #EAF3FF 0%, #F5F8FF 100%)",
            borderColor: "#C8E0FF",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {/* Mail icon inside blue-tinted container */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 shadow-xs"
                style={{
                  background: "#DCEBFF",
                  borderColor: "#B8D7FF",
                  color: "#1E58D8",
                }}
              >
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#202B3C]">
                    Verified email address
                  </span>
                  {/* Mint green Verified badge */}
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs"
                    style={{
                      background: "#D4F4E6",
                      borderColor: "#91D9C0",
                      color: "#0A6C45",
                    }}
                  >
                    <CheckCircle2 size={11} className="text-[#0A6C45]" />
                    <span>Verified</span>
                  </span>
                </div>
                <div className="text-[14px] sm:text-[15px] font-medium text-[#202B3C] font-mono mt-0.5 truncate">
                  {userEmail}
                </div>
                <p className="text-[12px] sm:text-[13px] text-[#64748B] mt-0.5 leading-normal">
                  Store invitations will be linked to this email address.
                </p>
              </div>
            </div>

            {/* Copy Email button with blue outline and subtle hover */}
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-[#2563EB] text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95 shrink-0 self-start sm:self-center border"
              style={{
                borderColor: "#91C5FF",
              }}
              aria-label="Copy verified account email"
            >
              {copiedEmail ? (
                <>
                  <Check size={13} className="text-[#0A6C45]" />
                  <span className="text-[#0A6C45]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Email</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* 5. Main Workspace Action Cards (Side-by-side on desktop, equal height, 20-24px gap) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-stretch">
          {/* CARD A — JOIN EXISTING WORKSPACE (Light Blue card background) */}
          <div
            className="rounded-[18px] border p-6 sm:p-7 shadow-[0_4px_20px_rgba(145,197,255,0.15)] flex flex-col justify-between transition-all hover:shadow-[0_6px_24px_rgba(145,197,255,0.22)]"
            style={{
              background: "linear-gradient(135deg, #EDF5FF 0%, #F5F9FF 100%)",
              borderColor: "#C4DCFF",
            }}
          >
            <div>
              {/* Blue icon container */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border mb-4 shadow-xs"
                style={{
                  background: "#DCEBFF",
                  borderColor: "#B8D7FF",
                  color: "#1E58D8",
                }}
              >
                <Users size={18} />
              </div>

              <h2 className="text-[21px] sm:text-[22px] font-semibold text-[#202B3C] tracking-tight">
                Already have a store invitation?
              </h2>
              <p className="text-[14px] text-[#64748B] mt-1.5 leading-relaxed">
                Join an existing business as an invited team member.
              </p>

              <form onSubmit={handleRedeemToken} className="mt-5">
                <label
                  htmlFor="invitation-input"
                  className="block text-[13px] font-semibold text-[#202B3C] mb-2"
                >
                  Invitation code or link
                </label>
                <input
                  id="invitation-input"
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your invitation code or link"
                  disabled={tokenLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white text-[14px] text-[#202B3C] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#91C5FF] transition font-mono disabled:opacity-60 border"
                  style={{
                    borderColor: "#C4DCFF",
                  }}
                />

                {tokenMessage && (
                  <div
                    className={`mt-2.5 p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                      tokenMessage.type === "success"
                        ? "bg-[#91D9C0]/30 text-[#0A6C45] border-[#91D9C0]/60"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {tokenMessage.type === "success" ? (
                      <CheckCircle2 size={13} className="text-[#0A6C45] shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="text-rose-600 shrink-0" />
                    )}
                    <span>{tokenMessage.text}</span>
                  </div>
                )}

                {/* Primary blue gradient button */}
                <button
                  type="submit"
                  disabled={tokenLoading || !tokenInput.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-[14px] font-semibold transition cursor-pointer mt-5 shadow-[0_4px_14px_rgba(57,119,246,0.30)] hover:shadow-[0_6px_18px_rgba(57,119,246,0.40)] active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
                  style={{
                    background: "linear-gradient(110deg, #69B5FF 0%, #3977F6 100%)",
                  }}
                >
                  {tokenLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Joining Workspace…</span>
                    </>
                  ) : (
                    <>
                      <span>Join Workspace</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* CARD B — REGISTER NEW STORE (Light Mint card background) */}
          <div
            className="rounded-[18px] border p-6 sm:p-7 shadow-[0_4px_20px_rgba(145,217,192,0.18)] flex flex-col justify-between transition-all hover:shadow-[0_6px_24px_rgba(145,217,192,0.26)]"
            style={{
              background: "linear-gradient(135deg, #F0FAF5 0%, #F7FCFA 100%)",
              borderColor: "#BDEBD8",
            }}
          >
            <div>
              {/* Green icon container */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border mb-4 shadow-xs"
                style={{
                  background: "#DDF5EA",
                  borderColor: "#A9E5CC",
                  color: "#0A6C45",
                }}
              >
                <Store size={18} />
              </div>

              <h2 className="text-[21px] sm:text-[22px] font-semibold text-[#202B3C] tracking-tight">
                Starting your own business?
              </h2>
              <p className="text-[14px] text-[#64748B] mt-1.5 leading-relaxed">
                Register a new store and become the Business Owner.
              </p>

              {/* Light mint information panel */}
              <div
                className="mt-5 p-4 rounded-xl border flex items-start gap-3 shadow-2xs"
                style={{
                  background: "#E2F6ED",
                  borderColor: "#AEE8CF",
                }}
              >
                <CheckCircle2 size={16} className="text-[#0A6C45] shrink-0 mt-0.5" />
                <p className="text-[13px] font-semibold text-[#0A6C45] leading-snug">
                  Your own store, billing, inventory and team management.
                </p>
              </div>
            </div>

            <div className="mt-6">
              {/* Blue outlined Register New Store button */}
              <Link
                to="/register-shop"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#EDF5FF] active:bg-[#DCEBFF] text-[14px] font-semibold transition cursor-pointer shadow-xs border-2"
                style={{
                  borderColor: "#3977F6",
                  color: "#2563EB",
                }}
              >
                <Store size={15} />
                <span>Register New Store</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Pending Store Invitations (Light lavender-tinted section background) */}
        <section
          className="rounded-[18px] border p-5 sm:p-7 shadow-[0_4px_20px_rgba(185,164,245,0.14)] mb-6 transition-all"
          style={{
            background: "linear-gradient(135deg, #F7F3FF 0%, #FCFAFF 100%)",
            borderColor: "#DFD3FB",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between pb-4 border-b mb-5"
            style={{
              borderColor: "#EADFFC",
            }}
          >
            <div className="flex items-center gap-2.5">
              {/* Lavender icon container */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs"
                style={{
                  background: "#EAE0FD",
                  borderColor: "#D2BFF9",
                  color: "#6D28D9",
                }}
              >
                <Mail size={16} />
              </div>
              <h2 className="text-[18px] sm:text-[20px] font-semibold text-[#202B3C]">
                Pending Store Invitations
              </h2>
              {invitations.length > 0 ? (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold border shadow-2xs"
                  style={{
                    background: "#D4F4E6",
                    borderColor: "#91D9C0",
                    color: "#0A6C45",
                  }}
                >
                  {invitations.length} {invitations.length === 1 ? "invite" : "invites"}
                </span>
              ) : (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[12px] font-medium border"
                  style={{
                    background: "#EDE5FD",
                    borderColor: "#DFD3FB",
                    color: "#6D28D9",
                  }}
                >
                  0
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={fetchInvitations}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white/90 hover:bg-white text-xs font-semibold text-[#202B3C] transition shadow-xs cursor-pointer disabled:opacity-60"
              style={{
                borderColor: "#D2BFF9",
              }}
              title="Check for new invitations"
            >
              <RefreshCw
                size={12}
                className={loading ? "animate-spin text-[#6D28D9]" : "text-[#6D28D9]"}
              />
              <span>{loading ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>

          {/* Invitation Rows or Clean Lavender Minimal Empty State */}
          {invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 sm:p-5 rounded-xl border bg-white/90 hover:bg-white transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                  style={{
                    borderColor: "#E2D7FA",
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-[#3977F6] shrink-0" />
                      <h3 className="text-[15px] font-semibold text-[#202B3C] truncate">
                        {inv.business?.name || "Business Store"}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span
                        className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold border"
                        style={{
                          background: "#DCEBFF",
                          borderColor: "#B8D7FF",
                          color: "#1E58D8",
                        }}
                      >
                        Role: {inv.role}
                      </span>
                      {inv.department && (
                        <span className="text-[12px] text-[#64748B]">
                          • {inv.department}
                        </span>
                      )}
                      {inv.designation && (
                        <span className="text-[12px] text-[#64748B]">
                          ({inv.designation})
                        </span>
                      )}
                    </div>

                    {inv.message && (
                      <p className="text-[12px] text-[#64748B] mt-2 italic bg-[#F7F3FF] p-2.5 rounded-lg border border-[#E2D7FA]">
                        &quot;{inv.message}&quot;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#64748B] mt-2">
                      <span>
                        Invited by{" "}
                        <strong className="font-medium text-[#202B3C]">
                          {inv.inviter?.name || inv.inviter?.email || "Store Administrator"}
                        </strong>{" "}
                        on {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                      {inv.expiresAt && (
                        <span>
                          • Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Accept & Decline Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAcceptInvite(inv)}
                      disabled={actionLoadingId === inv.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
                      style={{
                        background: "linear-gradient(110deg, #69B5FF 0%, #3977F6 100%)",
                      }}
                    >
                      {actionLoadingId === inv.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineInvite(inv)}
                      disabled={actionLoadingId === inv.id}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-[#64748B] text-xs font-semibold transition border border-[#DFD3FB] disabled:opacity-50 cursor-pointer"
                      title="Decline invitation"
                    >
                      <X size={13} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="py-10 text-center px-4 rounded-xl border border-dashed"
              style={{
                background: "rgba(255, 255, 255, 0.6)",
                borderColor: "#D2BFF9",
              }}
            >
              {/* Minimal mail icon with soft lavender circular background */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs border"
                style={{
                  background: "#EDE5FD",
                  borderColor: "#DFD3FB",
                  color: "#6D28D9",
                }}
              >
                <Mail size={22} className="text-[#6D28D9]" />
              </div>
              <h3 className="text-[16px] font-semibold text-[#202B3C]">
                No pending invitations
              </h3>
              <p className="text-[13px] text-[#64748B] mt-1.5 max-w-sm mx-auto leading-normal">
                Invitations sent to your verified email will appear here automatically.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="py-4 border-t border-[#E1E9F4] bg-white/70 backdrop-blur-sm text-[12px] text-[#64748B]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span>Need assistance setting up your workspace? </span>
            <a
              href="mailto:support@bilzet.com"
              className="text-[#3977F6] hover:underline font-semibold"
            >
              Contact BILZET Support
            </a>
          </div>
          <div className="text-[11px] text-slate-400">
            BILZET Multi-Tenant Cloud ERP • Enterprise Workspace Onboarding
          </div>
        </div>
      </footer>
    </div>
  );
}
