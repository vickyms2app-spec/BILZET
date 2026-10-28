import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth";
import { apiError } from "../../api/http";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";

import Logo from "../../components/common/Logo";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("Vickyms2app@gmail.com");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = useAuth((s) => s.login);
  const nav = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      if ((res?.user?.email || "").toLowerCase() !== "vickyms2app@gmail.com") {
        setError("Authorized access only. This portal is exclusively for the platform master admin.");
        return;
      }

      nav("/app-admin");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7FBFF] text-[#526B87] flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background Soft Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-[#D8EBFF]/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full bg-[#EEF7FF]/60 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto z-10">
        <div className="flex items-center gap-3">
          <Logo variant="full" theme="light" size="md" />
          <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#EEF7FF] text-[#2563EB] border border-[#D8EBFF]">
            Master Admin
          </span>
        </div>

        <a
          href="/login"
          className="text-xs font-semibold text-[#7188A3] hover:text-[#2563EB] transition flex items-center gap-1"
        >
          Regular Shop Login →
        </a>
      </div>

      {/* Main Form Card */}
      <div className="max-w-md w-full mx-auto my-auto z-10 py-10">
        <div className="rounded-3xl bg-white border border-[#E3EDF8] p-8 shadow-xl shadow-blue-500/5">
          <div className="mb-7 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF7FF] border border-[#D8EBFF] text-[#2563EB] text-xs font-semibold mb-3">
              <ShieldCheck size={14} />
              Platform Command Center
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#526B87] font-['Plus_Jakarta_Sans']">
              Application Master Admin
            </h1>
            <p className="text-xs text-[#7188A3] mt-1.5">
              Secure authentication for platform-wide control.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FFF0F2] border border-[#FECDD3] text-[#991B1B] text-xs font-medium flex items-start gap-2.5">
              <ShieldAlert size={16} className="shrink-0 text-[#EF4444] mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Master Email Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#526B87]">
                  Authorized Admin Email
                </label>
                <span className="text-[11px] font-bold text-[#2563EB] font-mono">
                  Username: admin
                </span>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-[#526B87] placeholder-[#94A8BE] text-sm focus:outline-none focus:border-[#8AAED8] focus:ring-1 focus:ring-[#8AAED8] transition"
                placeholder="vickyms2app@gmail.com"
              />
              <p className="text-[11px] text-[#94A8BE]">
                Contact number not required for super admin.
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#526B87]">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F4F9FF] border border-[#E3EDF8] text-[#526B87] placeholder-[#94A8BE] text-sm focus:outline-none focus:border-[#8AAED8] focus:ring-1 focus:ring-[#8AAED8] transition pr-11"
                  placeholder="Enter master password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A8BE] hover:text-[#526B87] transition"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] shadow-sm hover:brightness-105 active:scale-[0.98] transition-all mt-6 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-[#2563EB]/30 border-t-[#2563EB] animate-spin" />
                  Verifying Master Keys…
                </>
              ) : (
                <>
                  Access Platform Control
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Initial credentials reminder badge */}
          <div className="mt-6 pt-5 border-t border-[#EDF3FA] text-center">
            <span className="text-[11px] text-[#7188A3]">
              Initial Master Password:{" "}
              <code className="bg-[#EEF7FF] text-[#2563EB] border border-[#D8EBFF] px-2 py-0.5 rounded font-mono">
                AdminPassword123!
              </code>
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#94A8BE] z-10">
        BILZET Multi-Tenant Infrastructure · Platform Super Admin Operations
      </div>
    </div>
  );
}
