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
  FileText,
} from "lucide-react";

// Convert number to Indian words
export function numberToWordsINR(num) {
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
  { id: "trust_blue", label: "Trust Blue", plan: "FREE", isFree: true, primary: "#2563eb", secondary: "#3b82f6", light: "#dbeafe", dark: "#1e3a8a", border: "#93c5fd", tableBorder: "#bfdbfe" },
  { id: "growth_green", label: "Growth Green", plan: "FREE", isFree: true, primary: "#16a34a", secondary: "#22c55e", light: "#dcfce7", dark: "#14532d", border: "#86efac", tableBorder: "#bbf7d0" },
  { id: "professional_slate", label: "Professional Slate", plan: "FREE", isFree: true, primary: "#475569", secondary: "#64748b", light: "#f1f5f9", dark: "#0f172a", border: "#cbd5e1", tableBorder: "#e2e8f0" },
  { id: "indigo_focus", label: "Indigo Focus", plan: "PRO", isFree: false, primary: "#4f46e5", secondary: "#6366f1", light: "#e0e7ff", dark: "#312e81", border: "#a5b4fc", tableBorder: "#c7d2fe" },
  { id: "calm_teal", label: "Calm Teal", plan: "PRO", isFree: false, primary: "#0d9488", secondary: "#14b8a6", light: "#ccfbf1", dark: "#134e4a", border: "#5eead4", tableBorder: "#99f6e4" },
  { id: "retail_orange", label: "Retail Orange", plan: "PRO", isFree: false, primary: "#ea580c", secondary: "#f97316", light: "#ffedd5", dark: "#7c2d12", border: "#fdba74", tableBorder: "#fed7aa" },
  { id: "bold_ruby", label: "Bold Ruby", plan: "PRO", isFree: false, primary: "#e11d48", secondary: "#f43f5e", light: "#ffe4e6", dark: "#881337", border: "#fda4af", tableBorder: "#fecdd3" },
  { id: "premium_purple", label: "Premium Purple", plan: "PRO", isFree: false, primary: "#9333ea", secondary: "#a855f7", light: "#f3e8ff", dark: "#581c87", border: "#d8b4fe", tableBorder: "#e9d5ff" },
  { id: "fresh_cyan", label: "Fresh Cyan", plan: "PRO", isFree: false, primary: "#0891b2", secondary: "#06b6d4", light: "#cffafe", dark: "#164e63", border: "#67e8f9", tableBorder: "#a5f3fc" },
  { id: "luxury_gold", label: "Luxury Gold", plan: "PREMIUM", isFree: false, primary: "#b45309", secondary: "#d97706", light: "#fef3c7", dark: "#451a03", border: "#fcd34d", tableBorder: "#fde68a" },
  { id: "executive_navy", label: "Executive Navy", plan: "PREMIUM", isFree: false, primary: "#1e3a8a", secondary: "#1d4ed8", light: "#dbeafe", dark: "#0f172a", border: "#93c5fd", tableBorder: "#bfdbfe" },
  { id: "mono_premium", label: "Mono Premium", plan: "PREMIUM", isFree: false, primary: "#18181b", secondary: "#27272a", light: "#f4f4f5", dark: "#09090b", border: "#d4d4d8", tableBorder: "#e4e4e7" },
];

export const FONT_OPTIONS = [
  { id: "inter", name: "Inter (Modern Sans)", value: "Inter, system-ui, sans-serif", plan: "FREE" },
  { id: "roboto", name: "Roboto (Clean Standard)", value: "Roboto, sans-serif", plan: "PRO" },
  { id: "outfit", name: "Outfit (Geometric Pro)", value: "Outfit, sans-serif", plan: "PRO" },
  { id: "poppins", name: "Poppins (Rounded Elegant)", value: "Poppins, sans-serif", plan: "PRO" },
  { id: "playfair", name: "Playfair Display (Luxury Serif)", value: "'Playfair Display', Georgia, serif", plan: "PREMIUM" },
  { id: "mono", name: "JetBrains Mono (Technical)", value: "'JetBrains Mono', monospace", plan: "PREMIUM" },
];

export const HEADER_STYLES = [
  { id: "curved_arc", name: "Master Dashboard Arc", description: "Iconic Bilzet top curved arc and corner triangles", plan: "FREE" },
  { id: "minimal", name: "Minimal Clean", description: "Sleek modern border with subtle accent line", plan: "PRO" },
  { id: "bold_banner", name: "Bold Accent Banner", description: "Full-width colored header with inverted typography", plan: "PREMIUM" },
  { id: "executive", name: "Executive Dual Split", description: "High-contrast split branding layout", plan: "PREMIUM" },
];

export const BORDER_STYLES = [
  { id: "rounded", name: "Modern Rounded (16px)", plan: "FREE" },
  { id: "crisp", name: "Classic Crisp (4px)", plan: "PRO" },
  { id: "subtle", name: "Subtle Soft (8px)", plan: "PRO" },
  { id: "double", name: "Executive Double Line", plan: "PREMIUM" },
];

// For backward compatibility with existing code
export const INVOICE_TEMPLATES = [
  { id: "modern", name: "Master Dashboard Arc", isFree: true, accent: "#2563eb", tag: "FREE" },
  { id: "minimal", name: "Minimal Clean", isFree: false, accent: "#475569", tag: "PRO" },
  { id: "bold_banner", name: "Bold Accent Banner", isFree: false, accent: "#7c3aed", tag: "PREMIUM" },
  { id: "executive", name: "Executive Dual Split", isFree: false, accent: "#1e3a8a", tag: "PREMIUM" },
];

