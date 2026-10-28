import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../store/auth";
import { apiError } from "../api/http";
import { referralApi } from "../api";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import { ClerkGoogleButton } from "../components/auth/ClerkAuth";
import { hasClerk } from "../config/clerk";
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

  // Auth store
  const user = useAuth((s) => s.user);
  const register = useAuth((s) => s.register);
  const googleLogin = useAuth((s) => s.googleLogin);

  // Form State
  const [accountType, setAccountType] = useState("BUSINESS_OWNER"); // 'BUSINESS_OWNER' | 'TAX_CONSULTANT' | 'STAFF'
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      nav(getWorkspaceRedirectPath(user), { replace: true });
    }
  }, [user, nav]);

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
    if (accountType === "BUSINESS_OWNER" && !businessName.trim()) {
      return setError("Please enter your Business / Company Name.");
    }
    if (accountType === "TAX_CONSULTANT" && !businessName.trim()) {
      return setError("Please enter your Firm / Practice Name.");
    }
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
        accountType,
        businessName: businessName.trim() || undefined,
        country: country.trim(),
        state: state.trim(),
        referralCode: referralCode.trim().toUpperCase() || undefined,
      };

      const regUser = await register(payload);
      setSuccess("Account created successfully! Redirecting to your workspace...");
      const targetPath = getWorkspaceRedirectPath(regUser?.user || useAuth.getState().user);
      setTimeout(() => nav(targetPath, { replace: true }), 400);
    } catch (err) {
      setError(apiError(err) || "Failed to create account. Please verify your details.");
    } finally {
      setBusy(false);
    }
  }

  // Adaptive placeholder based on selected account type
  const getBusinessFieldPlaceholder = () => {
    switch (accountType) {
      case "TAX_CONSULTANT":
        return "Firm / Practice Name";
      case "STAFF":
        return "Business / Employer Name (Optional)";
      case "BUSINESS_OWNER":
      default:
        return "Business / Company Name";
    }
  };

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
            <linearGradient id="fullTopCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#EEF7FF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#D8EBFF" stopOpacity="0.6" />
            </linearGradient>

            <linearGradient id="fullWaveMainFlowGrad" x1="100%" y1="15%" x2="15%" y2="95%">
              <stop offset="0%" stopColor="#EEF7FF" />
              <stop offset="25%" stopColor="#E0EFFE" />
              <stop offset="70%" stopColor="#D8EBFF" />
              <stop offset="100%" stopColor="#C7E1FF" />
            </linearGradient>

            <linearGradient id="fullWaveMidDeepGrad" x1="100%" y1="40%" x2="25%" y2="95%">
              <stop offset="0%" stopColor="#D8EBFF" />
              <stop offset="50%" stopColor="#C7E1FF" />
              <stop offset="100%" stopColor="#B3D7FF" />
            </linearGradient>

            <linearGradient id="fullWaveDeepNavyGrad" x1="100%" y1="65%" x2="40%" y2="98%">
              <stop offset="0%" stopColor="#EAF4FF" />
              <stop offset="55%" stopColor="#D8EBFF" />
              <stop offset="100%" stopColor="#C7E1FF" />
            </linearGradient>

            <linearGradient id="fullWaveRimHighlight" x1="100%" y1="20%" x2="25%" y2="95%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#D8EBFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Top-Right Soft Blue Circle */}
          <ellipse cx="1200" cy="110" rx="380" ry="380" fill="url(#fullTopCircleGrad)" />

          {/* Main Sweeping Wave */}
          <path
            d="M 1440,300 C 1180,360 840,550 660,720 C 580,795 530,850 490,900 L 1440,900 Z"
            fill="url(#fullWaveMainFlowGrad)"
          />

          {/* Edge Highlight */}
          <path
            d="M 1440,300 C 1180,360 840,550 660,720 C 580,795 530,850 490,900"
            fill="none"
            stroke="url(#fullWaveRimHighlight)"
            strokeWidth="3"
          />

          {/* Second Cascading Deep Blue Wave */}
          <path
            d="M 1440,540 C 1200,580 960,710 800,810 C 730,855 680,880 630,900 L 1440,900 Z"
            fill="url(#fullWaveMidDeepGrad)"
          />

          {/* Third Cascading Deep Navy Wave */}
          <path
            d="M 1440,730 C 1260,750 1080,830 960,875 C 910,890 870,898 820,900 L 1440,900 Z"
            fill="url(#fullWaveDeepNavyGrad)"
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
          RIGHT SIGNUP PANEL — ~40% Width Desktop
          macOS-Inspired White Registration Card Floating Over Waves
          ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[41%] xl:w-[40%] relative z-10 flex flex-col justify-center items-center lg:items-end p-4 sm:p-6 lg:pr-12 lg:py-8 min-h-screen">
        {/* Floating Centered White Registration Card */}
        <div className="w-full max-w-[475px] bg-white rounded-[26px] border border-[#E3EDF8] shadow-xl p-6 sm:p-7 relative font-macos">
          {/* Top Header: Logo on Left, Login Link on Top-Right */}
          <div className="flex items-center justify-between mb-4">
            <BrandHeader logoHeight="h-7.5" />
            <div className="text-right">
              <span className="text-[12px] text-[#7188A3]">
                Already have an account?{" "}
              </span>
              <Link
                to="/sign-in"
                className="text-[12px] font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Heading and Supporting Text */}
          <div className="mb-4">
            <h1 className="text-xl sm:text-[23px] font-bold text-[#526B87] tracking-tight leading-tight mb-1 font-macos">
              Create your account
            </h1>
            <p className="text-[12.5px] text-[#7188A3] leading-normal font-normal font-macos">
              Get started with BILZET and manage your business smarter.
            </p>
          </div>

          {/* Referral Badge if Active */}
          {referralCode && (
            <div className="mb-4 px-3.5 py-2 rounded-xl bg-[#ECF9F1] border border-[#C8E6C9] text-[#166534] text-xs font-semibold flex items-center justify-between font-macos">
              <span>
                Referral code applied: <strong>{referralCode}</strong>
              </span>
              <span className="bg-[#166534] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                10% Discount
              </span>
            </div>
          )}

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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-2.5 font-macos">
            {/* ─── Account Type Selector (Exact 3 Cards in 1 Row) ─── */}
            <div>
              <label className="block text-[11.5px] font-semibold text-[#526B87] mb-1.5 font-macos">
                Account type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Business Owner */}
                <button
                  type="button"
                  id="account-type-owner"
                  onClick={() => setAccountType("BUSINESS_OWNER")}
                  className={`relative flex flex-col items-center justify-center pt-2.5 pb-2 px-1 rounded-[10px] transition-all text-center select-none cursor-pointer border ${
                    accountType === "BUSINESS_OWNER"
                      ? "border-[#8AAED8] bg-[#EEF7FF] text-[#2563EB]"
                      : "border-[#E3EDF8] bg-white text-[#7188A3] hover:border-[#8AAED8] hover:bg-[#F4F9FF]"
                  }`}
                >
                  {/* Top-left Radio Indicator */}
                  <div className="absolute top-2 left-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                        accountType === "BUSINESS_OWNER"
                          ? "border-[#2563EB] bg-white"
                          : "border-[#E3EDF8] bg-white"
                      }`}
                    >
                      {accountType === "BUSINESS_OWNER" && (
                        <div className="w-2 h-2 rounded-full bg-[#0878F9]" />
                      )}
                    </div>
                  </div>

                  {/* Icon */}
                  <Store
                    size={18}
                    className={`mb-1 mt-0.5 ${
                      accountType === "BUSINESS_OWNER" ? "text-[#0878F9]" : "text-[#64748B]"
                    }`}
                    strokeWidth={1.8}
                  />
                  <span className="text-[11px] font-semibold text-[#111827] leading-tight font-macos">
                    Business Owner
                  </span>
                </button>

                {/* 2. Tax Consultant / CA */}
                <button
                  type="button"
                  id="account-type-ca"
                  onClick={() => setAccountType("TAX_CONSULTANT")}
                  className={`relative flex flex-col items-center justify-center pt-2.5 pb-2 px-1 rounded-[10px] transition-all text-center select-none cursor-pointer border ${
                    accountType === "TAX_CONSULTANT"
                      ? "border-[#8AAED8] bg-[#EEF7FF] text-[#2563EB]"
                      : "border-[#E3EDF8] bg-white text-[#7188A3] hover:border-[#8AAED8] hover:bg-[#F4F9FF]"
                  }`}
                >
                  {/* Top-left Radio Indicator */}
                  <div className="absolute top-2 left-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                        accountType === "TAX_CONSULTANT"
                          ? "border-[#2563EB] bg-white"
                          : "border-[#E3EDF8] bg-white"
                      }`}
                    >
                      {accountType === "TAX_CONSULTANT" && (
                        <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      )}
                    </div>
                  </div>

                  {/* Icon */}
                  <UserCheck
                    size={18}
                    className={`mb-1 mt-0.5 ${
                      accountType === "TAX_CONSULTANT" ? "text-[#2563EB]" : "text-[#8AAED8]"
                    }`}
                    strokeWidth={1.8}
                  />
                  <span className="text-[11px] font-medium text-[#526B87] leading-tight font-macos">
                    Tax Consultant / CA
                  </span>
                </button>

                {/* 3. Staff / Other Role */}
                <button
                  type="button"
                  id="account-type-staff"
                  onClick={() => setAccountType("STAFF")}
                  className={`relative flex flex-col items-center justify-center pt-2.5 pb-2 px-1 rounded-[10px] transition-all text-center select-none cursor-pointer border ${
                    accountType === "STAFF"
                      ? "border-[#8AAED8] bg-[#EEF7FF] text-[#2563EB]"
                      : "border-[#E3EDF8] bg-white text-[#7188A3] hover:border-[#8AAED8] hover:bg-[#F4F9FF]"
                  }`}
                >
                  {/* Top-left Radio Indicator */}
                  <div className="absolute top-2 left-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                        accountType === "STAFF"
                          ? "border-[#2563EB] bg-white"
                          : "border-[#E3EDF8] bg-white"
                      }`}
                    >
                      {accountType === "STAFF" && (
                        <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      )}
                    </div>
                  </div>

                  {/* Icon */}
                  <Users
                    size={18}
                    className={`mb-1 mt-0.5 ${
                      accountType === "STAFF" ? "text-[#2563EB]" : "text-[#8AAED8]"
                    }`}
                    strokeWidth={1.8}
                  />
                  <span className="text-[11px] font-medium text-[#526B87] leading-tight font-macos">
                    Staff / Other Role
                  </span>
                </button>
              </div>
            </div>

            {/* ─── Field 1: Business / Company Name ─── */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                <Building2 size={15} strokeWidth={1.8} />
              </div>
              <input
                id="signup-business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={getBusinessFieldPlaceholder()}
                className="w-full h-[42px] pl-9 pr-3.5 rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] text-[13px] text-[#526B87] placeholder:text-[#94A8BE] focus:outline-none focus:border-[#8AAED8] focus:ring-2 focus:ring-[#8AAED8]/15 transition-all font-macos"
              />
            </div>

            {/* ─── Field 2: Full Name ─── */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                <User size={15} strokeWidth={1.8} />
              </div>
              <input
                id="signup-full-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full h-[42px] pl-9 pr-3.5 rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] text-[13px] text-[#526B87] placeholder:text-[#94A8BE] focus:outline-none focus:border-[#8AAED8] focus:ring-2 focus:ring-[#8AAED8]/15 transition-all font-macos"
              />
            </div>

            {/* ─── Field 3: Email Address ─── */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                <Mail size={15} strokeWidth={1.8} />
              </div>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-[42px] pl-9 pr-3.5 rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] text-[13px] text-[#526B87] placeholder:text-[#94A8BE] focus:outline-none focus:border-[#8AAED8] focus:ring-2 focus:ring-[#8AAED8]/15 transition-all font-macos"
              />
            </div>

            {/* ─── Field 4: Combined Mobile Number with Country Code ─── */}
            <div className="flex h-[42px] rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] overflow-hidden focus-within:border-[#8AAED8] focus-within:ring-2 focus-within:ring-[#8AAED8]/15 transition-all">
              <div className="relative flex items-center pl-3 pr-2 shrink-0 border-r border-[#E3EDF8] text-[#7188A3] gap-2">
                <Phone size={14} strokeWidth={1.8} />
                <IndiaFlag />
                <select
                  id="signup-country-code"
                  aria-label="Country Code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-transparent text-[13px] font-semibold text-[#526B87] focus:outline-none cursor-pointer pr-3.5 font-macos appearance-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} className="text-[#8AAED8] pointer-events-none absolute right-1" />
              </div>
              <input
                id="signup-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile Number"
                className="w-full h-full px-3 text-[13px] text-[#526B87] placeholder:text-[#94A8BE] focus:outline-none font-macos"
              />
            </div>

            {/* ─── Field 5: Password with Show/Hide Control ─── */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                <Lock size={15} strokeWidth={1.8} />
              </div>
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
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

            {/* ─── Field 6: Country and State Dropdowns Side by Side ─── */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Country */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                  <Globe size={14} strokeWidth={1.8} />
                </div>
                <select
                  id="signup-country"
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full h-[42px] pl-8.5 pr-7 rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] text-[13px] font-semibold text-[#526B87] focus:outline-none focus:border-[#8AAED8] focus:ring-2 focus:ring-[#8AAED8]/15 transition-all appearance-none cursor-pointer font-macos"
                >
                  {getCountries().map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label || c.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#8AAED8]">
                  <ChevronDown size={13} />
                </div>
              </div>

              {/* State */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8AAED8]">
                  <MapPin size={14} strokeWidth={1.8} />
                </div>
                <select
                  id="signup-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-[42px] pl-8.5 pr-7 rounded-[9px] border border-[#E3EDF8] bg-[#F4F9FF] text-[13px] font-semibold text-[#526B87] focus:outline-none focus:border-[#8AAED8] focus:ring-2 focus:ring-[#8AAED8]/15 transition-all appearance-none cursor-pointer font-macos"
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
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-[#8AAED8]">
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
                  className="w-4 h-4 rounded text-[#2563EB] border-[#E3EDF8] focus:ring-[#8AAED8] cursor-pointer"
                />
                <span className="text-[12px] text-[#7188A3] leading-tight font-macos">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setModalContent("terms")}
                    className="text-[#2563EB] font-medium underline hover:text-[#1D4ED8] focus:outline-none"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setModalContent("privacy")}
                    className="text-[#2563EB] font-medium underline hover:text-[#1D4ED8] focus:outline-none"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            </div>

            {/* ─── Primary CTA Button (Warm Yellow #FFC533) ─── */}
            <button
              type="submit"
              id="signup-submit-btn"
              disabled={busy}
              className="w-full h-[42px] rounded-[10px] font-bold text-[14px] text-[#111827] bg-[#FFC533] hover:bg-[#F5B822] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1.5 font-macos shadow-[0_2px_8px_rgba(255,197,51,0.35)]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin text-[#111827]" />
                  <span>Creating your account...</span>
                </>
              ) : (
                <>
                  <span>Create my account</span>
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

            {/* ─── Google OAuth Button (White Outlined Button) ─── */}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2747]/40 backdrop-blur-xs animate-fadeIn font-jakarta"
          onClick={() => setModalContent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E3EDF8] overflow-hidden max-h-[85vh] flex flex-col font-jakarta"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EDF3FA]">
              <h3 className="text-base font-bold text-[#526B87] font-jakarta">
                {modalContent === "terms" ? "Terms of Service" : "Privacy Policy"}
              </h3>
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A8BE] hover:text-[#526B87] hover:bg-[#F4F9FF] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 overflow-y-auto text-xs text-[#7188A3] space-y-3 leading-relaxed font-jakarta">
              {modalContent === "terms" ? (
                <>
                  <p>
                    <strong>1. Terms of Service:</strong> By signing up for BILZET, you agree to comply with our platform policies for business billing, inventory control, and GST filing.
                  </p>
                  <p>
                    <strong>2. Account Roles:</strong> Business Owners hold complete store administration rights. Staff roles operate under store administrator supervision. Chartered Accountants access synchronized client tax workpapers.
                  </p>
                  <p>
                    <strong>3. Data Integrity:</strong> Invoices generated are preserved with complete audit histories to ensure tax and regulatory compliance.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>1. Data Confidentiality:</strong> Your financial records, customer details, and invoice databases are strictly private and encrypted.
                  </p>
                  <p>
                    <strong>2. Access Control:</strong> Only authorized members or tax consultants invited by the business owner may view store books.
                  </p>
                  <p>
                    <strong>3. Compliance:</strong> We never share or monetize your private accounting data.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-[#EDF3FA] flex justify-end font-jakarta">
              <button
                type="button"
                onClick={() => setModalContent(null)}
                className="px-4 py-2 rounded-xl bg-[#D8EBFF] hover:bg-[#C7E1FF] text-[#2563EB] text-xs font-semibold transition-colors font-jakarta"
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
