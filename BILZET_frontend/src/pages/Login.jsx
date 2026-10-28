import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { apiError } from "../api/http";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import Logo from "../components/common/Logo";
import { ClerkGoogleButton } from "../components/auth/ClerkAuth";
import { hasClerk } from "../config/clerk";
import {
  FileText,
  Boxes,
  Box,
  Users,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  Zap,
  CheckCircle,
  Shield,
  Cloud,
  Sparkles,
  Landmark,
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
      <span className="text-[9px] font-bold tracking-[0.22em] text-[#64748B] mt-1.5 uppercase pl-0.5 font-macos">
        BUSINESS MADE SIMPLE
      </span>
    </div>
  );
}

export default function Login({ initialMode = "login" }) {
  const location = useLocation();
  const nav = useNavigate();

  // If URL points to sign-up, redirect to new Signup page immediately
  useEffect(() => {
    if (location.pathname.startsWith("/sign-up") || location.pathname === "/register") {
      nav("/sign-up" + (location.search || ""), { replace: true });
    }
  }, [location.pathname, location.search, nav]);

  // Auth store
  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const googleLogin = useAuth((s) => s.googleLogin);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & UI
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      nav(getWorkspaceRedirectPath(user), { replace: true });
    }
  }, [user, nav]);

  // Google Identity Services client (GIS fallback if Clerk is inactive)
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
      } catch (_) {}
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
      const targetPath = getWorkspaceRedirectPath(loggedUser?.user || useAuth.getState().user);
      setTimeout(() => nav(targetPath, { replace: true }), 350);
    } catch (err) {
      setError(apiError(err) || "Invalid email or password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Instant Demo / Guest Mode Access
  function handleSkipLogin() {
    try {
      useAuth.setState({
        user: {
          id: "demo-admin-id",
          name: "Vicky (Owner)",
          role: "ADMIN",
          email: "owner@bilzet.app",
          isOwner: true,
          businessId: "demo-store-01",
          subscription: {
            planTier: "PREMIUM",
            planName: "Premium Enterprise",
            status: "ACTIVE",
            isActive: true,
            isUnlimited: true,
            maxSubUsers: -1,
          },
        },
        loading: false,
      });
      localStorage.setItem("bilzet_access_token", "demo-token-active");
    } catch (_) {}
    nav("/dashboard");
  }

  return (
    <div
      className="min-h-screen w-full relative overflow-x-hidden font-macos antialiased text-[#526B87] flex flex-col lg:flex-row"
      style={{
        background: "#F7FBFF",
      }}
    >
      {/* Full-bleed layered flowing SVG waves spanning across the entire desktop viewport */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 1440 900"
        >
          <defs>
            <linearGradient id="loginTopCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#EEF7FF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#D8EBFF" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="loginWaveMainFlowGrad" x1="100%" y1="15%" x2="15%" y2="95%">
              <stop offset="0%" stopColor="#EEF7FF" />
              <stop offset="25%" stopColor="#E0EFFE" />
              <stop offset="70%" stopColor="#D8EBFF" />
              <stop offset="100%" stopColor="#C7E1FF" />
            </linearGradient>

            <linearGradient id="loginWaveMidDeepGrad" x1="100%" y1="40%" x2="25%" y2="95%">
              <stop offset="0%" stopColor="#D8EBFF" />
              <stop offset="50%" stopColor="#C7E1FF" />
              <stop offset="100%" stopColor="#B3D7FF" />
            </linearGradient>

            <linearGradient id="loginWaveDeepNavyGrad" x1="100%" y1="65%" x2="40%" y2="98%">
              <stop offset="0%" stopColor="#EAF4FF" />
              <stop offset="55%" stopColor="#D8EBFF" />
              <stop offset="100%" stopColor="#C7E1FF" />
            </linearGradient>

            <linearGradient id="loginWaveRimHighlight" x1="100%" y1="20%" x2="25%" y2="95%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#D8EBFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Top-Right Soft Blue Circle */}
          <ellipse cx="1200" cy="110" rx="380" ry="380" fill="url(#loginTopCircleGrad)" />

          {/* Main Sweeping Wave */}
          <path
            d="M 1440,300 C 1180,360 840,550 660,720 C 580,795 530,850 490,900 L 1440,900 Z"
            fill="url(#loginWaveMainFlowGrad)"
          />

          {/* Edge Highlight */}
          <path
            d="M 1440,300 C 1180,360 840,550 660,720 C 580,795 530,850 490,900"
            fill="none"
            stroke="url(#loginWaveRimHighlight)"
            strokeWidth="3"
          />

          {/* Second Cascading Deep Blue Wave */}
          <path
            d="M 1440,540 C 1200,580 960,710 800,810 C 730,855 680,880 630,900 L 1440,900 Z"
            fill="url(#loginWaveMidDeepGrad)"
          />

          {/* Third Cascading Deep Navy Wave */}
          <path
            d="M 1440,730 C 1260,750 1080,830 960,875 C 910,890 870,898 820,900 L 1440,900 Z"
            fill="url(#loginWaveDeepNavyGrad)"
          />
        </svg>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LEFT MARKETING PANEL — ~60% Width Desktop
          ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[59%] xl:w-[60%] relative z-10 flex flex-col justify-between p-6 sm:p-10 lg:pl-16 lg:pr-10 lg:py-10 shrink-0 min-h-screen">
        <div className="flex flex-col h-full justify-between max-w-xl">
          {/* Top Brand Logo & Compact Pill Badge */}
          <div className="mb-6 lg:mb-8">
            <BrandHeader logoHeight="h-10" />

            {/* Small pill matching reference: “Smart Billing · Inventory · GST · CA Connect” */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF7FF] border border-[#D8EBFF] text-[11.5px] font-semibold tracking-tight shadow-2xs mt-3 select-none font-macos">
              <span className="text-[#2563EB] text-xs leading-none">✧</span>
              <span className="text-[#2563EB]">Smart Billing</span>
              <span className="text-[#7188A3]">&middot; Inventory &middot; GST &middot; CA Connect</span>
            </div>
          </div>

          {/* Main Headline & Supporting Paragraph with Apple / macOS Typography */}
          <div className="my-auto py-2">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.12] text-[#526B87] mb-3.5 font-macos">
              Manage Billing,<br />
              Inventory and GST<br />
              <span className="bg-gradient-to-r from-[#2563EB] to-[#8AAED8] bg-clip-text text-transparent font-black">
                in One Place.
              </span>
            </h1>

            <p className="text-[14.5px] sm:text-[15.5px] text-[#7188A3] leading-relaxed font-normal mb-7 lg:mb-8 max-w-md font-macos">
              A simple and powerful platform to run your business, stay GST compliant and collaborate with your team and CA — all in one place.
            </p>

            {/* Four Feature Rows with Compact Rounded-Square Icons */}
            <div className="space-y-3.5 lg:space-y-4">
              {/* Feature 1: GST Ready Invoicing */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EEF7FF] border border-[#D8EBFF] flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-[#2563EB]" strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14.5px] font-bold text-[#526B87] tracking-tight leading-snug font-macos">
                    GST Ready Invoicing
                  </h2>
                  <p className="text-[13px] text-[#7188A3] leading-normal mt-0.5 font-macos">
                    Create and share GST-compliant invoices in seconds.
                  </p>
                </div>
              </div>

              {/* Feature 2: Inventory Management */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#ECF9F1] border border-[#C8E6C9] flex items-center justify-center shrink-0">
                  <Box size={18} className="text-[#166534]" strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14.5px] font-bold text-[#526B87] tracking-tight leading-snug font-macos">
                    Inventory Management
                  </h2>
                  <p className="text-[13px] text-[#7188A3] leading-normal mt-0.5 font-macos">
                    Track stock, purchases and sales easily.
                  </p>
                </div>
              </div>

              {/* Feature 3: CA Connect */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#F0F7FF] border border-[#D8EBFF] flex items-center justify-center shrink-0">
                  <Users size={18} className="text-[#2563EB]" strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14.5px] font-bold text-[#526B87] tracking-tight leading-snug font-macos">
                    CA Connect
                  </h2>
                  <p className="text-[13px] text-[#7188A3] leading-normal mt-0.5 font-macos">
                    Share data and reports with your CA without manual work.
                  </p>
                </div>
              </div>

              {/* Feature 4: Secure & Reliable */}
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FFF6E9] border border-[#FDE68A] flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-[#B45309]" strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14.5px] font-bold text-[#526B87] tracking-tight leading-snug font-macos">
                    Secure &amp; Reliable
                  </h2>
                  <p className="text-[13px] text-[#7188A3] leading-normal mt-0.5 font-macos">
                    Your business data is safe and always accessible.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Panel Footer with Small Outline Icons Matching Reference Image */}
          <div className="pt-5 border-t border-[#E3EDF8] flex flex-wrap items-center justify-between gap-3 text-xs text-[#7188A3] font-macos">
            <span>&copy; {new Date().getFullYear()} BILZET. All rights reserved.</span>
            <div className="flex items-center gap-3 text-[11.5px] font-medium text-[#2563EB]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#2563EB]" strokeWidth={2} />
                GST Ready
              </span>
              <span className="text-[#8AAED8]">|</span>
              <span className="flex items-center gap-1.5">
                <Landmark size={14} className="text-[#2563EB]" strokeWidth={2} />
                Bank Grade Security
              </span>
              <span className="text-[#8AAED8]">|</span>
              <span className="flex items-center gap-1.5">
                <Cloud size={14} className="text-[#2563EB]" strokeWidth={2} />
                Cloud Access
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL — ~40% Width Desktop
          macOS-Inspired White Card Floating Over Waves
          ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[41%] xl:w-[40%] relative z-10 flex flex-col justify-center items-center lg:items-end p-4 sm:p-6 lg:pr-12 lg:py-8 min-h-screen">
        {/* Floating Centered White Form Card */}
        <div className="w-full max-w-[460px] bg-white rounded-[26px] border border-[#E3EDF8] shadow-xl p-6 sm:p-7 relative font-macos">
          {/* Top Brand Logo */}
          <div className="flex items-center justify-between mb-4">
            <BrandHeader logoHeight="h-7.5" />
            <Link
              to="/sign-up"
              className="text-[12px] font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition-colors font-macos"
            >
              Create Account &rarr;
            </Link>
          </div>

          {/* Heading and Supporting Text */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-[26px] font-bold text-[#526B87] tracking-tight leading-tight mb-1 font-macos">
              Sign in to your account
            </h1>
            <p className="text-[13px] text-[#7188A3] leading-normal font-normal font-macos">
              Enter your credentials to access your store workspace.
            </p>
          </div>

          {/* Error / Success Alerts */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-[#FFF0F2] border border-[#FECDD3] text-[#991B1B] text-xs sm:text-[13px] flex items-start gap-2.5 animate-fadeIn font-macos"
            >
              <AlertCircle size={15} className="shrink-0 text-[#EF4444] mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-[#ECF9F1] border border-[#C8E6C9] text-[#166534] text-xs sm:text-[13px] flex items-start gap-2.5 animate-fadeIn font-macos"
            >
              <Check size={15} className="shrink-0 text-[#166534] mt-0.5" />
              <div className="flex-1 font-medium">{success}</div>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4 font-macos">
            {/* ─── Field 1: Email Address ─── */}
            <div>
              <label
                htmlFor="signin-email"
                className="block text-xs font-semibold text-[#526B87] mb-1.5 font-macos"
              >
                Email address <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                  <Mail size={16} strokeWidth={1.8} />
                </div>
                <input
                  id="signin-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-[42px] pl-9 pr-3.5 rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] text-[13px] text-[#526B87] placeholder:text-[#94A8BE] focus:outline-none focus:border-[#8AAED8] focus:ring-2 focus:ring-[#8AAED8]/15 transition-all font-macos"
                />
              </div>
            </div>

            {/* ─── Field 2: Password ─── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="signin-password"
                  className="block text-xs font-semibold text-[#526B87] font-macos"
                >
                  Password <span className="text-[#EF4444]">*</span>
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                  <Lock size={15} strokeWidth={1.8} />
                </div>
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-[42px] pl-9 pr-10 rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] text-[13px] text-[#526B87] placeholder:text-[#94A8BE] focus:outline-none focus:border-[#8AAED8] focus:ring-2 focus:ring-[#8AAED8]/15 transition-all font-macos"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A8BE] hover:text-[#526B87] transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>

            {/* ─── Remember Me & Forgot Password ─── */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="signin-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2563EB] border-[#E3EDF8] focus:ring-[#8AAED8] cursor-pointer"
                />
                <span className="text-xs text-[#7188A3] font-medium font-macos">Remember my device</span>
              </label>

              <button
                type="button"
                onClick={() => setError("Please contact your Store Administrator or support@bilzet.app to reset your credentials.")}
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline focus:outline-none font-macos"
              >
                Forgot password?
              </button>
            </div>

            {/* ─── Primary CTA Button (Warm Yellow #FFC533) ─── */}
            <button
              type="submit"
              id="signin-submit-btn"
              disabled={busy}
              className="w-full h-[42px] rounded-[10px] font-bold text-[14px] text-[#111827] bg-[#FFC533] hover:bg-[#F5B822] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 font-macos shadow-[0_2px_8px_rgba(255,197,51,0.35)]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin text-[#111827]" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight size={16} strokeWidth={2.2} />
                </>
              )}
            </button>

            {/* ─── Divider: "or" ─── */}
            <div className="relative flex items-center justify-center my-2.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EDF3FA]" />
              </div>
              <span className="relative px-3 bg-white text-[11px] text-[#94A8BE] lowercase font-medium font-macos">
                or
              </span>
            </div>

            {/* ─── Google OAuth Button ─── */}
            {hasClerk ? (
              <ClerkGoogleButton
                mode="login"
                onError={setError}
                setBusy={setBusy}
                busy={busy}
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
                    setError("Google sign-in is initializing. Please try again in a moment.");
                  }
                }}
                className="w-full h-[42px] rounded-[9px] border border-[#E3EDF8] bg-white hover:bg-[#F4F9FF] text-[#526B87] text-[13px] font-medium transition-all flex items-center justify-center gap-2.5 cursor-pointer font-macos"
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
            )}

            {/* ─── Instant Demo / Guest Mode ─── */}
            <button
              type="button"
              onClick={handleSkipLogin}
              className="w-full flex items-center justify-center gap-2 rounded-[9px] py-2 text-xs font-semibold transition-all duration-200 border border-[#E3EDF8] bg-[#F4F9FF] text-[#526B87] hover:bg-[#EEF7FF] cursor-pointer font-macos"
            >
              <Zap size={14} className="text-[#2563EB]" />
              <span>Instant Demo — Continue as Guest</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
