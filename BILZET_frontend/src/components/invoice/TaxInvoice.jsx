import { useRef, useState } from "react";
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
  Clock,
  CreditCard,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  { id: "trust_blue", label: "Trust Blue", plan: "FREE", isFree: true, primary: "#0F2747", secondary: "#1E3A8A", light: "#F0F7FF", dark: "#0A1D36", border: "#CBD5E1", tableBorder: "#E2E8F0" },
  { id: "growth_green", label: "Growth Green", plan: "FREE", isFree: true, primary: "#16a34a", secondary: "#22c55e", light: "#dcfce7", dark: "#14532d", border: "#86efac", tableBorder: "#bbf7d0" },
  { id: "professional_slate", label: "Professional Slate", plan: "FREE", isFree: true, primary: "#475569", secondary: "#64748b", light: "#f1f5f9", dark: "#0f172a", border: "#cbd5e1", tableBorder: "#e2e8f0" },
  { id: "indigo_focus", label: "Indigo Focus", plan: "PRO", isFree: false, primary: "#4f46e5", secondary: "#6366f1", light: "#e0e7ff", dark: "#312e81", border: "#a5b4fc", tableBorder: "#c7d2fe" },
  { id: "calm_teal", label: "Calm Teal", plan: "PRO", isFree: false, primary: "#0d9488", secondary: "#14b8a6", light: "#ccfbf1", dark: "#134e4a", border: "#5eead4", tableBorder: "#99f6e4" },
  { id: "retail_orange", label: "Retail Orange", plan: "PRO", isFree: false, primary: "#ea580c", secondary: "#f97316", light: "#ffedd5", dark: "#7c2d12", border: "#fdba74", tableBorder: "#fed7aa" },
  { id: "bold_ruby", label: "Bold Ruby", plan: "PRO", isFree: false, primary: "#e11d48", secondary: "#f43f5e", light: "#ffe4e6", dark: "#881337", border: "#fda4af", tableBorder: "#fecdd3" },
  { id: "premium_purple", plan: "PRO", isFree: false, primary: "#9333ea", secondary: "#a855f7", light: "#f3e8ff", dark: "#581c87", border: "#d8b4fe", tableBorder: "#e9d5ff" },
  { id: "fresh_cyan", label: "Fresh Cyan", plan: "PRO", isFree: false, primary: "#0891b2", secondary: "#06b6d4", light: "#cffafe", dark: "#164e63", border: "#67e8f9", tableBorder: "#a5f3fc" },
  { id: "luxury_gold", label: "Luxury Gold", plan: "PREMIUM", isFree: false, primary: "#b45309", secondary: "#d97706", light: "#fef3c7", dark: "#451a03", border: "#fcd34d", tableBorder: "#fde68a" },
  { id: "executive_navy", label: "Executive Navy", plan: "PREMIUM", isFree: false, primary: "#0F2747", secondary: "#1E3A8A", light: "#F0F7FF", dark: "#0B1D36", border: "#93c5fd", tableBorder: "#bfdbfe" },
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
  { id: "professional_navy", name: "BILZET Executive Navy", description: "Clean brand header with horizontal strip", plan: "FREE" },
  { id: "minimal", name: "Minimal Clean", description: "Sleek modern border with subtle accent line", plan: "PRO" },
  { id: "bold_banner", name: "Bold Accent Banner", description: "Full-width colored header with inverted typography", plan: "PREMIUM" },
  { id: "executive", name: "Executive Dual Split", description: "High-contrast split branding layout", plan: "PREMIUM" },
];

export const BORDER_STYLES = [
  { id: "crisp", name: "Classic Crisp (4px)", plan: "FREE" },
  { id: "rounded", name: "Modern Rounded (12px)", plan: "FREE" },
  { id: "subtle", name: "Subtle Soft (8px)", plan: "PRO" },
  { id: "double", name: "Executive Double Line", plan: "PREMIUM" },
];

export const INVOICE_TEMPLATES = [
  { id: "modern", name: "BILZET Professional Navy", isFree: true, accent: "#0F2747", tag: "FREE" },
  { id: "minimal", name: "Minimal Clean", isFree: false, accent: "#475569", tag: "PRO" },
  { id: "bold_banner", name: "Bold Accent Banner", isFree: false, accent: "#7c3aed", tag: "PREMIUM" },
  { id: "executive", name: "Executive Dual Split", isFree: false, accent: "#0F2747", tag: "PREMIUM" },
];

