import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Settings as SettingsIcon,
  Store,
  Printer,
  FileText,
  Save,
  Check,
  Palette,
  Shield,
  QrCode,
  Building2,
  Sparkles,
  Eye,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { settingsApi } from "../api";
import TaxInvoice from "../components/invoice/TaxInvoice";
import { useAuth } from "../store/auth";
import { useSecurityStore } from "../store/securityStore";
import { isAdminUser, isAdminEmail, maskAccountNumber, maskIFSC, maskUPI } from "../utils/security";
import { Lock, Unlock, EyeOff } from "lucide-react";

export default function Settings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOnboarding = searchParams.get("onboarding") === "true";
  const [activeTab, setActiveTab] = useState(isOnboarding ? "store" : "customizer");

  const [form, setForm] = useState(() => {
    const savedLocal = localStorage.getItem("bilzet_invoice_settings");
    const parsed = savedLocal ? JSON.parse(savedLocal) : {};
    return {
      // Store details
      shopName: parsed.shopName || "BILZET Retail Mart",
      ownerName: parsed.ownerName || "Karthik Enterprises",
      phone: parsed.phone || "+91 98765 43210",
      email: parsed.email || "billing@bilzet.app",
      address: parsed.address || "123 Commercial Plaza, Main Market, Bengaluru",
      gstin: parsed.gstin || "29ABCDE1234F1Z5",
      state: parsed.state || "Karnataka",
      stateCode: parsed.stateCode || "29",
      pan: parsed.pan || "ABCDE1234F",
      invoicePrefix: parsed.invoicePrefix || "INV-2026-",
      paperSize: parsed.paperSize || "A4",
      terms:
        parsed.terms ||
        "1. Goods once sold cannot be returned. 2. Payment is due within 15 days of invoice date. 3. Subject to local jurisdiction.",

      // Customizer specifics
      template: parsed.template || "modern", // 'modern' | 'classic' | 'minimal' | 'thermal'
      themeColor: parsed.themeColor || "#1a5cff",
      invoiceTitle: parsed.invoiceTitle || "TAX INVOICE",
      showHsnSummary: parsed.showHsnSummary !== false,
      showBankDetails: parsed.showBankDetails !== false,
      showQrCode: parsed.showQrCode !== false,
      showSignatory: parsed.showSignatory !== false,
      showTerms: parsed.showTerms !== false,
      showAmountInWords: parsed.showAmountInWords !== false,

      // Bank & UPI details
      bankName: parsed.bankName || "HDFC Bank Ltd",
      accountNumber: parsed.accountNumber || "50200012345678",
      ifsc: parsed.ifsc || "HDFC0001234",
      accountHolder: parsed.accountHolder || "BILZET Retail Mart",
      upiId: parsed.upiId || "bilzet@hdfcbank",
    };
  });

  const { user } = useAuth();
  const { adminRevealed } = useSecurityStore();
  const isAuthorizedAdmin = isAdminUser(user) || isAdminEmail(user?.email);
  const canViewBankDetails = isAuthorizedAdmin || adminRevealed;
  const [showFullBankDetails, setShowFullBankDetails] = useState(false);

  const [saved, setSaved] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => {
        if (res) {
          setForm((prev) => {
            const merged = { ...prev, ...res };
            localStorage.setItem("bilzet_invoice_settings", JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (field, val) => {
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      localStorage.setItem("bilzet_invoice_settings", JSON.stringify(next));
      return next;
    });
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem("bilzet_invoice_settings", JSON.stringify(form));
    settingsApi.update(form).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2800);
  };

  const themePalettes = [
    { label: "Royal Blue", color: "#1a5cff" },
    { label: "Emerald Teal", color: "#0d9488" },
    { label: "Vibrant Violet", color: "#7c3aed" },
    { label: "Deep Slate", color: "#0f172a" },
    { label: "Rose Ruby", color: "#e11d48" },
    { label: "Warm Amber", color: "#d97706" },
  ];

  const templates = [
    {
      id: "modern",
      name: "Modern Gradient",
      desc: "Contemporary layout with colored badges and sleek borders.",
      tag: "Most Popular",
    },
    {
      id: "classic",
      name: "Classic Corporate",
      desc: "Formal double-bordered table design ideal for GST audits.",
      tag: "Official GST",
    },
    {
      id: "minimal",
      name: "Minimalist Clean",
      desc: "High-contrast editorial typography with generous whitespace.",
      tag: "Modern",
    },
    {
      id: "thermal",
      name: "80mm Thermal Receipt",
      desc: "Monochrome roll format for fast thermal counter printers.",
      tag: "POS Retail",
    },
  ];

  const inputCls = "w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition bg-white";

  return (
    <div className="space-y-5 pb-16 max-w-7xl mx-auto fade-up">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0">
            <Palette size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Invoice Customizer &amp; Settings
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
                GST Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Design tailored tax invoices, configure brand themes, and set up instant UPI scan-to-pay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {saved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl">
              <Check size={13} />
              <span>Saved!</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowFullPreview(true)}
            className="btn-secondary text-xs"
          >
            <Eye size={13} className="text-slate-400" />
            <span>Full Preview</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary text-xs"
          >
            <Save size={13} />
            <span>Save Customization</span>
          </button>
        </div>
      </div>

      {isOnboarding && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div>
            <h3 className="font-bold text-sm">Welcome to BILZET ERP! 🎉</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              Let&apos;s quickly review and save your Business profile and Shop details before accessing your workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition shrink-0 self-start sm:self-auto shadow-xs"
          >
            Continue to Dashboard →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          NAVIGATION TABS
      ══════════════════════════════════════════════════ */}
      <div className="seg-tabs w-full overflow-x-auto">
        {[
          { id: "customizer", label: "Invoice Studio & Preview", icon: Sparkles },
          { id: "store", label: "Shop Profile & GST", icon: Store },
          { id: "bank", label: "Bank & UPI QR", icon: Building2 },
          { id: "paper", label: "Paper & Print", icon: Printer },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`seg-tab flex items-center gap-1.5 ${isActive ? "active" : ""}`}
            >
              <Icon size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          2-COLUMN SPLIT: FORM CONTROLS (LEFT) + LIVE PREVIEW (RIGHT)
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: ACTIVE TAB CONTROLS (6 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* ──────────────── TAB 1: INVOICE STUDIO ──────────────── */}
          {activeTab === "customizer" && (
            <div className="space-y-5">
              {/* 1. TEMPLATE PICKER */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">1. Invoice Design Template</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Select the visual layout for your customer invoices</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                    {form.template}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((tmpl) => {
                    const isSelected = form.template === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => handleChange("template", tmpl.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/40"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-bold text-xs text-slate-900">{tmpl.name}</p>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {tmpl.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{tmpl.desc}</p>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                          <span className={isSelected ? "text-blue-600 font-bold" : "text-slate-400"}>
                            {isSelected ? "✓ Active Layout" : "Click to apply"}
                          </span>
                          {isSelected && <CheckCircle2 size={13} className="text-blue-600" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. THEME PALETTE & ACCENT COLOR */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">2. Brand Accent Color</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Used for headers, invoice highlights, and badges</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: form.themeColor }}
                    />
                    <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                      {form.themeColor}
                    </span>
                  </div>
                </div>

                {/* Swatches */}
                <div className="flex flex-wrap items-center gap-2">
                  {themePalettes.map((p) => {
                    const active = form.themeColor === p.color;
                    return (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => handleChange("themeColor", p.color)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                          active
                            ? "border-slate-800 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/60 shadow-xs"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <label className="text-[10px] font-semibold text-slate-500">Custom:</label>
                    <input
                      type="color"
                      value={form.themeColor}
                      onChange={(e) => handleChange("themeColor", e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. INVOICE HEADER & TITLE */}
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">3. Document Header &amp; Title</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Invoice Document Title</label>
                    <select
                      value={form.invoiceTitle}
                      onChange={(e) => handleChange("invoiceTitle", e.target.value)}
                      className={inputCls}
                    >
                      <option value="TAX INVOICE">TAX INVOICE (GST Standard)</option>
                      <option value="RETAIL INVOICE">RETAIL INVOICE</option>
                      <option value="BILL OF SUPPLY">BILL OF SUPPLY (Composition / Exempt)</option>
                      <option value="CASH MEMO">TAX INVOICE / CASH MEMO</option>
                      <option value="PROFORMA INVOICE">PROFORMA INVOICE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Invoice Series Prefix</label>
                    <input
                      value={form.invoicePrefix}
                      onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                      placeholder="INV-2026-"
                      className={`${inputCls} font-mono uppercase`}
                    />
                  </div>
                </div>
              </div>

              {/* 4. TOGGLES: SECTIONS DISPLAY */}
              <div className="card p-5 space-y-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">4. Visible Elements &amp; Compliance</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Toggle sections shown on customer invoices</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {[
                    {
                      key: "showHsnSummary",
                      title: "HSN / SAC Tax Summary Grid",
                      desc: "Detailed table calculating CGST and SGST per HSN category",
                    },
                    {
                      key: "showAmountInWords",
                      title: "Amount in Words (INR)",
                      desc: "Spells out the grand total in Indian Rupees",
                    },
                    {
                      key: "showBankDetails",
                      title: "Bank Account & IFSC Box",
                      desc: "Displays Bank Name, A/C Number, IFSC for NEFT/RTGS",
                    },
                    {
                      key: "showQrCode",
                      title: "Dynamic UPI Payment QR Code",
                      desc: "Direct scan-to-pay QR linking to your shop's UPI VPA",
                    },
                    {
                      key: "showSignatory",
                      title: "Authorized Signatory Box",
                      desc: "Formal stamp area with 'For [Shop Name]' and signature line",
                    },
                    {
                      key: "showTerms",
                      title: "Terms & Conditions Clause",
                      desc: "Footer note outlining return policy and business terms",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(e) => handleChange(item.key, e.target.checked)}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer shrink-0 ml-3"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: SHOP PROFILE & GST ──────────────── */}
          {activeTab === "store" && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <Store size={18} className="text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Business Profile &amp; GST Identification</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official entity information printed on the supplier block of tax invoices
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Shop / Business Trade Name</label>
                  <input value={form.shopName} onChange={(e) => handleChange("shopName", e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Owner / Authorized Person</label>
                  <input value={form.ownerName} onChange={(e) => handleChange("ownerName", e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Contact Phone</label>
                  <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Contact Email</label>
                  <input value={form.email} onChange={(e) => handleChange("email", e.target.value)} className={inputCls} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Registered Principal Place of Business Address</label>
                  <input value={form.address} onChange={(e) => handleChange("address", e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Registered GSTIN (15 Digits)</label>
                  <input
                    value={form.gstin}
                    onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                    placeholder="29ABCDE1234F1Z5"
                    className={`${inputCls} font-mono uppercase font-bold`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Permanent Account Number (PAN)</label>
                  <input
                    value={form.pan}
                    onChange={(e) => handleChange("pan", e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className={`${inputCls} font-mono uppercase font-bold`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">State Name</label>
                  <input value={form.state} onChange={(e) => handleChange("state", e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">State Code (e.g. 29, 33, 27)</label>
                  <input value={form.stateCode} onChange={(e) => handleChange("stateCode", e.target.value)} className={`${inputCls} font-mono`} />
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: BANK & UPI QR ──────────────── */}
          {activeTab === "bank" && (
            <div className="card p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">Direct Bank Settlement &amp; UPI Payment QR</h2>
                      {canViewBankDetails ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 size={11} /> Admin Access Granted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Lock size={11} /> Masked (Non-Admin)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Printed on invoice bills for customer payments via GPay, PhonePe, Paytm, or NEFT
                    </p>
                  </div>
                </div>

                {canViewBankDetails && (
                  <button
                    type="button"
                    onClick={() => setShowFullBankDetails(!showFullBankDetails)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                  >
                    {showFullBankDetails ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showFullBankDetails ? "Mask Financial Details" : "Reveal Full Details"}</span>
                  </button>
                )}
              </div>

              {!canViewBankDetails && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                  <Lock className="text-amber-600 mt-0.5 shrink-0" size={18} />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">Protected Settlement Account (Admin Access Required)</h4>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Direct settlement account numbers and routing IFSC credentials are protected by enterprise security policy. Only authenticated administrators with authorized credentials can view or modify settlement details.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Bank Name</label>
                  <input
                    value={form.bankName}
                    disabled={!canViewBankDetails}
                    onChange={(e) => handleChange("bankName", e.target.value)}
                    placeholder="HDFC Bank / State Bank of India"
                    className={`${inputCls} ${!canViewBankDetails ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Beneficiary / Account Holder Name</label>
                  <input
                    value={form.accountHolder}
                    disabled={!canViewBankDetails}
                    onChange={(e) => handleChange("accountHolder", e.target.value)}
                    placeholder="BILZET Retail Mart"
                    className={`${inputCls} ${!canViewBankDetails ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Bank Account Number</label>
                  <input
                    type="text"
                    value={
                      canViewBankDetails && showFullBankDetails
                        ? form.accountNumber
                        : maskAccountNumber(form.accountNumber, false)
                    }
                    disabled={!canViewBankDetails || !showFullBankDetails}
                    onChange={(e) => handleChange("accountNumber", e.target.value)}
                    placeholder="50200012345678"
                    className={`${inputCls} font-mono font-bold ${
                      !canViewBankDetails || !showFullBankDetails
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed tracking-widest"
                        : "text-slate-900"
                    }`}
                  />
                  {!showFullBankDetails && canViewBankDetails && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Click &quot;Reveal Full Details&quot; above to view and edit the exact account number.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">IFSC Code (11 Characters)</label>
                  <input
                    value={
                      canViewBankDetails && showFullBankDetails
                        ? form.ifsc
                        : maskIFSC(form.ifsc, false)
                    }
                    disabled={!canViewBankDetails || !showFullBankDetails}
                    onChange={(e) => handleChange("ifsc", e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    className={`${inputCls} font-mono uppercase font-bold ${
                      !canViewBankDetails || !showFullBankDetails
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                        : "text-slate-900"
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Shop UPI VPA ID (For Instant Scan &amp; Pay QR Code)
                  </label>
                  <input
                    value={
                      canViewBankDetails
                        ? form.upiId
                        : maskUPI(form.upiId, false)
                    }
                    disabled={!canViewBankDetails}
                    onChange={(e) => handleChange("upiId", e.target.value)}
                    placeholder="bilzet@hdfcbank or phone@paytm"
                    className={`${inputCls} font-mono font-bold text-emerald-700 ${
                      !canViewBankDetails ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Each invoice automatically embeds an authentic UPI QR code encoded with your UPI ID and the exact invoice bill amount.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 4: PAPER & PRINT ──────────────── */}
          {activeTab === "paper" && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <Printer size={18} className="text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Print Paper Dimensions &amp; Legal Terms</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose output paper size and configure the default terms of sale
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "A4", name: "A4 Standard Sheet", sub: "Standard laser or inkjet printer" },
                  { id: "A5", name: "A5 Half Sheet", sub: "Compact invoice format (148 × 210 mm)" },
                  { id: "80mm", name: "80mm Thermal Roll", sub: "Fast POS counter roll printer" },
                ].map((p) => {
                  const active = form.paperSize === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        handleChange("paperSize", p.id);
                        if (p.id === "80mm") handleChange("template", "thermal");
                      }}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                        active
                          ? "border-blue-600 bg-blue-50/40"
                          : "border-slate-200/80 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{p.sub}</p>
                      </div>
                      <input
                        type="radio"
                        name="paperSize"
                        checked={active}
                        onChange={() => {}}
                        className="accent-blue-600 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice Terms &amp; Legal Conditions
                </label>
                <textarea
                  rows={4}
                  value={form.terms}
                  onChange={(e) => handleChange("terms", e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: LIVE INTERACTIVE PREVIEW (6 Cols - Visible across all tabs!) */}
        <div className="lg:col-span-6 sticky top-5">
          {/* Preview Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 rounded-t-2xl border border-slate-700 border-b-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Dynamic Preview</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                {form.paperSize}
              </span>
            </div>
            <button
              onClick={() => setShowFullPreview(true)}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
            >
              <Eye size={12} />
              <span>Fullscreen</span>
            </button>
          </div>

          {/* Embedded Preview Container */}
          <div className="bg-slate-100 border border-slate-300 border-t-0 rounded-b-2xl p-4 overflow-y-auto max-h-[820px]">
            <div className="shadow-md rounded-xl overflow-hidden bg-white">
              <TaxInvoice shopSettings={form} isModal={false} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL: FULL PREVIEW
      ══════════════════════════════════════════════════ */}
      {showFullPreview && (
        <TaxInvoice
          shopSettings={form}
          isModal={true}
          onClose={() => setShowFullPreview(false)}
        />
      )}
    </div>
  );
}
