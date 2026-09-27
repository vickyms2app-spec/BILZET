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
import Logo from "../common/Logo";

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

export default function TaxInvoice({
  invoice,
  shopSettings,
  onClose,
  isModal = false,
}) {
  const printRef = useRef(null);

  // Default fallback data if invoice is sample/partial
  const inv = {
    invoiceNumber: invoice?.invoiceNumber || "INV-2025-0042",
    date: invoice?.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"),
    dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : new Date(Date.now() + 15 * 86400000).toLocaleDateString("en-IN"),
    customer: {
      name: invoice?.customer?.name || "Apex Retail & Traders",
      phone: invoice?.customer?.phone || "+91 98450 11223",
      email: invoice?.customer?.email || "accounts@apexretail.in",
      address: invoice?.customer?.address || "Shop 14, Commercial Complex, MG Road, Bengaluru",
      gstin: invoice?.customer?.gstin || "29AABCU9603R1ZM",
      state: invoice?.customer?.state || "Karnataka",
      stateCode: invoice?.customer?.stateCode || "29",
    },
    items: invoice?.items || [
      { name: "Basmati Rice Royal Premium 5kg", sku: "RICE-5KG", hsn: "1006", qty: 4, rate: 450, taxPercent: 5, total: 1890 },
      { name: "Organic Cold Pressed Groundnut Oil 1L", sku: "OIL-1L", hsn: "1508", qty: 6, rate: 210, taxPercent: 5, total: 1323 },
      { name: "Whole Grain Wheat Flour 10kg", sku: "ATTA-10KG", hsn: "1101", qty: 2, rate: 380, taxPercent: 0, total: 760 },
      { name: "Darjeeling Tea Select Export Pack", sku: "TEA-500G", hsn: "0902", qty: 3, rate: 290, taxPercent: 12, total: 974.4 },
    ],
    subtotal: invoice?.subtotal || 4580,
    cgst: invoice?.cgst || 193.7,
    sgst: invoice?.sgst || 193.7,
    taxTotal: invoice?.taxTotal || 387.4,
    discountTotal: invoice?.discountTotal || 0,
    roundOff: invoice?.roundOff || -0.4,
    grandTotal: invoice?.grandTotal || 4947,
    paymentMethod: invoice?.paymentMethod || "UPI / Mixed",
    paymentStatus: invoice?.paymentStatus || "PAID",
  };

  // Customization settings
  const settings = {
    template: shopSettings?.template || "modern", // modern, classic, minimal, thermal
    themeColor: shopSettings?.themeColor || "#1a5cff",
    title: shopSettings?.invoiceTitle || "TAX INVOICE",
    showHsnSummary: shopSettings?.showHsnSummary !== false,
    showBankDetails: shopSettings?.showBankDetails !== false,
    showQrCode: shopSettings?.showQrCode !== false,
    showSignatory: shopSettings?.showSignatory !== false,
    showTerms: shopSettings?.showTerms !== false,
    showAmountInWords: shopSettings?.showAmountInWords !== false,
    shopName: shopSettings?.shopName || "BILZET Retail Mart",
    ownerName: shopSettings?.ownerName || "Karthik Enterprises",
    phone: shopSettings?.phone || "+91 98765 43210",
    email: shopSettings?.email || "billing@bilzet.app",
    address: shopSettings?.address || "123 Commercial Plaza, Main Market, Bengaluru",
    gstin: shopSettings?.gstin || "29ABCDE1234F1Z5",
    state: shopSettings?.state || "Karnataka",
    stateCode: shopSettings?.stateCode || "29",
    pan: shopSettings?.pan || "ABCDE1234F",
    bankName: shopSettings?.bankName || "HDFC Bank Ltd",
    accountNumber: shopSettings?.accountNumber || "50200012345678",
    ifsc: shopSettings?.ifsc || "HDFC0001234",
    accountHolder: shopSettings?.accountHolder || shopSettings?.shopName || "BILZET Retail Mart",
    upiId: shopSettings?.upiId || "bilzet@hdfcbank",
    terms: shopSettings?.terms || "1. Goods once sold cannot be returned. 2. Payment is due within 15 days. 3. Subject to Bengaluru jurisdiction.",
  };

  const handlePrint = () => {
    window.print();
  };

  // Group items by HSN for Tax Summary table
  const hsnGroups = inv.items.reduce((acc, item) => {
    const hsn = item.hsn || "1001";
    const taxable = (item.rate * item.qty) - (item.discount || 0);
    const taxRate = item.taxPercent || 0;
    const cgstRate = taxRate / 2;
    const sgstRate = taxRate / 2;
    const cgstAmt = (taxable * cgstRate) / 100;
    const sgstAmt = (taxable * sgstRate) / 100;

    if (!acc[hsn]) {
      acc[hsn] = {
        hsn,
        taxable: 0,
        cgstRate,
        cgstAmt: 0,
        sgstRate,
        sgstAmt: 0,
        totalTax: 0,
      };
    }
    acc[hsn].taxable += taxable;
    acc[hsn].cgstAmt += cgstAmt;
    acc[hsn].sgstAmt += sgstAmt;
    acc[hsn].totalTax += cgstAmt + sgstAmt;
    return acc;
  }, {});

  // Generate UPI Payment URI for QR code
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.shopName)}&am=${inv.grandTotal}&cu=INR&tn=${encodeURIComponent(inv.invoiceNumber)}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiPayUrl)}`;

  // Thermal Receipt Render Mode
  if (settings.template === "thermal") {
    return (
      <div className={`${isModal ? "fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" : ""}`}>
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
          {/* Action Bar */}
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

          {/* Thermal Printable Area */}
          <div className="font-mono text-[11px] text-black leading-tight space-y-2 p-2" id="printable-tax-invoice">
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="text-base font-bold uppercase">{settings.shopName}</h2>
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
                  <span className="w-1/4 text-right">₹{i.total || (i.rate * i.qty)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{inv.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST + SGST:</span>
                <span>₹{inv.taxTotal}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
                <span>GRAND TOTAL:</span>
                <span>₹{inv.grandTotal}</span>
              </div>
            </div>

            {settings.showQrCode && (
              <div className="text-center pt-3 border-t border-dashed border-black">
                <img src={qrImgSrc} alt="UPI QR" className="w-24 h-24 mx-auto" />
                <p className="text-[9px] mt-1">Scan &amp; Pay via UPI ({settings.upiId})</p>
              </div>
            )}

            <div className="text-center pt-2 text-[9px] border-t border-dashed border-black">
              <p>Thank you for shopping with us!</p>
              <p>Visit Again</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full A4 Tax Invoice (Modern, Classic, Minimal)
  const isMinimal = settings.template === "minimal";
  const isClassic = settings.template === "classic";

  return (
    <div className={`${isModal ? "fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" : ""}`}>
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
            PRINTABLE A4 INVOICE SHEET
        ══════════════════════════════════════════════════ */}
        <div
          ref={printRef}
          id="printable-tax-invoice"
          className="p-8 sm:p-10 bg-white text-slate-800 text-xs font-['Inter',system-ui,sans-serif] space-y-6"
          style={{ minHeight: "1000px" }}
        >
          {/* Header Block */}
          <div className={`pb-6 ${isClassic ? "border-b-2 border-black" : "border-b border-slate-200"}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              {/* Supplier Info */}
              <div className="space-y-1.5 max-w-md">
                <div className="flex items-center gap-3">
                  <Logo variant="icon" theme="light" size="md" className="shrink-0" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      {settings.shopName}
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium">
                      GST Registered Supplier · Retail &amp; Wholesale
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 leading-relaxed pt-1">
                  <p>{settings.address}</p>
                  <p>
                    <strong>State:</strong> {settings.state} (Code: <strong>{settings.stateCode}</strong>)
                  </p>
                  <p>
                    <strong>GSTIN:</strong>{" "}
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                      {settings.gstin}
                    </span>
                    {settings.pan && <span className="ml-3 font-mono">PAN: {settings.pan}</span>}
                  </p>
                  <p>Ph: {settings.phone} · Email: {settings.email}</p>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="text-left sm:text-right space-y-1.5">
                <div
                  className={`inline-block px-3 py-1 text-sm font-black tracking-wider uppercase rounded-lg ${
                    isMinimal
                      ? "border-2 border-black text-black"
                      : "text-white shadow-sm"
                  }`}
                  style={{ background: isMinimal ? "transparent" : settings.themeColor }}
                >
                  {settings.title}
                </div>

                <div className="pt-2 text-[11px] space-y-1 text-slate-600">
                  <p>
                    Invoice No:{" "}
                    <strong className="font-mono text-sm text-slate-900 font-black">
                      {inv.invoiceNumber}
                    </strong>
                  </p>
                  <p>Invoice Date: <strong>{inv.date}</strong></p>
                  <p>Due Date: <strong>{inv.dueDate}</strong></p>
                  <p>Place of Supply: <strong>{settings.state} ({settings.stateCode})</strong></p>
                  <p>Reverse Charge: <strong>No</strong></p>
                </div>
              </div>
            </div>
          </div>

          {/* Billed To / Buyer Details Block */}
          <div className={`p-4 rounded-xl ${isClassic ? "border border-black bg-white" : "bg-slate-50/80 border border-slate-200"}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  Details of Receiver (Billed To)
                </p>
                <h3 className="text-sm font-bold text-slate-900">{inv.customer.name}</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">{inv.customer.address}</p>
                <p className="text-[11px] text-slate-600">
                  Ph: {inv.customer.phone} {inv.customer.email ? `· ${inv.customer.email}` : ""}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  Buyer Tax &amp; State Information
                </p>
                <p className="text-[11px] text-slate-700">
                  GSTIN:{" "}
                  <strong className="font-mono font-bold text-slate-900">
                    {inv.customer.gstin || "URP (Unregistered Person)"}
                  </strong>
                </p>
                <p className="text-[11px] text-slate-600">
                  State / Code: <strong>{inv.customer.state} ({inv.customer.stateCode})</strong>
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 size={11} />
                  Payment Status: {inv.paymentStatus} ({inv.paymentMethod})
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Goods & Services Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isClassic
                      ? "border-t-2 border-b-2 border-black bg-slate-100 text-black"
                      : "text-white"
                  }`}
                  style={{ background: isClassic ? "#f8fafc" : isMinimal ? "#0f172a" : settings.themeColor }}
                >
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-2 text-center">HSN</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-center">Tax %</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inv.items.map((item, idx) => {
                  const lineTotal = item.total || (item.rate * item.qty);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        {item.sku && <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600">{item.hsn || "—"}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">{item.qty}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{Number(item.rate).toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600">{item.taxPercent || 0}%</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Calculations & Summary Section */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            {/* Left: Amount in Words & Bank Details & QR */}
            <div className="sm:col-span-7 space-y-4">
              {/* Words */}
              {settings.showAmountInWords && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Total Amount in Words:
                  </p>
                  <p className="text-xs font-bold text-slate-900 italic mt-0.5">
                    {numberToWordsINR(inv.grandTotal)}
                  </p>
                </div>
              )}

              {/* Bank Details & QR Code */}
              {settings.showBankDetails && (
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-1 text-[11px] text-slate-700">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                      Bank Payment Details (NEFT / RTGS / IMPS)
                    </p>
                    <p><strong>Bank:</strong> {settings.bankName}</p>
                    <p><strong>A/C No:</strong> <span className="font-mono font-bold">{settings.accountNumber}</span></p>
                    <p><strong>IFSC:</strong> <span className="font-mono font-bold">{settings.ifsc}</span></p>
                    <p><strong>UPI ID:</strong> <span className="font-mono text-blue-600">{settings.upiId}</span></p>
                  </div>

                  {settings.showQrCode && (
                    <div className="text-center shrink-0">
                      <img src={qrImgSrc} alt="Scan & Pay UPI" className="w-20 h-20 rounded border border-slate-300" />
                      <p className="text-[9px] text-slate-500 font-bold mt-1">Scan &amp; Pay</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Calculations Totals */}
            <div className="sm:col-span-5 space-y-2 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono font-semibold">₹{Number(inv.subtotal).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>CGST (Central Tax):</span>
                  <span className="font-mono font-semibold">₹{Number(inv.cgst).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>SGST (State Tax):</span>
                  <span className="font-mono font-semibold">₹{Number(inv.sgst).toFixed(2)}</span>
                </div>

                {inv.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{Number(inv.discountTotal).toFixed(2)}</span>
                  </div>
                )}

                {inv.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Round Off:</span>
                    <span className="font-mono">₹{Number(inv.roundOff).toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-baseline font-black text-slate-900 text-base">
                  <span>Invoice Total:</span>
                  <span className="font-mono text-lg text-blue-600">
                    ₹{Number(inv.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* HSN / SAC Tax Summary Grid (Indian GST Law requirement) */}
          {settings.showHsnSummary && (
            <div className="pt-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                GST Tax Summary (HSN / SAC Breakdown)
              </p>
              <table className="w-full text-[10px] border border-slate-200 text-left">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="py-1.5 px-2.5 border-b border-r">HSN Code</th>
                    <th className="py-1.5 px-2.5 border-b border-r text-right">Taxable Value (₹)</th>
                    <th className="py-1.5 px-2.5 border-b border-r text-right">Central Tax (CGST)</th>
                    <th className="py-1.5 px-2.5 border-b border-r text-right">State Tax (SGST)</th>
                    <th className="py-1.5 px-2.5 border-b text-right">Total Tax Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.values(hsnGroups).map((g) => (
                    <tr key={g.hsn}>
                      <td className="py-1.5 px-2.5 border-r font-mono font-semibold">{g.hsn}</td>
                      <td className="py-1.5 px-2.5 border-r text-right font-mono">₹{g.taxable.toFixed(2)}</td>
                      <td className="py-1.5 px-2.5 border-r text-right font-mono">
                        {g.cgstRate}% (₹{g.cgstAmt.toFixed(2)})
                      </td>
                      <td className="py-1.5 px-2.5 border-r text-right font-mono">
                        {g.sgstRate}% (₹{g.sgAmt ? g.sgAmt.toFixed(2) : g.sgstAmt.toFixed(2)})
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                        ₹{g.totalTax.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer: Terms & Authorized Signatory */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
            {/* Terms */}
            {settings.showTerms && (
              <div className="text-[10px] text-slate-500 space-y-1">
                <p className="font-bold uppercase tracking-wider text-slate-700">Terms &amp; Conditions:</p>
                <p className="leading-relaxed">{settings.terms}</p>
              </div>
            )}

            {/* Signature Box */}
            {settings.showSignatory && (
              <div className="text-right sm:ml-auto">
                <p className="text-[10px] font-bold text-slate-700">For {settings.shopName}</p>
                <div className="h-14 flex items-end justify-end">
                  <span className="text-[9px] text-slate-400 italic">Digitally signed &amp; verified</span>
                </div>
                <div className="border-t border-slate-300 pt-1">
                  <p className="text-xs font-bold text-slate-800">Authorized Signatory</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