export const DEFAULT_INVOICE_SETTINGS = {
  invoiceTitle: "TAX INVOICE",
  invoicePrefix: "INV-2026-",
  invoiceNumberDigits: 4,
  dateFormat: "DD/MM/YYYY",
  currency: "INR",
  currencySymbol: "₹",

  // Business Information
  shopName: "BILZET Retail Mart",
  tagline: "Smart Billing for Smarter Businesses",
  ownerName: "Store Manager",
  phone: "+91 98765 43210",
  email: "billing@bilzet.app",
  address: "123 Commercial Plaza, Main Market",
  city: "Bengaluru",
  state: "Tamil Nadu",
  stateCode: "33",
  pincode: "600001",
  gstin: "33AAAAA0000A1Z5",
  fssai: "",
  logoUrl: "",
  showLogo: true,
  showLogoOnInvoices: true,
  signatureUrl: "",
  showSignatory: true,
  showSignatureOnInvoices: true,

  // Table & Columns
  showItemNumber: true,
  showItemName: true,
  showHsn: true,
  showQuantity: true,
  showRate: true,
  showItemDiscount: true,
  showGstPercent: true,
  showTotal: true,
  showWatermark: true,
  watermarkText: "BILZET",

  // Totals Section
  showSubtotal: true,
  showDiscountTotal: true,
  showCgstSgst: true,
  showIgst: true,
  showGrandTotal: true,
  showAmountInWords: true,

  // Bank & UPI
  showBankDetails: true,
  showQrCode: true,
  bankName: "HDFC Bank Ltd",
  accountHolder: "BILZET Retail Mart",
  accountNumber: "50200012345678",
  ifsc: "HDFC0001234",
  upiId: "bilzet@hdfcbank",

  // Notes & Footer
  notes: "Thank you for your business! Please visit us again.",
  terms: "1. Goods once sold are subject to standard return policy within 7 days.\n2. Warranty claims as per manufacturer terms.\n3. All disputes subject to local jurisdiction.",
  signatoryLabel: "Authorized Signatory",
  authorizedPerson: "Authorized Signatory",
};

/**
 * BILZET Professional Tax Invoice Template
 * 
 * Clean, precisely aligned, BILZET-branded invoice template with:
 * - BILZET logo & store information header
 * - Horizontal GSTIN/FSSAI/State strip
 * - "TAX INVOICE" on left, aligned invoice info & payment status card on right
 * - Compact Customer Details panel (Customer Name & Customer Number ONLY)
 * - Itemized table with dark navy-blue header & subtle background watermark
 * - Notes & payment details on left, bill summary on right
 * - Clean footer with BILZET branding
 * - Real downloadable PDF export & native print support
 */
