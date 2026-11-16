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
      className="min-h-screen text-[#111318] bg-[#E3E3E5] flex flex-col justify-between selection:bg-[#5BF07B] selection:text-[#0E2A16] relative font-sans"
    >
      {/* 1. Header Navigation Bar */}
      <header className="bg-[#EDEDEF] border-b border-[#D8D9DE] sticky top-0 z-30">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Top-left BILZET Logo */}
          <div className="flex items-center">
            <Logo theme="light" size="sm" />
          </div>

          {/* Top-right Profile & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full bg-[#12151C] text-[#5BF07B] text-xs font-bold flex items-center justify-center shrink-0 select-none shadow-xs"
                aria-hidden="true"
              >
                {userInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#111318] leading-tight">
                  {displayName}
                </span>
                <span
                  className="text-[11px] text-[#7C7F8A] leading-tight font-mono truncate max-w-[170px]"
                  title={userEmail}
                >
                  {userEmail}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E7E8EC] bg-[#F6F6F8] hover:bg-[#EDEDEF] text-xs font-semibold text-[#111318] transition cursor-pointer shadow-xs active:scale-95"
              title="Sign out of your account"
            >
              <LogOut size={13} className="text-[#7C7F8A]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-[1180px] w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        {/* Global Feedback Banner */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-[20px] text-xs sm:text-sm font-semibold flex items-center gap-2.5 border shadow-xs transition-all ${
              statusMessage.type === "success"
                ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                : statusMessage.type === "error"
                ? "bg-[#FBD3D3] text-[#E5484D] border-[#E5484D]/30"
                : "bg-[#FAFAFB] text-[#111318] border-[#E7E8EC]"
            }`}
            role="status"
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle size={16} className="text-[#E5484D] shrink-0" />
            ) : (
              <Sparkles size={16} className="text-[#111318] shrink-0" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[#7C7F8A] hover:text-[#111318] p-0.5 cursor-pointer"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 3. Welcome Section */}
        <section className="text-center mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#EDEDEF] border border-[#D8D9DE] text-[#7C7F8A] mb-2 uppercase tracking-wider">
            BILZET Workspace Onboarding
          </span>
          <h1 className="text-[32px] sm:text-[38px] font-bold text-[#111318] tracking-tight leading-tight font-heading">
            Welcome to BILZET
          </h1>
          <p className="text-[14px] sm:text-[15px] text-[#7C7F8A] mt-1.5 max-w-xl mx-auto font-normal">
            Choose how you want to get started with your business workspace.
          </p>
        </section>

        {/* 4. Verified Email Section */}
        <section
          className="rounded-[24px] bg-[#F6F6F8] border border-[#E7E8EC] p-5 sm:p-6 mb-6 shadow-fintech"
          aria-label="Account verified email"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-[#EDEDEF] border border-[#D8D9DE] flex items-center justify-center shrink-0 shadow-2xs mt-0.5 text-[#111318]">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#111318]">
                    Verified email address
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 shadow-2xs">
                    <CheckCircle2 size={11} className="text-[#0E2A16]" />
                    <span>Verified</span>
                  </span>
                </div>
                <div className="text-[14px] sm:text-[15px] font-medium text-[#111318] font-mono mt-0.5 truncate">
                  {userEmail}
                </div>
                <p className="text-[12px] sm:text-[13px] text-[#7C7F8A] mt-0.5 leading-normal">
                  Store invitations will be linked to this email address.
                </p>
              </div>
            </div>

            {/* Copy Email button */}
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#12151C] hover:bg-[#202530] text-white text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95 shrink-0 self-start sm:self-center border border-[#12151C]"
              aria-label="Copy verified account email"
            >
              {copiedEmail ? (
                <>
                  <Check size={13} className="text-[#5BF07B]" />
                  <span className="text-[#5BF07B]">Copied!</span>
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

        {/* 5. Main Workspace Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-stretch">
          {/* CARD A — JOIN EXISTING WORKSPACE */}
          <div
            className="rounded-[28px] bg-[#F6F6F8] border border-[#E7E8EC] p-6 sm:p-7 shadow-fintech flex flex-col justify-between transition-all hover:border-[#D8D9DE]"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDEDEF] text-[#111318] border border-[#D8D9DE] flex items-center justify-center mb-5 shadow-2xs">
                <Users size={20} />
              </div>

              <h2 className="text-[20px] sm:text-[22px] font-bold text-[#111318] tracking-tight font-heading">
                Already have a store invitation?
              </h2>
              <p className="text-[13px] text-[#7C7F8A] mt-1.5 leading-relaxed">
                Join an existing business as an invited team member using your code or link.
              </p>

              <form onSubmit={handleRedeemToken} className="mt-5">
                <label
                  htmlFor="invitation-input"
                  className="block text-[12px] font-semibold text-[#111318] mb-2 uppercase tracking-wider"
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
                  className="w-full px-4 py-2.5 rounded-full bg-white text-[13px] text-[#111318] placeholder-[#A9ABB5] focus:outline-none focus:border-[#111318] focus:ring-2 focus:ring-[#111318]/10 transition font-mono disabled:opacity-60 border border-[#E7E8EC]"
                />

                {tokenMessage && (
                  <div
                    className={`mt-2.5 p-3 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                      tokenMessage.type === "success"
                        ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                        : "bg-[#FBD3D3] text-[#E5484D] border-[#E5484D]/30"
                    }`}
                  >
                    {tokenMessage.type === "success" ? (
                      <CheckCircle2 size={13} className="text-[#0E2A16] shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="text-[#E5484D] shrink-0" />
                    )}
                    <span>{tokenMessage.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={tokenLoading || !tokenInput.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-[13px] font-semibold transition cursor-pointer mt-5 bg-[#12151C] hover:bg-[#202530] active:scale-[0.99] disabled:opacity-50 shadow-fintech"
                >
                  {tokenLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-[#5BF07B]" />
                      <span>Joining Workspace…</span>
                    </>
                  ) : (
                    <>
                      <span>Join Workspace</span>
                      <ArrowRight size={14} className="text-[#5BF07B]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* CARD B — REGISTER NEW STORE (Keel Dark Contrast Bento Card) */}
          <div
            className="rounded-[28px] bg-[#12151C] border border-[#202530] text-white p-6 sm:p-7 shadow-fintech flex flex-col justify-between transition-all"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 text-[#5BF07B] border border-white/15 flex items-center justify-center mb-5 shadow-2xs">
                <Store size={20} />
              </div>

              <h2 className="text-[20px] sm:text-[22px] font-bold text-white tracking-tight font-heading">
                Starting your own business?
              </h2>
              <p className="text-[13px] text-[#A9ABB5] mt-1.5 leading-relaxed">
                Register a brand new store and become the Business Owner with complete ERP access.
              </p>

              <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-[#5BF07B] shrink-0 mt-0.5" />
                <p className="text-[13px] font-medium text-white/90 leading-snug">
                  Full control over billing, inventory, GST compliance, staff roles and multi-store setups.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register-shop"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#5BF07B] hover:bg-[#4de66e] active:bg-[#42ce62] text-[#0E2A16] text-[13px] font-bold transition cursor-pointer shadow-fintech"
              >
                <Store size={15} />
                <span>Register New Store</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Pending Store Invitations */}
        <section
          className="rounded-[28px] bg-[#F6F6F8] border border-[#E7E8EC] p-6 sm:p-7 shadow-fintech mb-6 transition-all"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E7E8EC] mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDEDEF] text-[#111318] border border-[#D8D9DE] flex items-center justify-center shadow-2xs">
                <Mail size={16} />
              </div>
              <h2 className="text-[17px] sm:text-[19px] font-bold text-[#111318] font-heading">
                Pending Store Invitations
              </h2>
              {invitations.length > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 shadow-2xs">
                  {invitations.length} {invitations.length === 1 ? "invite" : "invites"}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAFAFB] text-[#7C7F8A] border border-[#E7E8EC]">
                  0
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={fetchInvitations}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E7E8EC] bg-white hover:bg-[#EDEDEF] text-xs font-semibold text-[#111318] transition shadow-xs cursor-pointer disabled:opacity-60"
              title="Check for new invitations"
            >
              <RefreshCw
                size={12}
                className={loading ? "animate-spin text-[#111318]" : "text-[#7C7F8A]"}
              />
              <span>{loading ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>

          {/* Invitation Rows or Clean Empty State */}
          {invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 sm:p-5 rounded-[20px] border border-[#E7E8EC] bg-[#FAFAFB] hover:bg-white transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-[#111318] shrink-0" />
                      <h3 className="text-[15px] font-bold text-[#111318] truncate">
                        {inv.business?.name || "Business Store"}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40">
                        Role: {inv.role}
                      </span>
                      {inv.department && (
                        <span className="text-[12px] text-[#7C7F8A]">
                          • {inv.department}
                        </span>
                      )}
                      {inv.designation && (
                        <span className="text-[12px] text-[#7C7F8A]">
                          ({inv.designation})
                        </span>
                      )}
                    </div>

                    {inv.message && (
                      <p className="text-[12px] text-[#7C7F8A] mt-2 italic bg-[#EDEDEF] p-2.5 rounded-xl border border-[#D8D9DE]">
                        &quot;{inv.message}&quot;
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#7C7F8A] mt-2">
                      <span>
                        Invited by{" "}
                        <strong className="font-semibold text-[#111318]">
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[#0E2A16] bg-[#5BF07B] hover:bg-[#4de66e] text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
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
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-[#FBD3D3] hover:bg-[#f7bebe] text-[#E5484D] text-xs font-semibold transition border border-[#E5484D]/30 disabled:opacity-50 cursor-pointer"
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
              className="py-10 text-center px-4 rounded-[20px] border border-dashed border-[#D8D9DE] bg-[#FAFAFB]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#EDEDEF] border border-[#D8D9DE] flex items-center justify-center mx-auto mb-3 shadow-xs text-[#7C7F8A]">
                <Mail size={20} />
              </div>
              <h3 className="text-[15px] font-bold text-[#111318]">
                No pending invitations
              </h3>
              <p className="text-[13px] text-[#7C7F8A] mt-1 max-w-sm mx-auto leading-normal">
                Invitations sent to your verified email will appear here automatically.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="py-4 border-t border-[#D8D9DE] bg-[#EDEDEF] text-[12px] text-[#7C7F8A]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span>Need assistance setting up your workspace? </span>
            <a
              href="mailto:support@bilzet.com"
              className="text-[#111318] hover:underline font-semibold"
            >
              Contact BILZET Support
            </a>
          </div>
          <div className="text-[11px] text-[#7C7F8A]">
            BILZET Multi-Tenant Cloud ERP • Enterprise Workspace Onboarding
          </div>
        </div>
      </footer>
    </div>
  );
}
