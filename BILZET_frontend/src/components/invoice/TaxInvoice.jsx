import { useRef } from "react";
import {
  Printer,
  Download,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

// Convert number to Indian words
function numberToWordsINR(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return "Zero Rupees Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertGroup(val) {
    let str = "";
    if (val > 99) {
      str += a[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val > 19) {
      str += b[Math.floor(val / 10)] + " " + a[val % 10] + " ";
    } else if (val > 0) {
      str += a[val] + " ";
    }
    return str.trim();
  }

  let crore = Math.floor(n / 10000000);
  let lakh = Math.floor((n % 10000000) / 100000);
  let thousand = Math.floor((n % 100000) / 1000);
  let remainder = n % 1000;

  let res = "";
  if (crore > 0) res += convertGroup(crore) + " Crore ";
  if (lakh > 0) res += convertGroup(lakh) + " Lakh ";
  if (thousand > 0) res += convertGroup(thousand) + " Thousand ";
  if (remainder > 0) res += convertGroup(remainder);

  return `Rupees ${res.trim()} Only`;
}

export const COLOR_THEMES = [
  { id: "trust_blue", label: "Trust Blue", isFree: true, primary: "#2563eb", secondary: "#3b82f6", light: "#dbeafe", dark: "#1e3a8a", border: "#93c5fd", tableBorder: "#bfdbfe" },
  { id: "growth_green", label: "Growth Green", isFree: true, primary: "#16a34a", secondary: "#22c55e", light: "#dcfce7", dark: "#14532d", border: "#86efac", tableBorder: "#bbf7d0" },
  { id: "professional_slate", label: "Professional Slate", isFree: true, primary: "#475569", secondary: "#64748b", light: "#f1f5f9", dark: "#0f172a", border: "#cbd5e1", tableBorder: "#e2e8f0" },
  { id: "indigo_focus", label: "Indigo Focus", isFree: false, primary: "#4f46e5", secondary: "#6366f1", light: "#e0e7ff", dark: "#312e81", border: "#a5b4fc", tableBorder: "#c7d2fe" },
  { id: "calm_teal", label: "Calm Teal", isFree: false, primary: "#0d9488", secondary: "#14b8a6", light: "#ccfbf1", dark: "#134e4a", border: "#5eead4", tableBorder: "#99f6e4" },
  { id: "retail_orange", label: "Retail Orange", isFree: false, primary: "#ea580c", secondary: "#f97316", light: "#ffedd5", dark: "#7c2d12", border: "#fdba74", tableBorder: "#fed7aa" },
  { id: "bold_ruby", label: "Bold Ruby", isFree: false, primary: "#e11d48", secondary: "#f43f5e", light: "#ffe4e6", dark: "#881337", border: "#fda4af", tableBorder: "#fecdd3" },
  { id: "premium_purple", label: "Premium Purple", isFree: false, primary: "#9333ea", secondary: "#a855f7", light: "#f3e8ff", dark: "#581c87", border: "#d8b4fe", tableBorder: "#e9d5ff" },
  { id: "fresh_cyan", label: "Fresh Cyan", isFree: false, primary: "#0891b2", secondary: "#06b6d4", light: "#cffafe", dark: "#164e63", border: "#67e8f9", tableBorder: "#a5f3fc" },
  { id: "cafe_brown", label: "Cafe Brown", isFree: false, primary: "#854d0e", secondary: "#a16207", light: "#fef9c3", dark: "#422006", border: "#fde047", tableBorder: "#fef08a" },
  { id: "luxury_gold", label: "Luxury Gold", isFree: false, primary: "#b45309", secondary: "#d97706", light: "#fef3c7", dark: "#451a03", border: "#fcd34d", tableBorder: "#fde68a" },
  { id: "elegant_rose", label: "Elegant Rose", isFree: false, primary: "#db2777", secondary: "#ec4899", light: "#fce7f3", dark: "#831843", border: "#f9a8d4", tableBorder: "#fbcfe8" },
  { id: "executive_navy", label: "Executive Navy", isFree: false, primary: "#1e3a8a", secondary: "#1d4ed8", light: "#dbeafe", dark: "#0f172a", border: "#93c5fd", tableBorder: "#bfdbfe" },
  { id: "creative_violet", label: "Creative Violet", isFree: false, primary: "#7c3aed", secondary: "#8b5cf6", light: "#ede9fe", dark: "#4c1d95", border: "#c4b5fd", tableBorder: "#ddd6fe" },
  { id: "forest", label: "Forest", isFree: false, primary: "#15803d", secondary: "#16a34a", light: "#dcfce7", dark: "#14532d", border: "#86efac", tableBorder: "#bbf7d0" },
  { id: "mono_premium", label: "Mono Premium", isFree: false, primary: "#18181b", secondary: "#27272a", light: "#f4f4f5", dark: "#09090b", border: "#d4d4d8", tableBorder: "#e4e4e7" },
];

export const INVOICE_TEMPLATES = [
  { id: "modern", name: "Modern", isFree: true, accent: "#2563eb", tag: "FREE" },
  { id: "classic_border", name: "Classic Border", isFree: true, accent: "#16a34a", tag: "FREE" },
  { id: "compact", name: "Compact", isFree: true, accent: "#0891b2", tag: "FREE" },
  { id: "corporate", name: "Corporate", isFree: false, accent: "#334155", tag: "PRO" },
  { id: "retail", name: "Retail", isFree: false, accent: "#ea580c", tag: "PRO" },
  { id: "hotel_restaurant", name: "Hotel / Restaurant", isFree: false, accent: "#854d0e", tag: "PRO" },
  { id: "clean_minimal", name: "Clean Minimal", isFree: false, accent: "#475569", tag: "PRO" },
  { id: "side_ribbon", name: "Side Ribbon", isFree: false, accent: "#7c3aed", tag: "PRO" },
  { id: "premium", name: "Premium", isFree: false, accent: "#b45309", tag: "PRO" },
  { id: "elegant", name: "Elegant", isFree: false, accent: "#db2777", tag: "PRO" },
  { id: "geometric", name: "Geometric", isFree: false, accent: "#2563eb", tag: "PRO" },
];

export default function TaxInvoice({
  invoice,
  shopSettings,
  onClose,
  isModal = false,
  lastChangedField = "",
  lastChangeTitle = "",
}) {
  const printRef = useRef(null);

  // Resolve active color theme
  const activeTheme = COLOR_THEMES.find(
    (t) => t.id === shopSettings?.colorTheme || t.primary === shopSettings?.themeColor
  ) || COLOR_THEMES[0];

  // Parse items safely with proper calculations
  const rawItems = invoice?.items && invoice.items.length > 0 ? invoice.items : null;

  const items = rawItems
    ? rawItems.map((item) => {
        const qty = Number(item.qty || 1);
        const rate = Number(item.rate || item.price || 0);
        const gst = Number(item.taxPercent !== undefined ? item.taxPercent : (item.gst || 0));
        const discount = Number(item.discount || 0);
        const taxable = (rate * qty) - discount;
        const taxAmt = (taxable * gst) / 100;
        const total = Number(item.total !== undefined ? item.total : (taxable + taxAmt));
        return {
          name: item.name || "Sample Product",
          hsn: item.hsn || item.sku || "1234",
          qty,
          unit: item.unit || "pcs",
          rate,
          gst,
          taxable,
          total,
        };
      })
    : [
        {
          name: "Sample Product",
          hsn: "1234",
          qty: 2,
          unit: "pcs",
          rate: 500.0,
          gst: 18,
          taxable: 1000.0,
          total: 1180.0,
        },
      ];

  const calculatedSubtotal = items.reduce((acc, i) => acc + i.taxable, 0);
  const calculatedTax = items.reduce((acc, i) => acc + (i.total - i.taxable), 0);
  const calculatedGrandTotal = items.reduce((acc, i) => acc + i.total, 0);

  const subtotalVal = invoice?.subtotal !== undefined ? Number(invoice.subtotal) : calculatedSubtotal;
  const grandTotalVal = invoice?.grandTotal !== undefined ? Number(invoice.grandTotal) : calculatedGrandTotal;
  
  // Taxes calculation
  const isInterState = invoice?.isInterState || false;
  const totalTaxAmt = invoice?.taxTotal !== undefined ? Number(invoice.taxTotal) : calculatedTax;
  const cgstVal = invoice?.cgst !== undefined ? Number(invoice.cgst) : (isInterState ? 0 : totalTaxAmt / 2);
  const sgstVal = invoice?.sgst !== undefined ? Number(invoice.sgst) : (isInterState ? 0 : totalTaxAmt / 2);
  const igstVal = invoice?.igst !== undefined ? Number(invoice.igst) : (isInterState ? totalTaxAmt : 0);

  const paymentStatus = (invoice?.paymentStatus || "UNPAID").toUpperCase();
  const receivedVal = invoice?.received !== undefined
    ? Number(invoice.received)
    : (paymentStatus === "PAID" ? grandTotalVal : 0);
  const balanceDueVal = invoice?.balanceDue !== undefined
    ? Number(invoice.balanceDue)
    : Math.max(0, grandTotalVal - receivedVal);

  const inv = {
    invoiceNumber:
      invoice?.invoiceNumber ||
      invoice?.billNumber ||
      `${shopSettings?.invoicePrefix || "INV-2026-"}0001`,
    date: invoice?.createdAt
      ? new Date(invoice.createdAt).toISOString().split("T")[0]
      : (invoice?.date || "2026-10-04"),
    saleType: invoice?.saleType || (invoice?.customer?.gstin ? "B2B" : "B2B"),
    placeOfSupply: invoice?.placeOfSupply || invoice?.customer?.state || shopSettings?.state || "Tamil Nadu",
    customer: {
      name: invoice?.customer?.name || invoice?.customerName || "Sample Customer",
      phone: invoice?.customer?.phone || invoice?.mobileNumber || "9876543210",
      address: invoice?.customer?.address || invoice?.customerAddress || "Customer address",
      gstin: invoice?.customer?.gstin || "33ABCDE1234F1Z5",
      state: invoice?.customer?.state || "Tamil Nadu",
    },
    items,
    subtotal: subtotalVal,
    cgst: cgstVal,
    sgst: sgstVal,
    igst: igstVal,
    grandTotal: grandTotalVal,
    received: receivedVal,
    balanceDue: balanceDueVal,
    paymentStatus,
    paymentMethod: invoice?.paymentMethod || "Cash / UPI",
  };

  // Customization settings: only render pure thermal receipt if template is "thermal" OR viewMode is "thermal"
  const isThermal =
    shopSettings?.template === "thermal" ||
    shopSettings?.viewMode === "thermal";

  const settings = {
    template: shopSettings?.template || "modern",
    paperSize: shopSettings?.paperSize || "A4",
    title: shopSettings?.invoiceTitle || "TAX INVOICE",
    companyName: shopSettings?.shopName || shopSettings?.ownerName || "BILZET Retail Mart",
    shopName: shopSettings?.shopName || "BILZET Retail Mart",
    ownerName: shopSettings?.ownerName || "karthikeyan",
    phone: shopSettings?.phone || "+91 98765 43210",
    email: shopSettings?.email || "billing@bilzet.app",
    address: shopSettings?.address || "123 Commercial Plaza, Main Market",
    gstin: shopSettings?.gstin || "33ABCDE1234F1Z5",
    state: shopSettings?.state || "Tamil Nadu",
    logoUrl: shopSettings?.logoUrl || null,
    showHsnSummary: shopSettings?.showHsnSummary === true,
    showBankDetails: shopSettings?.showBankDetails !== false,
    showQrCode: shopSettings?.showQrCode !== false,
    showWatermark: shopSettings?.showWatermark !== false,
    showLogo: shopSettings?.showLogo !== false,
    showStatusBadge: shopSettings?.showStatusBadge !== false,
    showSignatory: shopSettings?.showSignatory !== false,
    showTerms: shopSettings?.showTerms !== false,
    showChangeIndicators: shopSettings?.showChangeIndicators !== false,
    bankName: shopSettings?.bankName || "HDFC Bank Ltd",
    accountNumber: shopSettings?.accountNumber || "50200012345678",
    ifsc: shopSettings?.ifsc || "HDFC0001234",
    upiId: shopSettings?.upiId || "bilzet@hdfcbank",
    terms: shopSettings?.terms || "Thank you for your business.\nGoods/services once accepted are subject to applicable business terms.",
  };

  const activeChangedField = lastChangedField || shopSettings?.lastChangedField || "";
  const activeChangeTitle = lastChangeTitle || shopSettings?.lastChangeTitle || "";
  const isFieldChanged = (field) => {
    return activeChangedField === field && settings.showChangeIndicators;
  };

  const handlePrint = () => {
    window.print();
  };

  // Thermal Receipt Render Mode
  if (isThermal) {
    return (
      <div className={`${isModal ? "fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" : ""}`}>
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
          <div className="flex items-center justify-between pb-4 border-b mb-4 print:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              80mm Thermal Receipt
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Printer size={13} /> Print
              </button>
              {isModal && (
                <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="font-mono text-[11px] text-black leading-tight space-y-2 p-2" id="printable-tax-invoice">
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="text-base font-bold uppercase">{settings.companyName}</h2>
              <p className="text-[10px]">{settings.address}</p>
              <p className="text-[10px]">Ph: {settings.phone}</p>
              <p className="text-[10px] font-bold">GSTIN: {settings.gstin}</p>
            </div>

            <div className="flex justify-between text-[10px] border-b border-dashed border-black pb-1.5">
              <span>Bill: {inv.invoiceNumber}</span>
              <span>{inv.date}</span>
            </div>

            <div>
              <p className="font-bold text-[10px]">Customer: {inv.customer.name}</p>
              {inv.customer.phone && <p className="text-[10px]">Ph: {inv.customer.phone}</p>}
            </div>

            <div className="border-t border-b border-black py-1">
              <div className="flex justify-between font-bold text-[10px]">
                <span className="w-1/2">Item</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Amt</span>
              </div>
            </div>

            <div className="space-y-1 py-1">
              {inv.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-[10px]">
                  <span className="w-1/2 truncate">{i.name}</span>
                  <span className="w-1/4 text-center">{i.qty}</span>
                  <span className="w-1/4 text-right">₹{Number(i.total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{Number(inv.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST:</span>
                <span>₹{Number(inv.cgst).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span>₹{Number(inv.sgst).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
                <span>GRAND TOTAL:</span>
                <span>₹{Number(inv.grandTotal).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center pt-2 text-[9px] border-t border-dashed border-black">
              <p>Thank you for shopping with us!</p>
              <p>Visit Again · Generated by BILZET</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UPI Payment QR code url if enabled
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.companyName)}&am=${inv.grandTotal}&cu=INR&tn=${encodeURIComponent(inv.invoiceNumber)}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiPayUrl)}`;

  return (
    <div
      className={`${
        isModal
          ? "fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          : "w-full"
      }`}
    >
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden relative flex flex-col my-auto border border-slate-200">
        {/* ══════════════════════════════════════════════════
            TOP ACTION BAR (Hidden in print)
        ══════════════════════════════════════════════════ */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Tax Invoice Preview · {settings.title}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition active:scale-95"
            >
              <Printer size={15} />
              <span>Print Invoice (A4)</span>
            </button>

            {isModal && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            PRINTABLE A4 INVOICE SHEET (DYNAMIC 11 TEMPLATES)
        ══════════════════════════════════════════════════ */}
        <div
          ref={printRef}
          id="printable-tax-invoice"
          className={`relative bg-white text-slate-800 text-xs overflow-hidden ${
            settings.template === "classic_border"
              ? "font-serif border-4 border-double rounded-none p-8 sm:p-10 space-y-5"
              : settings.template === "compact"
              ? "font-sans border rounded-xl p-5 sm:p-6 space-y-3.5"
              : settings.template === "corporate"
              ? "font-sans border border-slate-300 rounded-none p-8 sm:p-10 space-y-5"
              : settings.template === "retail"
              ? "font-mono border-2 border-dashed rounded-xl p-6 sm:p-8 space-y-4"
              : settings.template === "hotel_restaurant"
              ? "font-serif border border-amber-200 rounded-2xl p-8 sm:p-10 space-y-5 bg-[#fffdfa]"
              : settings.template === "clean_minimal"
              ? "font-sans border border-slate-200 rounded-xl p-8 sm:p-10 space-y-7"
              : settings.template === "side_ribbon"
              ? "font-sans border-2 rounded-2xl p-8 sm:p-10 pl-16 sm:pl-20 space-y-6"
              : settings.template === "premium"
              ? "font-serif border-2 rounded-xl p-8 sm:p-10 space-y-6 bg-[#fafaf9] shadow-lg ring-1 ring-amber-400/30"
              : settings.template === "elegant"
              ? "font-sans border-2 rounded-3xl p-8 sm:p-10 space-y-6"
              : settings.template === "geometric"
              ? "font-mono border-2 rounded-none p-8 sm:p-10 space-y-6"
              : "font-sans border-2 rounded-2xl p-8 sm:p-10 space-y-6" // default: modern
          }`}
          style={{
            minHeight: settings.template === "compact" ? "850px" : "1050px",
            borderColor:
              settings.template === "premium"
                ? "#b45309"
                : settings.template === "classic_border"
                ? activeTheme.primary
                : activeTheme.border,
          }}
        >
          {/* ── Active Real-Time Change Banner ──────────────── */}
          {activeChangeTitle && settings.showChangeIndicators && (
            <div className="relative z-30 mb-3 p-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between text-xs font-bold shadow-md animate-pulse print:hidden">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>✏️ Live Change on Bill: {activeChangeTitle}</span>
              </span>
              <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
                Updated
              </span>
            </div>
          )}

          {/* ── Live Inspection Mode Badge ────────────────────── */}
          {settings.showChangeIndicators && (
            <div className="relative z-20 mb-3 print:hidden flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
              <span className="text-[9px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                ● Layout: {settings.template.toUpperCase()}
              </span>
              <span className="text-[9px] font-bold text-slate-800 bg-white/95 border border-slate-300 px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTheme.primary }} />
                Theme: {activeTheme.label}
              </span>
              <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full shadow-xs">
                Size: {settings.paperSize}
              </span>
              {activeChangedField && (
                <span className="text-[9px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-xs animate-bounce">
                  ✨ Focus: {activeChangedField}
                </span>
              )}
            </div>
          )}

          {/* ── 1. Template-Specific Corner / Background Art ── */}
          {/* A. Modern: Concentric Circles & Dual Triangles */}
          {settings.template === "modern" && (
            <>
              <div className="absolute top-0 right-0 w-36 h-36 overflow-hidden pointer-events-none z-0">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <circle cx="120" cy="0" r="95" fill="none" stroke={activeTheme.primary} strokeWidth="18" opacity="0.95" />
                  <circle cx="120" cy="0" r="60" fill={activeTheme.dark} />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 w-32 h-32 overflow-hidden pointer-events-none z-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon points="0,100 0,60 40,100" fill={activeTheme.border} opacity="0.9" />
                  <polygon points="0,100 0,80 20,100" fill={activeTheme.primary} />
                </svg>
              </div>
            </>
          )}

          {/* B. Classic Border: Ornate Corner Bracket Markers */}
          {settings.template === "classic_border" && (
            <>
              <div className="absolute top-3 left-3 text-slate-400 pointer-events-none select-none text-base font-mono">╔══</div>
              <div className="absolute top-3 right-3 text-slate-400 pointer-events-none select-none text-base font-mono">══╗</div>
              <div className="absolute bottom-3 left-3 text-slate-400 pointer-events-none select-none text-base font-mono">╚══</div>
              <div className="absolute bottom-3 right-3 text-slate-400 pointer-events-none select-none text-base font-mono">══╝</div>
            </>
          )}

          {/* C. Side Ribbon: Full Height Colored Left Ribbon */}
          {settings.template === "side_ribbon" && (
            <div
              className="absolute top-0 bottom-0 left-0 w-12 sm:w-14 flex flex-col items-center justify-between py-8 text-white select-none z-10"
              style={{ backgroundColor: activeTheme.primary }}
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-xs">
                BZ
              </div>
              <span
                className="font-black text-xs tracking-widest rotate-180 uppercase"
                style={{ writingMode: "vertical-rl" }}
              >
                {settings.title} &middot; BILZET
              </span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold">
                ✓
              </div>
            </div>
          )}

          {/* D. Corporate: Solid Top Accent Band */}
          {settings.template === "corporate" && (
            <div
              className="absolute top-0 left-0 right-0 h-2 z-0"
              style={{ backgroundColor: activeTheme.primary }}
            />
          )}

          {/* E. Premium: Luxury Gold Accent Header */}
          {settings.template === "premium" && (
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-600 to-amber-500 z-0" />
          )}

          {/* F. Geometric: Angled Polygon Cut */}
          {settings.template === "geometric" && (
            <div className="absolute top-0 right-0 w-48 h-16 pointer-events-none z-0 overflow-hidden">
              <svg viewBox="0 0 200 60" className="w-full h-full">
                <polygon points="40,0 200,0 200,60 0,60" fill={activeTheme.light} opacity="0.8" />
                <polygon points="120,0 200,0 200,60 80,60" fill={activeTheme.primary} opacity="0.9" />
              </svg>
            </div>
          )}

          {/* G. Hotel / Restaurant: Crest Accent */}
          {settings.template === "hotel_restaurant" && (
            <div className="absolute top-3 right-4 text-amber-900/15 pointer-events-none select-none text-3xl font-serif">
              ⚜
            </div>
          )}

          {/* ── Background Watermark (If toggled) ─────────────── */}
          {settings.showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              {settings.showChangeIndicators && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 print:hidden z-10 pointer-events-none">
                  <span className="text-[9px] font-bold text-rose-700 bg-white/95 border border-rose-300 px-2.5 py-0.5 rounded-full shadow-xs">
                    💧 Watermark Layer Active
                  </span>
                </div>
              )}
              <span
                className="text-8xl sm:text-9xl font-black uppercase tracking-widest text-slate-300 transform -rotate-30"
                style={{
                  opacity:
                    settings.template === "clean_minimal"
                      ? 0.05
                      : settings.template === "premium"
                      ? 0.07
                      : 0.12,
                }}
              >
                {settings.template === "hotel_restaurant"
                  ? "GUEST FOLIO"
                  : settings.template === "retail"
                  ? "BILZET POS"
                  : "BILZET"}
              </span>
            </div>
          )}

          {/* ── 2. Header Section ────────────────────────────── */}
          {/* Variant A: Corporate Header Banner */}
          {/* ── 2. Header Section ────────────────────────────── */}
          {settings.template === "corporate" ? (
            /* 1. Corporate: Dark Executive Top Banner */
            <div
              className="relative z-10 p-5 rounded-xl text-white flex items-center justify-between shadow-sm"
              style={{ backgroundColor: activeTheme.dark }}
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider">
                  {settings.title}
                </h1>
                <p className="text-sm font-bold text-slate-100 mt-0.5">
                  {settings.shopName}
                </p>
                <p className="text-[11px] text-slate-300">
                  {settings.address} &middot; Ph: {settings.phone}
                </p>
                <p className="text-[11px] text-slate-300 font-mono">
                  GSTIN: {settings.gstin}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black tracking-widest block uppercase">
                  {settings.shopName.split(" ")[0]}
                </span>
                {settings.showStatusBadge && (
                  <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-white/20 text-white">
                    {inv.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          ) : settings.template === "classic_border" ? (
            /* 2. Classic Border: Formal Boxed Header */
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                <div>
                  <h2 className="text-xl font-bold font-serif">{settings.shopName}</h2>
                  <p className="text-[11px] text-slate-600">{settings.address} &middot; Ph: {settings.phone}</p>
                </div>
                {settings.showLogo && settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="max-h-10 object-contain" />
                )}
              </div>
              <div className="border-y-2 border-slate-900 py-2 text-center my-1">
                <h1 className="text-2xl font-black uppercase tracking-widest font-serif">
                  {settings.title}
                </h1>
                <p className="text-[10px] text-slate-600 font-mono">
                  GSTIN: {settings.gstin} &middot; State: {settings.state}
                </p>
              </div>
            </div>
          ) : settings.template === "retail" ? (
            /* 3. Retail: Barcode Graphic POS Header */
            <div className="relative z-10 flex items-center justify-between border-b pb-3 border-dashed border-slate-400">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">{settings.title}</h1>
                <p className="text-sm font-bold text-slate-900 uppercase">{settings.shopName}</p>
                <p className="text-[11px] text-slate-600 font-mono">{settings.address} &middot; Ph: {settings.phone}</p>
                <p className="text-[10px] text-slate-500 font-mono">GSTIN: {settings.gstin}</p>
              </div>
              <div className="text-right">
                <div className="font-mono tracking-widest text-[10px] bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                  ||| |||| | ||| || ||| {inv.invoiceNumber}
                </div>
                <span className="text-[10px] font-bold text-emerald-600 block mt-1">
                  ● RETAIL POS CASH MEMO
                </span>
              </div>
            </div>
          ) : settings.template === "clean_minimal" ? (
            /* 4. Clean Minimal: Left-Aligned Scandinavian Minimal */
            <div className="relative z-10 flex items-start justify-between border-b pb-4 border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeTheme.primary }}>
                  {settings.title}
                </span>
                <h1 className="text-2xl font-light tracking-tight text-slate-900 mt-0.5">
                  {settings.shopName}
                </h1>
                <p className="text-xs text-slate-500 mt-1">{settings.address} &middot; Ph: {settings.phone}</p>
                <p className="text-[11px] text-slate-400 font-mono">GSTIN: {settings.gstin}</p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-slate-900">{inv.invoiceNumber}</span>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{inv.date}</p>
                {settings.showStatusBadge && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {inv.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          ) : settings.template === "geometric" ? (
            /* 5. Geometric: Monospace Technical Grid Header */
            <div className="relative z-10 flex items-center justify-between border-2 p-3.5 border-slate-800 bg-slate-50/80 font-mono">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-slate-900">SYS_ID: #01</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{settings.title}</span>
                </div>
                <h1 className="text-xl font-black uppercase mt-1 tracking-tight text-slate-900">
                  {settings.shopName}
                </h1>
                <p className="text-[11px] text-slate-600 font-mono">LOC: {settings.address} // TEL: {settings.phone}</p>
                <p className="text-[11px] text-slate-600 font-mono">TAX_REG: {settings.gstin}</p>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs font-bold text-slate-900 border border-slate-400 px-2.5 py-1 bg-white inline-block">
                  DOC_REF: {inv.invoiceNumber}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">DATE: {inv.date}</div>
                {settings.showStatusBadge && (
                  <div className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 mt-1 inline-block">
                    STATUS: {inv.paymentStatus}
                  </div>
                )}
              </div>
            </div>
          ) : settings.template === "elegant" ? (
            /* 6. Elegant: Soft Pill Curved Header */
            <div className="relative z-10 p-5 rounded-3xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/80 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  {settings.title}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 pt-1">
                  {settings.shopName}
                </h1>
                <p className="text-xs text-slate-600">{settings.address} &middot; Ph: {settings.phone}</p>
                <p className="text-[11px] text-slate-500 font-mono">GSTIN: {settings.gstin}</p>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm font-bold text-slate-900 font-mono bg-white px-3 py-1.5 rounded-2xl border border-slate-200 inline-block shadow-2xs">
                  {inv.invoiceNumber}
                </div>
                <p className="text-xs text-slate-500">{inv.date}</p>
                {settings.showStatusBadge && (
                  <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {inv.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          ) : settings.template === "hotel_restaurant" ? (
            /* 7. Hotel / Restaurant: Hospitality Folio Header */
            <div className="relative z-10 text-center border-b pb-4 border-amber-300 font-serif space-y-1">
              <div className="text-2xl text-amber-700">⚜</div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-amber-950 uppercase">
                {settings.shopName}
              </h1>
              <p className="text-xs text-amber-900/80 italic font-serif">
                {settings.title} &middot; Fine Hospitality &amp; Dining
              </p>
              <p className="text-[11px] text-amber-900/70">{settings.address} &middot; Ph: {settings.phone}</p>
              <p className="text-[10px] text-amber-800 font-mono">GSTIN: {settings.gstin}</p>
            </div>
          ) : settings.template === "premium" ? (
            /* 8. Premium: Luxury Gold Accent Header */
            <div className="relative z-10 flex items-start justify-between border-b-2 border-amber-400/80 pb-4 font-serif">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded">
                  {settings.title} &middot; LUXURY SUITE
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-950 mt-1">
                  {settings.shopName}
                </h1>
                <p className="text-xs text-stone-600 mt-0.5">{settings.address} &middot; Ph: {settings.phone}</p>
                <p className="text-[11px] text-stone-500 font-mono">GSTIN: {settings.gstin}</p>
              </div>
              <div className="text-right font-serif">
                <span className="text-sm font-bold font-mono text-amber-950 block">{inv.invoiceNumber}</span>
                <p className="text-xs text-stone-600">{inv.date}</p>
                {settings.showStatusBadge && (
                  <span className="inline-block mt-1 px-3 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-600 text-white shadow-xs">
                    {inv.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          ) : settings.template === "side_ribbon" ? (
            /* 9. Side Ribbon Header */
            <div className="relative z-10 flex items-start justify-between border-b pb-4" style={{ borderColor: activeTheme.border }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded text-white" style={{ backgroundColor: activeTheme.primary }}>
                  {settings.title}
                </span>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-1">
                  {settings.shopName}
                </h1>
                <p className="text-xs text-slate-600">{settings.address} &middot; Ph: {settings.phone}</p>
                <p className="text-[11px] text-slate-500 font-mono">GSTIN: {settings.gstin}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-slate-900">{inv.invoiceNumber}</span>
                <p className="text-xs text-slate-500">{inv.date}</p>
                {settings.showStatusBadge && (
                  <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs" style={{ backgroundColor: activeTheme.primary }}>
                    {inv.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          ) : settings.template === "compact" ? (
            /* 10. Compact: Dense Header */
            <div className="relative z-10 flex items-center justify-between border-b pb-2 border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-600 text-white font-black text-xs flex items-center justify-center">BZ</div>
                <div>
                  <h1 className="text-base font-bold text-slate-900 leading-tight">{settings.shopName}</h1>
                  <p className="text-[10px] text-slate-500">{settings.phone} &middot; GSTIN: {settings.gstin}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600">{settings.title}</span>
                <p className="text-[10px] font-mono text-slate-700">{inv.invoiceNumber} &middot; {inv.date}</p>
              </div>
            </div>
          ) : (
            /* 11. Modern (Default): Circular Corner Art with Modern Dual Cards */
            <div className="relative z-10 flex items-start justify-between">
              {/* Left: Company Logo */}
              <div className="w-1/3 pt-1">
                {settings.showChangeIndicators && (
                  <span className="text-[8px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded-full block w-fit mb-1 print:hidden">
                    ● Logo ({settings.showLogo ? "Visible" : "Off"})
                  </span>
                )}
                {settings.showLogo && settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Company Logo"
                    className="max-h-12 max-w-[150px] object-contain"
                  />
                ) : settings.showLogo ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                      style={{ backgroundColor: activeTheme.primary }}
                    >
                      BZ
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Company Logo</span>
                  </div>
                ) : null}
              </div>

              {/* Center: TAX INVOICE & Company Name */}
              <div className="w-1/3 text-center">
                {settings.showChangeIndicators && (
                  <span className="text-[8px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full inline-block mb-1 print:hidden">
                    ● Heading: {settings.title}
                  </span>
                )}
                <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
                  {settings.title}
                </h1>
                <p className="text-sm font-bold text-slate-800 mt-0.5 tracking-normal">
                  {settings.shopName}
                </p>
                {settings.ownerName && (
                  <p className="text-[11px] text-slate-500">Prop: {settings.ownerName}</p>
                )}
              </div>

              {/* Right: BILZET Brand & Status Badge */}
              <div className="w-1/3 flex flex-col items-end pr-2 pt-0.5">
                <span
                  className="text-2xl font-black tracking-wider uppercase"
                  style={{ color: activeTheme.primary }}
                >
                  {settings.shopName ? settings.shopName.split(" ")[0] : "BILZET"}
                </span>
                {settings.showChangeIndicators && (
                  <span className="text-[8px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded-full inline-block mt-1 print:hidden">
                    ● Badge: {settings.showStatusBadge ? "On" : "Off"}
                  </span>
                )}
                {settings.showStatusBadge && (
                  <span
                    className="mt-1 px-3.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                    style={
                      inv.paymentStatus === "PAID"
                        ? {
                            backgroundColor: activeTheme.light,
                            color: activeTheme.dark,
                            borderColor: activeTheme.border,
                          }
                        : {
                            backgroundColor: "#fef3c7",
                            color: "#92400e",
                            borderColor: "#fde68a",
                          }
                    }
                  >
                    {inv.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── 3. Information Cards / Metadata Strip ─────────── */}
          {settings.template === "compact" ? (
            /* Compact Single-Strip Metadata */
            <div className="relative z-10 p-2.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="font-bold text-slate-700">Customer:</span>{" "}
                <span className="text-slate-900 font-medium">{inv.customer.name}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Phone:</span>{" "}
                <span className="font-mono text-slate-900">{inv.customer.phone}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Doc No:</span>{" "}
                <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Date:</span>{" "}
                <span className="font-mono text-slate-900">{inv.date}</span>
              </div>
            </div>
          ) : settings.template === "corporate" ? (
            /* Corporate 3-Column Metadata Strip */
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">Billed To</p>
                <p className="font-bold text-slate-900">{inv.customer.name}</p>
                <p className="text-slate-600">{inv.customer.phone}</p>
                <p className="text-slate-600">{inv.customer.address}</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">Invoice Details</p>
                <p><span className="font-semibold">Doc No:</span> {inv.invoiceNumber}</p>
                <p><span className="font-semibold">Date:</span> {inv.date}</p>
                <p><span className="font-semibold">Sale:</span> {inv.saleType}</p>
              </div>
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 mb-1">Tax Compliance</p>
                <p><span className="font-semibold">Cust GSTIN:</span> {inv.customer.gstin || "N/A"}</p>
                <p><span className="font-semibold">Place of Supply:</span> {inv.placeOfSupply}</p>
                <p><span className="font-semibold">State Code:</span> 33</p>
              </div>
            </div>
          ) : settings.template === "hotel_restaurant" ? (
            /* Hospitality Folio Metadata */
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 font-serif">
              <div><span className="font-bold">Guest:</span> {inv.customer.name}</div>
              <div><span className="font-bold">Table No:</span> 12</div>
              <div><span className="font-bold">Server:</span> Karthik</div>
              <div><span className="font-bold">Folio / Bill:</span> {inv.invoiceNumber}</div>
            </div>
          ) : settings.template === "geometric" ? (
            /* Geometric Technical Metadata Box */
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 border-2 border-slate-800 bg-white font-mono text-xs">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 uppercase">RECIPIENT_DATA:</p>
                <p className="font-medium text-slate-800">{inv.customer.name}</p>
                <p className="text-slate-600">TEL: {inv.customer.phone}</p>
                <p className="text-slate-600">ADDR: {inv.customer.address}</p>
                <p className="text-slate-700">GST: {inv.customer.gstin || "UNREGISTERED"}</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 uppercase">INVOICE_PARAMETERS:</p>
                <p>DOC_NUM: <span className="font-bold">{inv.invoiceNumber}</span></p>
                <p>TIMESTAMP: {inv.date}</p>
                <p>TAX_TYPE: {inv.saleType}</p>
                <p>POS_LOC: {inv.placeOfSupply}</p>
              </div>
            </div>
          ) : (
            /* Standard 2 Rounded Cards (Bill To & Document Info) */
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Left Card: Bill To */}
              <div
                className={`p-4 text-xs shadow-2xs space-y-1 ${
                  settings.template === "clean_minimal"
                    ? "border-l-4 pl-3.5 rounded-none bg-transparent"
                    : settings.template === "classic_border"
                    ? "border-2 rounded-none bg-white font-serif"
                    : settings.template === "premium"
                    ? "border rounded-xl bg-stone-50 font-serif border-amber-300"
                    : settings.template === "elegant"
                    ? "border rounded-3xl bg-slate-50/50 shadow-xs border-slate-200"
                    : "border rounded-2xl bg-white"
                }`}
                style={{
                  borderColor:
                    settings.template === "clean_minimal"
                      ? activeTheme.primary
                      : settings.template === "classic_border"
                      ? "#334155"
                      : activeTheme.border,
                }}
              >
                <p className="font-bold text-slate-900 text-sm mb-1.5">Bill To</p>
                <p className="font-semibold text-slate-800">{inv.customer.name}</p>
                <p className="text-slate-600">{inv.customer.phone}</p>
                <p className="text-slate-600">{inv.customer.address}</p>
                <p className="text-slate-700">
                  GSTIN: <span className="font-medium text-slate-800">{inv.customer.gstin || "N/A"}</span>
                </p>
                <p className="text-slate-700">
                  State: <span className="font-medium text-slate-800">{inv.customer.state}</span>
                </p>
              </div>

              {/* Right Card: Document Info */}
              <div
                className={`p-4 text-xs shadow-2xs space-y-1.5 ${
                  settings.template === "clean_minimal"
                    ? "border-l-4 pl-3.5 rounded-none bg-transparent"
                    : settings.template === "classic_border"
                    ? "border-2 rounded-none bg-white font-serif"
                    : settings.template === "premium"
                    ? "border rounded-xl bg-stone-50 font-serif border-amber-300"
                    : settings.template === "elegant"
                    ? "border rounded-3xl bg-slate-50/50 shadow-xs border-slate-200"
                    : "border rounded-2xl bg-white"
                }`}
                style={{
                  borderColor:
                    settings.template === "clean_minimal"
                      ? activeTheme.primary
                      : settings.template === "classic_border"
                      ? "#334155"
                      : activeTheme.border,
                }}
              >
                <p>
                  <span className="font-bold text-slate-900">Document No:</span>{" "}
                  <span className="font-medium text-slate-800">{inv.invoiceNumber}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-900">Date:</span>{" "}
                  <span className="font-medium text-slate-800">{inv.date}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-900">Sale:</span>{" "}
                  <span className="font-medium text-slate-800">{inv.saleType}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-900">Place of Supply:</span>{" "}
                  <span className="font-medium text-slate-800">{inv.placeOfSupply}</span>
                </p>
              </div>
            </div>
          )}

          {/* ── 4. Line Items Table ──────────────────────────── */}
          <div
            className={`relative z-10 border overflow-x-auto ${
              settings.template === "clean_minimal" ? "border-x-0 rounded-none" : "rounded-xl"
            }`}
            style={{ borderColor: activeTheme.tableBorder }}
          >
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr
                  className="font-bold text-[11px]"
                  style={
                    settings.template === "classic_border" || settings.template === "corporate"
                      ? { backgroundColor: activeTheme.dark, color: "#ffffff" }
                      : settings.template === "premium"
                      ? { backgroundColor: "#fef3c7", color: "#78350f" }
                      : { backgroundColor: activeTheme.light, color: activeTheme.dark }
                  }
                >
                  <th className="py-2.5 px-3 text-center border-r w-[6%]" style={{ borderColor: activeTheme.tableBorder }}>#</th>
                  <th className="py-2.5 px-3 text-left border-r w-[28%]" style={{ borderColor: activeTheme.tableBorder }}>Item</th>
                  <th className="py-2.5 px-2 text-center border-r w-[14%]" style={{ borderColor: activeTheme.tableBorder }}>HSN/SAC</th>
                  <th className="py-2.5 px-2 text-center border-r w-[10%]" style={{ borderColor: activeTheme.tableBorder }}>Qty</th>
                  <th className="py-2.5 px-2 text-center border-r w-[12%]" style={{ borderColor: activeTheme.tableBorder }}>Rate</th>
                  <th className="py-2.5 px-2 text-center border-r w-[8%]" style={{ borderColor: activeTheme.tableBorder }}>GST</th>
                  <th className="py-2.5 px-3 text-right border-r w-[11%]" style={{ borderColor: activeTheme.tableBorder }}>Taxable</th>
                  <th className="py-2.5 px-3 text-right w-[11%]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white text-slate-800" style={{ borderColor: activeTheme.tableBorder }}>
                {inv.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center border-r text-slate-600 font-medium" style={{ borderColor: activeTheme.tableBorder }}>
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-left border-r font-medium text-slate-900" style={{ borderColor: activeTheme.tableBorder }}>
                      {item.name}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r font-mono text-slate-700" style={{ borderColor: activeTheme.tableBorder }}>
                      {item.hsn}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r font-medium text-slate-800" style={{ borderColor: activeTheme.tableBorder }}>
                      {item.qty} {item.unit || "pcs"}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r font-mono text-slate-700" style={{ borderColor: activeTheme.tableBorder }}>
                      ₹{Number(item.rate).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r font-medium text-slate-700" style={{ borderColor: activeTheme.tableBorder }}>
                      {item.gst}%
                    </td>
                    <td className="py-2.5 px-3 text-right border-r font-mono text-slate-900 font-medium" style={{ borderColor: activeTheme.tableBorder }}>
                      ₹{Number(item.taxable).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      ₹{Number(item.total).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Optional: HSN / SAC Summary Grid ─────────────── */}
          {settings.showHsnSummary && (
            <div className="relative z-10 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  HSN / SAC Tax Breakdown Summary
                </p>
                {settings.showChangeIndicators && (
                  <span className="print:hidden text-[8px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-1.5 py-0.2 rounded-full">
                    ● Tax Breakdown Grid Active
                  </span>
                )}
              </div>
              <table className="w-full text-[10px] text-center border border-collapse rounded-lg overflow-hidden" style={{ borderColor: activeTheme.tableBorder }}>
                <thead style={{ backgroundColor: activeTheme.light, color: activeTheme.dark }}>
                  <tr>
                    <th className="py-1 px-2 border-r" style={{ borderColor: activeTheme.tableBorder }}>HSN/SAC</th>
                    <th className="py-1 px-2 border-r" style={{ borderColor: activeTheme.tableBorder }}>Taxable Value</th>
                    <th className="py-1 px-2 border-r" style={{ borderColor: activeTheme.tableBorder }}>CGST Rate</th>
                    <th className="py-1 px-2 border-r" style={{ borderColor: activeTheme.tableBorder }}>CGST Amt</th>
                    <th className="py-1 px-2 border-r" style={{ borderColor: activeTheme.tableBorder }}>SGST Rate</th>
                    <th className="py-1 px-2 border-r" style={{ borderColor: activeTheme.tableBorder }}>SGST Amt</th>
                    <th className="py-1 px-2">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {inv.items.map((i, idx) => (
                    <tr key={idx} className="border-t" style={{ borderColor: activeTheme.tableBorder }}>
                      <td className="py-1 px-2 border-r font-mono">{i.hsn}</td>
                      <td className="py-1 px-2 border-r font-mono">₹{i.taxable.toFixed(2)}</td>
                      <td className="py-1 px-2 border-r">{i.gst / 2}%</td>
                      <td className="py-1 px-2 border-r font-mono">₹{((i.taxable * (i.gst / 2)) / 100).toFixed(2)}</td>
                      <td className="py-1 px-2 border-r">{i.gst / 2}%</td>
                      <td className="py-1 px-2 border-r font-mono">₹{((i.taxable * (i.gst / 2)) / 100).toFixed(2)}</td>
                      <td className="py-1 px-2 font-mono font-bold">₹{(((i.taxable * i.gst) / 100)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 5. Calculations & Totals (Right-Aligned) ─────── */}
          <div className="relative z-10 flex justify-end pt-1">
            <div className="w-full sm:w-80 space-y-1.5 text-xs">
              <div className="flex justify-between py-1 text-slate-700">
                <span className="font-medium">Subtotal</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-t border-dashed border-slate-300 text-slate-700">
                <span className="font-medium">CGST</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.cgst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 text-slate-700">
                <span className="font-medium">SGST</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.sgst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {inv.igst > 0 && (
                <div className="flex justify-between py-1 text-slate-700">
                  <span className="font-medium">IGST</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Number(inv.igst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div
                className="flex justify-between py-2 border-t-2 text-sm"
                style={{ borderColor: activeTheme.primary }}
              >
                <span className="font-black text-slate-900">Grand Total</span>
                <span className="font-mono font-black text-slate-900">
                  ₹{Number(inv.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 text-slate-700">
                <span className="font-medium">Received</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.received).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between py-1 border-t border-dashed border-slate-300 text-xs">
                <span className="font-bold text-slate-900">Balance Due</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Number(inv.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* ── Optional: Bank Settlement Details & UPI QR ──── */}
          {settings.showBankDetails && (
            <div className="relative z-10 p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between text-[11px] text-slate-700">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-bold uppercase tracking-wider text-slate-800 text-[10px]">
                    Bank Settlement Details:
                  </p>
                  {settings.showChangeIndicators && (
                    <span className="print:hidden text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                      ● Bank &amp; QR Active
                    </span>
                  )}
                </div>
                <p><strong>Bank:</strong> {settings.bankName} &middot; <strong>A/C:</strong> {settings.accountNumber}</p>
                <p><strong>IFSC:</strong> {settings.ifsc} &middot; <strong>UPI:</strong> {settings.upiId}</p>
              </div>
              {settings.showQrCode && (
                <div className="text-center shrink-0">
                  <img src={qrImgSrc} alt="UPI QR" className="w-16 h-16 rounded border border-slate-300 bg-white p-0.5" />
                </div>
              )}
            </div>
          )}

          {/* ── 6. Footer / Terms & Signature ─────────────────── */}
          {(settings.showTerms || settings.showSignatory) && (
            <div className="relative z-10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end border-t border-slate-100">
              {/* Left: Footer / Terms */}
              {settings.showTerms ? (
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-xs">Footer / Terms</p>
                    {settings.showChangeIndicators && (
                      <span className="print:hidden text-[8px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                        ● Terms Printed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed whitespace-pre-line">{settings.terms}</p>
                </div>
              ) : <div />}

              {/* Right: Authorized Signature */}
              {settings.showSignatory && (
                <div className="text-right space-y-6">
                  <div className="h-6" />
                  <div className="flex items-center justify-end gap-1.5">
                    {settings.showChangeIndicators && (
                      <span className="print:hidden text-[8px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                        ● Signatory Box
                      </span>
                    )}
                    <p className="text-xs text-slate-600 font-medium">Authorized Signature</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 7. Bottom Brand Watermark Line ────────────────── */}
          <div className="relative z-10 text-center pt-4 text-[11px] text-slate-400 font-medium">
            Generated by BILZET &middot; {settings.template.toUpperCase()} TEMPLATE
          </div>
        </div>
      </div>
    </div>
  );
}
