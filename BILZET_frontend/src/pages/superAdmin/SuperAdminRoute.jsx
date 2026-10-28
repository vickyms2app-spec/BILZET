import { Navigate } from "react-router-dom";
import { useAuth } from "../../store/auth";
import { ShieldAlert, ArrowRight, Lock } from "lucide-react";

export const SUPER_ADMIN_EMAIL = "vickyms2app@gmail.com";

export default function SuperAdminRoute({ children }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F7FBFF] text-[#526B87]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#D8EBFF] border-t-[#2563EB] animate-spin" />
          <p className="text-sm font-semibold tracking-wider text-[#7188A3] uppercase">
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
      <div className="min-h-screen grid place-items-center bg-[#F7FBFF] p-6 text-[#526B87]">
        <div className="max-w-md w-full rounded-2xl bg-white border border-[#E3EDF8] p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0F2] border border-[#FECDD3] grid place-items-center text-[#EF4444] mx-auto mb-5">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold mb-2 text-[#526B87]">Restricted Platform Control</h2>
          <p className="text-sm text-[#7188A3] mb-6 leading-relaxed">
            The Application Admin Panel is strictly reserved for the platform master admin (<span className="text-[#2563EB] font-mono font-medium">{SUPER_ADMIN_EMAIL}</span>).
            <br />
            You are currently signed in as <span className="text-[#526B87] font-medium">{user.email}</span>.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                logout();
                window.location.href = "/app-admin/login";
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] transition-all"
            >
              <Lock size={15} />
              Sign in as Platform Admin
            </button>
            <a
              href="/dashboard"
              className="block w-full py-2.5 text-xs font-semibold text-[#94A8BE] hover:text-[#526B87] transition"
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