// Helper to normalize relative /api asset URLs to full backend URLs
export const resolveAssetUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }
  const backendBase = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL)
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "")
    : "http://localhost:5000";
  return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
};

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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [signatureLoadFailed, setSignatureLoadFailed] = useState(false);

  // Merge shopSettings with customizationSettings and fallback defaults
  const cleanShopSettings = shopSettings?.settings ? { ...shopSettings, ...shopSettings.settings } : (shopSettings || {});
  const cleanCustomizationSettings = customizationSettings?.settings ? { ...customizationSettings, ...customizationSettings.settings } : (customizationSettings || {});

  const settings = {
    ...DEFAULT_INVOICE_SETTINGS,
    ...cleanShopSettings,
    ...cleanCustomizationSettings,
  };

  // Resolve branding URLs from settings, shopSettings, or invoice business relation
  const rawLogoUrl =
    settings.logoUrl ||
    cleanShopSettings?.logoUrl ||
    shopSettings?.settings?.logoUrl ||
    invoice?.business?.logoUrl ||
    "";

  const rawSignatureUrl =
    settings.signatureUrl ||
    cleanShopSettings?.signatureUrl ||
    shopSettings?.settings?.signatureUrl ||
    invoice?.business?.signatureUrl ||
    "";

  const resolvedLogoUrl = resolveAssetUrl(rawLogoUrl);
  const resolvedSignatureUrl = resolveAssetUrl(rawSignatureUrl);

  // Independent visibility toggles
  const isLogoEnabled =
    settings.showLogoOnInvoices !== undefined
      ? Boolean(settings.showLogoOnInvoices)
      : (cleanShopSettings?.showLogoOnInvoices !== undefined
          ? Boolean(cleanShopSettings.showLogoOnInvoices)
          : (settings.showLogo !== undefined ? Boolean(settings.showLogo) : Boolean(resolvedLogoUrl)));

  // Detect if rendering a Quotation vs an Invoice
  const isQuotationDoc = Boolean(
    invoice?.quotationNumber ||
    invoice?.documentType === "quotation" ||
    settings.documentType === "quotation"
  );

  const isSignatureEnabled = isQuotationDoc
    ? (settings.showSignatureOnQuotations !== undefined
        ? Boolean(settings.showSignatureOnQuotations)
        : (cleanShopSettings?.showSignatureOnQuotations !== undefined
            ? Boolean(cleanShopSettings.showSignatureOnQuotations)
            : Boolean(resolvedSignatureUrl)))
    : (settings.showSignatureOnInvoices !== undefined
        ? Boolean(settings.showSignatureOnInvoices)
        : (cleanShopSettings?.showSignatureOnInvoices !== undefined
            ? Boolean(cleanShopSettings.showSignatureOnInvoices)
            : (settings.showSignatory !== undefined ? Boolean(settings.showSignatory) : Boolean(resolvedSignatureUrl))));

  const shouldDisplayLogo = isLogoEnabled && Boolean(resolvedLogoUrl) && !logoLoadFailed;
  const shouldDisplaySignature = isSignatureEnabled && Boolean(resolvedSignatureUrl) && !signatureLoadFailed;

  // Sanitize and clean document title
  const rawTitle = isQuotationDoc
    ? (settings.quotationTitle || "QUOTATION / ESTIMATE")
    : (settings.invoiceTitle || "TAX INVOICE");
  const displayTitle =
    rawTitle.includes("TAX INVOICESUPER") || rawTitle.includes("SUPER TAX INVOICE")
      ? "TAX INVOICE"
      : rawTitle.trim() || (isQuotationDoc ? "QUOTATION / ESTIMATE" : "TAX INVOICE");

  // Dynamic Store Information from currently selected store / settings
  const storeName =
    invoice?.business?.name ||
    shopSettings?.shopName ||
    shopSettings?.storeName ||
    settings?.shopName ||
    "BILZET Retail Mart";

  const storeTagline =
    shopSettings?.tagline ||
    shopSettings?.storeTagline ||
    settings?.tagline ||
    "Smart Billing for Smarter Businesses";

  const storeAddress =
    invoice?.business?.address ||
    shopSettings?.address ||
    shopSettings?.storeLocation ||
    settings?.address ||
    "123 Commercial Plaza, Main Market";

  const storeCity =
    shopSettings?.city ||
    settings?.city ||
    "";

  const storeState =
    invoice?.business?.state ||
    shopSettings?.state ||
    settings?.state ||
    "Tamil Nadu";

  const storeStateCode =
    invoice?.business?.stateCode ||
    shopSettings?.stateCode ||
    settings?.stateCode ||
    "33";

  const storePinCode =
    shopSettings?.pincode ||
    shopSettings?.pinCode ||
    settings?.pincode ||
    "";

  const cityStatePin = [
    storeCity,
    storeState,
    storePinCode ? `PIN: ${storePinCode}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const gstin =
    invoice?.business?.gstin ||
    shopSettings?.gstin ||
    settings?.gstin ||
    "33AAAAA0000A1Z5";

  const fssai =
    shopSettings?.fssai ||
    settings?.fssai ||
    "";

  // Parse items safely with calculations
  const rawItems = invoice?.items && invoice.items.length > 0 ? invoice.items : null;

  const items = rawItems
    ? rawItems.map((item, idx) => {
        const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty || 1));
        const rate = Number(item.rate !== undefined ? item.rate : (item.price || item.sellingPrice || item.unitPrice || 0));
        const gst = Number(
          item.gstRate !== undefined
            ? item.gstRate
            : item.taxPercent !== undefined
            ? item.taxPercent
            : item.taxRate !== undefined
            ? item.taxRate
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
            : item.totalPrice !== undefined
            ? item.totalPrice
            : taxable + taxAmt
        );

        return {
          id: item.id || item._id || idx + 1,
          name: item.name || item.productName || item.product?.name || "Sample Product",
          code: item.code || item.sku || item.product?.code || `SKU-${idx + 1}`,
          hsn: item.hsn || item.hsnCode || item.sku || "1904",
          unit: item.unit || "pcs",
          qty,
          originalQuantity: Number(item.originalQuantity || qty),
          returnedQuantity: Number(item.returnedQuantity || 0),
          rate,
          discount,
          gst,
          taxable,
          taxAmt,
          total,
          image: item.image || item.imageUrl || item.product?.image || null,
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

  const calculatedSubtotal = items.reduce((acc, i) => acc + (i.rate * i.qty), 0);
  const calculatedDiscount = items.reduce((acc, i) => acc + i.discount, 0);
  const calculatedTaxable = items.reduce((acc, i) => acc + i.taxable, 0);
  const calculatedTax = items.reduce((acc, i) => acc + i.taxAmt, 0);
  const calculatedGrandTotal = items.reduce((acc, i) => acc + i.total, 0);

  const subtotalVal = invoice?.subtotal !== undefined ? Number(invoice.subtotal) : calculatedSubtotal;
  const discountTotalVal = invoice?.discountTotal !== undefined ? Number(invoice.discountTotal) : calculatedDiscount;
  const taxableVal = invoice?.taxableAmount !== undefined ? Number(invoice.taxableAmount) : calculatedTaxable;
  const grandTotalVal = invoice?.grandTotal !== undefined ? Number(invoice.grandTotal) : calculatedGrandTotal;
  const isInterState = invoice?.isInterState || false;
  const totalTaxAmt = invoice?.tax !== undefined ? Number(invoice.tax) : invoice?.taxTotal !== undefined ? Number(invoice.taxTotal) : calculatedTax;

  const cgstVal = invoice?.cgst !== undefined ? Number(invoice.cgst) : (isInterState ? 0 : totalTaxAmt / 2);
  const sgstVal = invoice?.sgst !== undefined ? Number(invoice.sgst) : (isInterState ? 0 : totalTaxAmt / 2);
  const igstVal = invoice?.igst !== undefined ? Number(invoice.igst) : (isInterState ? totalTaxAmt : 0);

  // Authoritative Payment Status
  const rawPaymentStatus = (invoice?.paymentStatus || invoice?.status || "PAID").toUpperCase();
  let paymentStatus = "UNPAID";
  if (rawPaymentStatus === "PAID" || rawPaymentStatus === "COMPLETED") {
    paymentStatus = "PAID";
  } else if (
    rawPaymentStatus === "PARTIALLY_PAID" ||
    rawPaymentStatus === "PARTIALLY PAID" ||
    rawPaymentStatus === "PARTIAL"
  ) {
    paymentStatus = "PARTIALLY PAID";
  } else if (rawPaymentStatus === "PENDING") {
    paymentStatus = "PENDING";
  } else {
    paymentStatus = "UNPAID";
  }

  const roundOffVal = Number(invoice?.roundOff !== undefined ? invoice.roundOff : 0);
  const returnedAmountVal = Number(invoice?.totalReturnedAmount || invoice?.returnedAmount || 0);
  const netPayableVal = Number(
    invoice?.total !== undefined
      ? invoice.total
      : invoice?.netPayable !== undefined
      ? invoice.netPayable
      : Math.max(0, grandTotalVal - returnedAmountVal + roundOffVal)
  );

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

  const invNumber = invoice?.invoiceNumber || invoice?.billNumber || `${settings.invoicePrefix || "INV-2026-"}0001`;

  // Formatted Date & Time
  const formattedDateTime = () => {
    const raw = invoice?.createdAt || invoice?.date || invoice?.invoiceDate;
    if (!raw) {
      const now = new Date();
      return `${now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    }
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return String(raw);
      const datePart = d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${datePart}, ${timePart}`;
    } catch {
      return String(raw);
    }
  };

  // Payment Mode & Order Type
  const paymentMode =
    invoice?.paymentMethod ||
    invoice?.paymentMode ||
    (invoice?.payments && invoice.payments.length > 0 ? invoice.payments[0].method : null) ||
    "CASH";

  const orderType =
    invoice?.orderType ||
    (invoice?.type ? String(invoice.type).toUpperCase() : "Retail Sale / POS");

  const paymentRef =
    invoice?.paymentId ||
    invoice?.transactionId ||
    invoice?.reference ||
    (invoice?.payments && invoice.payments.length > 0 ? invoice.payments[0].id : null) ||
    "";

  // Customer Details: Strictly Customer Name and Customer Number (Phone)
  const customerName =
    invoice?.customer?.name ||
    invoice?.customerName ||
    "Walk-in Retail Customer";

  const customerPhone =
    invoice?.customer?.phone ||
    invoice?.mobileNumber ||
    invoice?.customerPhone ||
    invoice?.phone ||
    "Not Provided";

  // UPI payment QR URL using actual configured UPI ID & store details
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId || "bilzet@hdfcbank")}&pn=${encodeURIComponent(storeName)}&am=${netPayableVal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invNumber)}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiPayUrl)}`;

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  // Real PDF Download (Generates actual downloadable PDF file)
  const handleDownloadPdf = async () => {
    if (!printRef.current || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const element = printRef.current;
      // Preload all images before capturing canvas to ensure logo & signature render flawlessly in PDF
      const images = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      const safeInvNum = (invNumber || "TAX_INVOICE").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`BILZET_Invoice_${safeInvNum}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      className={`${
        isModal
          ? "fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 print:p-0 print:bg-white print:static"
          : "w-full"
      }`}
    >
      <div
        className={`bg-white max-w-[850px] w-full overflow-hidden relative flex flex-col my-auto border transition-all ${
          isModal
            ? "rounded-2xl shadow-2xl border-slate-300 print:border-none print:shadow-none print:rounded-none max-h-[94vh]"
            : "rounded-xl shadow-md border-slate-200"
        }`}
      >
        {/* ══════════════════════════════════════════════════
            TOP ACTION BAR (Hidden in print)
        ══════════════════════════════════════════════════ */}
        {showActions && (
          <div className="bg-[#0F2747] text-white px-5 sm:px-6 py-2.5 flex items-center justify-between print:hidden shrink-0 border-b border-slate-800 select-none">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                {settings.invoiceTitle || "TAX INVOICE"} &middot; {invNumber}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition active:scale-95 cursor-pointer"
                title="Print Invoice"
              >
                <Printer size={13} />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 cursor-pointer disabled:opacity-60"
                title="Download official PDF file"
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    <span>Export PDF</span>
                  </>
                )}
              </button>

              {isModal && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition ml-1 cursor-pointer"
                  title="Close Preview"
                >
                  <X size={17} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            PRINTABLE A4 INVOICE SHEET (BILZET BRANDED)
        ══════════════════════════════════════════════════ */}
        <div className={isModal ? "overflow-y-auto flex-1 print:overflow-visible" : "w-full"}>
          <div
            ref={printRef}
            id="printable-tax-invoice"
          className={`@container relative bg-white text-slate-800 text-xs p-5 sm:p-8 space-y-4 print:p-6 print:m-0 print:border-none ${
            settings.paperSize === "Thermal 80mm"
              ? "max-w-[340px] mx-auto text-[11px]"
              : settings.paperSize === "Thermal 58mm"
              ? "max-w-[260px] mx-auto text-[10px]"
              : ""
          }`}
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
            color: "#0F172A",
          }}
        >
          {/* Thermal Layout Centered Logo */}
          {settings.paperSize?.includes("Thermal") && shouldDisplayLogo && (
            <div className="flex justify-center pb-2 border-b border-slate-200">
              <img
                src={resolvedLogoUrl}
                alt={storeName}
                crossOrigin="anonymous"
                className="max-h-12 max-w-[140px] object-contain mx-auto"
                onError={() => setLogoLoadFailed(true)}
              />
            </div>
          )}
          {/* ── 1. Store Information Header & Logo ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
            {/* Left: Store Logo & Information */}
            <div className="flex items-start gap-4">
              <div className="shrink-0 pt-0.5">
                {shouldDisplayLogo ? (
                  <img
                    src={resolvedLogoUrl}
                    alt={storeName}
                    crossOrigin="anonymous"
                    className="h-12 sm:h-14 max-w-[140px] sm:max-w-[180px] object-contain rounded"
                    onError={() => setLogoLoadFailed(true)}
                  />
                ) : (
                  <img
                    src="/assets/bilzet-logo-dark.png"
                    alt="BILZET"
                    className="h-10 sm:h-12 w-auto object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/assets/bilzet-logo-main.png";
                    }}
                  />
                )}
              </div>

              <div className="space-y-0.5 border-l border-slate-200 pl-4">
                <h2 className="text-sm sm:text-base font-extrabold text-[#0F2747] tracking-tight uppercase leading-snug">
                  {storeName}
                </h2>
                {storeTagline && (
                  <p className="text-[10px] text-slate-500 italic font-medium leading-tight">
                    {storeTagline}
                  </p>
                )}
                <p className="text-[11px] text-slate-600 leading-tight">
                  {storeAddress}
                </p>
                {cityStatePin && (
                  <p className="text-[11px] text-slate-600 leading-tight">
                    {cityStatePin}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. Horizontal Information Strip (GSTIN, FSSAI, State) ── */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">GSTIN:</span>
              <span className="font-mono font-bold text-[#0F2747]">{gstin}</span>
            </div>

            {fssai && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">FSSAI:</span>
                <span className="font-mono font-semibold text-slate-800">{fssai}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">State &amp; Code:</span>
              <span className="font-semibold text-slate-800">
                {storeState} {storeStateCode ? `(Code: ${storeStateCode})` : ""}
              </span>
            </div>
          </div>

          {/* ── 3. Invoice Title & Payment Status Header Row ── */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Left: Document Title & Recipient Badge */}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-[#0F2747] tracking-tight uppercase leading-tight truncate">
                {displayTitle}
              </h1>
              <span className="inline-block px-2.5 py-0.5 mt-1 rounded bg-[#EFF6FF] text-[#1E40AF] text-[10px] font-bold uppercase tracking-wider border border-[#BFDBFE]">
                Original for Recipient
              </span>
            </div>

            {/* Right: Payment Status Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border text-center shrink-0 shadow-2xs whitespace-nowrap ${
                paymentStatus === "PAID"
                  ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]"
                  : paymentStatus === "PARTIALLY PAID"
                  ? "bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]"
                  : "bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider">
                {paymentStatus === "PAID" && <CheckCircle2 size={13} />}
                {paymentStatus === "PARTIALLY PAID" && <AlertCircle size={13} />}
                <span>{paymentStatus}</span>
              </div>
              {paymentRef && (
                <div className="text-[9px] font-mono text-slate-500 mt-0.5 truncate max-w-[110px]">
                  Ref: {paymentRef}
                </div>
              )}
            </div>
          </div>

          {/* ── 3B. Aligned Invoice Metadata Card (4 Fields) ── */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs shadow-2xs">
            <div className="grid grid-cols-2 @2xl:grid-cols-4 print:grid-cols-4 gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  Invoice No:
                </span>
                <span className="font-mono font-extrabold text-[#0F2747] text-xs truncate">
                  {invNumber}
                </span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  Date:
                </span>
                <span className="font-mono text-slate-800 text-[11px] truncate">
                  {formattedDateTime()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  Payment:
                </span>
                <span className="font-bold text-slate-900 uppercase text-[11px] truncate">
                  {paymentMode}
                </span>
              </div>

              <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                  Order Type:
                </span>
                <span className="text-slate-800 text-[11px] truncate">
                  {orderType || "Retail Sale / POS"}
                </span>
              </div>
            </div>
          </div>

          {/* ── 4. Customer Details Section (Name & Number ONLY) ── */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 text-xs shadow-2xs space-y-1 @lg:space-y-0 @lg:flex @lg:items-center @lg:justify-between print:space-y-0 print:flex print:items-center print:justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 whitespace-nowrap">
                Customer Name:
              </span>
              <span className="font-bold text-slate-900 truncate">
                {customerName && customerName.trim() ? customerName : "Walk-in Retail Customer"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 whitespace-nowrap">
                Customer Number:
              </span>
              <span className="font-mono font-bold text-slate-900 tracking-wide whitespace-nowrap">
                {customerPhone && customerPhone.trim() ? customerPhone : "+91 98000 00000"}
              </span>
            </div>
          </div>

          {/* ── 5. Itemized Invoice Table with Navy Header & BILZET Watermark ── */}
          <div className="relative border border-[#E2E8F0] rounded-xl overflow-hidden shadow-2xs">
            {/* Subtle BILZET Watermark Centered Behind Table Content */}
            {settings.showWatermark !== false && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                <span
                  className="text-7xl sm:text-9xl font-black uppercase tracking-[0.25em] text-[#0F2747] transform -rotate-15 select-none"
                  style={{ opacity: 0.045 }}
                >
                  {settings.watermarkText || "BILZET"}
                </span>
              </div>
            )}

            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#0F2747] text-white font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-2 text-center w-[5%] border-r border-[#1E3A8A]/50">#</th>
                    <th className="py-2.5 px-3 text-left w-[33%] border-r border-[#1E3A8A]/50">Item Name</th>
                    <th className="py-2.5 px-2 text-center w-[11%] border-r border-[#1E3A8A]/50">HSN Code</th>
                    <th className="py-2.5 px-2 text-center w-[8%] border-r border-[#1E3A8A]/50">Qty</th>
                    <th className="py-2.5 px-2.5 text-right w-[12%] border-r border-[#1E3A8A]/50">Unit Price (₹)</th>
                    <th className="py-2.5 px-2 text-right w-[10%] border-r border-[#1E3A8A]/50">Discount (₹)</th>
                    <th className="py-2.5 px-2 text-center w-[9%] border-r border-[#1E3A8A]/50">Tax Rate</th>
                    <th className="py-2.5 px-3 text-right w-[12%]">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/95 text-slate-800">
                  {items.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]/60"}
                    >
                      <td className="py-2 px-2 text-center border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-7 h-7 object-cover rounded-md shrink-0 border border-slate-200"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 leading-snug truncate">
                              {item.name}
                            </p>
                            {item.code && (
                              <p className="text-[10px] font-mono text-slate-400">
                                {item.code}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-100 font-mono text-slate-600 text-[11px]">
                        {item.hsn || "—"}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-100 font-bold text-slate-900 font-mono">
                        {item.qty} {item.unit ? <span className="text-[10px] font-normal text-slate-500">{item.unit}</span> : ""}
                      </td>
                      <td className="py-2 px-2.5 text-right border-r border-slate-100 font-mono text-slate-700">
                        {Number(item.rate).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right border-r border-slate-100 font-mono text-emerald-700 font-medium">
                        {item.discount > 0 ? `-${Number(item.discount).toFixed(2)}` : "0.00"}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-100 font-mono text-slate-700 text-[11px]">
                        {item.gst}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#0F2747]">
                        {Number(item.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 6. Notes and Bill Summary (Two Column Layout) ── */}
          <div className="grid grid-cols-1 @lg:grid-cols-2 print:grid-cols-2 gap-4 items-start pt-1">
            {/* Left Column: Notes & UPI Payment Panel */}
            <div className="space-y-3">
              {/* Notes Panel */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Notes &amp; Remarks:
                </p>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {settings.notes || settings.thankYouMessage || "Thank you for choosing BILZET. Please visit us again."}
                </p>
                {settings.terms && (
                  <div className="pt-1.5 border-t border-slate-200 mt-1.5">
                    <p className="font-bold uppercase tracking-wider text-[9px] text-slate-500">
                      Terms &amp; Conditions:
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-line">
                      {settings.terms}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Details Panel (Real UPI QR & Bank Settlement) */}
              {settings.showBankDetails !== false && (
                <div className="bg-[#F0F7FF] border border-[#BFDBFE] rounded-xl p-3 flex items-center justify-between text-xs text-slate-700 shadow-2xs">
                  <div className="space-y-1 pr-2 min-w-0">
                    <p className="font-bold uppercase tracking-wider text-[#0F2747] text-[10px] flex items-center gap-1.5">
                      <Building2 size={12} className="text-[#1E3A8A]" />
                      <span>Bank &amp; UPI Settlement</span>
                    </p>
                    <div className="space-y-0.5 text-[11px]">
                      <p className="truncate">
                        <span className="font-semibold text-slate-700">Bank:</span>{" "}
                        <span className="text-slate-900 font-medium">{settings.bankName || "HDFC Bank Ltd"}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">A/C No:</span>{" "}
                        <span className="font-mono font-bold text-slate-900">{settings.accountNumber || "50200012345678"}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-slate-700">IFSC:</span>{" "}
                        <span className="font-mono text-slate-900">{settings.ifsc || "HDFC0001234"}</span>
                      </p>
                      <p className="truncate">
                        <span className="font-semibold text-slate-700">UPI ID:</span>{" "}
                        <span className="font-mono font-bold text-[#1E3A8A]">{settings.upiId || "bilzet@hdfcbank"}</span>
                      </p>
                    </div>
                  </div>

                  {settings.showQrCode !== false && (
                    <div className="text-center shrink-0 pl-2 border-l border-blue-200">
                      <img
                        src={qrImgSrc}
                        alt="UPI QR Code"
                        className="w-16 h-16 rounded-lg border border-white bg-white p-0.5 shadow-xs mx-auto"
                      />
                      <span className="text-[9px] font-extrabold text-[#0F2747] uppercase tracking-wider block mt-1">
                        Scan to Pay
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Bill Summary Panel */}
            <div className="space-y-2">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
                <p className="font-bold uppercase tracking-wider text-[10px] text-slate-500 pb-1 border-b border-slate-200">
                  Bill Summary
                </p>

                {/* Subtotal */}
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ₹{subtotalVal.toFixed(2)}
                  </span>
                </div>

                {/* Total Discount */}
                {discountTotalVal > 0 && (
                  <div className="flex justify-between py-0.5 text-emerald-700 font-medium">
                    <span>Total Discount</span>
                    <span className="font-mono font-bold">
                      -₹{discountTotalVal.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Taxable Amount */}
                <div className="flex justify-between py-0.5 text-slate-700">
                  <span className="font-medium">Taxable Amount</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ₹{taxableVal.toFixed(2)}
                  </span>
                </div>

                {/* Tax Details */}
                {!isInterState ? (
                  <>
                    {cgstVal > 0 && (
                      <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                        <span>CGST</span>
                        <span className="font-mono">₹{cgstVal.toFixed(2)}</span>
                      </div>
                    )}
                    {sgstVal > 0 && (
                      <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                        <span>SGST</span>
                        <span className="font-mono">₹{sgstVal.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  igstVal > 0 && (
                    <div className="flex justify-between py-0.5 text-slate-600 text-[11px]">
                      <span>IGST</span>
                      <span className="font-mono">₹{igstVal.toFixed(2)}</span>
                    </div>
                  )
                )}

                {/* Round Off */}
                {roundOffVal !== 0 && (
                  <div className="flex justify-between py-0.5 text-slate-600 text-[11px] font-mono">
                    <span className="font-sans">Round-off</span>
                    <span>{roundOffVal > 0 ? "+" : ""}₹{Number(roundOffVal).toFixed(2)}</span>
                  </div>
                )}

                {/* Goods Return Credit */}
                {returnedAmountVal > 0 && (
                  <div className="flex justify-between py-0.5 text-rose-600 font-medium">
                    <span>Returned Goods Credit</span>
                    <span className="font-mono font-bold">-₹{returnedAmountVal.toFixed(2)}</span>
                  </div>
                )}

                {/* Visually Prominent Final Total Amount */}
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-2.5 rounded-lg flex items-center justify-between text-slate-900 mt-2">
                  <span className="font-black text-xs uppercase tracking-wider text-[#0F2747]">
                    Total Amount
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-[#0F2747]">
                    ₹{netPayableVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Amount in Words */}
                <div className="pt-1 text-[10px] text-slate-600 italic">
                  <span className="font-bold text-slate-700 not-italic">In Words: </span>
                  {numberToWordsINR(netPayableVal)}
                </div>

                {/* Payments & Balance */}
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-700 text-[11px]">
                    <span className="font-medium">Amount Paid</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{receivedVal.toFixed(2)}
                    </span>
                  </div>

                  {balanceDueVal > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold text-[11px]">
                      <span>Balance Due</span>
                      <span className="font-mono">
                        ₹{balanceDueVal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 7. Clean Footer with BILZET Branding & Tagline ── */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-end justify-between gap-4 text-xs">
            {/* Left: BILZET Logo & Tagline */}
            <div className="flex items-center gap-2.5 pb-1 self-start sm:self-end">
              <span className="font-black text-[#0F2747] tracking-wider uppercase text-sm">
                BILZET
              </span>
              <span className="text-slate-300 font-light">|</span>
              <span className="text-[11px] font-medium text-slate-500 italic">
                Smart Billing for Smarter Businesses
              </span>
            </div>

            {/* Right: Store Tagline & Authorized Signature */}
            <div className="flex items-end gap-4 text-right ml-auto">
              <div className="flex flex-col items-end min-w-[150px]">
                {/* Dedicated Space for Owner Signature */}
                {shouldDisplaySignature ? (
                  <div className="h-14 sm:h-16 flex items-end justify-center w-full pb-1">
                    <img
                      src={resolvedSignatureUrl}
                      alt="Authorized Owner Signature"
                      crossOrigin="anonymous"
                      className="max-h-12 max-w-[140px] object-contain"
                      onError={() => setSignatureLoadFailed(true)}
                    />
                  </div>
                ) : (
                  <div className="h-10 sm:h-12 flex items-end justify-center w-full pb-1">
                    <span className="text-[9px] font-medium text-slate-300 select-none tracking-wider italic">
                      (Signature / Seal)
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-400 pt-1 w-full text-right">
                  <p className="text-[11px] font-bold text-[#0F2747] leading-tight">
                    {settings.authorizedPerson || storeName}
                  </p>
                  <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                    {settings.signatoryLabel || "Authorized Signatory"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { TaxInvoice as InvoiceTemplate };
