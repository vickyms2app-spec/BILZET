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
    <div className="min-h-screen bg-[#060a17] text-white flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto z-10">
        <div className="flex items-center gap-3">
          <Logo variant="full" theme="dark" size="md" />
          <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            Master Admin
          </span>
        </div>

        <a
          href="/login"
          className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1"
        >
          Regular Shop Login →
        </a>
      </div>

      {/* Main Form Card */}
      <div className="max-w-md w-full mx-auto my-auto z-10 py-10">
        <div className="rounded-3xl bg-[#0c1427]/80 border border-white/10 backdrop-blur-2xl p-8 shadow-2xl shadow-black/80">
          <div className="mb-7 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
              <ShieldCheck size={14} />
              Platform Command Center
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
              Application Master Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Secure authentication for platform-wide control.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5">
              <ShieldAlert size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Master Email Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">
                  Authorized Admin Email
                </label>
                <span className="text-[11px] font-bold text-cyan-400 font-mono">
                  Username: admin
                </span>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                placeholder="vickyms2app@gmail.com"
              />
              <p className="text-[11px] text-slate-500">
                Contact number not required for super admin.
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition pr-11"
                  placeholder="Enter master password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-[0.98] transition-all mt-6 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <span className="text-[11px] text-slate-400">
              Initial Master Password:{" "}
              <code className="bg-white/10 px-2 py-0.5 rounded text-cyan-300 font-mono">
                AdminPassword123!
              </code>
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 z-10">
        BILZET Multi-Tenant Infrastructure · Platform Super Admin Operations
      </div>
    </div>
  );
}
