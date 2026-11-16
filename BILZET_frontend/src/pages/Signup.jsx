import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { apiError } from "../api/http";
import { referralApi, roleInvitationApi } from "../api";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import { ClerkGoogleButton } from "../components/auth/ClerkAuth";
import { hasClerk } from "../config/clerk";
import WaveBackground from "../components/auth/WaveBackground";
import {
  FileText,
  Boxes,
  Box,
  Users,
  ShieldCheck,
  Store,
  UserCheck,
  User,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Check,
  AlertCircle,
  Globe,
  MapPin,
  ChevronDown,
  X,
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

import {
  getCountries,
  getStatesForCountry,
  isValidStateForCountry,
  getCountryPhoneCode,
  getDefaultStateForCountry,
} from "../utils/countryStateData";

// Native SVG Flag of India for cross-platform fidelity (prevents OS emoji fallback like "IN")
function IndiaFlag({ className = "w-5 h-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={`${className} rounded-[2px] shadow-2xs object-cover border border-slate-200/90 shrink-0 inline-block`}
      aria-hidden="true"
    >
      <rect width="24" height="5.33" fill="#FF9933" />
      <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
      <rect y="10.67" width="24" height="5.33" fill="#138808" />
      <circle cx="12" cy="8" r="2.1" fill="none" stroke="#000080" strokeWidth="0.5" />
      <circle cx="12" cy="8" r="0.45" fill="#000080" />
    </svg>
  );
}

const COUNTRY_CODES = [
  { code: "+91", label: "+91" },
  { code: "+1", label: "+1" },
  { code: "+44", label: "+44" },
  { code: "+971", label: "+971" },
  { code: "+65", label: "+65" },
  { code: "+61", label: "+61" },
  { code: "+966", label: "+966" },
];

export default function Signup() {
  const nav = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialRefCode = searchParams.get("ref") || "";
  const returnUrl = searchParams.get("returnUrl") || "";
  const queryEmail = searchParams.get("email") || "";

  const inviteToken = searchParams.get("invitation") || searchParams.get("token") || "";
  const [verifiedInvite, setVerifiedInvite] = useState(null);
  const [inviteVerifying, setInviteVerifying] = useState(Boolean(inviteToken));
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (!inviteToken) return;
    let isCancelled = false;
    setInviteVerifying(true);
    setInviteError("");

    roleInvitationApi
      .verify(inviteToken)
      .then((res) => {
        if (isCancelled) return;
        if (res?.valid && res.invitation) {
          setVerifiedInvite(res.invitation);
          if (res.invitation.email) {
            setEmail(res.invitation.email);
          }
          if (res.invitation.name) {
            setName(res.invitation.name);
          }
        } else {
          setInviteError(res?.message || "This registration link is invalid, expired, or has reached its usage limit.");
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        setInviteError(err?.response?.data?.message || err?.message || "Invalid or expired registration link.");
      })
      .finally(() => {
        if (!isCancelled) setInviteVerifying(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [inviteToken]);

  const isInvitedFlow = Boolean(
    returnUrl.includes("accept-invitation") ||
    returnUrl.includes("join-team") ||
    searchParams.get("role") ||
    searchParams.get("token")
  );

  // Auth store
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const register = useAuth((s) => s.register);
  const googleLogin = useAuth((s) => s.googleLogin);

  // Form State - Strict RBAC: No predefined role. Universal account creation.
  const [name, setName] = useState("");
  const [email, setEmail] = useState(queryEmail);
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Tamil Nadu");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Handle Country selection change - resets dependent State and syncs dial code
  const handleCountryChange = (newCountry) => {
    setCountry(newCountry);
    // Requirement 2: Whenever the selected country changes, immediately clear the previously selected state
    setState("");
    const dialCode = getCountryPhoneCode(newCountry);
    if (dialCode) {
      setCountryCode(dialCode);
    }
  };

  // Referral code from URL
  const [referralCode, setReferralCode] = useState(initialRefCode);
  const [referralValid, setReferralValid] = useState(false);

  // Status & UI
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalContent, setModalContent] = useState(null); // 'terms' | 'privacy' | null

  // Redirect if already authenticated — honour returnUrl if present and safe
  useEffect(() => {
    if (!loading && user) {
      const isAuthPath = (p) =>
        !p ||
        p.startsWith("/sign-in") ||
        p.startsWith("/sign-up") ||
        p === "/login" ||
        p === "/register";

      const safeReturnUrl = isAuthPath(returnUrl) ? null : returnUrl;
      const target = safeReturnUrl || getWorkspaceRedirectPath(user);

      if (target && !isAuthPath(target) && target !== location.pathname) {
        nav(target, { replace: true });
      }
    }
  }, [user, loading, nav, returnUrl, location.pathname]);

  // Validate referral code if present
  useEffect(() => {
    if (initialRefCode) {
      referralApi
        .validate(initialRefCode.trim().toUpperCase())
        .then(() => setReferralValid(true))
        .catch(() => setReferralValid(false));
    }
  }, [initialRefCode]);

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

  // Form Submission
  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");

    // Validations
    if (name.trim().length < 2) {
      return setError("Please enter your full name.");
    }
    if (!email.trim() || !email.includes("@")) {
      return setError("Please enter a valid email address.");
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      return setError("Please enter a valid mobile number.");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (!country || !country.trim()) {
      return setError("Please select your country.");
    }
    if (!state || !state.trim()) {
      return setError(`Please select a valid state or region for ${country}.`);
    }
    if (!isValidStateForCountry(country, state)) {
      return setError(`Selected state is not valid for ${country}. Please select a valid state.`);
    }
    if (!agreedToTerms) {
      return setError("Please agree to the Terms of Service and Privacy Policy to continue.");
    }

    setBusy(true);
    try {
      const fullPhone = `${countryCode} ${phone.trim()}`;

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: fullPhone,
        password,
        country: country.trim(),
        state: state.trim(),
        referralCode: referralCode.trim().toUpperCase() || undefined,
        invitationToken: inviteToken ? inviteToken.trim() : undefined,
      };

      const regUser = await register(payload);
      setSuccess("Account created successfully! Redirecting\u2026");
      // If user came from an invitation link, send them back there; otherwise go to their workspace
      const isAuthPath = (p) =>
        !p ||
        p.startsWith("/sign-in") ||
        p.startsWith("/sign-up") ||
        p === "/login" ||
        p === "/register";
      const safeReturnUrl = isAuthPath(returnUrl) ? null : returnUrl;
      const targetPath = safeReturnUrl || getWorkspaceRedirectPath(regUser?.user || useAuth.getState().user);
      const destination = (!targetPath || isAuthPath(targetPath)) ? "/dashboard" : targetPath;
      setTimeout(() => nav(destination, { replace: true }), 400);
    } catch (err) {
      setError(apiError(err) || "Failed to create account. Please verify your details.");
    } finally {
      setBusy(false);
    }
  }



  return (
    <div
      className="min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-[#111318] bg-[#FAFAFB] flex flex-col lg:flex-row selection:bg-[#CDEBE7] selection:text-[#1A3A36]"
    >
      {/* Dynamic Layered Organic Wave Gradient Background */}
      <WaveBackground />
      {/* ══════════════════════════════════════════════════════════════
          LEFT MARKETING PANEL — ~60% Width Desktop
          ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[59%] xl:w-[60%] relative z-10 flex flex-col justify-between p-6 sm:p-10 lg:pl-16 lg:pr-10 lg:py-10 shrink-0 min-h-screen">
        <div className="flex flex-col h-full justify-between max-w-xl">
          {/* Top Brand Logo & Compact Pill Badge */}
          <div className="mb-6 lg:mb-8">
            <BrandHeader logoHeight="h-10" />

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAFAFB] border border-[#E7E8EC] text-[12px] font-semibold tracking-tight shadow-2xs mt-4 select-none">
              <span className="w-2 h-2 rounded-full bg-[#5BF07B] animate-pulse" />
              <span className="text-[#111318]">Smart Billing</span>
              <span className="text-[#7C7F8A]">&middot; Inventory &middot; GST &middot; CA Connect</span>
            </div>
          </div>

          {/* Main Headline & Supporting Paragraph */}
          <div className="my-auto py-4">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight leading-[1.15] text-[#111318] mb-4 font-heading">
              Manage Billing,<br />
              Inventory and GST<br />
              <span className="text-[#111318] underline decoration-[#5BF07B] decoration-4 underline-offset-4">
                in One Place.
              </span>
            </h1>

            <p className="text-[14.5px] sm:text-[15.5px] text-[#7C7F8A] leading-relaxed font-normal mb-8 max-w-md">
              Join thousands of smart businesses running compliant invoicing, stock tracking, and automated GST reporting with BILZET.
            </p>

            {/* Four Feature Bento Rows */}
            <div className="space-y-3.5">
              {/* Feature 1: GST Ready Invoicing */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-[20px] bg-[#F6F6F8] border border-[#E7E8EC] shadow-fintech-sm hover:shadow-fintech transition-all">
                <div className="w-10 h-10 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText size={18} strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14px] font-bold text-[#111318] tracking-tight leading-snug">
                    GST Ready Invoicing
                  </h2>
                  <p className="text-[12.5px] text-[#7C7F8A] leading-normal mt-0.5">
                    Create, print and share GST-compliant invoices in under 5 seconds.
                  </p>
                </div>
              </div>

              {/* Feature 2: Inventory Management */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-[20px] bg-[#F6F6F8] border border-[#E7E8EC] shadow-fintech-sm hover:shadow-fintech transition-all">
                <div className="w-10 h-10 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-2xs">
                  <Box size={18} strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14px] font-bold text-[#111318] tracking-tight leading-snug">
                    Real-time Inventory
                  </h2>
                  <p className="text-[12.5px] text-[#7C7F8A] leading-normal mt-0.5">
                    Barcode scanning, low-stock alerts, and multi-warehouse stock sync.
                  </p>
                </div>
              </div>

              {/* Feature 3: CA Connect */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-[20px] bg-[#F6F6F8] border border-[#E7E8EC] shadow-fintech-sm hover:shadow-fintech transition-all">
                <div className="w-10 h-10 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-2xs">
                  <Users size={18} strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14px] font-bold text-[#111318] tracking-tight leading-snug">
                    CA Audit Workspace
                  </h2>
                  <p className="text-[12.5px] text-[#7C7F8A] leading-normal mt-0.5">
                    One-click GSTR-1, GSTR-3B audit review and error resolution with your CA.
                  </p>
                </div>
              </div>

              {/* Feature 4: Bank-Grade Security */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-[20px] bg-[#F6F6F8] border border-[#E7E8EC] shadow-fintech-sm hover:shadow-fintech transition-all">
                <div className="w-10 h-10 rounded-2xl bg-[#12151C] text-[#5BF07B] flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <div className="pt-0.5">
                  <h2 className="text-[14px] font-bold text-[#111318] tracking-tight leading-snug">
                    Bank-Grade Cloud ERP
                  </h2>
                  <p className="text-[12.5px] text-[#7C7F8A] leading-normal mt-0.5">
                    End-to-end encrypted ledger data with automated daily backups.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Left Panel Footer */}
          <div className="pt-5 border-t border-[#D8D9DE] flex flex-wrap items-center justify-between gap-3 text-xs text-[#7C7F8A]">
            <span>&copy; {new Date().getFullYear()} BILZET. All rights reserved.</span>
            <div className="flex items-center gap-3 text-[11.5px] font-medium text-[#111318]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#0E2A16]" strokeWidth={2} />
                GST Ready
              </span>
              <span className="text-[#C3C5CE]">|</span>
              <span className="flex items-center gap-1.5">
                <Landmark size={14} className="text-[#0E2A16]" strokeWidth={2} />
                256-bit Security
              </span>
              <span className="text-[#C3C5CE]">|</span>
              <span className="flex items-center gap-1.5">
                <Cloud size={14} className="text-[#0E2A16]" strokeWidth={2} />
                Real-time Sync
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT SIGNUP PANEL — ~40% Width Desktop
          Keel Bento Card
          ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[41%] xl:w-[40%] relative z-10 flex flex-col justify-center items-center lg:items-end p-4 sm:p-6 lg:pr-14 lg:py-8 min-h-screen">
        <div className="w-full max-w-[475px] bg-[#FAFAFB] rounded-[28px] border border-white shadow-[0_15px_50px_rgba(0,0,0,0.08)] p-6 sm:p-7 relative font-sans">
          {/* Top Header: Logo on Left, Login Link on Top-Right */}
          <div className="flex items-center justify-between mb-4">
            <BrandHeader logoHeight="h-7.5" />
            <div className="text-right">
              <span className="text-[12px] text-[#7C7F8A]">
                Already registered?{" "}
              </span>
              <Link
                to="/sign-in"
                className="text-[12px] font-bold text-[#111318] hover:underline transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Heading and Supporting Text */}
          <div className="mb-4">
            <h1 className="text-xl sm:text-[23px] font-bold text-[#111318] tracking-tight leading-tight mb-1 font-heading">
              Create your account
            </h1>
            <p className="text-[12.5px] text-[#7C7F8A] leading-normal font-normal">
              Get started with BILZET and manage your business smarter.
            </p>
          </div>

          {/* Referral Badge if Active */}
          {referralCode && (
            <div className="mb-4 px-3.5 py-2 rounded-full bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16] text-xs font-semibold flex items-center justify-between">
              <span>
                Referral code applied: <strong>{referralCode}</strong>
              </span>
              <span className="bg-[#12151C] text-[#5BF07B] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                10% Discount
              </span>
            </div>
          )}

          {/* Error / Success Alerts */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-[16px] bg-[#FBD3D3] border border-[#E5484D]/30 text-[#E5484D] text-xs sm:text-[13px] flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle size={15} className="shrink-0 text-[#E5484D] mt-0.5" />
              <div className="flex-1 font-semibold">
                <div>{error}</div>
                {(String(error).toLowerCase().includes("already exists") || String(error).toLowerCase().includes("sign in instead")) && (
                  <div className="mt-2">
                    <Link
                      to={`/sign-in?email=${encodeURIComponent(email)}`}
                      className="inline-flex items-center gap-1 font-bold text-[#111318] hover:underline text-xs"
                    >
                      Click here to sign in with this email &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {success && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-[16px] bg-[#DFFFE6] border border-[#5BF07B]/40 text-[#0E2A16] text-xs sm:text-[13px] flex items-start gap-2.5 animate-fadeIn"
            >
              <Check size={15} className="shrink-0 text-[#0E2A16] mt-0.5" />
              <div className="flex-1 font-semibold">{success}</div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            {/* Verified Team Invitation Notice (if arrived with invitation link) */}
            {verifiedInvite && (
              <div className="p-3 rounded-2xl bg-[#FAFAFB] border border-[#E7E8EC] text-[#111318] flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-[#5BF07B] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[12.5px] font-bold text-[#111318]">
                    Joining {verifiedInvite.business?.name || "Business Store"}
                  </p>
                  <p className="text-[11.5px] text-[#7C7F8A] mt-0.5">
                    Role assigned by business owner: <strong className="text-[#111318]">{verifiedInvite.role}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* ─── Field 2: Full Name ─── */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C7F8A]">
                <User size={15} strokeWidth={1.8} />
              </div>
              <input
                id="signup-full-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full h-[44px] pl-10 pr-4 rounded-full border border-[#E7E8EC] bg-white text-[13px] text-[#111318] placeholder:text-[#A9ABB5] focus:outline-none focus:border-[#111318] focus:ring-2 focus:ring-[#111318]/10 transition-all font-sans"
              />
            </div>

            {/* ─── Field 3: Email Address ─── */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C7F8A]">
                <Mail size={15} strokeWidth={1.8} />
              </div>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-[44px] pl-10 pr-4 rounded-full border border-[#E7E8EC] bg-white text-[13px] text-[#111318] placeholder:text-[#A9ABB5] focus:outline-none focus:border-[#111318] focus:ring-2 focus:ring-[#111318]/10 transition-all font-mono"
              />
            </div>

            {/* ─── Field 4: Combined Mobile Number with Country Code ─── */}
            <div className="flex h-[44px] rounded-full border border-[#E7E8EC] bg-white overflow-hidden focus-within:border-[#111318] focus-within:ring-2 focus-within:ring-[#111318]/10 transition-all">
              <div className="relative flex items-center pl-3.5 pr-2.5 shrink-0 border-r border-[#E7E8EC] text-[#7C7F8A] gap-2">
                <Phone size={14} strokeWidth={1.8} />
                <IndiaFlag />
                <select
                  id="signup-country-code"
                  aria-label="Country Code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-transparent text-[13px] font-semibold text-[#111318] focus:outline-none cursor-pointer pr-3.5 appearance-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="text-[#7C7F8A] pointer-events-none absolute right-1" />
              </div>
              <input
                id="signup-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile Number"
                className="w-full h-full px-3 text-[13px] text-[#111318] placeholder:text-[#A9ABB5] focus:outline-none font-mono"
              />
            </div>

            {/* ─── Field 5: Password with Show/Hide Control ─── */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C7F8A]">
                <Lock size={15} strokeWidth={1.8} />
              </div>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-[44px] pl-10 pr-11 rounded-full border border-[#E7E8EC] bg-white text-[13px] text-[#111318] placeholder:text-[#A9ABB5] focus:outline-none focus:border-[#111318] focus:ring-2 focus:ring-[#111318]/10 transition-all font-mono"
              />
              <button
                type="button"
                id="toggle-password-visibility"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7C7F8A] hover:text-[#111318] transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>

            {/* ─── Field 6: Country and State Dropdowns Side by Side ─── */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Country */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C7F8A]">
                  <Globe size={14} strokeWidth={1.8} />
                </div>
                <select
                  id="signup-country"
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full h-[44px] pl-9 pr-7 rounded-full border border-[#E7E8EC] bg-white text-[13px] font-semibold text-[#111318] focus:outline-none focus:border-[#111318] focus:ring-2 focus:ring-[#111318]/10 transition-all appearance-none cursor-pointer"
                >
                  {getCountries().map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label || c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#7C7F8A]">
                  <ChevronDown size={13} />
                </div>
              </div>

              {/* State */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C7F8A]">
                  <MapPin size={14} strokeWidth={1.8} />
                </div>
                <select
                  id="signup-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-[44px] pl-9 pr-7 rounded-full border border-[#E7E8EC] bg-white text-[13px] font-semibold text-[#111318] focus:outline-none focus:border-[#111318] focus:ring-2 focus:ring-[#111318]/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    {getStatesForCountry(country).length > 0 ? "Select State / Region" : "No regions available"}
                  </option>
                  {getStatesForCountry(country).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#7C7F8A]">
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>

            {/* ─── Terms & Privacy Consent Checkbox ─── */}
            <div className="pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="signup-consent-checkbox"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-[#111318] border-[#E7E8EC] focus:ring-[#111318] cursor-pointer accent-[#111318]"
                />
                <span className="text-[12px] text-[#7C7F8A] leading-tight">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setModalContent("terms")}
                    className="text-[#111318] font-bold underline hover:text-black focus:outline-none"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setModalContent("privacy")}
                    className="text-[#111318] font-bold underline hover:text-black focus:outline-none"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            </div>

            {/* ─── Primary CTA Button (Keel Dark Charcoal) ─── */}
            <button
              type="submit"
              id="signup-submit-btn"
              disabled={busy}
              className="w-full h-[46px] rounded-full font-bold text-[14px] text-white bg-[#12151C] hover:bg-[#202530] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 shadow-fintech"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin text-[#5BF07B]" />
                  <span>Creating your account...</span>
                </>
              ) : (
                <>
                  <span>Create my account</span>
                  <ArrowRight size={16} strokeWidth={2.4} className="text-[#5BF07B]" />
                </>
              )}
            </button>

            {/* ─── Divider: "or" ─── */}
            <div className="relative flex items-center justify-center my-2.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E7E8EC]" />
              </div>
              <span className="relative px-3 bg-[#F6F6F8] text-[11px] text-[#A9ABB5] font-semibold uppercase tracking-wider">
                or
              </span>
            </div>

            {/* ─── Google OAuth Button ─── */}
            {hasClerk ? (
              <ClerkGoogleButton
                mode="register"
                onError={setError}
                setBusy={setBusy}
                busy={busy}
              />
            ) : (
              <button
                type="button"
                id="signup-google-btn"
                disabled={busy}
                onClick={() => {
                  if (window.google?.accounts?.id) {
                    window.google.accounts.id.prompt();
                  } else {
                    setError("Google Sign-In is initializing. Please wait a moment or sign up with your email.");
                  }
                }}
                className="w-full h-[44px] rounded-full border border-[#E7E8EC] bg-white hover:bg-[#EDEDEF] text-[#111318] text-[13px] font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
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
          </form>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: Terms of Service & Privacy Policy Overlay
          ══════════════════════════════════════════════════════════════ */}
      {modalContent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12151C]/60 backdrop-blur-xs animate-fadeIn font-sans"
          onClick={() => setModalContent(null)}
        >
          <div
            className="bg-[#F6F6F8] rounded-[28px] max-w-lg w-full p-6 sm:p-7 shadow-fintech border border-[#E7E8EC] overflow-hidden max-h-[85vh] flex flex-col font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E8EC]">
              <h3 className="text-base font-bold text-[#111318] font-heading">
                {modalContent === "terms" ? "Terms of Service" : "Privacy Policy"}
              </h3>
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7C7F8A] hover:text-[#111318] hover:bg-[#EDEDEF] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 overflow-y-auto text-xs text-[#7C7F8A] space-y-3 leading-relaxed">
              {modalContent === "terms" ? (
                <>
                  <p>
                    <strong className="text-[#111318]">1. Terms of Service:</strong> By signing up for BILZET, you agree to comply with our platform policies for business billing, inventory control, and GST filing.
                  </p>
                  <p>
                    <strong className="text-[#111318]">2. Account Roles:</strong> Business Owners hold complete store administration rights. Staff roles operate under store administrator supervision. Chartered Accountants access synchronized client tax workpapers.
                  </p>
                  <p>
                    <strong className="text-[#111318]">3. Data Integrity:</strong> Invoices generated are preserved with complete audit histories to ensure tax and regulatory compliance.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong className="text-[#111318]">1. Data Confidentiality:</strong> Your financial records, customer details, and invoice databases are strictly private and encrypted.
                  </p>
                  <p>
                    <strong className="text-[#111318]">2. Access Control:</strong> Only authorized members or tax consultants invited by the business owner may view store books.
                  </p>
                  <p>
                    <strong className="text-[#111318]">3. Compliance:</strong> We never share or monetize your private accounting data.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3.5 border-t border-[#E7E8EC] flex justify-end">
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="px-5 py-2.5 rounded-full bg-[#12151C] hover:bg-[#202530] text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