export const DEFAULT_INVOICE_SETTINGS = {
  // General
  invoiceTitle: "TAX INVOICE",
  invoicePrefix: "INV-2026-",
  invoiceNumberDigits: 4,
  dateFormat: "DD/MM/YYYY",
  currency: "INR",
  currencySymbol: "₹",

  // Business Information
  shopName: "BILZET Retail Mart",
  ownerName: "Karthi Kevan",
  phone: "+91 88254 54486",
  email: "contact@bilzet.com",
  address: "123 Commercial Plaza, Main Market",
  city: "Bengaluru",
  state: "Tamil Nadu",
  stateCode: "33",
  gstin: "33AAAAA0000A1Z5",
  logoUrl: "",
  showLogo: true,

  // Customer Information
  showCustomerName: true,
  showCustomerPhone: true,
  showCustomerAddress: true,
  showCustomerGstin: true,
  showCustomerState: true,

  // Table Columns
  showItemNumber: true,
  showItemName: true,
  showItemCode: true,
  showHsn: true,
  showQuantity: true,
  showUnit: true,
  showRate: true,
  showItemDiscount: true,
  showGstPercent: true,
  showTaxableAmount: true,
  showTotal: true,

  // Totals Section
  showSubtotal: true,
  showDiscountTotal: true,
  showCgstSgst: true,
  showIgst: true,
  showRoundOff: true,
  showGrandTotal: true,
  showAmountInWords: true,
  showPaymentStatus: true,
  showReceivedAmount: true,
  showBalanceDue: true,

  // Payment & Bank
  showBankDetails: true,
  bankName: "HDFC Bank Ltd",
  accountNumber: "50200012345678",
  ifsc: "HDFC0001234",
  branch: "Main Branch",
  accountHolder: "BILZET Retail Mart",
  showQrCode: true,
  upiId: "bilzet@hdfcbank",
  paymentInstructions: "Scan UPI QR code or pay via bank transfer.",

  // Appearance & Styling
  colorTheme: "trust_blue",
  customColor: "",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: "medium",
  textAlign: "left",
  borderStyle: "rounded",
  headerStyle: "curved_arc",
  watermarkText: "BILZET",
  showWatermark: true,

  // Footer
  notes: "Thank you for your business! Goods once sold are subject to store policy.",
  terms: "1. All disputes subject to local jurisdiction.\n2. Interest @ 18% p.a. will be charged for delayed payments beyond 30 days.\n3. Goods once sold are not returnable without original bill.",
  thankYouMessage: "Thank you for shopping with us! Visit again.",
  showTerms: true,
  showNotes: true,
  showThankYou: true,
  showSignatory: true,
  signatoryLabel: "Authorized Signatory",
  authorizedPerson: "Karthi Kevan",
  designation: "Store Manager",
};

/**
 * MASTER INVOICE COMPONENT:
 * Directly based on the existing Dashboard Bill Invoice design.
 * Used identically for:
 * - Dashboard invoice modal / view
 * - New Bill live preview & saved invoice
 * - Invoice list preview
 * - Print invoice
 * - PDF generation
 * - Business Settings live customization preview
 */
