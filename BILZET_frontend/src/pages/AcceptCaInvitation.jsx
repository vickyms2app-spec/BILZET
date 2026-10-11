import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Clock,
  ArrowRight,
  LogOut,
  LogIn,
  UserCheck,
  FileText,
  Percent,
  CreditCard,
  FileSpreadsheet,
  Layers,
  Sparkles,
} from "lucide-react";
import { caInvitationApi } from "../api";
import { useAuth } from "../store/auth";
import Button from "../components/common/Button";

export default function AcceptCaInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null); // { code, message }
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  // 1. Verify token on load
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorStatus({
        code: "NO_TOKEN",
        message: "No invitation token was found in the link. Please open the exact link from your invitation email.",
      });
      return;
    }

    let isMounted = true;
    const verifyToken = async () => {
      setLoading(true);
      setErrorStatus(null);
      try {
        const res = await caInvitationApi.verify(token);
        if (isMounted) {
          if (res?.valid && res.invitation) {
            setInvitationData(res.invitation);
          } else {
            setErrorStatus({
              code: res?.code || "INVALID",
              message: res?.message || "This invitation is invalid or has expired.",
              acceptedAt: res?.acceptedAt,
              revokedAt: res?.revokedAt,
              expiresAt: res?.expiresAt,
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorStatus({
            code: "ERROR",
            message: err?.message || "Failed to verify invitation token. Please check your internet connection.",
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Check email match if user is signed in
  const invitedEmail = (invitationData?.email || "").trim().toLowerCase();
  const userEmail = (user?.email || "").trim().toLowerCase();
  const isEmailMatch = Boolean(user && userEmail && invitedEmail && userEmail === invitedEmail);
  const isEmailMismatch = Boolean(user && userEmail && invitedEmail && userEmail !== invitedEmail);

  // 2. Handle Accept
  const handleAccept = async () => {
    if (!token || !isEmailMatch) return;
    setAccepting(true);
    try {
      const res = await caInvitationApi.accept({ token });
      setSuccessResult(res);

      // Save connected store in local storage so CA Portal opens this store
      if (res?.storeId) {
        localStorage.setItem("bilzet_active_store_id", res.storeId);
      }

      // Automatically redirect to CA Portal workspace after short feedback
      setTimeout(() => {
        navigate(`/ca-portal`, { replace: true });
      }, 1800);
    } catch (err) {
      alert("Failed to accept invitation: " + (err?.message || "Unknown error"));
      setAccepting(false);
    }
  };

  // 3. Handle Decline
  const handleDecline = async () => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to decline this invitation to connect?")) return;
    setDeclining(true);
    try {
      await caInvitationApi.decline({ token, reason: "Declined by invitee" });
      setErrorStatus({
        code: "DECLINED",
        message: "You have declined this invitation. No connection was established.",
      });
    } catch (err) {
      alert("Failed to decline invitation: " + (err?.message || "Unknown error"));
      setDeclining(false);
    }
  };

  const permissionLabels = {
    sales_audit: { label: "Sales & Output GST", icon: FileText },
    purchase_audit: { label: "Purchases & Input Tax Credit", icon: FileSpreadsheet },
    tax_audit: { label: "GST Slabs & Review", icon: Percent },
    reconciliation: { label: "Bank Reconciliation", icon: CreditCard },
    reports: { label: "Workpapers & Reports", icon: Layers },
    tasks: { label: "Audit Tasks", icon: CheckCircle2 },
    discrepancies: { label: "Discrepancy Resolutions", icon: AlertTriangle },
    documents: { label: "Supporting Evidence & Docs", icon: Briefcase },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Main Container */}
      <div className="w-full max-w-xl z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            BILZET &bull; CA Connect
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Chartered Accountant Invitation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure client authorization & synchronized accounting workspace
          </p>
        </div>

        {/* Card Content */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-semibold text-slate-300">Verifying secure invitation token…</p>
              <p className="text-xs text-slate-500 mt-1">Validating single-use cryptographic signature</p>
            </div>
          )}

          {/* Success State */}
          {!loading && successResult && (
            <div className="py-8 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Connection Established!</h2>
              <p className="text-sm text-slate-300 mb-6">
                You are now connected with <strong className="text-emerald-400">{successResult.storeName}</strong> as their authorized Chartered Accountant.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20 animate-pulse">
                <span>Redirecting to your CA workspace…</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* Error / Inactive States */}
          {!loading && !successResult && errorStatus && (
            <div className="py-6 text-center animate-in fade-in">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
                {errorStatus.code === "EXPIRED" ? (
                  <Clock className="w-8 h-8" />
                ) : errorStatus.code === "ALREADY_ACCEPTED" ? (
                  <CheckCircle2 className="w-8 h-8 text-blue-400" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>
              <h2 className="text-lg font-bold text-white mb-2">
                {errorStatus.code === "EXPIRED"
                  ? "Invitation Expired"
                  : errorStatus.code === "ALREADY_ACCEPTED"
                  ? "Invitation Already Accepted"
                  : errorStatus.code === "REVOKED"
                  ? "Invitation Revoked"
                  : "Invalid Invitation"}
              </h2>
              <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
                {errorStatus.message}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/sign-in"
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  Go to Sign In
                </Link>
                {user && (
                  <Link
                    to="/dashboard"
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition"
                  >
                    Open Dashboard
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Valid Invitation Presentation */}
          {!loading && !successResult && !errorStatus && invitationData && (
            <div className="space-y-6 animate-in fade-in">
              {/* Business Details Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                    Inviting Business
                  </div>
                  <h3 className="text-lg font-bold text-white truncate">
                    {invitationData.business?.name}
                  </h3>
                  {invitationData.business?.gstin && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        GSTIN: {invitationData.business.gstin}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-2">
                    Invited by: <span className="text-slate-200 font-medium">{invitationData.inviterName}</span>
                  </div>
                </div>
              </div>

              {/* Message from inviter (if any) */}
              {invitationData.message && (
                <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 leading-relaxed italic">
                  "{invitationData.message}"
                </div>
              )}

              {/* Scope & Permissions List */}
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2.5">
                  Authorized Workspace Permissions
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(invitationData.permissions || []).map((perm) => {
                    const info = permissionLabels[perm] || { label: perm, icon: ShieldCheck };
                    const Icon = info.icon;
                    return (
                      <div
                        key={perm}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-slate-700/60 text-xs text-slate-300"
                      >
                        <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{info.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expiry Notice */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/30 p-2.5 rounded-xl border border-slate-800">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Expires on: <strong className="text-slate-300">{new Date(invitationData.expiresAt).toLocaleDateString()}</strong> at{" "}
                  {new Date(invitationData.expiresAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Authentication & Email Identity Status Section */}
              <div className="pt-2 border-t border-slate-700">
                {!user ? (
                  /* Case 1: Not logged in */
                  <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
                      <LogIn className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">Authentication Required</h4>
                    <p className="text-xs text-slate-300 mb-4 max-w-sm mx-auto leading-relaxed">
                      This invitation is intended for <strong className="text-blue-300 underline">{invitationData.email}</strong>.
                      Please sign in or register to verify your identity.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                      <Link
                        to={`/sign-in?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                        className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                      >
                        Sign In as {invitationData.email}
                      </Link>
                      <Link
                        to={`/sign-up?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                        className="w-full sm:w-auto px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition"
                      >
                        Create New Account
                      </Link>
                    </div>
                  </div>
                ) : isEmailMismatch ? (
                  /* Case 2: Logged in with different email */
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-300 mb-1">Account Email Mismatch</h4>
                        <p className="text-xs text-slate-300 leading-relaxed mb-2">
                          This invitation is reserved exclusively for:
                          <br />
                          <strong className="text-white font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700 inline-block mt-1">
                            {invitationData.email}
                          </strong>
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed mb-3">
                          You are currently signed in as:
                          <br />
                          <strong className="text-amber-200 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700 inline-block mt-1">
                            {user.email}
                          </strong>
                        </p>
                        <button
                          onClick={async () => {
                            if (logout) await logout();
                            navigate(`/sign-in?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out & Switch Account
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Case 3: Logged in with matching email */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Verified Account: <strong className="text-white">{user.email}</strong>
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <button
                        onClick={handleAccept}
                        disabled={accepting || declining}
                        className="w-full sm:flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                      >
                        {accepting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Connecting Workspace…</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Accept Invitation & Connect</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDecline}
                        disabled={accepting || declining}
                        className="w-full sm:w-auto py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                      >
                        {declining ? "Declining…" : "Decline"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          BILZET Cloud ERP &bull; End-to-end encrypted Chartered Accountant authorization
        </div>
      </div>
    </div>
  );
}
