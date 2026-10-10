import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Building2,
  Store,
  Receipt,
  Users,
  Bell,
  Save,
  RotateCcw,
  Check,
  Lock,
  Eye,
  EyeOff,
  Printer,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Crown,
  Shield,
  Maximize2,
  Clock,
  Sparkles,
  Smartphone,
  X,
  CreditCard,
  CheckSquare,
  Square,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Star,
  ArrowRight,
} from "lucide-react";
import TeamManagement from "../components/team/TeamManagement";
import RolesManagement from "../components/team/RolesManagement";
import { settingsApi, subscriptionApi } from "../api";
import TaxInvoice, {
  COLOR_THEMES,
  DEFAULT_INVOICE_SETTINGS,
} from "../components/invoice/TaxInvoice";
import { useAuth } from "../store/auth";
import Button from "../components/common/Button";
import { useSecurityStore } from "../store/securityStore";
import { isAdminUser, isAdminEmail, maskAccountNumber } from "../utils/security";

export const PAPER_SIZES = [
  { id: "A4", label: "A4 Standard (Sheet)", tier: "FREE", desc: "Full-page standard invoice layout" },
  { id: "A5", label: "A5 Compact (Half Sheet)", tier: "FREE", desc: "Compact paper-saving bill layout" },
  { id: "Thermal 80mm", label: "Thermal 80mm (Roll)", tier: "PRO", desc: "Standard POS thermal receipt printer" },
  { id: "Thermal 58mm", label: "Thermal 58mm (Roll)", tier: "PREMIUM", desc: "Ultra-compact mobile handheld POS printer" },
];

