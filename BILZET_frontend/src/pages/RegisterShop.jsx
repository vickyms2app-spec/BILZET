import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Store,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  Package,
  BarChart3,
  Edit3,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { storesApi } from "../api";
import { useStore } from "../store/storeContext";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import Logo from "../components/common/Logo";

export const BUSINESS_TYPES = [
  { value: "RETAIL", label: "Retail Store" },
  { value: "WHOLESALE", label: "Wholesale & Distribution" },
  { value: "SUPERMARKET", label: "Supermarket / Grocery" },
  { value: "RESTAURANT", label: "Restaurant / Cafe / QSR" },
  { value: "ELECTRONICS", label: "Electronics & Mobile" },
  { value: "PHARMACY", label: "Pharmacy & Healthcare" },
  { value: "TEXTILE", label: "Apparel & Textiles" },
  { value: "SERVICES", label: "Professional Services" },
  { value: "OTHER", label: "Other Business" },
];

export const INDIAN_STATES = [
  { code: "33", name: "Tamil Nadu", label: "33 - Tamil Nadu" },
  { code: "29", name: "Karnataka", label: "29 - Karnataka" },
  { code: "27", name: "Maharashtra", label: "27 - Maharashtra" },
  { code: "07", name: "Delhi", label: "07 - Delhi" },
  { code: "32", name: "Kerala", label: "32 - Kerala" },
  { code: "36", name: "Telangana", label: "36 - Telangana" },
  { code: "37", name: "Andhra Pradesh", label: "37 - Andhra Pradesh" },
  { code: "24", name: "Gujarat", label: "24 - Gujarat" },
  { code: "19", name: "West Bengal", label: "19 - West Bengal" },
  { code: "09", name: "Uttar Pradesh", label: "09 - Uttar Pradesh" },
  { code: "08", name: "Rajasthan", label: "08 - Rajasthan" },
  { code: "06", name: "Haryana", label: "06 - Haryana" },
  { code: "03", name: "Punjab", label: "03 - Punjab" },
  { code: "21", name: "Odisha", label: "21 - Odisha" },
  { code: "10", name: "Bihar", label: "10 - Bihar" },
  { code: "23", name: "Madhya Pradesh", label: "23 - Madhya Pradesh" },
  { code: "01", name: "Jammu & Kashmir", label: "01 - Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh", label: "02 - Himachal Pradesh" },
  { code: "04", name: "Chandigarh", label: "04 - Chandigarh" },
  { code: "05", name: "Uttarakhand", label: "05 - Uttarakhand" },
  { code: "11", name: "Sikkim", label: "11 - Sikkim" },
  { code: "12", name: "Arunachal Pradesh", label: "12 - Arunachal Pradesh" },
  { code: "13", name: "Nagaland", label: "13 - Nagaland" },
  { code: "14", name: "Manipur", label: "14 - Manipur" },
  { code: "15", name: "Mizoram", label: "15 - Mizoram" },
  { code: "16", name: "Tripura", label: "16 - Tripura" },
  { code: "17", name: "Meghalaya", label: "17 - Meghalaya" },
  { code: "18", name: "Assam", label: "18 - Assam" },
  { code: "20", name: "Jharkhand", label: "20 - Jharkhand" },
  { code: "22", name: "Chhattisgarh", label: "22 - Chhattisgarh" },
  { code: "30", name: "Goa", label: "30 - Goa" },
  { code: "34", name: "Puducherry", label: "34 - Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands", label: "35 - Andaman & Nicobar Islands" },
  { code: "38", name: "Ladakh", label: "38 - Ladakh" },
  { code: "97", name: "Other Territory", label: "97 - Other Territory" },
];