export default function TaxInvoice({
  invoice,
  shopSettings = {},
  customizationSettings = {},
  plan = "Free",
  onClose,
  isModal = false,
  showActions = true,
  lastChangedField = "",
  lastChangeTitle = "",
}) {
  const printRef = useRef(null);

  // Merge shopSettings with customizationSettings and fallback defaults
  const settings = {
    ...DEFAULT_INVOICE_SETTINGS,
    ...shopSettings,
    ...customizationSettings,
  };

  // Resolve active theme colors
  let activeTheme = COLOR_THEMES.find(
    (t) => t.id === settings.colorTheme || t.primary === settings.themeColor || t.primary === settings.customColor
  ) || COLOR_THEMES[0];

  // If a custom color is set (PREMIUM feature)
  if (settings.customColor && settings.customColor.startsWith("#")) {
    activeTheme = {
      ...activeTheme,
      primary: settings.customColor,
      secondary: settings.customColor,
      dark: settings.customColor,
      border: `${settings.customColor}66`,
      tableBorder: `${settings.customColor}44`,
      light: `${settings.customColor}15`,
    };
  }

  // Parse items safely with calculations
  const rawItems = invoice?.items && invoice.items.length > 0 ? invoice.items : null;

  const items = rawItems
    ? rawItems.map((item, idx) => {
        const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty || 1));
        const rate = Number(item.rate !== undefined ? item.rate : (item.price || item.sellingPrice || 0));
        const gst = Number(
          item.gstRate !== undefined
            ? item.gstRate
            : item.taxPercent !== undefined
            ? item.taxPercent
            : item.gst || 0
        );
        const discount = Number(item.discount || 0);
        const taxable = (rate * qty) - discount;
        const taxAmt = Number(
          item.taxAmount !== undefined
            ? item.taxAmount
            : (taxable * gst) / 100
        );
        const total = Number(
          item.total !== undefined
            ? item.total
            : taxable + taxAmt
        );

        return {
          id: item.id || item._id || idx + 1,
          name: item.name || item.product?.name || "Sample Product",
          code: item.code || item.sku || item.product?.code || `PRD-${idx + 1}`,
          hsn: item.hsn || item.sku || "1234",
          unit: item.unit || "pcs",
          qty,
          originalQuantity: Number(item.originalQuantity || qty),
          returnedQuantity: Number(item.returnedQuantity || 0),
          remainingQuantity: Number(item.remainingQuantity !== undefined ? item.remainingQuantity : (qty - (item.returnedQuantity || 0))),
          rate,
          discount,
          gst,
          taxable,
          taxAmt,
          gstAdjustment: Number(item.gstAdjustment || 0),
          refundedAmount: Number(item.refundedAmount || 0),
          total,
        };
      })
    : [
        {
          id: 1,
          name: "Premium Basmati Rice (5kg)",
          code: "RIC-001",
          hsn: "1006",
          unit: "bag",
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
          name: "Organic Whole Wheat Flour (10kg)",
          code: "WHT-002",
          hsn: "1101",
          unit: "bag",
          qty: 1,
          rate: 420.0,
          discount: 20.0,
          gst: 5,
          taxable: 400.0,
          taxAmt: 20.0,
          total: 420.0,
        },
        {
          id: 3,
          name: "Cold-Pressed Groundnut Oil (1L)",
          code: "OIL-003",
          hsn: "1508",
          unit: "btl",
          qty: 2,
          rate: 240.0,
          discount: 0.0,
          gst: 12,
          taxable: 480.0,
          taxAmt: 57.6,
          total: 537.6,
        },
      ];

  const calculatedSubtotal = items.reduce((acc, i) => acc + i.taxable, 0);
  const calculatedDiscount = items.reduce((acc, i) => acc + i.discount, 0);
  const calculatedTax = items.reduce((acc, i) => acc + i.taxAmt, 0);
  const calculatedGrandTotal = items.reduce((acc, i) => acc + i.total, 0);

  const subtotalVal = invoice?.subtotal !== undefined ? Number(invoice.subtotal) : calculatedSubtotal;
  const discountTotalVal = invoice?.discountTotal !== undefined ? Number(invoice.discountTotal) : calculatedDiscount;
  const grandTotalVal = invoice?.grandTotal !== undefined ? Number(invoice.grandTotal) : calculatedGrandTotal;
  const isInterState = invoice?.isInterState || false;
  const totalTaxAmt = invoice?.taxTotal !== undefined ? Number(invoice.taxTotal) : calculatedTax;

  const cgstVal = invoice?.cgst !== undefined ? Number(invoice.cgst) : (isInterState ? 0 : totalTaxAmt / 2);
  const sgstVal = invoice?.sgst !== undefined ? Number(invoice.sgst) : (isInterState ? 0 : totalTaxAmt / 2);
  const igstVal = invoice?.igst !== undefined ? Number(invoice.igst) : (isInterState ? totalTaxAmt : 0);

  const rawPaymentStatus = (invoice?.paymentStatus || invoice?.status || "PAID").toUpperCase();
  let paymentStatus = "UNPAID";
  if (rawPaymentStatus === "PENDING") {
    paymentStatus = "PENDING";
  } else if (rawPaymentStatus === "PAID" || rawPaymentStatus === "COMPLETED") {
    paymentStatus = "PAID";
  } else if (
    rawPaymentStatus === "PARTIALLY_PAID" ||
    rawPaymentStatus === "PARTIALLY PAID" ||
    rawPaymentStatus === "PARTIAL"
  ) {
    paymentStatus = "PARTIALLY PAID";
  } else {
    paymentStatus = "UNPAID";
  }

  const rawReturnStatus = (
    invoice?.returnStatus ||
    (invoice?.returns?.length > 0 ? "PARTIALLY_RETURNED" : "NONE")
  ).toUpperCase();
  let returnStatus = "NONE";
  if (rawReturnStatus === "RETURNED") {
    returnStatus = "RETURNED";
  } else if (rawReturnStatus === "PARTIALLY_RETURNED" || rawReturnStatus === "PARTIAL_RETURN") {
    returnStatus = "PARTIALLY RETURNED";
  }

  const originalGrandTotal = Number(invoice?.originalGrandTotal || invoice?.grandTotal || grandTotalVal);
  const roundOffVal = Number(invoice?.roundOff !== undefined ? invoice.roundOff : 0);
  const returnedAmountVal = Number(invoice?.totalReturnedAmount || invoice?.returnedAmount || 0);
  const gstAdjustmentVal = Number(invoice?.gstAdjustment || 0);
  const netPayableVal = Number(
    invoice?.netPayable !== undefined
      ? invoice.netPayable
      : Math.max(0, originalGrandTotal - returnedAmountVal)
  );

  const hsnSummaryData = invoice?.hsnSummary && invoice.hsnSummary.length > 0
    ? invoice.hsnSummary
    : (() => {
        const hMap = {};
        for (const it of items) {
          const hsnCode = it.hsn || it.hsnCode || "1904";
          const gstRate = Number(it.gst !== undefined ? it.gst : (it.gstRate || 0));
          const key = `${hsnCode}_${gstRate}`;
          if (!hMap[key]) {
            hMap[key] = {
              hsn: hsnCode,
              gstRate,
              taxableAmount: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              taxAmount: 0,
              totalAmount: 0,
            };
          }
          const itemTaxable = Number(it.taxable || 0);
          const itemTax = Number(it.taxAmt || 0);
          hMap[key].taxableAmount = Number((hMap[key].taxableAmount + itemTaxable).toFixed(2));
          hMap[key].taxAmount = Number((hMap[key].taxAmount + itemTax).toFixed(2));
          if (isInterState) {
            hMap[key].igst = Number((hMap[key].igst + itemTax).toFixed(2));
          } else {
            hMap[key].cgst = Number((hMap[key].cgst + itemTax / 2).toFixed(2));
            hMap[key].sgst = Number((hMap[key].sgst + itemTax / 2).toFixed(2));
          }
          hMap[key].totalAmount = Number((hMap[key].totalAmount + Number(it.total || 0)).toFixed(2));
        }
        return Object.values(hMap);
      })();

  const receivedVal =
    invoice?.paidAmount !== undefined
      ? Number(invoice.paidAmount)
      : invoice?.received !== undefined
      ? Number(invoice.received)
      : paymentStatus === "PAID"
      ? netPayableVal
      : 0;

  const balanceDueVal =
    invoice?.balanceDue !== undefined
      ? Number(invoice.balanceDue)
      : invoice?.outstandingBalance !== undefined
      ? Number(invoice.outstandingBalance)
      : Math.max(0, netPayableVal - receivedVal);

  const formattedDate = () => {
    const raw = invoice?.createdAt || invoice?.date || invoice?.invoiceDate;
    if (!raw) return new Date().toLocaleDateString("en-IN");
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return String(raw);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return String(raw);
    }
  };

  const invNumber = invoice?.invoiceNumber || invoice?.billNumber || `${settings.invoicePrefix || "INV-2026-"}0001`;

  const customerObj = {
    name: invoice?.customer?.name || invoice?.customerName || "Walk-in Retail Customer",
    phone: invoice?.customer?.phone || invoice?.mobileNumber || "9876543210",
    address: invoice?.customer?.address || invoice?.customerAddress || "123 Commercial Plaza, Bengaluru",
    gstin: invoice?.customer?.gstin || "33ABCDE1234F1Z5",
    state: invoice?.customer?.state || settings.state || "Tamil Nadu",
  };

  // UPI payment QR URL
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId || "bilzet@hdfcbank")}&pn=${encodeURIComponent(settings.shopName || "BILZET")}&am=${grandTotalVal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invNumber)}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiPayUrl)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Standard high-fidelity browser PDF print dialog
    window.print();
  };

  // Font family resolution
  const activeFontFamily = settings.fontFamily || "Inter, system-ui, sans-serif";

  // Border radius resolution
  const getBorderRadiusClass = () => {
    if (settings.borderStyle === "crisp") return "rounded-sm";
    if (settings.borderStyle === "subtle") return "rounded-lg";
    if (settings.borderStyle === "double") return "rounded-none border-4 border-double";
    return "rounded-2xl"; // default rounded
  };

  return (
    <div
      className={`${
        isModal
          ? "fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static"
          : "w-full"
      }`}
    >
      <div
        className={`bg-white max-w-4xl w-full overflow-hidden relative flex flex-col my-auto border transition-all ${
          isModal ? "rounded-3xl shadow-2xl border-slate-300 print:border-none print:shadow-none print:rounded-none" : "rounded-2xl shadow-md border-slate-200"
        }`}
      >
        {/* ══════════════════════════════════════════════════
            TOP ACTION BAR (Hidden in print)
        ══════════════════════════════════════════════════ */}
        {showActions && (
          <div className="bg-slate-900 text-white px-5 sm:px-6 py-3 flex items-center justify-between print:hidden shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {settings.invoiceTitle || "TAX INVOICE"} &middot; {invNumber}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition active:scale-95 cursor-pointer"
                title="Print Invoice (A4 Standard)"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 cursor-pointer"
                title="Download / Save as PDF"
              >
                <Download size={14} />
                <span>PDF</span>
              </button>

              {isModal && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition ml-1"
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            PRINTABLE A4 INVOICE SHEET (MASTER DASHBOARD DESIGN)
        ══════════════════════════════════════════════════ */}
        <div
          ref={printRef}
          id="printable-tax-invoice"
          style={{
            fontFamily: activeFontFamily,
            borderColor: activeTheme.border,
          }}
          className={`relative bg-white text-slate-800 text-xs overflow-hidden p-5 sm:p-8 space-y-4 border-2 transition-all ${getBorderRadiusClass()} print:border-none print:p-6 print:m-0`}
        >
          {/* ── 1. Corner Artwork: Top-Right Arc & Bottom-Left Triangles (Master Dashboard Design) ── */}
          {settings.headerStyle !== "minimal" && (
            <>
              {/* Top-Right Corner SVG Arc */}
              <div className="absolute top-0 right-0 w-28 h-28 sm:w-36 sm:h-36 overflow-hidden pointer-events-none z-0">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <circle
                    cx="120"
                    cy="0"
                    r="95"
                    fill="none"
                    stroke={activeTheme.primary}
                    strokeWidth="18"
                    opacity="0.95"
                  />
                  <circle cx="120" cy="0" r="60" fill={activeTheme.dark} />
                </svg>
              </div>

              {/* Bottom-Left Corner Artwork Triangles */}
              <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-28 sm:h-28 overflow-hidden pointer-events-none z-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polygon
                    points="0,100 0,60 40,100"
                    fill={activeTheme.border}
                    opacity="0.9"
                  />
                  <polygon
                    points="0,100 0,80 20,100"
                    fill={activeTheme.primary}
                  />
                </svg>
              </div>
            </>
          )}

          {/* ── 2. Background Watermark: Master BILZET Watermark ── */}
          {settings.showWatermark !== false && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
              <span
                className="text-6xl sm:text-8xl font-black uppercase tracking-widest text-slate-300 transform -rotate-30"
                style={{ opacity: 0.08 }}
              >
                {settings.watermarkText || "BILZET"}
              </span>
            </div>
          )}

          {/* ── 3. Header Section (Logo, Title, Brand & Status Badge) ── */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            {/* Left: Company Logo / BZ Avatar */}
            <div className="w-1/3 pt-1">
              {settings.showLogo !== false && (
                settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.shopName || "Company Logo"}
                    className="max-h-12 max-w-[140px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs"
                      style={{ backgroundColor: activeTheme.primary }}
                    >
                      BZ
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block leading-tight">
                        {settings.shopName || "BILZET Retail Mart"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {settings.phone || "+91 88254 54486"}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Center: TAX INVOICE & Company / Owner Name */}
            <div className="w-1/3 text-center">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                {settings.invoiceTitle || "TAX INVOICE"}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-normal mt-0.5">
                {settings.ownerName || settings.shopName || "BILZET Retail Mart"}
              </p>
              {settings.address && (
                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[220px] mx-auto truncate">
                  {settings.address}
                </p>
              )}
            </div>

            {/* Right: BILZET Brand Title & Status Badge */}
            <div className="w-1/3 flex flex-col items-end pr-1 pt-0.5">
              <span
                className="text-xl sm:text-2xl font-black tracking-wider uppercase"
                style={{ color: activeTheme.primary }}
              >
                BILZET
              </span>

              <div className="flex items-center gap-1.5 flex-wrap justify-end mt-1">
                {settings.showPaymentStatus !== false && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-2xs"
                    style={
                      paymentStatus === "PAID"
                        ? { backgroundColor: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" }
                        : paymentStatus === "PARTIALLY PAID"
                        ? { backgroundColor: "#eff6ff", color: "#1e40af", borderColor: "#bfdbfe" }
                        : paymentStatus === "PENDING"
                        ? { backgroundColor: "#fffbeb", color: "#b45309", borderColor: "#fde68a" }
                        : { backgroundColor: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" }
                    }
                  >
                    {paymentStatus}
                  </span>
                )}

                {returnStatus !== "NONE" && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-2xs"
                    style={
                      returnStatus === "RETURNED"
                        ? { backgroundColor: "#fdf4ff", color: "#86198f", borderColor: "#f5d0fe" }
                        : { backgroundColor: "#fff7ed", color: "#c2410c", borderColor: "#ffedd5" }
                    }
                  >
                    {returnStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── 4. Information Dual Cards (Bill To & Document Info) ── */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Left Card: Bill To */}
            <div
              className="border rounded-2xl p-3 sm:p-3.5 bg-white/95 backdrop-blur-xs space-y-1.5 text-xs text-slate-700 shadow-2xs"
              style={{ borderColor: activeTheme.border }}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  Bill To
                </span>
                {customerObj.gstin && settings.showCustomerGstin !== false && (
                  <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                    GST REGISTERED
                  </span>
                )}
              </div>

              {settings.showCustomerName !== false && (
                <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                  {customerObj.name}
                </p>
              )}

              {settings.showCustomerPhone !== false && customerObj.phone && (
                <p className="text-[11px] text-slate-600 font-mono">
                  Ph: {customerObj.phone}
                </p>
              )}

              {settings.showCustomerAddress !== false && customerObj.address && (
                <p className="text-[10px] text-slate-500 leading-tight">
                  {customerObj.address}
                </p>
              )}

              <div className="flex items-center gap-3 text-[10px] text-slate-600 pt-0.5">
                {settings.showCustomerGstin !== false && customerObj.gstin && (
                  <p>
                    <span className="font-semibold text-slate-800">GSTIN:</span>{" "}
                    <span className="font-mono">{customerObj.gstin}</span>
                  </p>
                )}
                {settings.showCustomerState !== false && customerObj.state && (
                  <p>
                    <span className="font-semibold text-slate-800">State:</span>{" "}
                    <span>{customerObj.state}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right Card: Document Info */}
            <div
              className="border rounded-2xl p-3 sm:p-3.5 bg-white/95 backdrop-blur-xs space-y-1.5 text-xs text-slate-700 shadow-2xs"
              style={{ borderColor: activeTheme.border }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Document No:</span>
                <span
                  className="font-mono font-bold text-xs"
                  style={{ color: activeTheme.primary }}
                >
                  {invNumber}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Date:</span>
                <span className="font-mono text-slate-700 text-xs">
                  {formattedDate()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Sale:</span>
                <span className="font-medium text-slate-800 text-xs">
                  {customerObj.gstin ? "B2B" : "B2C"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Place of Supply:</span>
                <span className="font-medium text-slate-800 text-xs">
                  {settings.stateCode || "33"}-{settings.state || "Tamil Nadu"}
                </span>
              </div>
            </div>
          </div>

          {/* ── 5. Master Items Table ── */}
          <div
            className="relative z-10 border rounded-xl overflow-hidden shadow-2xs"
            style={{ borderColor: activeTheme.tableBorder }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead
                  className="font-bold text-[11px] sticky top-0 z-10"
                  style={{
                    backgroundColor: activeTheme.light,
                    color: activeTheme.dark,
                  }}
                >
                  <tr>
                    {settings.showItemNumber !== false && (
                      <th
                        className="py-2.5 px-2 text-center border-r w-[5%]"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        #
                      </th>
                    )}
                    {settings.showItemName !== false && (
                      <th
                        className="py-2.5 px-3 text-left border-r"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        Item Description
                      </th>
                    )}
                    {settings.showHsn !== false && (
                      <th
                        className="py-2.5 px-2 text-center border-r w-[12%]"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        HSN/SAC
                      </th>
                    )}
                    {settings.showQuantity !== false && (
                      <th
                        className="py-2.5 px-2 text-center border-r w-[10%]"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        Qty
                      </th>
                    )}
                    {settings.showRate !== false && (
                      <th
                        className="py-2.5 px-2 text-center border-r w-[12%]"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        Rate ({settings.currencySymbol || "₹"})
                      </th>
                    )}
                    {settings.showGstPercent !== false && (
                      <th
                        className="py-2.5 px-2 text-center border-r w-[8%]"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        GST
                      </th>
                    )}
                    {settings.showTaxableAmount !== false && (
                      <th
                        className="py-2.5 px-2.5 text-right border-r w-[13%]"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        Taxable
                      </th>
                    )}
                    {settings.showTotal !== false && (
                      <th
                        className="py-2.5 px-3 text-right w-[14%]"
                        style={{ borderColor: activeTheme.tableBorder }}
                      >
                        Total ({settings.currencySymbol || "₹"})
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody
                  className="divide-y bg-white text-slate-800"
                  style={{ borderColor: activeTheme.tableBorder }}
                >
                  {items.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/70 transition"
                    >
                      {settings.showItemNumber !== false && (
                        <td
                          className="py-2 px-2 text-center border-r text-slate-500 font-mono text-[11px]"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          {idx + 1}
                        </td>
                      )}
                      {settings.showItemName !== false && (
                        <td
                          className="py-2 px-3 border-r font-medium text-slate-900"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          <p className="font-semibold text-slate-900 leading-tight">
                            {item.name}
                          </p>
                          {settings.showItemCode !== false && item.code && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {item.code}
                            </p>
                          )}
                        </td>
                      )}
                      {settings.showHsn !== false && (
                        <td
                          className="py-2 px-2 text-center border-r font-mono text-slate-600 text-[11px]"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          {item.hsn}
                        </td>
                      )}
                      {settings.showQuantity !== false && (
                        <td
                          className="py-2 px-2 text-center border-r font-bold text-slate-800 font-mono"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          <div>{item.qty} {settings.showUnit !== false && item.unit ? item.unit : ""}</div>
                          {item.returnedQuantity > 0 && (
                            <span className="text-[9px] font-normal text-rose-600 block">
                              -{item.returnedQuantity} ret.
                            </span>
                          )}
                        </td>
                      )}
                      {settings.showRate !== false && (
                        <td
                          className="py-2 px-2 text-center border-r font-mono text-slate-700"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          {settings.currencySymbol || "₹"}
                          {Number(item.rate).toFixed(2)}
                        </td>
                      )}
                      {settings.showGstPercent !== false && (
                        <td
                          className="py-2 px-2 text-center border-r font-medium text-slate-700 text-[11px]"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          <div>{item.gst}%</div>
                          {item.gstAdjustment > 0 && (
                            <span className="text-[9px] font-normal text-amber-600 block">
                              -₹{item.gstAdjustment.toFixed(1)} adj
                            </span>
                          )}
                        </td>
                      )}
                      {settings.showTaxableAmount !== false && (
                        <td
                          className="py-2 px-2.5 text-right border-r font-mono text-slate-800"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          {settings.currencySymbol || "₹"}
                          {Number(item.taxable).toFixed(2)}
                        </td>
                      )}
                      {settings.showTotal !== false && (
                        <td
                          className="py-2 px-3 text-right font-mono font-bold text-slate-900"
                          style={{ borderColor: activeTheme.tableBorder }}
                        >
                          {settings.currencySymbol || "₹"}
                          {Number(item.total).toFixed(2)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 5.1 HSN/SAC Tax Summary Table (Indian GST Requirement) ── */}
          {settings.showHsnSummary !== false && hsnSummaryData && hsnSummaryData.length > 0 && (
            <div className="relative z-10 pt-2 pb-1">
              <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: activeTheme.tableBorder }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className="border-b text-[10px] uppercase font-bold tracking-wider"
                      style={{
                        backgroundColor: activeTheme.tableHeaderBg,
                        color: activeTheme.tableHeaderColor,
                        borderColor: activeTheme.tableBorder,
                      }}
                    >
                      <th className="py-2 px-3 border-r" style={{ borderColor: activeTheme.tableBorder }}>HSN / SAC</th>
                      <th className="py-2 px-3 text-right border-r" style={{ borderColor: activeTheme.tableBorder }}>Taxable Value</th>
                      {!isInterState ? (
                        <>
                          <th className="py-2 px-2 text-right border-r" style={{ borderColor: activeTheme.tableBorder }}>CGST</th>
                          <th className="py-2 px-2 text-right border-r" style={{ borderColor: activeTheme.tableBorder }}>SGST</th>
                        </>
                      ) : (
                        <th className="py-2 px-2 text-right border-r" style={{ borderColor: activeTheme.tableBorder }}>IGST</th>
                      )}
                      <th className="py-2 px-3 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                    {hsnSummaryData.map((h, hIdx) => (
                      <tr key={hIdx} className="hover:bg-slate-50/60 transition">
                        <td className="py-1.5 px-3 border-r font-medium text-slate-800" style={{ borderColor: activeTheme.tableBorder }}>
                          {h.hsn} <span className="text-[10px] text-slate-400 font-sans">({h.gstRate}%)</span>
                        </td>
                        <td className="py-1.5 px-3 text-right border-r text-slate-800" style={{ borderColor: activeTheme.tableBorder }}>
                          ₹{Number(h.taxableAmount).toFixed(2)}
                        </td>
                        {!isInterState ? (
                          <>
                            <td className="py-1.5 px-2 text-right border-r text-slate-700" style={{ borderColor: activeTheme.tableBorder }}>
                              ₹{Number(h.cgst).toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 text-right border-r text-slate-700" style={{ borderColor: activeTheme.tableBorder }}>
                              ₹{Number(h.sgst).toFixed(2)}
                            </td>
                          </>
                        ) : (
                          <td className="py-1.5 px-2 text-right border-r text-slate-700" style={{ borderColor: activeTheme.tableBorder }}>
                            ₹{Number(h.igst).toFixed(2)}
                          </td>
                        )}
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                          ₹{Number(h.taxAmount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 6. Amount in Words & Totals Breakdown (Right-Aligned) ── */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-start">
            {/* Left: Amount in Words */}
            <div className="space-y-2">
              {settings.showAmountInWords !== false && (
                <div
                  className="p-3 rounded-xl border bg-slate-50/50 space-y-1"
                  style={{ borderColor: activeTheme.tableBorder }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Amount in Words:
                  </p>
                  <p className="font-semibold text-slate-900 text-xs italic">
                    {numberToWordsINR(grandTotalVal)}
                  </p>
                </div>
              )}

              {/* Payment Instructions if enabled */}
              {settings.paymentInstructions && (
                <div className="text-[10px] text-slate-500 italic px-1">
                  Note: {settings.paymentInstructions}
                </div>
              )}
            </div>

            {/* Right: Calculations & Totals (Matching Dashboard Bill) */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-1 text-xs">
                {/* Subtotal */}
                {settings.showSubtotal !== false && (
                  <div className="flex justify-between py-1 text-slate-700">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-mono font-bold text-slate-900">
                      {settings.currencySymbol || "₹"}
                      {subtotalVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* Discount */}
                {settings.showDiscountTotal !== false && discountTotalVal > 0 && (
                  <div className="flex justify-between py-1 text-emerald-700">
                    <span className="font-medium">Discount</span>
                    <span className="font-mono font-bold">
                      -{settings.currencySymbol || "₹"}
                      {discountTotalVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* CGST */}
                {settings.showCgstSgst !== false && !isInterState && cgstVal > 0 && (
                  <div className="flex justify-between py-1 border-t border-dashed border-slate-300 text-slate-700">
                    <span className="font-medium">CGST</span>
                    <span className="font-mono font-bold text-slate-900">
                      {settings.currencySymbol || "₹"}
                      {cgstVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* SGST */}
                {settings.showCgstSgst !== false && !isInterState && sgstVal > 0 && (
                  <div className="flex justify-between py-1 text-slate-700">
                    <span className="font-medium">SGST</span>
                    <span className="font-mono font-bold text-slate-900">
                      {settings.currencySymbol || "₹"}
                      {sgstVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* IGST (Interstate) */}
                {settings.showIgst !== false && isInterState && igstVal > 0 && (
                  <div className="flex justify-between py-1 border-t border-dashed border-slate-300 text-slate-700">
                    <span className="font-medium">IGST</span>
                    <span className="font-mono font-bold text-slate-900">
                      {settings.currencySymbol || "₹"}
                      {igstVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* Round Off Adjustment (Req 5, 9, 10) */}
                {roundOffVal !== 0 && (
                  <div className="flex justify-between py-1 text-slate-600 text-xs font-mono">
                    <span className="font-medium font-sans">Round Off Adjustment</span>
                    <span className="font-bold">
                      {roundOffVal > 0 ? "+" : ""}
                      {settings.currencySymbol || "₹"}
                      {Number(roundOffVal).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Original Grand Total */}
                {settings.showGrandTotal !== false && (
                  <div
                    className="flex justify-between py-1 border-t text-xs text-slate-700"
                    style={{ borderColor: activeTheme.tableBorder }}
                  >
                    <span className="font-medium">Original Invoice Total</span>
                    <span className="font-mono font-bold text-slate-900">
                      {settings.currencySymbol || "₹"}
                      {originalGrandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* Returned Goods Adjustment */}
                {returnedAmountVal > 0 && (
                  <div className="flex justify-between py-1 text-rose-600 text-xs">
                    <span className="font-medium">Returned Goods Credit</span>
                    <span className="font-mono font-bold">
                      -{settings.currencySymbol || "₹"}
                      {returnedAmountVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* GST Adjustment */}
                {gstAdjustmentVal > 0 && (
                  <div className="flex justify-between py-1 text-amber-700 text-xs">
                    <span className="font-medium">GST Adjustment (Credit)</span>
                    <span className="font-mono font-bold">
                      -{settings.currencySymbol || "₹"}
                      {gstAdjustmentVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* Net Payable Amount */}
                <div
                  className="flex justify-between py-1.5 border-t-2 text-sm"
                  style={{ borderColor: activeTheme.primary }}
                >
                  <span className="font-black text-slate-900">Net Payable Amount</span>
                  <span className="font-mono font-black text-slate-900">
                    {settings.currencySymbol || "₹"}
                    {netPayableVal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {/* Received */}
                {settings.showReceivedAmount !== false && (
                  <div className="flex justify-between py-1 text-slate-700 text-xs">
                    <span className="font-medium">Payments Received</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {settings.currencySymbol || "₹"}
                      {receivedVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {/* Outstanding Balance */}
                {settings.showBalanceDue !== false && (
                  <div className="flex justify-between py-1 border-t border-dashed border-slate-300 text-xs">
                    <span className="font-bold text-slate-900">Outstanding Balance</span>
                    <span
                      className={`font-mono font-bold ${
                        balanceDueVal > 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {settings.currencySymbol || "₹"}
                      {balanceDueVal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 7. Payment Information & Bank Settlement / UPI QR ── */}
          {settings.showBankDetails !== false && (
            <div
              className="relative z-10 p-3.5 rounded-xl border flex items-center justify-between text-xs text-slate-700 shadow-2xs"
              style={{
                backgroundColor: activeTheme.light,
                borderColor: activeTheme.border,
              }}
            >
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-wider text-slate-900 text-[11px] flex items-center gap-1.5">
                  <Building2 size={13} style={{ color: activeTheme.primary }} />
                  <span>Bank Settlement &amp; Payment Details</span>
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] pt-0.5">
                  <p>
                    <span className="font-semibold text-slate-800">Bank:</span>{" "}
                    {settings.bankName || "HDFC Bank Ltd"}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">A/C No:</span>{" "}
                    <span className="font-mono">{settings.accountNumber || "50200012345678"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">IFSC:</span>{" "}
                    <span className="font-mono">{settings.ifsc || "HDFC0001234"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">UPI ID:</span>{" "}
                    <span className="font-mono">{settings.upiId || "bilzet@hdfcbank"}</span>
                  </p>
                </div>
              </div>

              {settings.showQrCode !== false && (
                <div className="text-center shrink-0 pl-3">
                  <img
                    src={qrImgSrc}
                    alt="UPI Payment QR"
                    className="w-16 h-16 rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs"
                  />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                    Scan &amp; Pay
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── 8. Footer: Terms, Notes & Authorized Signatory ── */}
          <div className="relative z-10 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end border-t border-slate-100">
            {/* Left: Notes & Terms */}
            <div className="space-y-2">
              {settings.showNotes !== false && settings.notes && (
                <div className="text-xs text-slate-600">
                  <p className="font-bold text-slate-900 text-[11px]">Notes:</p>
                  <p className="text-[10px] leading-relaxed text-slate-500">{settings.notes}</p>
                </div>
              )}

              {settings.showTerms !== false && settings.terms && (
                <div className="text-xs text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-900 text-[11px]">Terms &amp; Conditions:</p>
                  <p className="text-[10px] leading-relaxed whitespace-pre-line text-slate-500">
                    {settings.terms}
                  </p>
                </div>
              )}

              {settings.showThankYou !== false && settings.thankYouMessage && (
                <p className="text-[10px] font-semibold text-slate-700 pt-1">
                  {settings.thankYouMessage}
                </p>
              )}
            </div>

            {/* Right: Authorized Signature */}
            {settings.showSignatory !== false && (
              <div className="text-right space-y-2">
                <div className="h-10" />
                <div className="border-t border-slate-300 w-44 ml-auto pt-1">
                  <p className="text-xs font-bold text-slate-900">
                    {settings.authorizedPerson || settings.ownerName || "Karthi Kevan"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {settings.signatoryLabel || "Authorized Signatory"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── 9. Bottom Brand Watermark Line ── */}
          <div className="relative z-10 text-center pt-3 text-[10px] text-slate-400 font-medium border-t border-slate-100/60">
            Generated by BILZET &middot; MASTER TAX INVOICE
          </div>

          {/* ── 10. Audit Trail & Lifecycle Event Log (On-Screen View Only) ── */}
          {((invoice?.auditLogs && invoice.auditLogs.length > 0) ||
            (invoice?.payments && invoice.payments.length > 0) ||
            (invoice?.returns && invoice.returns.length > 0)) && (
            <div className="relative z-10 pt-4 mt-3 border-t border-slate-200 print:hidden text-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-600" />
                  Audit Trail &amp; Invoice Lifecycle History
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Immutable Audit Records
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {/* Creation Event */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start justify-between text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-900">Invoice Created: </span>
                    <span className="text-blue-600 font-mono font-bold">INV #{invNumber}</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">
                      Initial Total: ₹{originalGrandTotal.toFixed(2)} &middot; Mode: {invoice?.paymentMethod || "CASH"} &middot; Status: {invoice?.paymentStatus || "UNPAID"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{formattedDate()}</span>
                </div>

                {/* Payments */}
                {(invoice?.payments || []).map((pay, pIdx) => (
                  <div key={pay.id || pIdx} className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start justify-between text-[11px]">
                    <div>
                      <span className="font-semibold text-emerald-900">Payment Recorded: </span>
                      <span className="font-mono font-bold text-emerald-700">₹{Number(pay.amount || 0).toFixed(2)}</span>
                      <span className="text-slate-500 text-[10px] block mt-0.5">
                        Method: {pay.method || "CASH"} {pay.note ? `&middot; ${pay.note}` : ""}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(pay.createdAt || Date.now()).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                ))}

                {/* Returns */}
                {(invoice?.returns || []).map((ret, rIdx) => (
                  <div key={ret.id || rIdx} className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 flex items-start justify-between text-[11px]">
                    <div>
                      <span className="font-semibold text-rose-900">Return &amp; Credit Note Issued: </span>
                      <span className="font-mono font-bold text-rose-700">₹{Number(ret.totalAmount || 0).toFixed(2)}</span>
                      <span className="text-slate-500 text-[10px] block mt-0.5">
                        Ref: {ret.returnNumber} &middot; Reason: {ret.reason || "Customer Return"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(ret.createdAt || Date.now()).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { TaxInvoice as InvoiceTemplate };
