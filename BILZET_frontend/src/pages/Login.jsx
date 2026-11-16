import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { apiError } from "../api/http";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import { ClerkGoogleButton } from "../components/auth/ClerkAuth";
import { hasClerk } from "../config/clerk";
import WaveBackground from "../components/auth/WaveBackground";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TOP-RIGHT CARD DECORATION
   Black → charcoal → grey organic curved shapes, no sharp edges.
───────────────────────────────────────────────────────────────────────────── */
function TopRightWave() {
  return (
    <div
      className="absolute top-0 right-0 pointer-events-none select-none overflow-hidden rounded-tr-[30px]"
      style={{ width: 260, height: 220 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 260 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="trG1" x1="260" y1="0" x2="80" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#111318" stopOpacity="0.92" />
            <stop offset="45%"  stopColor="#20232C" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#454953" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="trG2" x1="260" y1="0" x2="100" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#20232C" stopOpacity="0.70" />
            <stop offset="55%"  stopColor="#454953" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#A9ABB5" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="trG3" x1="260" y1="20" x2="130" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#454953" stopOpacity="0.55" />
            <stop offset="60%"  stopColor="#A9ABB5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#E3E3E5" stopOpacity="0.00" />
          </linearGradient>
          <filter id="trBlur">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {/* Primary dark curved shape */}
        <path
          d="M260,0 L260,80 C230,100 180,60 140,90 C100,118 80,70 50,100 C20,130 0,100 0,80 L0,0 Z"
          fill="url(#trG1)"
          filter="url(#trBlur)"
        />
        {/* Secondary charcoal sweep */}
        <path
          d="M260,0 L260,55 C220,72 175,38 135,62 C95,86 70,50 30,74 C10,86 0,72 0,60 L0,0 Z"
          fill="url(#trG2)"
        />
        {/* Tertiary light-grey feather */}
        <path
          d="M260,0 L260,35 C230,48 190,22 155,40 C120,58 90,28 50,44 L0,30 L0,0 Z"
          fill="url(#trG3)"
          filter="url(#trBlur)"
        />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BOTTOM CARD WAVE DECORATION
   4 overlapping black → charcoal → grey → light-grey SVG paths.
───────────────────────────────────────────────────────────────────────────── */
function BottomCardWave() {
  return (
    <div
      className="pointer-events-none select-none overflow-hidden rounded-b-[30px]"
      style={{ height: 88, marginLeft: -40, marginRight: -40, marginBottom: -40 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 540 88"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="bwDark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#20232C" stopOpacity="0.80" />
            <stop offset="50%"  stopColor="#111318" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#20232C" stopOpacity="0.80" />
          </linearGradient>
          <linearGradient id="bwMid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#111318" stopOpacity="0.90" />
            <stop offset="45%"  stopColor="#20232C" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#454953" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="bwGrey" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#454953" stopOpacity="0.65" />
            <stop offset="55%"  stopColor="#A9ABB5" stopOpacity="0.50" />
            <stop offset="100%" stopColor="#E3E3E5" stopOpacity="0.40" />
          </linearGradient>
          <linearGradient id="bwBase" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#111318" />
            <stop offset="100%" stopColor="#20232C" />
          </linearGradient>
        </defs>

        {/* Wave 1 — lightest, highest crest */}
        <path
          d="M0,52 C80,30 160,66 280,46 C380,28 460,58 540,40 L540,88 L0,88 Z"
          fill="url(#bwGrey)"
        />
        {/* Wave 2 — mid charcoal */}
        <path
          d="M0,60 C90,40 200,72 320,54 C420,38 490,64 540,50 L540,88 L0,88 Z"
          fill="url(#bwDark)"
        />
        {/* Wave 3 — deep charcoal */}
        <path
          d="M0,68 C100,52 220,78 350,62 C450,50 505,72 540,60 L540,88 L0,88 Z"
          fill="url(#bwMid)"
        />
        {/* Wave 4 — solid dark base fill */}
        <path
          d="M0,76 C120,64 260,84 400,72 C480,64 520,78 540,70 L540,88 L0,88 Z"
          fill="url(#bwBase)"
        />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GOOGLE SVG LOGO (official multicolor, never recolored)
───────────────────────────────────────────────────────────────────────────── */
function GoogleLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.29 21.43 7.37 24 12 24z" />
      <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN LOGIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function Login({ initialMode = "login" }) {
  const location  = useLocation();
  const nav       = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const returnUrl    = searchParams.get("returnUrl") || "";
  const queryEmail   = searchParams.get("email")     || "";

  // If URL points to sign-up, redirect immediately
  useEffect(() => {
    if (location.pathname.startsWith("/sign-up") || location.pathname === "/register") {
      nav("/sign-up" + (location.search || ""), { replace: true });
    }
  }, [location.pathname, location.search, nav]);

  // Auth store
  const user        = useAuth((s) => s.user);
  const loading     = useAuth((s) => s.loading);
  const login       = useAuth((s) => s.login);
  const googleLogin = useAuth((s) => s.googleLogin);

  // Form state
  const [email,        setEmail]        = useState(queryEmail);
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]   = useState(true);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      const isAuthPath = (p) =>
        !p || p.startsWith("/sign-in") || p.startsWith("/sign-up") ||
        p === "/login" || p === "/register";
      const safeReturn = isAuthPath(returnUrl) ? null : returnUrl;
      const target     = safeReturn || getWorkspaceRedirectPath(user);
      if (target && !isAuthPath(target) && target !== location.pathname) {
        nav(target, { replace: true });
      }
    }
  }, [user, loading, nav, returnUrl, location.pathname]);

  // Google Identity Services (fallback when Clerk is inactive)
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId || hasClerk) return;
    const script    = document.createElement("script");
    script.src      = "https://accounts.google.com/gsi/client";
    script.async    = true;
    script.defer    = true;
    script.onload   = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response?.credential) {
              setBusy(true);
              setError("");
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
    return () => { try { document.body.removeChild(script); } catch (_) {} };
  }, [googleLogin, nav]);

  // Form submission
  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    if (!email.trim() || !email.includes("@")) return setError("Please enter your registered email address.");
    if (!password) return setError("Please enter your account password.");
    setBusy(true);
    try {
      const loggedUser = await login({ email: email.trim().toLowerCase(), password });
      setSuccess("Authentication successful! Loading your workspace…");
      const isAuthPath = (p) =>
        !p || p.startsWith("/sign-in") || p.startsWith("/sign-up") ||
        p === "/login" || p === "/register";
      const safeReturn  = isAuthPath(returnUrl) ? null : returnUrl;
      const targetPath  = safeReturn || getWorkspaceRedirectPath(loggedUser?.user || useAuth.getState().user);
      const destination = (!targetPath || isAuthPath(targetPath)) ? "/dashboard" : targetPath;
      setTimeout(() => nav(destination, { replace: true }), 350);
    } catch (err) {
      setError(apiError(err) || "Invalid email or password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ── input inline focus handlers ──────────────────────────────────────── */
  const inputFocusStyle  = { borderColor: "#5BF07B", boxShadow: "0 0 0 3px rgba(91,240,123,0.14)" };
  const inputBlurStyle   = { borderColor: "#E1E3E8", boxShadow: "none" };
  const baseInputStyle   = {
    height: 58, background: "#F2F3F5", border: "1px solid #E1E3E8",
    borderRadius: 18, fontSize: 15, color: "#111318", outline: "none",
    transition: "border-color 0.18s, box-shadow 0.18s",
    fontFamily: "Inter, sans-serif", width: "100%",
    paddingLeft: 48, paddingRight: 48,
  };

  return (
    /* ── Page wrapper ──────────────────────────────────────────────────── */
    <div
      className="min-h-screen w-full relative overflow-x-hidden font-sans antialiased flex items-center justify-center p-4 py-10"
      style={{ background: "#F6F6F8" }}
    >
      {/* Page-level subtle wave background (white/grey/mint — preserved) */}
      <WaveBackground />

      {/* ── LOGIN CARD ───────────────────────────────────────────────────── */}
      <div
        className="relative z-10 w-full animate-card-enter"
        style={{
          maxWidth: 500,
          background: "#FAFAFB",
          borderRadius: 30,
          border: "1px solid rgba(255,255,255,0.90)",
          boxShadow: "0 16px 50px rgba(17,19,24,0.09)",
          padding: 40,
          overflow: "hidden",
        }}
      >
        {/* ── Top-right black-gradient wave decoration ─────────────────── */}
        <TopRightWave />

        {/* ── BILZET Logo (top-left) ───────────────────────────────────── */}
        <div className="mb-8 relative z-10">
          <img
            src="/assets/bilzet-logo-dark.png"
            alt="BILZET"
            className="h-9 w-auto object-contain"
            onError={(e) => { e.target.src = "/assets/bilzet-logo-transparent.png"; }}
            loading="eager"
            draggable={false}
          />
        </div>

        {/* ── Heading + green underline + subtitle ─────────────────────── */}
        <div className="mb-8 relative z-10">
          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 52px)",
              fontWeight: 700,
              color: "#111318",
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              fontFamily: "Inter, sans-serif",
              marginBottom: 14,
            }}
          >
            Welcome Back<br />to BILZET
          </h1>

          {/* Green gradient underline */}
          <div
            style={{
              width: 220,
              height: 6,
              borderRadius: 999,
              background: "linear-gradient(90deg, #16C957 0%, #5BF07B 100%)",
              marginBottom: 16,
            }}
          />

          <p style={{ fontSize: 17, color: "#7C7F8A", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
            Sign in to manage your business.
          </p>
        </div>

        {/* ── Alerts ───────────────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 animate-fadeIn"
            style={{
              padding: "12px 16px", borderRadius: 14,
              background: "#FBD3D3", border: "1px solid rgba(229,72,77,0.25)",
              color: "#E5484D", fontSize: 13,
            }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="font-semibold flex-1">{error}</span>
          </div>
        )}
        {success && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 animate-fadeIn"
            style={{
              padding: "12px 16px", borderRadius: 14,
              background: "#DFFFE6", border: "1px solid rgba(22,201,87,0.35)",
              color: "#0E5C2A", fontSize: 13,
            }}
          >
            <Check size={16} className="shrink-0 mt-0.5" />
            <span className="font-semibold flex-1">{success}</span>
          </div>
        )}

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5 relative z-10">

          {/* Email */}
          <div>
            <label
              htmlFor="signin-email"
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111318", marginBottom: 8, fontFamily: "Inter, sans-serif" }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#7C7F8A", display: "flex", pointerEvents: "none" }}>
                <Mail size={17} strokeWidth={1.8} />
              </span>
              <input
                id="signin-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                style={baseInputStyle}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e)  => Object.assign(e.target.style, inputBlurStyle)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="signin-password"
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111318", marginBottom: 8, fontFamily: "Inter, sans-serif" }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#7C7F8A", display: "flex", pointerEvents: "none" }}>
                <Lock size={16} strokeWidth={1.8} />
              </span>
              <input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ ...baseInputStyle, paddingRight: 52 }}
                onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                onBlur={(e)  => Object.assign(e.target.style, inputBlurStyle)}
              />
              <button
                type="button"
                id="toggle-password-visibility"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7C7F8A", display: "flex", padding: 4 }}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot password */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
              <input
                id="signin-remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-[#16C957]"
              />
              <span style={{ fontSize: 14, color: "#7C7F8A", fontFamily: "Inter, sans-serif" }}>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => setError("Please contact your Store Administrator or support@bilzet.app to reset your credentials.")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600, color: "#16C957",
                fontFamily: "Inter, sans-serif", padding: 0,
              }}
              className="hover:underline focus:outline-none"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            id="signin-submit-btn"
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 font-bold text-white cursor-pointer transition-all active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              height: 76,
              background: "#12151C",
              borderRadius: 999,
              fontSize: 18,
              fontFamily: "Inter, sans-serif",
              border: "none",
              boxShadow: "0 6px 24px rgba(17,19,24,0.22)",
              letterSpacing: "-0.3px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 12px 36px rgba(17,19,24,0.36)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(17,19,24,0.22)";  e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {busy ? (
              <>
                <Loader2 size={22} className="animate-spin" style={{ color: "#5BF07B" }} />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(91,240,123,0.18)", flexShrink: 0,
                }}>
                  <ArrowRight size={18} strokeWidth={2.5} style={{ color: "#5BF07B" }} />
                </span>
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "#E7E8EC" }} />
            <span style={{ fontSize: 13, color: "#A9ABB5", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "#E7E8EC" }} />
          </div>

          {/* Google button */}
          {hasClerk ? (
            <ClerkGoogleButton
              mode="login"
              onError={setError}
              setBusy={setBusy}
              busy={busy}
              className="w-full flex items-center justify-center gap-3 font-semibold text-[#111318] cursor-pointer transition-all"
              style={{
                height: 70, background: "#FFFFFF",
                border: "1px solid #E1E3E8", borderRadius: 999,
                fontSize: 15, fontFamily: "Inter, sans-serif",
                boxShadow: "0 1px 6px rgba(17,19,24,0.06)",
              }}
            />
          ) : (
            <button
              type="button"
              id="signin-google-btn"
              disabled={busy}
              onClick={() => {
                if (window.google?.accounts?.id) {
                  window.google.accounts.id.prompt();
                } else {
                  setError("Google Sign-In is initializing. Please wait a moment or sign in with your email.");
                }
              }}
              className="w-full flex items-center justify-center gap-3 font-semibold text-[#111318] cursor-pointer transition-all hover:bg-[#F6F6F8] disabled:opacity-60"
              style={{
                height: 70, background: "#FFFFFF",
                border: "1px solid #E1E3E8", borderRadius: 999,
                fontSize: 15, fontFamily: "Inter, sans-serif",
                boxShadow: "0 1px 6px rgba(17,19,24,0.06)",
              }}
            >
              <GoogleLogo size={22} />
              <span>Continue with Google</span>
            </button>
          )}

        </form>

        {/* ── Bottom black wave decoration ─────────────────────────────── */}
        <div className="relative mt-6 z-10">
          {/* Account link sits above the waves */}
          <p style={{ textAlign: "center", fontSize: 16, color: "#7C7F8A", fontFamily: "Inter, sans-serif", marginBottom: 20, fontWeight: 500 }}>
            Don't have an account?{" "}
            <Link
              to="/sign-up"
              style={{ color: "#16C957", fontWeight: 600, textDecoration: "none" }}
              className="hover:underline"
            >
              Create a new account
            </Link>
          </p>

          <BottomCardWave />
        </div>

      </div>
    </div>
  );
}
