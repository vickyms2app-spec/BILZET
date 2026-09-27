import { useState, useEffect } from "react";
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState("customizer"); // 'customizer' | 'store' | 'bank' | 'paper'

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

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white grid place-items-center shadow-lg shadow-blue-500/20">
            <Palette size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Invoice Customizer & Settings
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                GST Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Design tailored tax invoices, configure brand themes, and set up instant UPI scan-to-pay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl animate-in fade-in">
              <Check size={14} />
              <span>Settings Saved!</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowFullPreview(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Eye size={14} />
            <span>Full Preview</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-[#1a5cff] hover:bg-[#1248cc] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95"
          >
            <Save size={14} />
            <span>Save Customization</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          NAVIGATION TABS
      ══════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: "customizer", label: "Invoice Studio & Preview", icon: Sparkles },
          { id: "store", label: "Shop Profile & GST", icon: Store },
          { id: "bank", label: "Bank & UPI QR Setup", icon: Building2 },
          { id: "paper", label: "Paper & Print Formats", icon: Printer },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1: INVOICE STUDIO & LIVE PREVIEW
      ══════════════════════════════════════════════════ */}
      {activeTab === "customizer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: CONTROLS (7 Cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* 1. TEMPLATE PICKER */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">1. Invoice Design Template</h2>
                  <p className="text-xs text-slate-400">Select the visual layout for your customer invoices</p>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {form.template.toUpperCase()}
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
                          ? "border-blue-600 bg-blue-50/40 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-slate-900">{tmpl.name}</p>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {tmpl.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{tmpl.desc}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                        <span className={isSelected ? "text-blue-600 font-bold" : "text-slate-400"}>
                          {isSelected ? "Active Layout" : "Click to apply"}
                        </span>
                        {isSelected && <CheckCircle2 size={14} className="text-blue-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. THEME PALETTE & ACCENT COLOR */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">2. Brand Accent Color</h2>
                  <p className="text-xs text-slate-400">Used for headers, invoice highlights, and badges</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: form.themeColor }}
                  />
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                    {form.themeColor}
                  </span>
                </div>
              </div>

              {/* Swatches */}
              <div className="flex flex-wrap items-center gap-3">
                {themePalettes.map((p) => {
                  const active = form.themeColor === p.color;
                  return (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => handleChange("themeColor", p.color)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                        active
                          ? "border-slate-800 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                        style={{ backgroundColor: p.color }}
                      />
                      <span>{p.label}</span>
                    </button>
                  );
                })}

                {/* Custom Color Input */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <label className="text-[11px] font-semibold text-slate-500">Custom:</label>
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900">3. Document Header & Title</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Invoice Document Title
                  </label>
                  <select
                    value={form.invoiceTitle}
                    onChange={(e) => handleChange("invoiceTitle", e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold bg-white"
                  >
                    <option value="TAX INVOICE">TAX INVOICE (GST Standard)</option>
                    <option value="RETAIL INVOICE">RETAIL INVOICE</option>
                    <option value="BILL OF SUPPLY">BILL OF SUPPLY (Composition / Exempt)</option>
                    <option value="CASH MEMO">TAX INVOICE / CASH MEMO</option>
                    <option value="PROFORMA INVOICE">PROFORMA INVOICE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Invoice Series Prefix
                  </label>
                  <input
                    value={form.invoicePrefix}
                    onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                    placeholder="INV-2026-"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 4. TOGGLES: SECTIONS DISPLAY */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">4. Visible Elements & Compliance</h2>
                  <p className="text-xs text-slate-400">Toggle sections shown on customer invoices</p>
                </div>
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
                    desc: "Spells out the grand total in Indian Rupees (Rupees ... Only)",
                  },
                  {
                    key: "showBankDetails",
                    title: "Bank Account & IFSC Box",
                    desc: "Displays Bank Name, A/C Number, IFSC, and Branch for NEFT/RTGS",
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
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={form[item.key]}
                      onChange={(e) => handleChange(item.key, e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE INTERACTIVE PREVIEW (6 Cols) */}
          <div className="lg:col-span-6 sticky top-20">
            <div className="bg-slate-900 text-white p-3.5 rounded-t-2xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Live Dynamic Preview
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {form.paperSize}
                </span>
              </div>
              <button
                onClick={() => setShowFullPreview(true)}
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Eye size={12} /> Expand Fullscreen
              </button>
            </div>

            {/* Embedded Zoomed Preview container */}
            <div className="bg-slate-200 border-x border-b border-slate-300 rounded-b-2xl p-4 overflow-y-auto max-h-[820px] shadow-inner">
              <div className="origin-top transform transition-all duration-200 shadow-xl rounded-xl overflow-hidden bg-white">
                <TaxInvoice shopSettings={form} isModal={false} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2: SHOP PROFILE & GST
      ══════════════════════════════════════════════════ */}
      {activeTab === "store" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-4xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Store size={20} className="text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Business Profile & GST Identification</h2>
              <p className="text-xs text-slate-400">
                Official entity information printed on the supplier block of tax invoices
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Shop / Business Trade Name
              </label>
              <input
                value={form.shopName}
                onChange={(e) => handleChange("shopName", e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Owner / Authorized Person
              </label>
              <input
                value={form.ownerName}
                onChange={(e) => handleChange("ownerName", e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contact Phone</label>
              <input
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Contact Email</label>
              <input
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Registered Principal Place of Business Address
              </label>
              <input
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Registered GSTIN (15 Digits)
              </label>
              <input
                value={form.gstin}
                onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                placeholder="29ABCDE1234F1Z5"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                value={form.pan}
                onChange={(e) => handleChange("pan", e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">State Name</label>
              <input
                value={form.state}
                onChange={(e) => handleChange("state", e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                State Code (e.g. 29, 33, 27)
              </label>
              <input
                value={form.stateCode}
                onChange={(e) => handleChange("stateCode", e.target.value)}
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3: BANK & UPI QR SETUP
      ══════════════════════════════════════════════════ */}
      {activeTab === "bank" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-4xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Building2 size={20} className="text-emerald-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Direct Bank Settlement & UPI Payment QR</h2>
              <p className="text-xs text-slate-400">
                Printed on invoice bills for seamless customer payments via GPay, PhonePe, Paytm, or NEFT
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Bank Name
              </label>
              <input
                value={form.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
                placeholder="HDFC Bank / State Bank of India"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Beneficiary / Account Holder Name
              </label>
              <input
                value={form.accountHolder}
                onChange={(e) => handleChange("accountHolder", e.target.value)}
                placeholder="BILZET Retail Mart"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Bank Account Number
              </label>
              <input
                value={form.accountNumber}
                onChange={(e) => handleChange("accountNumber", e.target.value)}
                placeholder="50200012345678"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                IFSC Code (11 Characters)
              </label>
              <input
                value={form.ifsc}
                onChange={(e) => handleChange("ifsc", e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono uppercase font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Shop UPI VPA ID (For Instant Scan & Pay QR Code)
              </label>
              <input
                value={form.upiId}
                onChange={(e) => handleChange("upiId", e.target.value)}
                placeholder="bilzet@hdfcbank or phone@paytm"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-emerald-700 bg-emerald-50/30"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Each invoice automatically embeds an authentic UPI QR code encoded with your UPI ID and the exact invoice bill amount.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 4: PAPER & PRINT FORMATS
      ══════════════════════════════════════════════════ */}
      {activeTab === "paper" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 max-w-4xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <Printer size={20} className="text-purple-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Print Paper Dimensions & Legal Terms</h2>
              <p className="text-xs text-slate-400">
                Choose output paper size and configure the default terms of sale
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: "A4", name: "A4 Standard Sheet", sub: "Standard laser or inkjet printer" },
              { id: "A5", name: "A5 Half Sheet", sub: "Compact invoice format (148 x 210 mm)" },
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
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                    active
                      ? "border-purple-600 bg-purple-50/40 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
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
                    className="accent-purple-600"
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Invoice Terms & Legal Conditions
            </label>
            <textarea
              rows={4}
              value={form.terms}
              onChange={(e) => handleChange("terms", e.target.value)}
              className="w-full p-3 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>
      )}

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
