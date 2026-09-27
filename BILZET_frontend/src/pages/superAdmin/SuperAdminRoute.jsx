import { Navigate } from "react-router-dom";
import { useAuth } from "../../store/auth";
import { ShieldAlert, ArrowRight, Lock } from "lucide-react";

export const SUPER_ADMIN_EMAIL = "vickyms2app@gmail.com";

export default function SuperAdminRoute({ children }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#070d1e] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
            Verifying Master Credentials…
          </p>
        </div>
      </div>
    );
  }

  // Not logged in at all -> Go to dedicated super admin login
  if (!user) {
    return <Navigate to="/app-admin/login" replace />;
  }

  // Logged in as someone else -> Show unauthorized lock screen
  const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#070d1e] p-6 text-white">
        <div className="max-w-md w-full rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 grid place-items-center text-rose-400 mx-auto mb-5 shadow-lg shadow-rose-500/20">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold mb-2">Restricted Platform Control</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            The Application Admin Panel is strictly reserved for the platform master admin (<span className="text-cyan-400 font-mono font-medium">{SUPER_ADMIN_EMAIL}</span>).
            <br />
            You are currently signed in as <span className="text-slate-200 font-medium">{user.email}</span>.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                logout();
                window.location.href = "/app-admin/login";
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Lock size={15} />
              Sign in as Platform Admin
            </button>
            <a
              href="/dashboard"
              className="block w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Return to Shop Dashboard →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
