import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";
import { apiError } from "../api/http";
import Logo from "../components/common/Logo";
import HeroBillingIllustration from "../components/illustrations/HeroBillingIllustration";
import { ClerkAuthBox, ClerkGoogleButton } from "../components/auth/ClerkAuth";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
} from "lucide-react";

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

/* Inline styles for dark left panel */
const leftPanelStyle = {
  background: "linear-gradient(150deg, #0d1b3e 0%, #112257 40%, #0a2040 70%, #062035 100%)",
  position: "relative",
  overflow: "hidden",
};

export default function Login({ initialMode = "login" }) {
  const location = useLocation();
  const isRegister =
    location.pathname.startsWith("/sign-up") ||
    location.pathname === "/register" ||
    initialMode === "register";

  const [mode, setMode] = useState(isRegister ? "register" : "login");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const googleLogin = useAuth((s) => s.googleLogin);
  const nav = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      nav("/dashboard", { replace: true });
    }
  }, [user, nav]);

  useEffect(() => {
    if (location.pathname.startsWith("/sign-up") || location.pathname === "/register") {
      setMode("register");
    } else if (location.pathname.startsWith("/sign-in") || location.pathname === "/login") {
      setMode("login");
    }
  }, [location.pathname]);

  // Load Google Identity Services script if not already loaded
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response?.credential) {
              setBusy(true);
              try {
                await googleLogin(response.credential);
                nav("/dashboard");
              } catch (err) {
                setError(apiError(err));
              } finally {
                setBusy(false);
              }
            }
          },
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, [googleLogin, nav]);

  const handleGoogleSignIn = async () => {
    setError("");
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (window.google?.accounts?.id && googleClientId) {
      window.google.accounts.id.prompt();
      return;
    }

    setError("Google OAuth requires Clerk configuration. Please set VITE_CLERK_PUBLISHABLE_KEY in your frontend environment.");
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
    if (newMode === "register") {
      nav("/sign-up");
    } else {
      nav("/sign-in");
    }
  };


  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "register") {
      if (name.trim().length < 2) {
        return setError("Name must be at least 2 characters long.");
      }
      if (password.length < 6) {
        return setError("Password must be at least 6 characters long.");
      }
      if (password !== confirmPassword) {
        return setError("Passwords do not match. Please re-enter.");
      }
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await login({ email: email.trim().toLowerCase(), password });
        nav("/dashboard");
      } else {
        const payload = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          role: "ADMIN",
        };
        await register(payload);
        setSuccess("Account created successfully! Redirecting...");
        setTimeout(() => nav("/dashboard"), 600);
      }
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  function skipLogin() {
    try {
      useAuth.setState({
        user: { name: "Guest User", role: "GUEST", email: "guest@bilzet.app" },
        loading: false,
      });
    } catch (_) {}
    nav("/dashboard");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ════════════════════════════════════════════
          LEFT PANEL — Brand Hero
      ════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col justify-between p-12"
        style={leftPanelStyle}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(42,191,191,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(42,191,191,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Decorative floating orbs */}
        <div
          className="absolute top-20 right-20 w-48 h-48 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(42,191,191,0.25), transparent 70%)" }}
        />
        <div
          className="absolute bottom-32 left-12 w-40 h-40 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(26,92,255,0.2), transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(29,233,182,0.06), transparent 70%)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Top: Standardized Official Logo */}
        <div className="relative z-10 fade-up flex items-center gap-3">
          <Logo variant="full" theme="dark" size="lg" />
        </div>

        {/* Middle: Hero Text & Creative Illustration */}
        <div className="relative z-10 fade-up my-auto py-4" style={{ animationDelay: "0.1s" }}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-xs font-bold tracking-widest uppercase"
            style={{
              background: "rgba(0,196,204,0.12)",
              border: "1px solid rgba(0,196,204,0.25)",
              color: "#00c4cc",
            }}
          >
            <Sparkles size={12} />
            Smart Cloud Billing &amp; GST Suite
          </div>

          <h1
            className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight mb-4"
            style={{ color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {mode === "register" ? "Launch your shop" : "Run your business"}
            <br />
            <span className="bg-gradient-to-r from-[#00c4cc] to-[#38bdf8] bg-clip-text text-transparent">
              with digital ease.
            </span>
          </h1>

          <p className="text-sm xl:text-base leading-relaxed max-w-md text-slate-300">
            {mode === "register"
              ? "Join modern retail merchants generating compliant GST tax invoices, tracking dynamic inventory, and accepting instant scan-to-pay UPI collections."
              : "High-speed billing, barcode scanning, auto GST computation, and CA compliance in one unified workspace."}
          </p>

          {/* Large Creative Vector Illustration */}
          <div className="my-6 max-w-md">
            <HeroBillingIllustration />
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2.5">
            {[
              "GST Compliant Invoicing",
              "Instant UPI QR Payments",
              "Live Stock Inventory",
              "A4 & Thermal POS Print",
            ].map((f) => (
              <span
                key={f}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.12] text-slate-200"
              >
                <CheckCircle2 size={12} className="text-[#00c4cc]" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom: Tagline */}
        <p className="relative z-10 text-xs text-slate-500">
          Official Merchant Workspace · BILZET Enterprise
        </p>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — Auth Form (Login & Register)
      ════════════════════════════════════════════ */}
      <div
        className="grid place-items-center p-6 min-h-screen overflow-y-auto"
        style={{ background: "#f8fafc" }}
      >
        <div className="w-full max-w-md py-8 fade-up">
          {/* Mobile Logo */}
          <div className="flex justify-center mb-6 lg:hidden">
            <Logo variant="full" theme="light" size="lg" />
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-7 md:p-8 shadow-xl"
            style={{
              background: "#fff",
              border: "1px solid rgba(26,92,255,0.08)",
              boxShadow: "0 10px 40px rgba(13,27,62,0.08)",
            }}
          >
            {/* Mode Switcher Tabs */}
            <div
              className="grid grid-cols-2 p-1.5 rounded-xl mb-6"
              style={{ background: "#f1f5f9" }}
            >
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="py-2 text-xs md:text-sm font-bold rounded-lg transition-all"
                style={{
                  background: mode === "login" ? "#fff" : "transparent",
                  color: mode === "login" ? "#1a5cff" : "#64748b",
                  boxShadow: mode === "login" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="py-2 text-xs md:text-sm font-bold rounded-lg transition-all"
                style={{
                  background: mode === "register" ? "#fff" : "transparent",
                  color: mode === "register" ? "#1a5cff" : "#64748b",
                  boxShadow: mode === "register" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}
              >
                Create Account
              </button>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <div className="badge-live mb-3 w-fit">
                {mode === "login" ? "SECURE ACCESS" : "QUICK SETUP"}
              </div>
              <h2
                className="text-2xl font-bold tracking-tight"
                style={{ color: "#0d1b3e", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {mode === "login" ? "Welcome back 👋" : "Create your account 🚀"}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
                {mode === "login"
                  ? "Sign in to access your business bills and inventory."
                  : "Start managing billing and GST in under a minute."}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="mb-5 rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2"
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#be123c",
                }}
              >
                <span className="shrink-0 text-base">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                className="mb-5 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#047857",
                }}
              >
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {hasClerk ? (
              <div className="w-full">
                <ClerkAuthBox mode={mode} />
              </div>
            ) : (
              <>
                {/* Google Sign-In Button */}
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 mb-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/90 text-slate-700 text-xs font-bold transition shadow-2xs hover:shadow-xs active:scale-[0.99]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.29 21.43 7.37 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    or with email
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <form onSubmit={submit} className="space-y-4">

              {/* REGISTER ONLY: Name & Phone */}
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold" style={{ color: "#334155" }}>
                      Full Name / Business Owner <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: "#94a3b8" }}
                      />
                      <input
                        className="input-premium"
                        style={{ paddingLeft: "2.75rem" }}
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold" style={{ color: "#334155" }}>
                      Phone / Mobile Number
                    </label>
                    <div className="relative">
                      <Phone
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: "#94a3b8" }}
                      />
                      <input
                        className="input-premium"
                        style={{ paddingLeft: "2.75rem" }}
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold" style={{ color: "#334155" }}>
                  Email address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: "#94a3b8" }}
                  />
                  <input
                    className="input-premium"
                    style={{ paddingLeft: "2.75rem" }}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                  />
                </div>
              </div>



              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold" style={{ color: "#334155" }}>
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: "#94a3b8" }}
                  />
                  <input
                    className="input-premium pr-11"
                    style={{ paddingLeft: "2.75rem" }}
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "Minimum 6 characters" : "Enter your password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* REGISTER ONLY: Confirm Password */}
              {mode === "register" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold" style={{ color: "#334155" }}>
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "#94a3b8" }}
                    />
                    <input
                      className="input-premium pr-11"
                      style={{ paddingLeft: "2.75rem" }}
                      type={showConfirmPwd ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-4 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                style={{ padding: "0.85rem" }}
              >
                {busy ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {mode === "login" ? "Signing in…" : "Creating Account…"}
                  </>
                ) : (
                  <>
                    {mode === "login" ? "Sign In to Workspace" : "Complete Registration"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
            </>
            )}

            {/* Toggle Helper Prompt */}
            <div className="mt-5 text-center">
              {mode === "login" ? (
                <p className="text-xs text-slate-500">
                  Don't have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Create a free account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Sign in to your account
                  </button>
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                quick preview
              </span>
              <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
            </div>

            {/* Skip Login / Guest Mode */}
            <button
              type="button"
              onClick={skipLogin}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, rgba(42,191,191,0.08), rgba(26,92,255,0.06))",
                border: "1.5px dashed rgba(42,191,191,0.4)",
                color: "#0d9488",
              }}
            >
              <Zap size={14} style={{ color: "#2abfbf" }} />
              Instant Demo — Continue as Guest
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs" style={{ color: "#94a3b8" }}>
            © 2025 BILZET · Professional billing &amp; GST compliance
          </p>
        </div>
      </div>
    </div>
  );
}