export default function Settings({ defaultTab: initialTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { adminRevealed } = useSecurityStore();
  const isAuthorizedAdmin = isAdminUser(user) || isAdminEmail(user?.email);

  // Tab navigation mapping (backwards compatibility with old tab param names)
  const resolveTab = (tab) => {
    if (!tab) return "business";
    const lower = tab.toLowerCase();
    if (["business", "details", "info"].includes(lower)) return "business";
    if (["store", "shop"].includes(lower)) return "store";
    if (["tax", "billing", "customizer", "bank", "compliance"].includes(lower)) return "tax";
    if (["users", "permissions", "team", "roles"].includes(lower)) return "users";
    if (["preferences", "notifications", "attendance"].includes(lower)) return "preferences";
    return "business";
  };

  const [activeTab, setActiveTab] = useState(() => resolveTab(initialTab || searchParams.get("tab")));
  const [usersSubTab, setUsersSubTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab === "roles" ? "roles" : "staff";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(resolveTab(tabParam));
      if (tabParam === "roles") setUsersSubTab("roles");
      if (tabParam === "team") setUsersSubTab("staff");
    }
  }, [searchParams]);

  // Subscription state: verify from backend, fall back to localStorage
  const [activePlan, setActivePlan] = useState(() => {
    try {
      const sub = JSON.parse(localStorage.getItem("bilzet_subscription_data") || "{}");
      return (sub.currentPlan || "Free").toUpperCase();
    } catch (_) {
      return "FREE";
    }
  });

  const tierRank = { FREE: 1, PRO: 2, PREMIUM: 3, ENTERPRISE: 4 };
  const currentRank = tierRank[activePlan] || 1;

  const isFeatureUnlocked = (requiredTier) => {
    const req = (requiredTier || "FREE").toUpperCase();
    return currentRank >= (tierRank[req] || 1);
  };

  // Main settings state
  const [form, setForm] = useState(() => {
    const savedLocal = localStorage.getItem("bilzet_invoice_settings");
    const parsed = savedLocal ? JSON.parse(savedLocal) : {};
    return {
      ...DEFAULT_INVOICE_SETTINGS,
      // Store information fields
      storeName: parsed.storeName || parsed.shopName || "BILZET Retail Mart",
      storeLocation: parsed.storeLocation || parsed.address || "123 Commercial Plaza, Main Market",
      storePhone: parsed.storePhone || parsed.phone || "+91 9876543210",
      storeEmail: parsed.storeEmail || parsed.email || "billing@bilzet.app",
      // Tax preferences
      enableGst: parsed.enableGst !== undefined ? parsed.enableGst : true,
      defaultTaxRate: parsed.defaultTaxRate || "18",
      taxInclusive: parsed.taxInclusive !== undefined ? parsed.taxInclusive : false,
      showHsnSummary: parsed.showHsnSummary !== undefined ? parsed.showHsnSummary : true,
      // Notifications
      notifyWhatsApp: parsed.notifyWhatsApp !== undefined ? parsed.notifyWhatsApp : true,
      notifySms: parsed.notifySms !== undefined ? parsed.notifySms : false,
      notifyEmail: parsed.notifyEmail !== undefined ? parsed.notifyEmail : true,
      // Paper size & Watermark
      paperSize: parsed.paperSize || "A4",
      showWatermark: parsed.showWatermark !== undefined ? parsed.showWatermark : true,
      removeWatermark: parsed.removeWatermark || false,
      // Bank & UPI
      showBankDetails: parsed.showBankDetails !== undefined ? parsed.showBankDetails : true,
      showQrCode: parsed.showQrCode !== undefined ? parsed.showQrCode : true,
      bankName: parsed.bankName || "HDFC Bank Ltd",
      accountHolder: parsed.accountHolder || "BILZET Retail Mart",
      accountNumber: parsed.accountNumber || "50200012345678",
      ifsc: parsed.ifsc || "HDFC0001234",
      upiId: parsed.upiId || "bilzet@hdfcbank",
      // Color & Design
      colorTheme: parsed.colorTheme || "trust_blue",
      customColor: parsed.customColor || "",
      ...parsed,
    };
  });

  // Business Operational Preferences (Timings & Attendance)
  const [attSettings, setAttSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("bilzet_attendance_settings");
      return saved ? JSON.parse(saved) : {
        officeStartTime: "09:00",
        officeClosingTime: "18:00",
        gracePeriod: 15,
        lateThreshold: "09:15",
        halfDayThreshold: 4.0,
        minWorkingHours: 8.0,
        weeklyHolidays: ["Sunday"],
        overtimeRate: 1.5,
        lateDeductionRule: "3_TO_HALF_DAY",
      };
    } catch (_) {
      return {
        officeStartTime: "09:00",
        officeClosingTime: "18:00",
        gracePeriod: 15,
        lateThreshold: "09:15",
        halfDayThreshold: 4.0,
        minWorkingHours: 8.0,
        weeklyHolidays: ["Sunday"],
        overtimeRate: 1.5,
        lateDeductionRule: "3_TO_HALF_DAY",
      };
    }
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [showFullBankDetails, setShowFullBankDetails] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);

  // Fetch shop settings & subscription from backend
  useEffect(() => {
    let mounted = true;
    Promise.all([
      settingsApi.get().catch(() => null),
      subscriptionApi.getUsage().catch(() => null),
    ]).then(([settingsRes, usageRes]) => {
      if (!mounted) return;
      if (settingsRes) {
        setForm((prev) => {
          const merged = { ...prev, ...settingsRes };
          if (settingsRes.subscriptionTier) {
            setActivePlan(settingsRes.subscriptionTier.toUpperCase());
          }
          localStorage.setItem("bilzet_invoice_settings", JSON.stringify(merged));
          return merged;
        });
      }
      if (usageRes && usageRes.planTier) {
        setActivePlan(usageRes.planTier.toUpperCase());
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
    setErrorMessage("");
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      localStorage.setItem("bilzet_invoice_settings", JSON.stringify(next));
      return next;
    });
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateBusinessInfo = () => {
    const errors = {};
    if (!form.shopName || !form.shopName.trim()) {
      errors.shopName = "Business name is required";
    }
    if (!form.ownerName || !form.ownerName.trim()) {
      errors.ownerName = "Owner name is required";
    }
    if (!form.phone || !form.phone.trim()) {
      errors.phone = "Phone number is required";
    }
    if (!form.email || !form.email.trim()) {
      errors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!form.address || !form.address.trim()) {
      errors.address = "Business address is required";
    }
    return errors;
  };

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    const errors = validateBusinessInfo();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (activeTab !== "business") {
        handleTabChange("business");
      }
      setErrorMessage("Please complete all required fields in Business Information.");
      return;
    }

    setSaving(true);
    try {
      // Save operational preferences
      localStorage.setItem("bilzet_attendance_settings", JSON.stringify(attSettings));
      localStorage.setItem("bilzet_invoice_settings", JSON.stringify(form));

      // Persist to backend settings
      await settingsApi.update(form);

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || "Failed to save settings. Please try again.";
      setErrorMessage(apiMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Discard unsaved edits and reload saved business settings?")) {
      setLoading(true);
      settingsApi
        .get()
        .then((res) => {
          if (res) {
            setForm((prev) => ({ ...prev, ...res }));
          }
          setErrorMessage("");
          setFormErrors({});
        })
        .finally(() => setLoading(false));
    }
  };

  // Navigates to existing upgrade flow
  const handleUpgrade = (targetTier) => {
    navigate(`/plans?tier=${targetTier}`);
  };

  // Sample data for master invoice preview
  const sampleInvoiceData = {
    invoiceNumber: `${form.invoicePrefix || "INV-2026-"}0001`,
    createdAt: new Date().toISOString(),
    date: new Date().toISOString().split("T")[0],
    saleType: "B2B",
    placeOfSupply: `${form.stateCode || "33"}-${form.state || "Tamil Nadu"}`,
    paymentStatus: "PAID",
    customer: {
      name: "Ramesh Traders & Co.",
      phone: "9876543210",
      address: "Plot 42, Commercial Market, Coimbatore, Tamil Nadu",
      gstin: "33ABCDE1234F1Z5",
      state: "Tamil Nadu",
    },
    items: [
      {
        id: 1,
        name: "Standard Retail Product A",
        code: "SKU-001",
        hsn: "1006",
        unit: "box",
        qty: 2,
        rate: 550.0,
        discount: 50.0,
        gst: 5,
        taxable: 1050.0,
        taxAmt: 52.5,
        total: 1102.5,
      },
      {
        id: 2,
        name: "Commercial Packaged Goods B",
        code: "SKU-002",
        hsn: "1101",
        unit: "pack",
        qty: 1,
        rate: 420.0,
        discount: 20.0,
        gst: 5,
        taxable: 400.0,
        taxAmt: 20.0,
        total: 420.0,
      },
    ],
    totals: {
      subtotal: 1450.0,
      discount: 70.0,
      taxable: 1450.0,
      cgst: 36.25,
      sgst: 36.25,
      igst: 0.0,
      totalTax: 72.5,
      roundOff: 0.0,
      grandTotal: 1522.5,
      received: 1522.5,
      balance: 0.0,
    },
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition placeholder:text-slate-400";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ── 1. PAGE HEADER ───────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900">Business Settings</h1>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                activePlan === "PREMIUM"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : activePlan === "PRO"
                  ? "bg-blue-50 text-blue-800 border-blue-300"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              {activePlan} PLAN
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Manage your business details, store information, billing preferences, user access, and operational settings.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Plan Simulation Switcher for previewing Free, Pro, Premium */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] mr-1">
            <span className="text-slate-500 px-1 font-medium">Plan:</span>
            {["FREE", "PRO", "PREMIUM"].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  setActivePlan(tier);
                  localStorage.setItem(
                    "bilzet_subscription_data",
                    JSON.stringify({ currentPlan: tier })
                  );
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activePlan === tier
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={`Simulate ${tier} subscription tier`}
              >
                {tier}
              </button>
            ))}
          </div>

          <Button
            variant="neutral"
            size="sm"
            icon={Eye}
            onClick={() => setShowInvoicePreviewModal(true)}
            title="Preview master invoice layout"
          >
            Preview Bill
          </Button>

          <Button
            variant="neutral"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
            disabled={loading || saving}
            title="Reset form to last saved data"
          >
            Cancel
          </Button>

          <Button
            variant={savedSuccess ? "success" : "primary"}
            size="sm"
            icon={savedSuccess ? Check : Save}
            onClick={handleSaveAll}
            disabled={loading || saving}
          >
            {saving ? "Saving…" : savedSuccess ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* ── ALERTS: SUCCESS & ERROR ──────────────────────── */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Settings saved successfully. All changes are active for your business.</span>
          </div>
          <span className="text-[10px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded font-bold uppercase">
            Updated
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-rose-600 hover:text-rose-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── 2. MAIN NAVIGATION TABS ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-xs overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {[
            { id: "business", label: "Business Information", icon: Building2 },
            { id: "store", label: "Store Information", icon: Store },
            { id: "tax", label: "Tax & Billing", icon: Receipt },
            { id: "users", label: "Users & Permissions", icon: Users },
            { id: "preferences", label: "Notifications & Preferences", icon: Bell },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isCurrent
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={15} className={isCurrent ? "text-blue-600" : "text-slate-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── 3. TAB CONTENT ────────────────────────────────── */}

      {/* ════════════════════════════════════════════════════
          SECTION 1: BUSINESS INFORMATION
      ════════════════════════════════════════════════════ */}
      {activeTab === "business" && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Business Information</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Legal name, owner details, contact information, and principal place of business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Business Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.shopName || ""}
                onChange={(e) => handleFieldChange("shopName", e.target.value)}
                placeholder="e.g. BILZET Retail Mart"
                className={`${inputCls} ${formErrors.shopName ? "border-rose-400 bg-rose-50/30" : ""}`}
              />
              {formErrors.shopName ? (
                <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                  {formErrors.shopName}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The primary registered name of your company or shop.
                </span>
              )}
            </div>

            <div>
              <label className={labelCls}>
                Owner Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.ownerName || ""}
                onChange={(e) => handleFieldChange("ownerName", e.target.value)}
                placeholder="e.g. Karthi Kevan"
                className={`${inputCls} ${formErrors.ownerName ? "border-rose-400 bg-rose-50/30" : ""}`}
              />
              {formErrors.ownerName ? (
                <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                  {formErrors.ownerName}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Name of proprietor, partner, or managing director.
                </span>
              )}
            </div>

            <div>
              <label className={labelCls}>
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone || ""}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                placeholder="e.g. +91 9876543210"
                className={`${inputCls} ${formErrors.phone ? "border-rose-400 bg-rose-50/30" : ""}`}
              />
              {formErrors.phone ? (
                <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                  {formErrors.phone}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Official phone number printed on customer receipts and quotes.
                </span>
              )}
            </div>

            <div>
              <label className={labelCls}>
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                placeholder="e.g. billing@bilzet.app"
                className={`${inputCls} ${formErrors.email ? "border-rose-400 bg-rose-50/30" : ""}`}
              />
              {formErrors.email ? (
                <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                  {formErrors.email}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Email for billing communications and customer inquiries.
                </span>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>
                Business Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={form.address || ""}
                onChange={(e) => handleFieldChange("address", e.target.value)}
                placeholder="e.g. 123 Commercial Plaza, Main Market, Coimbatore, Tamil Nadu - 641001"
                className={`${inputCls} leading-relaxed ${
                  formErrors.address ? "border-rose-400 bg-rose-50/30" : ""
                }`}
              />
              {formErrors.address ? (
                <span className="text-[11px] text-rose-600 font-medium mt-1 block">
                  {formErrors.address}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Complete physical address displayed in the bill header.
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="neutral" size="sm" onClick={handleReset} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={handleSaveAll}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Business Information"}
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SECTION 2: STORE INFORMATION
      ════════════════════════════════════════════════════ */}
      {activeTab === "store" && (
        <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Store Information</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific outlet or branch details used for point of sale billing and branch identification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Store Name</label>
              <input
                type="text"
                value={form.storeName || form.shopName || ""}
                onChange={(e) => handleFieldChange("storeName", e.target.value)}
                placeholder="e.g. Central Outlet - Store #1"
                className={inputCls}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Branch or franchise name for this physical outlet.
              </span>
            </div>

            <div>
              <label className={labelCls}>Store Location / Landmark</label>
              <input
                type="text"
                value={form.storeLocation || form.address || ""}
                onChange={(e) => handleFieldChange("storeLocation", e.target.value)}
                placeholder="e.g. Ground Floor, West Wing"
                className={inputCls}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Local branch address or mall location.
              </span>
            </div>

            <div>
              <label className={labelCls}>Store Phone Number</label>
              <input
                type="tel"
                value={form.storePhone || form.phone || ""}
                onChange={(e) => handleFieldChange("storePhone", e.target.value)}
                placeholder="e.g. +91 9876543210"
                className={inputCls}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Counter or cash desk contact number.
              </span>
            </div>

            <div>
              <label className={labelCls}>Store Email Address</label>
              <input
                type="email"
                value={form.storeEmail || form.email || ""}
                onChange={(e) => handleFieldChange("storeEmail", e.target.value)}
                placeholder="e.g. store1@bilzet.app"
                className={inputCls}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Direct branch correspondence email.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button variant="neutral" size="sm" onClick={handleReset} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={handleSaveAll}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Store Information"}
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SECTION 3: TAX & BILLING
      ════════════════════════════════════════════════════ */}
      {activeTab === "tax" && (
        <div className="space-y-6">
          {/* Subsection 3.1: GST Details & Preferences */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">GST &amp; Tax Preferences</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Goods and Services Tax identification, place of supply, and default calculation rules.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                FREE INCLUDED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>GSTIN (Goods and Services Tax Number)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.gstin || ""}
                  onChange={(e) => handleFieldChange("gstin", e.target.value.toUpperCase())}
                  placeholder="33AAAAA0000A1Z5"
                  className={`${inputCls} font-mono uppercase font-bold tracking-wider`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  15-digit Indian GST identification number.
                </span>
              </div>

              <div>
                <label className={labelCls}>State &amp; State Code</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={form.stateCode || ""}
                    onChange={(e) => handleFieldChange("stateCode", e.target.value)}
                    placeholder="33"
                    className={`${inputCls} font-mono text-center`}
                  />
                  <input
                    type="text"
                    value={form.state || ""}
                    onChange={(e) => handleFieldChange("state", e.target.value)}
                    placeholder="Tamil Nadu"
                    className={`${inputCls} col-span-2`}
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Determines CGST + SGST vs IGST for inter-state supply.
                </span>
              </div>

              <div>
                <label className={labelCls}>Default Tax Rate (%)</label>
                <select
                  value={form.defaultTaxRate || "18"}
                  onChange={(e) => handleFieldChange("defaultTaxRate", e.target.value)}
                  className={inputCls}
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5% (Essentials)</option>
                  <option value="12">12% (Standard Low)</option>
                  <option value="18">18% (Standard General)</option>
                  <option value="28">28% (Luxury / Higher)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Pre-selected tax rate for new products and quick billing.
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enableGst}
                    onChange={(e) => handleFieldChange("enableGst", e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Enable GST calculations on sales
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.showHsnSummary}
                    onChange={(e) => handleFieldChange("showHsnSummary", e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Print HSN/SAC summary table on invoices
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Subsection 3.2: Invoice Settings (Numbering, Title, Paper Size) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Invoice Settings &amp; Printing</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Document title, serial numbering prefix, paper layout, and watermark rules.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Document Title</label>
                <input
                  type="text"
                  value={form.invoiceTitle || "TAX INVOICE"}
                  onChange={(e) => handleFieldChange("invoiceTitle", e.target.value)}
                  placeholder="TAX INVOICE"
                  className={inputCls}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Header printed at the top of the bill (e.g. TAX INVOICE, RETAIL BILL, CASH MEMO).
                </span>
              </div>

              <div>
                <label className={labelCls}>Invoice Prefix</label>
                <input
                  type="text"
                  value={form.invoicePrefix || "INV-2026-"}
                  onChange={(e) => handleFieldChange("invoicePrefix", e.target.value)}
                  placeholder="INV-2026-"
                  className={`${inputCls} font-mono`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Prefix placed before sequential invoice numbers (e.g. INV-2026-0001).
                </span>
              </div>
            </div>

            {/* Paper Size Gating */}
            <div className="space-y-3 pt-2">
              <label className={labelCls}>Paper Size &amp; Printer Layout</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAPER_SIZES.map((paper) => {
                  const isLocked = !isFeatureUnlocked(paper.tier);
                  const isSelected = form.paperSize === paper.id;
                  return (
                    <div
                      key={paper.id}
                      onClick={() => {
                        if (!isLocked) {
                          handleFieldChange("paperSize", paper.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition relative flex items-start justify-between cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 shadow-xs"
                          : isLocked
                          ? "border-slate-200 bg-slate-50/60 opacity-90 cursor-default"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{paper.label}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              paper.tier === "FREE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : paper.tier === "PRO"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {paper.tier}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{paper.desc}</p>
                      </div>

                      {isLocked ? (
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                            <Lock size={10} /> Locked
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgrade(paper.tier);
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline"
                          >
                            Upgrade to {paper.tier === "PREMIUM" ? "Premium" : "Pro"}
                          </button>
                        </div>
                      ) : (
                        <div className="shrink-0 pt-0.5">
                          <input
                            type="radio"
                            name="paperSize"
                            checked={isSelected}
                            onChange={() => handleFieldChange("paperSize", paper.id)}
                            className="w-4 h-4 text-blue-600 border-slate-300"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Watermark Removal (Pro Feature) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Remove BILZET Watermark</span>
                    {!isFeatureUnlocked("PRO") && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                        <Lock size={10} /> PRO FEATURE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Print bills with pure 100% white-label store branding without "Powered by BILZET".
                  </p>
                </div>

                {!isFeatureUnlocked("PRO") ? (
                  <Button
                    variant="neutral"
                    size="sm"
                    icon={Lock}
                    onClick={() => handleUpgrade("PRO")}
                  >
                    Upgrade to Pro
                  </Button>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!form.showWatermark || form.removeWatermark}
                      onChange={(e) => {
                        handleFieldChange("showWatermark", !e.target.checked);
                        handleFieldChange("removeWatermark", e.target.checked);
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Remove Watermark</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Subsection 3.3: Direct Bank Settlement & Scan-to-Pay UPI QR (Pro Feature) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Bank Settlement &amp; UPI QR Code
                  </h2>
                  {!isFeatureUnlocked("PRO") && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                      <Lock size={10} /> PRO FEATURE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Print bank account details and dynamic scan-and-pay UPI QR on invoices for instant customer settlement.
                </p>
              </div>

              {!isFeatureUnlocked("PRO") ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Lock}
                  onClick={() => handleUpgrade("PRO")}
                >
                  Upgrade to Pro
                </Button>
              ) : (
                isAuthorizedAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowFullBankDetails(!showFullBankDetails)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {showFullBankDetails ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showFullBankDetails ? "Mask Details" : "Reveal Numbers"}</span>
                  </button>
                )
              )}
            </div>

            {!isFeatureUnlocked("PRO") ? (
              <div className="p-5 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 text-center space-y-2">
                <CreditCard size={28} className="mx-auto text-blue-500" />
                <h3 className="text-xs font-bold text-slate-900">
                  Accept Direct Bank Payments &amp; UPI QR on Invoices
                </h3>
                <p className="text-[11px] text-slate-600 max-w-md mx-auto">
                  Upgrade to Pro to include your bank beneficiary name, account number, IFSC code, and scan-and-pay UPI QR code automatically on all printed and PDF invoices.
                </p>
                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => handleUpgrade("PRO")}
                  >
                    Upgrade to Pro to Unlock
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input
                    type="text"
                    value={form.bankName || ""}
                    onChange={(e) => handleFieldChange("bankName", e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Beneficiary / Account Holder</label>
                  <input
                    type="text"
                    value={form.accountHolder || ""}
                    onChange={(e) => handleFieldChange("accountHolder", e.target.value)}
                    placeholder="e.g. BILZET Retail Mart"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Account Number</label>
                  <input
                    type="text"
                    value={
                      showFullBankDetails
                        ? form.accountNumber || ""
                        : maskAccountNumber(form.accountNumber, false)
                    }
                    disabled={!showFullBankDetails}
                    onChange={(e) => handleFieldChange("accountNumber", e.target.value)}
                    placeholder="50200012345678"
                    className={`${inputCls} font-mono`}
                  />
                </div>

                <div>
                  <label className={labelCls}>IFSC Code</label>
                  <input
                    type="text"
                    value={form.ifsc || ""}
                    onChange={(e) => handleFieldChange("ifsc", e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    className={`${inputCls} font-mono uppercase`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelCls}>UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={form.upiId || ""}
                    onChange={(e) => handleFieldChange("upiId", e.target.value)}
                    placeholder="e.g. bilzet@hdfcbank"
                    className={`${inputCls} font-mono`}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Dynamic QR code generated from this UPI ID will be printed on bills.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Subsection 3.4: Appearance & Brand Colors */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Color Palette &amp; Themes</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose the invoice accent color. Free includes 3 standard themes. Custom HEX color requires Premium.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className={labelCls}>Standard Color Palettes</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COLOR_THEMES.slice(0, 4).map((theme) => {
                  const isSel = form.colorTheme === theme.id && !form.customColor;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        handleFieldChange("colorTheme", theme.id);
                        handleFieldChange("customColor", "");
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                        isSel
                          ? "border-blue-600 bg-blue-50/40 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <span className="text-xs font-semibold text-slate-800">{theme.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom HEX Color (Premium Feature) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Custom Brand HEX Color</span>
                      {!isFeatureUnlocked("PREMIUM") && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                          <Lock size={10} /> PREMIUM FEATURE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Use your exact company brand color on invoice headers, tables, and totals.
                    </p>
                  </div>

                  {!isFeatureUnlocked("PREMIUM") ? (
                    <Button
                      variant="neutral"
                      size="sm"
                      icon={Lock}
                      onClick={() => handleUpgrade("PREMIUM")}
                    >
                      Upgrade to Premium
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.customColor || "#2563eb"}
                        onChange={(e) => handleFieldChange("customColor", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                      />
                      <input
                        type="text"
                        value={form.customColor || ""}
                        onChange={(e) => handleFieldChange("customColor", e.target.value)}
                        placeholder="#2563EB"
                        className={`${inputCls} w-28 font-mono`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subsection 3.5: Notes, Terms & Signatory */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Terms, Greetings &amp; Signatures</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer notes, terms of sale, and authorized signatory line.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Thank-You Note / Greeting</label>
                <input
                  type="text"
                  value={form.thankYouMessage || form.notes || "Thank you for shopping with us! Visit again."}
                  onChange={(e) => {
                    handleFieldChange("thankYouMessage", e.target.value);
                    handleFieldChange("notes", e.target.value);
                  }}
                  placeholder="Thank you for shopping with us! Visit again."
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Authorized Signatory Name</label>
                <input
                  type="text"
                  value={form.authorizedPerson || ""}
                  onChange={(e) => handleFieldChange("authorizedPerson", e.target.value)}
                  placeholder="e.g. Karthi Kevan"
                  className={inputCls}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelCls}>Terms &amp; Conditions (Printed on bill)</label>
                <textarea
                  rows={3}
                  value={form.terms || ""}
                  onChange={(e) => handleFieldChange("terms", e.target.value)}
                  placeholder="1. Goods once sold will not be taken back without valid bill.&#10;2. Subject to local jurisdiction."
                  className={`${inputCls} font-mono text-[11px] leading-relaxed`}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="neutral"
                size="sm"
                icon={Eye}
                onClick={() => setShowInvoicePreviewModal(true)}
              >
                Preview Invoice Sample
              </Button>

              <div className="flex items-center gap-3">
                <Button variant="neutral" size="sm" onClick={handleReset} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Save}
                  onClick={handleSaveAll}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Tax & Billing"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SECTION 4: USERS & PERMISSIONS
      ════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Sub-tabs for Staff Access vs Roles */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUsersSubTab("staff")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                usersSubTab === "staff"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Users size={14} />
              <span>Staff &amp; Manager Access</span>
            </button>

            <button
              type="button"
              onClick={() => setUsersSubTab("roles")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                usersSubTab === "roles"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Shield size={14} />
              <span>Roles &amp; Permissions</span>
            </button>
          </div>

          {usersSubTab === "staff" ? (
            <div className="w-full">
              <TeamManagement />
            </div>
          ) : (
            <div className="w-full">
              <RolesManagement />
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          SECTION 5: NOTIFICATIONS & PREFERENCES
      ════════════════════════════════════════════════════ */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          {/* Subsection 5.1: Notifications */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Notification Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure automated customer receipts and business alert channels.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyWhatsApp}
                  onChange={(e) => handleFieldChange("notifyWhatsApp", e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    WhatsApp Bill Sharing Prompt
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Automatically display a one-click WhatsApp share button after generating each new invoice.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifySms}
                  onChange={(e) => handleFieldChange("notifySms", e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    SMS Order Dispatch Alerts
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Send real-time SMS delivery confirmation alerts when goods are marked as dispatched.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyEmail}
                  onChange={(e) => handleFieldChange("notifyEmail", e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    Email PDF Invoice Copies
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Attach clean PDF copies of finalized invoices and send to the customer's email address.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Subsection 5.2: Business Shift & Attendance Preferences */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Business Shift &amp; Working Hours</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard office opening and closing hours, grace periods, weekly off days, and automated attendance rules.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Office Opening Time</label>
                <input
                  type="time"
                  value={attSettings.officeStartTime}
                  onChange={(e) => setAttSettings({ ...attSettings, officeStartTime: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Morning start time for daily business operations (e.g. 09:00 AM).
                </span>
              </div>

              <div>
                <label className={labelCls}>Office Closing Time</label>
                <input
                  type="time"
                  value={attSettings.officeClosingTime}
                  onChange={(e) => setAttSettings({ ...attSettings, officeClosingTime: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Evening closing time for daily business operations (e.g. 06:00 PM).
                </span>
              </div>

              <div>
                <label className={labelCls}>Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={attSettings.gracePeriod}
                  onChange={(e) =>
                    setAttSettings({ ...attSettings, gracePeriod: Number(e.target.value) })
                  }
                  className={`${inputCls} font-mono`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Allowable late arrival without penalty (e.g. 15 minutes).
                </span>
              </div>

              <div>
                <label className={labelCls}>Late Threshold Time</label>
                <input
                  type="time"
                  value={attSettings.lateThreshold}
                  onChange={(e) => setAttSettings({ ...attSettings, lateThreshold: e.target.value })}
                  className={inputCls}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Check-ins after this time are marked as Late.
                </span>
              </div>

              <div>
                <label className={labelCls}>Minimum Working Hours (Full Day)</label>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="16"
                  value={attSettings.minWorkingHours}
                  onChange={(e) =>
                    setAttSettings({ ...attSettings, minWorkingHours: Number(e.target.value) })
                  }
                  className={`${inputCls} font-mono`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Hours needed to qualify for a full day's attendance (e.g. 8.0 hrs).
                </span>
              </div>

              <div>
                <label className={labelCls}>Half-Day Threshold (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={attSettings.halfDayThreshold}
                  onChange={(e) =>
                    setAttSettings({ ...attSettings, halfDayThreshold: Number(e.target.value) })
                  }
                  className={`${inputCls} font-mono`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Working hours below this are recorded as half-day.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Weekly Holidays</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {["Sunday", "Saturday", "Friday"].map((day) => {
                    const isChecked = attSettings.weeklyHolidays?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const list = [...(attSettings.weeklyHolidays || [])];
                          if (isChecked) {
                            setAttSettings({
                              ...attSettings,
                              weeklyHolidays: list.filter((d) => d !== day),
                            });
                          } else {
                            setAttSettings({
                              ...attSettings,
                              weeklyHolidays: [...list, day],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isChecked
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <span>{day}</span>
                        {isChecked && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Overtime Rate Multiplier</label>
                <select
                  value={attSettings.overtimeRate}
                  onChange={(e) =>
                    setAttSettings({ ...attSettings, overtimeRate: Number(e.target.value) })
                  }
                  className={inputCls}
                >
                  <option value={1.0}>1.0x (Standard hourly rate)</option>
                  <option value={1.5}>1.5x (Standard 150% overtime)</option>
                  <option value={2.0}>2.0x (Double rate)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Late Attendance Deduction Rule</label>
                <select
                  value={attSettings.lateDeductionRule}
                  onChange={(e) =>
                    setAttSettings({ ...attSettings, lateDeductionRule: e.target.value })
                  }
                  className={inputCls}
                >
                  <option value="3_TO_HALF_DAY">3 Late Marks = 0.5 Day Salary Deduction</option>
                  <option value="2_TO_HALF_DAY">2 Late Marks = 0.5 Day Salary Deduction</option>
                  <option value="NONE">No Automatic Deduction</option>
                </select>
              </div>
            </div>

            {/* Subsection 5.3: Refer & Earn Partner Program */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Star size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Refer &amp; Earn Merchant Rewards</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Invite fellow retail merchants to BILZET. They get 10% off their subscription, and you get 1 bonus month of Pro ERP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/referral")}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-center"
              >
                <span>View Refer &amp; Earn</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button variant="neutral" size="sm" onClick={handleReset} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Save}
                onClick={handleSaveAll}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Preferences"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL: FULL MASTER INVOICE PREVIEW
      ════════════════════════════════════════════════════ */}
      {showInvoicePreviewModal && (
        <TaxInvoice
          invoice={sampleInvoiceData}
          shopSettings={form}
          plan={activePlan}
          isModal={true}
          onClose={() => setShowInvoicePreviewModal(false)}
        />
      )}
    </div>
  );
}