export default function RegisterShop() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fetchStores = useStore((s) => s.fetchStores);

  // Stepper state: 1: Shop Details, 2: Business Info, 3: Review & Complete
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Shop Details
    shopName: "",
    businessType: "RETAIL",
    stateCode: "33",
    state: "Tamil Nadu",
    ownerName: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",

    // Step 2: Business & Compliance Information
    isGstRegistered: false,
    gstin: "",
    address: "",
    city: "",
    district: "",
    pinCode: "",

    // Step 3: Terms
    termsAccepted: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredStoreData, setRegisteredStoreData] = useState(null);

  // Pre-fill user data if available and not yet set
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        ownerName: prev.ownerName || user.name || "",
        phone: prev.phone || user.phone || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  // Restrict Staff, Cashier, CA, Accountant from registering independent stores
  const isStaffOrCA =
    user?.role === "STAFF" ||
    user?.role === "CASHIER" ||
    user?.role === "CA" ||
    user?.role === "ACCOUNTANT" ||
    user?.role === "MANAGER";

  useEffect(() => {
    if (isStaffOrCA) {
      navigate("/onboarding", { replace: true });
    }
  }, [isStaffOrCA, navigate]);

  // Capture CA / Merchant referral code from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref") || params.get("referral") || params.get("referralCode");
    if (refCode && refCode.trim()) {
      localStorage.setItem("bilzet_referral_code", refCode.trim().toUpperCase());
    }
  }, []);

  // Handle generic field change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setServerError("");
  };

  // State dropdown handler
  const handleStateChange = (selectedLabel) => {
    const matched = INDIAN_STATES.find(
      (s) => s.label === selectedLabel || s.name === selectedLabel || s.code === selectedLabel
    );
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        stateCode: matched.code,
        state: matched.name,
      }));
    } else {
      setFormData((prev) => ({ ...prev, state: selectedLabel, stateCode: "97" }));
    }
    if (errors.state) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.state;
        return next;
      });
    }
  };

  // Validation for Step 1
  const validateStep1 = () => {
    const errs = {};
    const name = formData.shopName.trim();
    if (!name) {
      errs.shopName = "Shop or business name is required.";
    } else if (name.length < 2) {
      errs.shopName = "Business name must be at least 2 characters.";
    }

    if (!formData.businessType) {
      errs.businessType = "Please select your business type.";
    }

    if (!formData.state) {
      errs.state = "Please select your state or jurisdiction.";
    }

    const owner = formData.ownerName.trim();
    if (!owner) {
      errs.ownerName = "Owner legal name is required.";
    } else if (owner.length < 2) {
      errs.ownerName = "Owner name must be at least 2 characters.";
    }

    const cleanPhone = formData.phone.trim().replace(/\s+/g, "");
    if (!cleanPhone) {
      errs.phone = "Phone number is required.";
    } else if (!/^(?:\+91|0)?[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = "Enter a valid 10-digit mobile number (e.g. 9876543210).";
    }

    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      errs.email = "Store email is required.";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      errs.email = "Please enter a valid email address.";
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) el.focus();
      return false;
    }
    return true;
  };

  // Validation for Step 2
  const validateStep2 = () => {
    const errs = {};

    const cleanGstin = formData.gstin.trim().toUpperCase();
    if (formData.isGstRegistered) {
      if (!cleanGstin) {
        errs.gstin = "GSTIN is required when registered for GST.";
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin)) {
        errs.gstin = "Enter a valid 15-character GSTIN (e.g. 33AAAAA0000A1Z5).";
      } else if (cleanGstin.slice(0, 2) !== formData.stateCode && formData.stateCode !== "97") {
        // Warning note if state codes do not align
        errs.gstin = `State code prefix in GSTIN (${cleanGstin.slice(0, 2)}) does not match ${formData.state} (${formData.stateCode}).`;
      }
    } else if (cleanGstin) {
      // Optional, but if entered must match format
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin)) {
        errs.gstin = "Enter a valid 15-character GSTIN or leave blank.";
      }
    }

    if (!formData.address.trim()) {
      errs.address = "Business street address is required.";
    }

    if (!formData.city.trim()) {
      errs.city = "City or town is required.";
    }

    const cleanPin = formData.pinCode.trim();
    if (!cleanPin) {
      errs.pinCode = "6-digit PIN code is required.";
    } else if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      errs.pinCode = "Enter a valid 6-digit Indian postal PIN code.";
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const el = document.getElementById(`field-${firstKey}`);
      if (el) el.focus();
      return false;
    }
    return true;
  };

  // Navigation: Step 1 -> Step 2
  const handleProceedToStep2 = (e) => {
    if (e) e.preventDefault();
    if (validateStep1()) {
      setCompletedSteps((prev) => new Set([...prev, 1]));
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Navigation: Step 2 -> Step 3
  const handleProceedToStep3 = (e) => {
    if (e) e.preventDefault();
    if (validateStep2()) {
      setCompletedSteps((prev) => new Set([...prev, 1, 2]));
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Navigation: Back
  const handleGoBack = (targetStep) => {
    setErrors({});
    setServerError("");
    setCurrentStep(targetStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Step 3 Submission
  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    // Validate Terms
    if (!formData.termsAccepted) {
      setErrors({
        termsAccepted: "Please acknowledge and accept the Terms of Service to complete registration.",
      });
      const el = document.getElementById("field-termsAccepted");
      if (el) el.focus();
      return;
    }

    // Double check previous steps
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    setServerError("");

    try {
      const fullAddress = [
        formData.address.trim(),
        formData.city.trim(),
        formData.district.trim(),
        formData.pinCode.trim() ? `PIN: ${formData.pinCode.trim()}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const payload = {
        name: formData.shopName.trim(),
        shopName: formData.shopName.trim(),
        businessType: formData.businessType,
        ownerName: formData.ownerName.trim(),
        phone: formData.phone.trim().replace(/\s+/g, ""),
        email: formData.email.trim().toLowerCase() || user?.email,
        address: fullAddress || "Main Branch",
        city: formData.city.trim(),
        district: formData.district.trim() || undefined,
        pinCode: formData.pinCode.trim(),
        state: formData.state,
        stateCode: formData.stateCode,
        gstin:
          formData.isGstRegistered && formData.gstin.trim()
            ? formData.gstin.trim().toUpperCase()
            : formData.gstin.trim()
            ? formData.gstin.trim().toUpperCase()
            : undefined,
        referralCode:
          new URLSearchParams(window.location.search).get("ref") ||
          new URLSearchParams(window.location.search).get("referralCode") ||
          localStorage.getItem("bilzet_referral_code") ||
          undefined,
      };

      const res = await storesApi.registerShop(payload);

      // Save updated JWT token if provided
      if (res?.token) {
        localStorage.setItem("bilzet_access_token", res.token);
        localStorage.setItem("token", res.token);
      }

      // Immediately cache store in localStorage for instant synchronization
      if (res?.store) {
        localStorage.setItem("bilzet_active_store_id", res.store.id);
        localStorage.setItem("bilzet_active_store", JSON.stringify(res.store));
        try {
          const prevSettings = JSON.parse(localStorage.getItem("bilzet_invoice_settings") || "{}");
          localStorage.setItem(
            "bilzet_invoice_settings",
            JSON.stringify({
              ...prevSettings,
              shopName: res.store.name || formData.shopName.trim(),
              storeName: res.store.name || formData.shopName.trim(),
              ownerName: formData.ownerName.trim(),
              address: res.store.address || fullAddress,
              phone: res.store.phone || formData.phone.trim(),
              email: res.store.email || formData.email.trim(),
              gstin: res.store.gstin || (formData.isGstRegistered ? formData.gstin.trim().toUpperCase() : ""),
              state: res.store.state || formData.state,
              stateCode: formData.stateCode,
            })
          );
        } catch (_) {}
      }

      setCompletedSteps(new Set([1, 2, 3]));
      setRegistrationSuccess(true);
      setRegisteredStoreData(res?.store || { name: formData.shopName.trim() });

      if (refreshUser) {
        await refreshUser().catch(() => {});
      }
      if (fetchStores) {
        await fetchStores().catch(() => {});
      }

      window.dispatchEvent(
        new CustomEvent("bilzet:store-changed", {
          detail: { storeId: res?.store?.id, businessId: res?.store?.id, store: res?.store },
        })
      );

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to register shop. Please verify your details and try again.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Staff / CA Access Restricted View
  if (isStaffOrCA) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center mb-4">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Store Registration Restricted</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Your account is assigned the <strong className="text-slate-900 font-semibold">{user?.role}</strong> role.
            Staff members and Chartered Accountants are not authorized to create independent stores.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate(getWorkspaceRedirectPath(user), { replace: true })}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              Return to Your Assigned Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success Confirmation Screen
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Store Registration Completed!
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            Your store <strong className="text-slate-900">{registeredStoreData?.name || formData.shopName}</strong> has been configured with billing, inventory, and GST management.
          </p>
          <div className="pt-4 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
            <Loader2 size={16} className="animate-spin" />
            <span>Redirecting to your Admin Console…</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedBusinessLabel =
    BUSINESS_TYPES.find((b) => b.value === formData.businessType)?.label || formData.businessType;
  const selectedStateLabel =
    INDIAN_STATES.find((s) => s.name === formData.state)?.label || `${formData.stateCode} - ${formData.state}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      {/* ── 1. CLEAN HEADER ───────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo theme="light" size="sm" />
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400 pl-3 border-l border-slate-200">
              Store Owner Onboarding
            </span>
          </div>

          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <ChevronLeft size={14} />
            <span>Back to Onboarding</span>
          </Link>
        </div>
      </header>

      {/* ── 2. MAIN TWO-COLUMN CONTAINER ──────────────────── */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col lg:flex-row">
          {/* ── LEFT PROMOTIONAL PANEL (Desktop) ─────────────── */}
          <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-8 xl:p-10 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border-r border-slate-200/80">
            <div className="space-y-7">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-blue-700 text-xs font-semibold">
                <Sparkles size={13} className="text-blue-600" />
                <span>Store Owner Onboarding</span>
              </div>

              {/* Headline & Supporting Text */}
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Your Business, Simplified.
                </h1>
                <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                  Set up your store to manage billing, inventory, GST and business operations with BILZET.
                </p>
              </div>

              {/* Three Compact Benefits */}
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Smart Billing &amp; Invoicing</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                      Fast POS counter billing, GST tax invoices, thermal printing, and digital WhatsApp sharing.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
                    <Package size={18} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Inventory Management</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                      Real-time stock tracking, low stock notifications, barcode scanning, and multi-category control.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
                    <BarChart3 size={18} />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Business Reports &amp; GST Tools</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5 leading-snug">
                      Automated GSTR-1 summaries, daily sales analytics, profit tracking, and direct CA collaboration.
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtle Visual / Micro Illustration Card */}
              <div className="pt-2">
                <div className="bg-white/90 border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        POS Cash Register
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Ready</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">Recent Invoice</span>
                      <p className="text-xs font-bold text-slate-800">INV-2026-0001</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-medium">Status</span>
                      <p className="text-xs font-extrabold text-emerald-600">PAID</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Security Badge */}
            <div className="pt-6 border-t border-slate-200/70 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <ShieldCheck size={14} className="text-blue-600 shrink-0" />
              <span>Tenant-Isolated Cloud Architecture</span>
            </div>
          </div>

          {/* ── RIGHT REGISTRATION FORM CARD ─────────────────── */}
          <div className="w-full lg:w-7/12 p-6 sm:p-10 flex flex-col justify-between bg-white">
            <div>
              {/* ── STEPPER COMPONENT (3 REAL STEPS) ───────────── */}
              <div className="mb-8 select-none">
                <div className="flex items-center justify-between relative">
                  {/* Step 1 Item */}
                  <div
                    onClick={() => {
                      if (completedSteps.has(1)) handleGoBack(1);
                    }}
                    className={`flex items-center gap-2.5 ${
                      completedSteps.has(1) ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        completedSteps.has(1) && currentStep !== 1
                          ? "bg-blue-600 text-white shadow-xs"
                          : currentStep === 1
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs"
                          : "bg-slate-100 border border-slate-200 text-slate-400"
                      }`}
                    >
                      {completedSteps.has(1) && currentStep !== 1 ? <Check size={13} strokeWidth={3} /> : "1"}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={`text-xs font-bold leading-none ${
                          currentStep === 1
                            ? "text-blue-600"
                            : completedSteps.has(1)
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        Shop Details
                      </p>
                      <span className="text-[10px] text-slate-400">Step 1</span>
                    </div>
                  </div>

                  {/* Connecting Line 1 */}
                  <div
                    className={`flex-1 h-0.5 mx-3 sm:mx-4 transition-colors duration-300 ${
                      completedSteps.has(1) ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />

                  {/* Step 2 Item */}
                  <div
                    onClick={() => {
                      if (completedSteps.has(2)) handleGoBack(2);
                    }}
                    className={`flex items-center gap-2.5 ${
                      completedSteps.has(2) ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        completedSteps.has(2) && currentStep !== 2
                          ? "bg-blue-600 text-white shadow-xs"
                          : currentStep === 2
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs"
                          : "bg-slate-100 border border-slate-200 text-slate-400"
                      }`}
                    >
                      {completedSteps.has(2) && currentStep !== 2 ? <Check size={13} strokeWidth={3} /> : "2"}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={`text-xs font-bold leading-none ${
                          currentStep === 2
                            ? "text-blue-600"
                            : completedSteps.has(2)
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        Business Info
                      </p>
                      <span className="text-[10px] text-slate-400">Step 2</span>
                    </div>
                  </div>

                  {/* Connecting Line 2 */}
                  <div
                    className={`flex-1 h-0.5 mx-3 sm:mx-4 transition-colors duration-300 ${
                      completedSteps.has(2) ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />

                  {/* Step 3 Item */}
                  <div className="flex items-center gap-2.5 cursor-default">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                        completedSteps.has(3)
                          ? "bg-blue-600 text-white shadow-xs"
                          : currentStep === 3
                          ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs"
                          : "bg-slate-100 border border-slate-200 text-slate-400"
                      }`}
                    >
                      {completedSteps.has(3) ? <Check size={13} strokeWidth={3} /> : "3"}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={`text-xs font-bold leading-none ${
                          currentStep === 3 ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        Review
                      </p>
                      <span className="text-[10px] text-slate-400">Step 3</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Server Error Alert */}
              {serverError && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* ══════════════════════════════════════════════════
                  STEP 1: SHOP DETAILS
              ══════════════════════════════════════════════════ */}
              {currentStep === 1 && (
                <form onSubmit={handleProceedToStep2} className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Shop Details</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter the basic business outlet and owner information.
                    </p>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-shopName">
                      Shop / Business Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                      <input
                        id="field-shopName"
                        type="text"
                        value={formData.shopName}
                        onChange={(e) => handleChange("shopName", e.target.value)}
                        placeholder="e.g. Apollo Supermarket or Apex Retail"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                          errors.shopName ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                        }`}
                      />
                    </div>
                    {errors.shopName && (
                      <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1 mt-1">
                        <AlertCircle size={12} />
                        <span>{errors.shopName}</span>
                      </p>
                    )}
                  </div>

                  {/* Business Type & State */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-businessType">
                        Business Type <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none" size={16} />
                        <select
                          id="field-businessType"
                          value={formData.businessType}
                          onChange={(e) => handleChange("businessType", e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition appearance-none cursor-pointer"
                        >
                          {BUSINESS_TYPES.map((bt) => (
                            <option key={bt.value} value={bt.value}>
                              {bt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-state">
                        State / Jurisdiction <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none" size={16} />
                        <select
                          id="field-state"
                          value={formData.state}
                          onChange={(e) => handleStateChange(e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition appearance-none cursor-pointer"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st.code} value={st.name}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Owner Name & Phone */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-ownerName">
                        Owner Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                        <input
                          id="field-ownerName"
                          type="text"
                          value={formData.ownerName}
                          onChange={(e) => handleChange("ownerName", e.target.value)}
                          placeholder="e.g. Karthi Kevan"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                            errors.ownerName ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                          }`}
                        />
                      </div>
                      {errors.ownerName && (
                        <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1 mt-1">
                          <AlertCircle size={12} />
                          <span>{errors.ownerName}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-phone">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                        <input
                          id="field-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          placeholder="9876543210"
                          className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                            errors.phone ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                          }`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1 mt-1">
                          <AlertCircle size={12} />
                          <span>{errors.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Store Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-email">
                      Store Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                      <input
                        id="field-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        placeholder="store@business.com"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                          errors.email ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1 mt-1">
                        <AlertCircle size={12} />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Primary Step 1 Action */}
                  <div className="pt-4 flex items-center justify-end">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>Continue to Business Information</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* ══════════════════════════════════════════════════
                  STEP 2: BUSINESS INFORMATION & COMPLIANCE
              ══════════════════════════════════════════════════ */}
              {currentStep === 2 && (
                <form onSubmit={handleProceedToStep3} className="space-y-4">
                  <div className="pb-2 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Business Information</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure GST compliance and registered physical store address.
                    </p>
                  </div>

                  {/* GST Registration Status Card */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      GST Registration Status
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => handleChange("isGstRegistered", true)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                          formData.isGstRegistered
                            ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="isGstRegistered"
                          checked={formData.isGstRegistered}
                          onChange={() => handleChange("isGstRegistered", true)}
                          className="mt-0.5 text-blue-600 border-slate-300"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">GST Registered</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            I have a 15-digit GSTIN for tax invoices and ITC.
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={() => {
                          handleChange("isGstRegistered", false);
                          handleChange("gstin", "");
                        }}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                          !formData.isGstRegistered
                            ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="isGstRegistered"
                          checked={!formData.isGstRegistered}
                          onChange={() => {
                            handleChange("isGstRegistered", false);
                            handleChange("gstin", "");
                          }}
                          className="mt-0.5 text-blue-600 border-slate-300"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Not Registered</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Turnover exempt / composition. Standard bills.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GSTIN (Conditional or Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-gstin">
                      GSTIN {formData.isGstRegistered ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                      <input
                        id="field-gstin"
                        type="text"
                        maxLength={15}
                        value={formData.gstin}
                        onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                        placeholder={`e.g. ${formData.stateCode}AAAAA0000A1Z5`}
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs font-mono tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase transition ${
                          errors.gstin ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                        }`}
                      />
                    </div>
                    {errors.gstin && (
                      <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1 mt-1">
                        <AlertCircle size={12} />
                        <span>{errors.gstin}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">
                      15-digit alphanumeric Indian GST number starting with state code ({formData.stateCode}).
                    </p>
                  </div>

                  {/* Business Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-address">
                      Business Street Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-2.5 text-slate-400" size={16} />
                      <input
                        id="field-address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                        placeholder="Shop No., Street Name, Commercial Complex / Area"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                          errors.address ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                        }`}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1 mt-1">
                        <AlertCircle size={12} />
                        <span>{errors.address}</span>
                      </p>
                    )}
                  </div>

                  {/* City, District, PIN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-city">
                        City / Town <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="field-city"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange("city", e.target.value)}
                        placeholder="e.g. Coimbatore"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                          errors.city ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                        }`}
                      />
                      {errors.city && (
                        <p className="text-rose-600 text-[10px] font-medium mt-1">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-district">
                        District <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        id="field-district"
                        type="text"
                        value={formData.district}
                        onChange={(e) => handleChange("district", e.target.value)}
                        placeholder="e.g. Coimbatore"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="field-pinCode">
                        PIN Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="field-pinCode"
                        type="text"
                        maxLength={6}
                        value={formData.pinCode}
                        onChange={(e) => handleChange("pinCode", e.target.value.replace(/\D/g, ""))}
                        placeholder="641001"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition ${
                          errors.pinCode ? "border-rose-300 bg-rose-50/20 focus:border-rose-500" : "border-slate-200 focus:border-blue-600 bg-white"
                        }`}
                      />
                      {errors.pinCode && (
                        <p className="text-rose-600 text-[10px] font-medium mt-1">
                          {errors.pinCode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Back & Continue */}
                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleGoBack(1)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Back to Shop Details</span>
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>Continue to Review</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* ══════════════════════════════════════════════════
                  STEP 3: REVIEW & COMPLETE
              ══════════════════════════════════════════════════ */}
              {currentStep === 3 && (
                <form onSubmit={handleFinalSubmit} className="space-y-5">
                  <div className="pb-2 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Review &amp; Complete</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify all details before finalizing your store workspace.
                    </p>
                  </div>

                  {/* Summary Cards */}
                  <div className="space-y-3.5">
                    {/* Block A: Shop Details */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <Store size={15} className="text-blue-600" />
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Shop Details
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGoBack(1)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={11} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Business Name</span>
                          <span className="font-bold text-slate-900">{formData.shopName}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Business Type</span>
                          <span className="font-semibold text-slate-800">{selectedBusinessLabel}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[11px] text-slate-400 block">Jurisdiction &amp; State</span>
                          <span className="font-semibold text-slate-800">{selectedStateLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Block B: Owner & Contact Details */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <User size={15} className="text-blue-600" />
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Owner &amp; Contact
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGoBack(1)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={11} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Owner Name</span>
                          <span className="font-bold text-slate-900">{formData.ownerName}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Phone</span>
                          <span className="font-mono font-semibold text-slate-800">{formData.phone}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Store Email</span>
                          <span className="font-medium text-slate-800 truncate block">{formData.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Block C: Business & Tax Information */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-blue-600" />
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Address &amp; GST Compliance
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGoBack(2)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={11} />
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">GST Status</span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              formData.isGstRegistered
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {formData.isGstRegistered ? "GST Registered" : "Not Registered"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">GSTIN</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formData.gstin ? formData.gstin.toUpperCase() : "N/A"}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[11px] text-slate-400 block">Registered Address</span>
                          <p className="text-xs text-slate-800 leading-snug">
                            {formData.address}, {formData.city}
                            {formData.district ? `, ${formData.district}` : ""}, {formData.state} - {formData.pinCode}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Privacy Acknowledgement */}
                  <div className="pt-2">
                    <label
                      htmlFor="field-termsAccepted"
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                        errors.termsAccepted
                          ? "border-rose-300 bg-rose-50/30"
                          : formData.termsAccepted
                          ? "border-blue-300 bg-blue-50/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <input
                        id="field-termsAccepted"
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={(e) => handleChange("termsAccepted", e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        I confirm these store and business details are accurate and agree to BILZET's{" "}
                        <span className="font-semibold text-slate-900">Terms of Service</span> and{" "}
                        <span className="font-semibold text-slate-900">Privacy Policy</span> for store administration.
                      </span>
                    </label>
                    {errors.termsAccepted && (
                      <p className="text-rose-600 text-[11px] font-medium flex items-center gap-1 mt-1.5">
                        <AlertCircle size={12} />
                        <span>{errors.termsAccepted}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions: Back & Final Submit */}
                  <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleGoBack(2)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ChevronLeft size={14} />
                      <span>Back to Business Info</span>
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60 active:scale-95"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating Your Store…</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Store Registration</span>
                          <CheckCircle2 size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Bottom Form Footer note */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                BILZET Multi-Tenant Cloud ERP &middot; Bank-grade security with isolated merchant tenancies.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── 3. CLEAN FOOTER ───────────────────────────────── */}
      <footer className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 text-center text-[11px] text-slate-400 border-t border-slate-200/60">
        &copy; {new Date().getFullYear()} BILZET Technologies. All rights reserved. &middot; Secure Store Onboarding
      </footer>
    </div>
  );
}
