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
  ShieldCheck,
  Users,
  BarChart3,
} from "lucide-react";

// Official BILZET Brand Header with High-Resolution Logo & Subtitle
function BrandHeader({ className = "", logoHeight = "h-10" }) {
  return (
    <div className={`flex flex-col items-start select-none ${className}`}>
      <img
        src="/assets/bilzet-logo-dark.png"
        alt="BILZET"
        className={`${logoHeight} w-auto object-contain shrink-0`}
        onError={(e) => {
          e.target.src = "/assets/bilzet-logo-transparent.png";
        }}
        loading="eager"
      />
      <span className="text-[9px] font-bold tracking-[0.24em] text-[#7C7F8A] mt-1.5 uppercase pl-0.5 font-sans">
        BUSINESS MADE SIMPLE
      </span>
    </div>
  );
}

export default function Login({ initialMode = "login" }) {
  const location = useLocation();
  const nav = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = searchParams.get("returnUrl") || "";
  const queryEmail = searchParams.get("email") || "";

  // If URL points to sign-up, redirect to Signup page immediately
  useEffect(() => {
    if (location.pathname.startsWith("/sign-up") || location.pathname === "/register") {
      nav("/sign-up" + (location.search || ""), { replace: true });
    }
  }, [location.pathname, location.search, nav]);

  // Auth store
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const login = useAuth((s) => s.login);
  const googleLogin = useAuth((s) => s.googleLogin);

  // Form Fields
  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & UI
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      const isAuthPath = (p) =>
        !p ||
        p.startsWith("/sign-in") ||
        p.startsWith("/sign-up") ||
        p === "/login" ||
        p === "/register";

      const safeReturnUrl = isAuthPath(returnUrl) ? null : returnUrl;
      const targetPath = safeReturnUrl || getWorkspaceRedirectPath(user);

      if (targetPath && !isAuthPath(targetPath) && targetPath !== location.pathname) {
        nav(targetPath, { replace: true });
      }
    }
  }, [user, loading, nav, returnUrl, location.pathname]);

  // Google Identity Services fallback if Clerk is inactive
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId || hasClerk) return;

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

    return () => {
      try {
        document.body.removeChild(script);
      } catch (_) { }
    };
  }, [googleLogin, nav]);

  // Handle Sign-In Form Submission
  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");

    if (!email.trim() || !email.includes("@")) {
      return setError("Please enter your registered email address.");
    }
    if (!password) {
      return setError("Please enter your account password.");
    }

    setBusy(true);
    try {
      const loggedUser = await login({
        email: email.trim().toLowerCase(),
        password,
      });
      setSuccess("Authentication successful! Loading your workspace...");
      const isAuthPath = (p) =>
        !p ||
        p.startsWith("/sign-in") ||
        p.startsWith("/sign-up") ||
        p === "/login" ||
        p === "/register";
      const safeReturnUrl = isAuthPath(returnUrl) ? null : returnUrl;
      const targetPath = safeReturnUrl || getWorkspaceRedirectPath(loggedUser?.user || useAuth.getState().user);
      const destination = (!targetPath || isAuthPath(targetPath)) ? "/dashboard" : targetPath;
      setTimeout(() => nav(destination, { replace: true }), 350);
    } catch (err) {
      setError(apiError(err) || "Invalid email or password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-[#111318] bg-[#FAFAFB] flex flex-col lg:flex-row selection:bg-[#CDEBE7] selection:text-[#1A3A36]">
      {/* ── Flowing Wave Gradient Background ────────────────────────── */}
      <WaveBackground />

      {/* ══════════════════════════════════════════════════════════════
          LEFT SECTION — ~55% Width Desktop
          Clean Minimalist Typography + Feature Badges (NO illustrations)
          ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[55%] xl:w-[56%] relative z-10 flex flex-col justify-between p-6 sm:p-10 lg:pl-16 xl:pl-20 lg:pr-8 py-8 lg:py-12 shrink-0 min-h-auto lg:min-h-screen">
        <div className="flex flex-col h-full justify-between max-w-xl">
          {/* Top: BILZET Logo */}
          <div className="mb-8 lg:mb-12">
            <BrandHeader logoHeight="h-10 sm:h-11" />
          </div>

          {/* Center: Main Headline, Description & 3 Feature Badges */}
          <div className="my-auto py-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] xl:text-[58px] font-semibold text-[#111318] tracking-tight leading-[1.12] mb-5">
              One Platform for<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2D7A70] via-[#4BA89B] to-[#A9DAD3]">
                Your Business Finance.
              </span>
            </h1>

            <p className="text-[15px] sm:text-[16px] text-[#7C7F8A] leading-relaxed font-normal mb-8 max-w-lg">
              Billing, Inventory, GST Compliance, CA Collaboration, and Business Analytics — All in One.
            </p>

            {/* Three Compact Feature Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Badge 1: GST Compliant */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 backdrop-blur-xs border border-[#E7E8EC] shadow-2xs hover:border-[#A9DAD3]/80 transition-all cursor-default select-none">
                <div className="w-6 h-6 rounded-full bg-[#E2F6F3] text-[#2D7A70] border border-[#CDEBE7]/60 flex items-center justify-center shrink-0">
                  <ShieldCheck size={13} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-semibold text-[#111318]">GST Compliant</span>
              </div>

              {/* Badge 2: CA Connect */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 backdrop-blur-xs border border-[#E7E8EC] shadow-2xs hover:border-[#A9DAD3]/80 transition-all cursor-default select-none">
                <div className="w-6 h-6 rounded-full bg-[#E2F6F3] text-[#2D7A70] border border-[#CDEBE7]/60 flex items-center justify-center shrink-0">
                  <Users size={13} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-semibold text-[#111318]">CA Connect</span>
              </div>

              {/* Badge 3: Business Analytics */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 backdrop-blur-xs border border-[#E7E8EC] shadow-2xs hover:border-[#A9DAD3]/80 transition-all cursor-default select-none">
                <div className="w-6 h-6 rounded-full bg-[#E2F6F3] text-[#2D7A70] border border-[#CDEBE7]/60 flex items-center justify-center shrink-0">
                  <BarChart3 size={13} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-semibold text-[#111318]">Business Analytics</span>
              </div>
            </div>
          </div>

          {/* Bottom Left Footer */}
          <div className="pt-8 border-t border-[#D8D9DE]/60 hidden lg:flex items-center justify-between text-xs text-[#7C7F8A]">
            <span>&copy; {new Date().getFullYear()} BILZET. All rights reserved.</span>
            <div className="flex items-center gap-2 font-medium text-[#111318]">
              <span className="w-2 h-2 rounded-full bg-[#A9DAD3]" />
              <span>Enterprise Grade Fintech ERP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT SECTION — ~45% Width Desktop
          Premium Login Card: Black Border & Concentric Circular Rings
          ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[45%] xl:w-[44%] relative z-10 flex flex-col justify-center items-center lg:items-end p-4 sm:p-8 lg:pr-16 xl:pr-20 py-8 lg:py-12 min-h-auto lg:min-h-screen">
        <div
          className="w-full max-w-[calc(100%-16px)] sm:max-w-[495px] rounded-[24px] sm:rounded-[32px] animate-card-enter relative overflow-hidden bg-white"
          style={{
            border: "2.5px solid #12151C",
            boxShadow: "0 18px 45px rgba(17,19,24,0.13)",
            padding: "clamp(24px, 5vw, 40px)",
          }}
        >
          {/* ── 1. Top-Right Concentric Rings (4 rings) ──────────────── */}
          <div
            className="absolute top-0 right-0 w-[190px] h-[190px] sm:w-[230px] sm:h-[230px] pointer-events-none select-none z-0 overflow-hidden"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Ring 1 (outermost): Thin charcoal outline */}
              <circle cx="200" cy="0" r="170" stroke="#12151C" strokeWidth="1.8" strokeOpacity="0.25" />
              {/* Ring 2: Intermediate light-grey outline */}
              <circle cx="200" cy="0" r="126" stroke="#DDE1E6" strokeWidth="1.6" strokeOpacity="0.85" />
              {/* Ring 3: Mint-green accent outline */}
              <circle cx="200" cy="0" r="82" stroke="#5BF07B" strokeWidth="2" strokeOpacity="0.95" />
              {/* Ring 4 (innermost): Thin charcoal outline with soft pale-mint circular fill */}
              <circle cx="200" cy="0" r="42" stroke="#12151C" strokeWidth="1.8" fill="#DFFFE6" fillOpacity="0.85" />
            </svg>
          </div>

          {/* ── 2. Bottom-Left Concentric Rings (4 rings) ─────────────── */}
          <div
            className="absolute bottom-0 left-0 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] pointer-events-none select-none z-0 overflow-hidden"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="blMintGradient" cx="20%" cy="80%" r="70%">
                  <stop offset="0%" stopColor="#5BF07B" stopOpacity="0.45" />
                  <stop offset="65%" stopColor="#DFFFE6" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#DFFFE6" stopOpacity="0.25" />
                </radialGradient>
              </defs>
              {/* Ring 1 (outermost): Light-grey outline */}
              <circle cx="0" cy="200" r="165" stroke="#DDE1E6" strokeWidth="1.6" strokeOpacity="0.8" />
              {/* Ring 2: Thin charcoal outline */}
              <circle cx="0" cy="200" r="122" stroke="#12151C" strokeWidth="1.8" strokeOpacity="0.25" />
              {/* Ring 3: Mint-green accent outline */}
              <circle cx="0" cy="200" r="80" stroke="#5BF07B" strokeWidth="2" strokeOpacity="0.95" />
              {/* Ring 4 (innermost): Black outline with subtle mint-green circular gradient */}
              <circle cx="0" cy="200" r="40" stroke="#12151C" strokeWidth="1.8" fill="url(#blMintGradient)" />
            </svg>
          </div>

          {/* ── 3. Login Content (Protected relative z-10 above rings) ── */}
          <div className="relative z-10">
            {/* Card Heading & Underline */}
            <div className="mb-6">
              <h2
                className="font-bold text-[#111318] leading-[1.15] mb-2 font-sans"
                style={{ fontSize: "clamp(24px, 4.2vw, 34px)" }}
              >
                Welcome Back to BILZET
              </h2>
              {/* Mint-Green Gradient Underline */}
              <div
                className="w-[150px] h-[5px] rounded-full mb-3 bg-gradient-to-r from-[#16C957] to-[#5BF07B]"
              />
              <p className="text-[15px] text-[#7C7F8A] leading-normal font-normal">
                Sign in to manage your business.
              </p>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-[16px] bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D] text-xs sm:text-[13px] flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle size={16} className="shrink-0 text-[#E5484D] mt-0.5" />
                <div className="flex-1 font-semibold">{error}</div>
              </div>
            )}

            {success && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-[16px] bg-[#DFFFE6] border border-[#5BF07B]/50 text-[#0E2A16] text-xs sm:text-[13px] flex items-start gap-2.5 animate-fadeIn"
              >
                <Check size={16} className="shrink-0 text-[#0E2A16] mt-0.5" />
                <div className="flex-1 font-semibold">{success}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Field: Email Address */}
              <div>
                <label
                  htmlFor="signin-email"
                  className="block text-[13px] font-semibold text-[#111318] mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7C7F8A]">
                    <Mail size={17} strokeWidth={1.8} />
                  </div>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full h-[54px] pl-11 pr-4 rounded-[16px] border border-[#E1E3E8] bg-[#F2F3F5] text-[14px] text-[#111318] placeholder:text-[#A9ABB5] focus:outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/30 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Field: Password */}
              <div>
                <label
                  htmlFor="signin-password"
                  className="block text-[13px] font-semibold text-[#111318] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7C7F8A]">
                    <Lock size={16} strokeWidth={1.8} />
                  </div>
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-[54px] pl-11 pr-12 rounded-[16px] border border-[#E1E3E8] bg-[#F2F3F5] text-[14px] text-[#111318] placeholder:text-[#A9ABB5] focus:outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/30 transition-all font-sans"
                  />
                  <button
                    type="button"
                    id="toggle-password-visibility"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#7C7F8A] hover:text-[#111318] transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="signin-remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E1E3E8] text-[#16C957] accent-[#16C957] cursor-pointer"
                  />
                  <span className="text-[13px] text-[#7C7F8A] font-medium">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setError("Please contact your Store Administrator or support@bilzet.app to reset your credentials.")}
                  className="text-[13px] font-semibold text-[#16C957] hover:text-[#13a847] hover:underline focus:outline-none cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                id="signin-submit-btn"
                disabled={busy}
                className="w-full h-[56px] rounded-full font-semibold text-[15px] text-white bg-[#12151C] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(18,21,28,0.28)] active:translate-y-0 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-3 shadow-md"
              >
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-[#5BF07B]" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={17} strokeWidth={2.4} className="text-[#5BF07B]" />
                  </>
                )}
              </button>

              {/* Divider: "or continue with" */}
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E1E3E8]" />
                </div>
                <span className="relative px-3 bg-white text-[12px] text-[#A9ABB5] font-medium">
                  or continue with
                </span>
              </div>

              {/* Google OAuth Button */}
              {hasClerk ? (
                <ClerkGoogleButton
                  mode="login"
                  onError={setError}
                  setBusy={setBusy}
                  busy={busy}
                  className="w-full h-[54px] rounded-full border border-[#E1E3E8] bg-white hover:bg-[#F6F6F8] text-[#111318] text-[14px] font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
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
                  className="w-full h-[54px] rounded-full border border-[#E1E3E8] bg-white hover:bg-[#F6F6F8] text-[#111318] text-[14px] font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.29 21.43 7.37 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.09z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z" />
                  </svg>
                  <span className="text-[#111318]">Continue with Google</span>
                </button>
              )}

              {/* Bottom Registration Link */}
              <div className="pt-3 text-center text-[13px] text-[#7C7F8A]">
                <span>Don't have an account? </span>
                <Link
                  to="/sign-up"
                  className="text-[#16C957] font-bold hover:underline transition-colors ml-1"
                >
                  Create a new account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
