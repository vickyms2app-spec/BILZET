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
  Lock,
  Unlock,
  EyeOff,
  ChevronDown,
  X,
  Crown,
} from "lucide-react";
import { settingsApi } from "../api";
import TaxInvoice, { COLOR_THEMES, INVOICE_TEMPLATES } from "../components/invoice/TaxInvoice";
import { useAuth } from "../store/auth";
import { useSecurityStore } from "../store/securityStore";
import { isAdminUser, isAdminEmail, maskAccountNumber, maskIFSC, maskUPI } from "../utils/security";

export const PAPER_SIZES = [
  { id: "A4", label: "A4", isFree: true, isPro: false },
  { id: "A5", label: "A5", isFree: true, isPro: false },
  { id: "Thermal 80mm", label: "Thermal 80mm", badge: "PRO", isFree: false, isPro: true },
  { id: "Thermal 58mm", label: "Thermal 58mm", badge: "PREMIUM", isFree: false, isPro: true },
];

function InvoiceLayoutWireframe({ templateId, accent = "#2563eb" }) {
  switch (templateId) {
    case "classic_border":
      return (
        <div className="w-full h-full p-1 border-2 border-double border-slate-700 font-serif flex flex-col justify-between text-[6px]">
          <div className="flex justify-between items-center border-b border-slate-700 pb-0.5">
            <span className="font-bold text-[7px]">╔══</span>
            <span className="font-bold tracking-widest text-[6px]">CLASSIC</span>
            <span className="font-bold text-[7px]">══╗</span>
          </div>
          <div className="border border-slate-300 p-0.5 rounded-none space-y-0.5">
            <div className="h-0.5 w-3/4 bg-slate-400" />
            <div className="h-0.5 w-1/2 bg-slate-300" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-slate-800" />
            <div className="h-0.5 w-full bg-slate-200" />
            <div className="h-0.5 w-full bg-slate-200" />
          </div>
          <div className="flex justify-between items-center text-[7px] text-slate-500">
            <span>╚══</span>
            <span>══╝</span>
          </div>
        </div>
      );

    case "compact":
      return (
        <div className="w-full h-full p-1 flex flex-col justify-between text-[6px]">
          <div className="flex justify-between items-center border-b border-cyan-300 pb-0.5">
            <span className="font-black text-cyan-700 text-[7px]">COMPACT</span>
            <span className="text-[6px] text-slate-400">1-PAGE</span>
          </div>
          <div className="h-2 w-full bg-cyan-50 border border-cyan-200 rounded flex items-center px-1 gap-1">
            <div className="h-1 w-1/4 bg-cyan-300 rounded" />
            <div className="h-1 w-1/4 bg-cyan-200 rounded" />
            <div className="h-1 w-1/4 bg-cyan-200 rounded" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-cyan-700 rounded-xs" />
            <div className="h-0.5 w-full bg-slate-200" />
            <div className="h-0.5 w-full bg-slate-200" />
            <div className="h-0.5 w-full bg-slate-200" />
          </div>
          <div className="flex justify-end">
            <div className="h-1 w-1/3 bg-cyan-600 rounded-xs" />
          </div>
        </div>
      );

    case "corporate":
      return (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden">
          <div className="bg-slate-800 text-white px-1 py-0.5 flex justify-between items-center text-[6px]">
            <span className="font-black text-[7px] tracking-wider">CORPORATE</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          </div>
          <div className="p-1 flex flex-col justify-between flex-1 space-y-1">
            <div className="grid grid-cols-3 gap-0.5">
              <div className="h-2 bg-slate-100 border border-slate-200 rounded-xs" />
              <div className="h-2 bg-slate-100 border border-slate-200 rounded-xs" />
              <div className="h-2 bg-slate-100 border border-slate-200 rounded-xs" />
            </div>
            <div className="space-y-0.5">
              <div className="h-1 w-full bg-slate-700" />
              <div className="h-0.5 w-full bg-slate-200" />
              <div className="h-0.5 w-full bg-slate-200" />
            </div>
            <div className="flex justify-end">
              <div className="h-1 w-2/5 bg-slate-800" />
            </div>
          </div>
        </div>
      );

    case "retail":
      return (
        <div className="w-full h-full p-1 border border-dashed border-orange-400 font-mono flex flex-col justify-between text-[6px]">
          <div className="flex justify-between items-center border-b border-dashed border-orange-300 pb-0.5">
            <span className="font-bold text-orange-700 text-[7px]">RETAIL POS</span>
            <span className="tracking-tighter font-black text-[6px] text-slate-800">|||||||</span>
          </div>
          <div className="text-center font-bold text-[6px] text-slate-400 py-0.5 border-b border-dashed border-slate-200">
            RECEIPT #0042
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between"><div className="h-0.5 w-1/2 bg-slate-700" /><div className="h-0.5 w-1/4 bg-slate-700" /></div>
            <div className="flex justify-between"><div className="h-0.5 w-1/3 bg-slate-400" /><div className="h-0.5 w-1/4 bg-slate-400" /></div>
            <div className="flex justify-between"><div className="h-0.5 w-2/5 bg-slate-400" /><div className="h-0.5 w-1/4 bg-slate-400" /></div>
          </div>
          <div className="border-t border-dashed border-orange-400 pt-0.5 flex justify-between items-center">
            <span className="font-bold text-orange-700 text-[6px]">TOTAL</span>
            <div className="h-1 w-1/3 bg-orange-600 rounded-xs" />
          </div>
        </div>
      );

    case "hotel_restaurant":
      return (
        <div className="w-full h-full p-1 bg-[#fffdf8] border border-amber-300 font-serif flex flex-col justify-between text-[6px]">
          <div className="flex justify-between items-center border-b border-amber-200 pb-0.5">
            <span className="font-bold text-amber-900 text-[7px]">GUEST FOLIO</span>
            <span className="text-amber-800 text-[8px]">⚜</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-amber-50/80 rounded border border-amber-200/80">
            <span className="text-[5px] text-amber-900 font-semibold">Table 12</span>
            <span className="text-[5px] text-amber-900 text-right">Server: KT</span>
          </div>
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-amber-800/80" />
            <div className="h-0.5 w-full bg-amber-100" />
            <div className="h-0.5 w-full bg-amber-100" />
          </div>
          <div className="flex justify-between items-center border-t border-amber-200 pt-0.5">
            <span className="text-[5px] text-amber-700 italic">Thank you</span>
            <div className="h-1 w-1/3 bg-amber-800 rounded-xs" />
          </div>
        </div>
      );

    case "clean_minimal":
      return (
        <div className="w-full h-full p-1.5 flex flex-col justify-between text-[6px]">
          <div className="flex items-center gap-1 border-b border-slate-100 pb-0.5">
            <div className="w-0.5 h-2.5 bg-slate-800 rounded-full" />
            <span className="font-bold text-slate-800 text-[7px] tracking-widest">MINIMAL</span>
          </div>
          <div className="space-y-0.5 pl-1.5 border-l border-slate-300">
            <div className="h-0.5 w-3/4 bg-slate-600" />
            <div className="h-0.5 w-1/2 bg-slate-400" />
          </div>
          <div className="space-y-1">
            <div className="h-0.5 w-full bg-slate-800" />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-full bg-slate-100" />
          </div>
          <div className="flex justify-end">
            <div className="h-0.5 w-1/3 bg-slate-900" />
          </div>
        </div>
      );

    case "side_ribbon":
      return (
        <div className="w-full h-full flex relative overflow-hidden">
          <div className="w-3 bg-purple-600 h-full flex flex-col items-center justify-between py-1 text-white text-[5px] font-black shrink-0">
            <span>B</span>
            <span className="rotate-90 origin-center text-[4px] tracking-widest">RIB</span>
            <span>✓</span>
          </div>
          <div className="p-1 pl-1.5 flex flex-col justify-between flex-1 space-y-1">
            <div className="flex justify-between items-center border-b border-purple-200 pb-0.5">
              <span className="font-bold text-purple-800 text-[7px]">RIBBON</span>
            </div>
            <div className="space-y-0.5">
              <div className="h-0.5 w-3/4 bg-slate-300" />
              <div className="h-0.5 w-1/2 bg-slate-200" />
            </div>
            <div className="space-y-0.5">
              <div className="h-1 w-full bg-purple-600 rounded-xs" />
              <div className="h-0.5 w-full bg-slate-200" />
              <div className="h-0.5 w-full bg-slate-200" />
            </div>
            <div className="flex justify-end">
              <div className="h-1 w-1/3 bg-purple-700 rounded-xs" />
            </div>
          </div>
        </div>
      );

    case "premium":
      return (
        <div className="w-full h-full flex flex-col justify-between bg-[#fafaf9] border border-amber-300 overflow-hidden text-[6px]">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-600 to-amber-500" />
          <div className="p-1 flex flex-col justify-between flex-1 space-y-1 font-serif">
            <div className="flex justify-between items-center">
              <span className="font-bold text-amber-950 text-[7px]">PREMIUM</span>
              <div className="w-2 h-2 rounded-full border border-amber-500 flex items-center justify-center text-[5px] text-amber-700">★</div>
            </div>
            <div className="border border-amber-200 bg-amber-50/50 p-0.5 rounded-xs space-y-0.5">
              <div className="h-0.5 w-3/4 bg-amber-800" />
              <div className="h-0.5 w-1/2 bg-amber-600" />
            </div>
            <div className="space-y-0.5">
              <div className="h-1 w-full bg-amber-800" />
              <div className="h-0.5 w-full bg-amber-100" />
              <div className="h-0.5 w-full bg-amber-100" />
            </div>
            <div className="flex justify-end">
              <div className="h-1 w-2/5 bg-amber-900 rounded-xs" />
            </div>
          </div>
        </div>
      );

    case "elegant":
      return (
        <div className="w-full h-full p-1 rounded-xl border border-pink-300 flex flex-col justify-between text-[6px]">
          <div className="flex justify-between items-center">
            <span className="font-bold text-pink-700 text-[7px]">ELEGANT</span>
            <span className="px-1 py-0.2 rounded-full bg-pink-100 text-pink-700 font-bold text-[5px]">PAID</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            <div className="h-2 rounded-md bg-pink-50/80 border border-pink-200" />
            <div className="h-2 rounded-md bg-pink-50/80 border border-pink-200" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-pink-600 rounded-full" />
            <div className="h-0.5 w-full bg-slate-200 rounded-full" />
            <div className="h-0.5 w-full bg-slate-200 rounded-full" />
          </div>
          <div className="flex justify-end">
            <div className="h-1 w-1/3 bg-pink-600 rounded-full" />
          </div>
        </div>
      );

    case "geometric":
      return (
        <div className="w-full h-full p-1 font-mono border border-blue-500 rounded-none flex flex-col justify-between relative overflow-hidden text-[6px]">
          <div className="absolute top-0 right-0 w-6 h-3 bg-blue-600" style={{ clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0% 100%)" }} />
          <div className="flex justify-between items-center z-10 border-b border-blue-400 pb-0.5">
            <span className="font-bold text-blue-800 text-[7px]">GEOMETRIC</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            <div className="border border-blue-200 p-0.5 space-y-0.5">
              <div className="h-0.5 w-full bg-blue-400" />
              <div className="h-0.5 w-2/3 bg-blue-300" />
            </div>
            <div className="border border-blue-200 p-0.5 space-y-0.5">
              <div className="h-0.5 w-full bg-blue-400" />
              <div className="h-0.5 w-2/3 bg-blue-300" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-blue-800" />
            <div className="h-0.5 w-full bg-blue-100" />
            <div className="h-0.5 w-full bg-blue-100" />
          </div>
          <div className="flex justify-end">
            <div className="h-1 w-1/3 bg-blue-700" />
          </div>
        </div>
      );

    default: // modern
      return (
        <div className="w-full h-full p-1.5 flex flex-col justify-between relative overflow-hidden text-[6px]">
          <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden pointer-events-none">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500 absolute -top-3 -right-3" />
          </div>
          <div className="flex justify-between items-start">
            <span className="font-black text-blue-600 text-[7px] uppercase tracking-wider">MODERN</span>
          </div>
          <div className="grid grid-cols-2 gap-1 my-0.5">
            <div className="h-2.5 rounded bg-blue-50/80 border border-blue-100 p-0.5 space-y-0.5">
              <div className="h-0.5 w-3/4 bg-blue-400 rounded-full" />
              <div className="h-0.5 w-1/2 bg-blue-200 rounded-full" />
            </div>
            <div className="h-2.5 rounded bg-blue-50/80 border border-blue-100 p-0.5 space-y-0.5">
              <div className="h-0.5 w-3/4 bg-blue-400 rounded-full" />
              <div className="h-0.5 w-1/2 bg-blue-200 rounded-full" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="h-1 w-full bg-blue-600 rounded" />
            <div className="h-0.5 w-full bg-slate-200 rounded" />
            <div className="h-0.5 w-full bg-slate-200 rounded" />
          </div>
          <div className="flex justify-end">
            <div className="h-1 w-1/3 bg-blue-700 rounded" />
          </div>
        </div>
      );
  }
}

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
      ownerName: parsed.ownerName || "karthikeyan",
      phone: parsed.phone || "+91 98765 43210",
      email: parsed.email || "billing@bilzet.app",
      address: parsed.address || "123 Commercial Plaza, Main Market, Bengaluru",
      gstin: parsed.gstin || "33ABCDE1234F1Z5",
      state: parsed.state || "Tamil Nadu",
      stateCode: parsed.stateCode || "33",
      pan: parsed.pan || "ABCDE1234F",
      invoicePrefix: parsed.invoicePrefix || "INV-2026-",
      paperSize: parsed.paperSize || "A4",
      terms:
        parsed.terms ||
        "Thank you for your business.\nGoods/services once accepted are subject to applicable business terms.",

      // Customizer specifics
      template: parsed.template || "modern",
      colorTheme: parsed.colorTheme || "trust_blue",
      themeColor: parsed.themeColor || "#2563eb",
      invoiceTitle: parsed.invoiceTitle || "TAX INVOICE",
      showHsnSummary: parsed.showHsnSummary === true,
      showBankDetails: parsed.showBankDetails !== false,
      showQrCode: parsed.showQrCode !== false,
      showSignatory: parsed.showSignatory !== false,
      showTerms: parsed.showTerms !== false,
      showWatermark: parsed.showWatermark !== false,
      showLogo: parsed.showLogo !== false,
      showStatusBadge: parsed.showStatusBadge !== false,
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

  // Subscription plan determination
  const userPlan = (() => {
    if (isAuthorizedAdmin) return "Pro Enterprise (Admin)";
    try {
      const sub = JSON.parse(localStorage.getItem("bilzet_subscription") || "{}");
      return sub.currentPlan || "Free";
    } catch (_) {
      return "Free";
    }
  })();

  const hasSubscription = isAuthorizedAdmin || userPlan === "Pro" || userPlan === "Enterprise";

  const [saved, setSaved] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState({
    open: false,
    item: "",
    type: "",
  });

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

  const [lastChange, setLastChange] = useState({
    title: "Initial Configuration",
    field: "template",
    time: "Ready",
  });
  const [highlightSections, setHighlightSections] = useState(true);

  const formatChangeName = (field, val) => {
    switch (field) {
      case "template": {
        const tmpl = INVOICE_TEMPLATES.find((t) => t.id === val);
        return `Switched layout to "${tmpl?.name || val}"`;
      }
      case "colorTheme": {
        const col = COLOR_THEMES.find((c) => c.id === val);
        return `Color palette set to "${col?.label || val}"`;
      }
      case "paperSize":
        return `Paper format set to "${val}"`;
      case "invoiceTitle":
        return `Document heading set to "${val}"`;
      case "invoicePrefix":
        return `Invoice prefix set to "${val}"`;
      case "showLogo":
        return `Company logo ${val ? "visible on bill" : "hidden"}`;
      case "showWatermark":
        return `Background watermark ${val ? "enabled on bill" : "hidden"}`;
      case "showStatusBadge":
        return `Payment status badge ${val ? "shown on bill" : "hidden"}`;
      case "showHsnSummary":
        return `HSN/SAC summary grid ${val ? "enabled on bill" : "hidden"}`;
      case "showBankDetails":
        return `Bank settlement details ${val ? "printed on bill" : "hidden"}`;
      case "showQrCode":
        return `UPI QR Code ${val ? "printed on bill" : "hidden"}`;
      case "showTerms":
        return `Terms & conditions ${val ? "printed on bill" : "hidden"}`;
      case "showSignatory":
        return `Authorized signature box ${val ? "visible on bill" : "hidden"}`;
      default:
        return `${field} updated`;
    }
  };

  const handleChange = (field, val) => {
    setLastChange({
      title: formatChangeName(field, val),
      field,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      localStorage.setItem("bilzet_invoice_settings", JSON.stringify(next));
      return next;
    });
  };

  const handleSelectTemplate = (tmpl) => {
    if (!tmpl.isFree && !hasSubscription) {
      setUpgradeModal({ open: true, item: tmpl.name, type: "template" });
      return;
    }
    handleChange("template", tmpl.id);
  };

  const handleSelectColor = (theme) => {
    if (!theme.isFree && !hasSubscription) {
      setUpgradeModal({ open: true, item: theme.label, type: "color" });
      return;
    }
    setLastChange({
      title: `Color palette set to "${theme.label}"`,
      field: "colorTheme",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    });
    setForm((prev) => {
      const next = { ...prev, colorTheme: theme.id, themeColor: theme.primary };
      localStorage.setItem("bilzet_invoice_settings", JSON.stringify(next));
      return next;
    });
  };

  const handleSelectPaperSize = (p) => {
    if (p.isPro && !hasSubscription) {
      setUpgradeModal({ open: true, item: `${p.label} Printing`, type: "paper size" });
      return;
    }
    handleChange("paperSize", p.id);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem("bilzet_invoice_settings", JSON.stringify(form));
    settingsApi.update(form).catch(() => {});
    setSaved(true);
    setTimeout(() => setSaved(false), 2800);
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition bg-white";

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto fade-up font-sans">
      {/* ══════════════════════════════════════════════════
          TOP HEADER
      ══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 grid place-items-center shrink-0">
            <Palette size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Invoice Studio &amp; Settings
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                hasSubscription
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200/80"
              }`}>
                {hasSubscription ? "👑 PRO ACTIVE" : "FREE STARTER TIER"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              3 Free Templates &amp; 3 Free Color Themes included &middot; Balance templates and palettes unlocked with Pro Suite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {saved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl animate-fadeIn">
              <Check size={13} />
              <span>Saved!</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowFullPreview(true)}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Eye size={13} className="text-slate-500" />
            <span>Full Preview</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
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
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold text-slate-500 overflow-x-auto">
        {[
          { id: "customizer", label: "Invoice Studio & Themes", icon: Sparkles },
          { id: "store", label: "Shop Profile & GST", icon: Store },
          { id: "bank", label: "Bank Settlement & UPI", icon: Building2 },
          { id: "compliance", label: "Document Headers & Terms", icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent hover:text-slate-800"
              }`}
            >
              <Icon size={14} className={isActive ? "text-blue-600" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          TAB 1: INVOICE STUDIO & THEMES (MATCHES USER SCREENSHOT)
      ══════════════════════════════════════════════════ */}
      {activeTab === "customizer" && (
        <div className="space-y-6">
          {/* ── TOP: LIVE BILL CHANGES INSPECTOR ──────────── */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 rounded-2xl border border-blue-800/40 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute" />
                </div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <span>Live Bill Inspector</span>
                  <span className="text-[10px] lowercase font-normal text-slate-300">
                    &middot; real-time preview of what you change
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHighlightSections(!highlightSections)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                    highlightSections
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-white/10 hover:bg-white/20 text-slate-300 border-white/20"
                  }`}
                  title="Toggle section callout tags directly on the bill"
                >
                  <Eye size={13} />
                  <span>{highlightSections ? "Visual Callouts ON" : "Visual Callouts OFF"}</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  {lastChange.time}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2.5 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-400 font-bold shrink-0">✨ Live Applied:</span>
                <span className="font-bold text-white bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/15">
                  {lastChange.title}
                </span>
              </div>

              {/* Active Bill Customization Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
                  📐 {form.paperSize}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold">
                  🏛️ {form.template}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        COLOR_THEMES.find((c) => c.id === form.colorTheme)?.primary || "#2563eb",
                    }}
                  />
                  🎨 {COLOR_THEMES.find((c) => c.id === form.colorTheme)?.label || "Blue"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${
                    form.showWatermark
                      ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  💧 Watermark: {form.showWatermark ? "ON" : "OFF"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${
                    form.showStatusBadge
                      ? "bg-sky-500/20 text-sky-300 border-sky-400/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  🛡️ Badge: {form.showStatusBadge ? "ON" : "OFF"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${
                    form.showHsnSummary
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  📊 HSN: {form.showHsnSummary ? "ON" : "OFF"}
                </span>
              </div>
            </div>
          </div>

          {/* ── RESPONSIVE DUAL-COLUMN LAYOUT (CONTROLS LEFT, STICKY BILL RIGHT) ── */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT: CONTROLS (7 Cols) */}
            <div className="xl:col-span-7 space-y-6">
              {/* ── CARD 1: PAPER SIZE ───────────────────────── */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Paper Size</h2>
              <span className="text-xs text-slate-400 font-medium">A4 / A5 / Thermal</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {PAPER_SIZES.map((p) => {
                const isSelected = form.paperSize === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPaperSize(p)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      isSelected
                        ? "border-2 border-blue-600 bg-white text-blue-600 font-bold shadow-xs ring-1 ring-blue-500/20"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>{p.label}</span>
                    {p.badge && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        👑 {p.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CARD 2: INVOICE LAYOUTS (11 DISTINCT TEMPLATES) ── */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Invoice Layouts (11 Distinct Templates)
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Layout Switcher
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Templates define the structural layouts of your invoices (header, customer cards, tables &amp; summary).
                  <span className="ml-1 text-emerald-600 font-bold">3 Free Layouts</span> &middot; 8 Subscription Layouts
                </p>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg uppercase tracking-wider self-start sm:self-auto">
                Current: {form.template.replace(/_/g, " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3.5">
              {INVOICE_TEMPLATES.map((tmpl) => {
                const isSelected = form.template === tmpl.id;
                const isLocked = !tmpl.isFree && !hasSubscription;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="group cursor-pointer flex flex-col transition"
                    title={isLocked ? "👑 Subscription required" : `${tmpl.name} Layout`}
                  >
                    <div
                      className={`h-24 rounded-xl border-2 transition relative p-1.5 flex flex-col justify-between overflow-hidden bg-white ${
                        isSelected
                          ? "border-blue-600 shadow-md ring-2 ring-blue-500/25 bg-blue-50/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Miniature Layout Wireframe */}
                      <InvoiceLayoutWireframe templateId={tmpl.id} accent={tmpl.accent} />

                      {/* Lock overlay for premium templates on free plan */}
                      {isLocked && (
                        <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[0.5px] flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-amber-600">
                            <Lock size={11} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1.5 gap-1">
                      <span
                        className={`text-[11px] font-semibold truncate ${
                          isSelected ? "text-blue-600 font-bold" : "text-slate-700"
                        }`}
                      >
                        {tmpl.name}
                      </span>
                      {tmpl.isFree ? (
                        <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded leading-none shrink-0">
                          FREE
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded leading-none shrink-0 flex items-center gap-0.5">
                          👑 PRO
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CARD 3: COLOR THEMES ─────────────────────── */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Color Themes</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Themes change invoice backgrounds, borders, accents, table headers and corner styling.
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                <strong className="text-emerald-600">3 Free Colors</strong> &middot; 13 Subscription Colors
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-1">
              {COLOR_THEMES.map((theme) => {
                const isSelected = form.colorTheme === theme.id || form.themeColor === theme.primary;
                const isLocked = !theme.isFree && !hasSubscription;

                return (
                  <div
                    key={theme.id}
                    onClick={() => handleSelectColor(theme)}
                    className={`cursor-pointer rounded-xl p-1.5 border-2 transition flex flex-col gap-1.5 bg-white relative ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/15 shadow-xs"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                    title={isLocked ? "👑 Subscription required" : theme.label}
                  >
                    <div
                      className="h-10 w-full rounded-lg overflow-hidden relative shadow-2xs border border-black/5"
                      style={{
                        background: `linear-gradient(135deg, ${theme.light} 0%, ${theme.light} 50%, ${theme.secondary} 50%, ${theme.primary} 100%)`,
                      }}
                    >
                      <div
                        className="absolute top-0 right-0 w-3.5 h-3.5 rounded-bl-md"
                        style={{ backgroundColor: theme.dark }}
                      />
                      {isLocked && (
                        <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-white/95 shadow-xs flex items-center justify-center text-amber-600">
                            <Lock size={8} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-semibold truncate ${
                          isSelected ? "text-blue-600 font-bold" : "text-slate-700"
                        }`}
                      >
                        {theme.label}
                      </span>
                      {theme.isFree ? (
                        <span className="text-[7px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded shrink-0">
                          FREE
                        </span>
                      ) : (
                        <span className="text-[7px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded shrink-0">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CARD 4: 11 INVOICE CONFIGURATION SETTINGS ─────── */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-blue-500/20">
                  11
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">11 Key Invoice Settings</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Real-time Config
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fine-tune document parameters, GST compliance tables, branding assets, and payment settlement
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto">
                All 11 Settings Synced Below
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* SETTING 1: Paper Size */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">1</span>
                    <span className="text-xs font-bold text-slate-800">Paper Size &amp; Format</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {form.paperSize}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Standard document or point-of-sale thermal roll format</p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {PAPER_SIZES.map((p) => {
                    const active = form.paperSize === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => handleSelectPaperSize(p)}
                        className={`text-[10px] font-bold py-1.5 px-2 rounded-lg border text-left transition truncate flex items-center justify-between ${
                          active
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className="truncate">{p.label}</span>
                        {!p.isFree && !hasSubscription && <Lock size={9} className="shrink-0 ml-1 text-amber-300" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SETTING 2: Invoice Template Layout */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">2</span>
                    <span className="text-xs font-bold text-slate-800">Invoice Layout (11 Templates)</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    11 Layouts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Choose the structural layout format for your invoice</p>
                <select
                  value={form.template}
                  onChange={(e) => {
                    const tmpl = INVOICE_TEMPLATES.find((t) => t.id === e.target.value);
                    if (tmpl) handleSelectTemplate(tmpl);
                  }}
                  className={`${inputCls} text-[11px] py-1.5 font-bold text-slate-800`}
                >
                  {INVOICE_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} {tmpl.isFree ? "(Free)" : "👑 (Pro)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* SETTING 3: Color Palette Theme */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center">3</span>
                    <span className="text-xs font-bold text-slate-800">Color Palette</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full border border-black/10"
                      style={{
                        backgroundColor:
                          COLOR_THEMES.find((c) => c.id === form.colorTheme)?.primary || "#2563eb",
                      }}
                    />
                    <span className="text-[10px] font-bold text-slate-600">
                      {COLOR_THEMES.find((c) => c.id === form.colorTheme)?.label || "Blue"}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">Header accents, borders, and line-item coloring</p>
                <select
                  value={form.colorTheme}
                  onChange={(e) => {
                    const color = COLOR_THEMES.find((c) => c.id === e.target.value);
                    if (color) handleSelectColor(color);
                  }}
                  className={`${inputCls} text-[11px] py-1.5 font-bold text-slate-800`}
                >
                  {COLOR_THEMES.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label} {theme.isFree ? "(Free)" : "👑 (Pro)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* SETTING 4: Document Title */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black flex items-center justify-center">4</span>
                    <span className="text-xs font-bold text-slate-800">Document Title</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Heading
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Statutory title printed at the top of the invoice</p>
                <select
                  value={form.invoiceTitle}
                  onChange={(e) => handleChange("invoiceTitle", e.target.value)}
                  className={`${inputCls} text-[11px] py-1.5 font-bold text-slate-800`}
                >
                  <option value="TAX INVOICE">TAX INVOICE (GST Standard)</option>
                  <option value="RETAIL INVOICE">RETAIL INVOICE</option>
                  <option value="BILL OF SUPPLY">BILL OF SUPPLY (Exempt / Comp.)</option>
                  <option value="CASH MEMO">TAX INVOICE / CASH MEMO</option>
                  <option value="PROFORMA INVOICE">PROFORMA INVOICE (Estimate)</option>
                </select>
              </div>

              {/* SETTING 5: Invoice Series Prefix */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black flex items-center justify-center">5</span>
                    <span className="text-xs font-bold text-slate-800">Series Number Prefix</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    {form.invoicePrefix}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Unique alphanumeric series for your financial year</p>
                <input
                  type="text"
                  value={form.invoicePrefix}
                  onChange={(e) => handleChange("invoicePrefix", e.target.value)}
                  placeholder="INV-2026-"
                  className={`${inputCls} text-[11px] py-1.5 font-mono uppercase font-bold`}
                />
              </div>

              {/* SETTING 6: Company Logo Visibility */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-700 text-[10px] font-black flex items-center justify-center">6</span>
                    <span className="text-xs font-bold text-slate-800">Company Logo</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Show brand logo badge at document header</p>
                  <span className={`text-[10px] font-bold ${form.showLogo ? "text-emerald-600" : "text-slate-400"}`}>
                    {form.showLogo ? "● Logo Visible" : "○ Logo Hidden"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!form.showLogo}
                    onChange={(e) => handleChange("showLogo", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* SETTING 7: Background Watermark */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center">7</span>
                    <span className="text-xs font-bold text-slate-800">Background Watermark</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Subtle diagonal watermark security stamp</p>
                  <span className={`text-[10px] font-bold ${form.showWatermark ? "text-emerald-600" : "text-slate-400"}`}>
                    {form.showWatermark ? "● Watermark Active" : "○ Watermark Hidden"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!form.showWatermark}
                    onChange={(e) => handleChange("showWatermark", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* SETTING 8: Payment Status Badge */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 text-[10px] font-black flex items-center justify-center">8</span>
                    <span className="text-xs font-bold text-slate-800">Payment Status Badge</span>
                  </div>
                  <p className="text-[11px] text-slate-500">PAID / UNPAID pill badge printed at top right</p>
                  <span className={`text-[10px] font-bold ${form.showStatusBadge ? "text-emerald-600" : "text-slate-400"}`}>
                    {form.showStatusBadge ? "● Status Badge On" : "○ Status Badge Off"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!form.showStatusBadge}
                    onChange={(e) => handleChange("showStatusBadge", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* SETTING 9: HSN/SAC Summary Grid */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-700 text-[10px] font-black flex items-center justify-center">9</span>
                    <span className="text-xs font-bold text-slate-800">HSN/SAC Summary Grid</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Itemized statutory CGST &amp; SGST tax breakdown table</p>
                  <span className={`text-[10px] font-bold ${form.showHsnSummary ? "text-emerald-600" : "text-slate-400"}`}>
                    {form.showHsnSummary ? "● HSN Table Enabled" : "○ HSN Table Disabled"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!form.showHsnSummary}
                    onChange={(e) => handleChange("showHsnSummary", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* SETTING 10: Bank Settlement & UPI QR */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">10</span>
                    <span className="text-xs font-bold text-slate-800">Bank &amp; UPI QR Code</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Scan &amp; pay UPI QR code and bank account info</p>
                  <span className={`text-[10px] font-bold ${form.showBankDetails || form.showQrCode ? "text-emerald-600" : "text-slate-400"}`}>
                    {form.showBankDetails || form.showQrCode ? "● Payment QR & Bank Active" : "○ Payment Info Hidden"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!(form.showBankDetails || form.showQrCode)}
                    onChange={(e) => {
                      handleChange("showBankDetails", e.target.checked);
                      handleChange("showQrCode", e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>

              {/* SETTING 11: Terms & Authorized Signatory */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center">11</span>
                    <span className="text-xs font-bold text-slate-800">Terms &amp; Signature Box</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Footer return policies and official signature block</p>
                  <span className={`text-[10px] font-bold ${form.showTerms && form.showSignatory ? "text-emerald-600" : "text-slate-400"}`}>
                    {form.showTerms && form.showSignatory ? "● Terms & Signatory Active" : "○ Footer Elements Off"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!!(form.showTerms && form.showSignatory)}
                    onChange={(e) => {
                      handleChange("showTerms", e.target.checked);
                      handleChange("showSignatory", e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
              </div>
            </div>
          </div>

            </div>

            {/* RIGHT: STICKY LIVE BILL PREVIEW (5 Cols) */}
            <div className="xl:col-span-5 xl:sticky xl:top-6 space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-sm font-bold text-slate-900">Live Bill Preview</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {form.paperSize} &middot; {form.template}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullPreview(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition"
                  >
                    <Eye size={13} />
                    <span>Fullscreen</span>
                  </button>
                </div>

                {/* Quick Toggle Ribbon directly on Live Preview */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200/70 text-[10px]">
                  <span className="text-slate-500 font-bold mr-1">Quick:</span>
                  <button
                    type="button"
                    onClick={() => handleChange("showWatermark", !form.showWatermark)}
                    className={`px-2 py-0.5 rounded-lg border font-semibold transition ${
                      form.showWatermark
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    💧 Watermark {form.showWatermark ? "✓" : "✗"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("showLogo", !form.showLogo)}
                    className={`px-2 py-0.5 rounded-lg border font-semibold transition ${
                      form.showLogo
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    🖼️ Logo {form.showLogo ? "✓" : "✗"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("showStatusBadge", !form.showStatusBadge)}
                    className={`px-2 py-0.5 rounded-lg border font-semibold transition ${
                      form.showStatusBadge
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    🛡️ Badge {form.showStatusBadge ? "✓" : "✗"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange("showHsnSummary", !form.showHsnSummary)}
                    className={`px-2 py-0.5 rounded-lg border font-semibold transition ${
                      form.showHsnSummary
                        ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                        : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    📊 HSN {form.showHsnSummary ? "✓" : "✗"}
                  </button>
                </div>

                <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-2 sm:p-3 overflow-x-auto flex justify-center max-h-[750px] overflow-y-auto">
                  <div className="w-full shadow-md rounded-xl overflow-hidden bg-white scale-[0.88] origin-top">
                    <TaxInvoice shopSettings={{ ...form, showChangeIndicators: highlightSections }} isModal={false} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2: SHOP PROFILE & GST
      ══════════════════════════════════════════════════ */}
      {activeTab === "store" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Shop Profile &amp; GST Registration</h2>
            <p className="text-xs text-slate-400 mt-0.5">Printed at the header and footer of your customer invoices</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Trade / Shop Name</label>
              <input value={form.shopName} onChange={(e) => handleChange("shopName", e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Business Owner / Legal Entity Name</label>
              <input value={form.ownerName} onChange={(e) => handleChange("ownerName", e.target.value)} className={inputCls} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Physical Shop / Godown Address</label>
              <input value={form.address} onChange={(e) => handleChange("address", e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone Number</label>
              <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Email Address</label>
              <input value={form.email} onChange={(e) => handleChange("email", e.target.value)} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">15-digit GSTIN</label>
              <input
                value={form.gstin}
                onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                placeholder="33ABCDE1234F1Z5"
                className={`${inputCls} font-mono uppercase font-bold`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Company PAN Number</label>
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
              <label className="block text-xs font-bold text-slate-600 mb-1.5">State Code (e.g. 33, 29, 27)</label>
              <input value={form.stateCode} onChange={(e) => handleChange("stateCode", e.target.value)} className={`${inputCls} font-mono`} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3: BANK SETTLEMENT & UPI
      ══════════════════════════════════════════════════ */}
      {activeTab === "bank" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
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
                  !canViewBankDetails ? "bg-slate-100 cursor-not-allowed" : ""
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 4: DOCUMENT HEADERS & COMPLIANCE TOGGLES
      ══════════════════════════════════════════════════ */}
      {activeTab === "compliance" && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Document Title &amp; Series Prefix</h2>
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

          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Visible Elements &amp; Compliance</h2>
            <div className="divide-y divide-slate-100">
              {[
                {
                  key: "showLogo",
                  title: "Company Trade Logo Badge",
                  desc: "Display company logo or icon badge in the invoice header",
                },
                {
                  key: "showWatermark",
                  title: "Diagonal Security Background Watermark",
                  desc: "Prints subtle diagonal watermark stamp across sheet body",
                },
                {
                  key: "showStatusBadge",
                  title: "PAID / UNPAID Status Pill Badge",
                  desc: "Color-coded payment status badge in header",
                },
                {
                  key: "showHsnSummary",
                  title: "HSN / SAC Tax Summary Grid",
                  desc: "Detailed table calculating CGST and SGST per HSN category",
                },
                {
                  key: "showBankDetails",
                  title: "Bank Account & Settlement Details",
                  desc: "Includes bank name, account number, IFSC, and UPI ID on the invoice",
                },
                {
                  key: "showQrCode",
                  title: "UPI Dynamic Payment QR Code",
                  desc: "Allows customers to scan and pay directly via GPay / PhonePe / Paytm",
                },
                {
                  key: "showSignatory",
                  title: "Authorized Signatory Box",
                  desc: "Placeholders for digital verification and official seal",
                },
                {
                  key: "showTerms",
                  title: "Terms & Conditions Section",
                  desc: "Prints return policy and jurisdiction notes at footer",
                },
              ].map((item) => (
                <div key={item.key} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!form[item.key]}
                      onChange={(e) => handleChange(item.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              ))}
            </div>

            <div className="pt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Invoice Terms &amp; Legal Conditions
              </label>
              <textarea
                rows={3}
                value={form.terms}
                onChange={(e) => handleChange("terms", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: FULLSCREEN PREVIEW
      ══════════════════════════════════════════════════ */}
      {showFullPreview && (
        <TaxInvoice
          shopSettings={form}
          isModal={true}
          onClose={() => setShowFullPreview(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: UPGRADE SUBSCRIPTION
      ══════════════════════════════════════════════════ */}
      {upgradeModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-5 animate-scaleIn">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Crown size={24} />
              </div>
              <button
                type="button"
                onClick={() => setUpgradeModal({ open: false, item: "", type: "" })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                👑 Subscription Feature
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Unlock {upgradeModal.item}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                You are currently on the <strong className="text-slate-900">Free Starter Plan</strong>, which includes 3 free invoice layouts and 3 complimentary color palettes. Upgrade to <strong className="text-blue-600">Pro Suite</strong> to access all 11 designer templates, all 16 brand color schemes, and thermal printing.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2 text-xs">
              <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Included with Pro Suite (₹999/mo):
              </p>
              <ul className="space-y-1.5 text-slate-600 text-[11px]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>All 11 modern, corporate, retail, hotel &amp; minimal layouts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>All 16 tailored dual-tone diagonal color themes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>80mm and 58mm POS thermal receipt printing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>Unlimited invoice creation with live UPI QR payment links</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate("/subscription")}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
              >
                <span>Upgrade to Pro Suite →</span>
              </button>
              <button
                type="button"
                onClick={() => setUpgradeModal({ open: false, item: "", type: "" })}
                className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
              >
                Keep Free
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
