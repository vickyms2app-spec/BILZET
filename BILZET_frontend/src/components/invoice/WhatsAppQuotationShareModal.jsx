import { useState, useRef, useEffect } from "react";
import {
  X,
  MessageCircle,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  User,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Calendar,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import TaxInvoice from "./TaxInvoice";
import { preloadPrintableImages, sanitizeClonedDocumentForPdf } from "../../utils/pdfRenderUtils";

/**
 * WhatsApp Quotation Sharing Modal
 * 
 * Generates and shares a professional quotation document using the
 * currently selected website billing theme, colors, fonts, and template.
 * Shares the PDF as a document attachment (or downloads for WhatsApp Web).
 */

export default function WhatsAppQuotationShareModal({
  isOpen,
  onClose,
  quotation,
  shopSettings,
}) {
  const invoiceContainerRef = useRef(null);

  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [caption, setCaption] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Normalize quotation data
  const normalizedQuotation = quotation ? {
    ...quotation,
    isQuotation: true,
    documentType: "quotation",
    invoiceNumber: quotation.quotationNumber || quotation.number || "QUO-2026-0001",
    quotationNumber: quotation.quotationNumber || quotation.number || "QUO-2026-0001",
    invoiceDate: quotation.quotationDate || quotation.date || quotation.createdAt || new Date().toISOString(),
    quotationDate: quotation.quotationDate || quotation.date || quotation.createdAt || new Date().toISOString(),
    validUntil: quotation.validUntil || quotation.expiryDate || quotation.validityDate,
    customer: quotation.customer || {
      name: quotation.customerName || "Valued Customer",
      phone: quotation.customerPhone || quotation.mobileNumber || "",
      email: quotation.customerEmail || "",
      gstin: quotation.customerGstin || "",
      address: quotation.customerAddress || quotation.billingAddress || "",
    },
  } : null;

  // Initialize recipient & prefilled caption on open
  useEffect(() => {
    if (isOpen && normalizedQuotation) {
      const cName =
        normalizedQuotation.customer?.name ||
        normalizedQuotation.customerName ||
        "Valued Customer";

      const cPhone =
        normalizedQuotation.customer?.phone ||
        normalizedQuotation.customerPhone ||
        normalizedQuotation.mobileNumber ||
        "";

      const sName =
        shopSettings?.shopName ||
        shopSettings?.businessName ||
        "BILZET Retail";

      const qNum =
        normalizedQuotation.quotationNumber ||
        normalizedQuotation.invoiceNumber ||
        "QUO-001";

      const amountVal = Number(
        normalizedQuotation.grandTotal ||
        normalizedQuotation.totalAmount ||
        normalizedQuotation.total ||
        0
      ).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      let validityStr = "15 Days from Date of Issue";
      if (normalizedQuotation.validUntil) {
        try {
          const d = new Date(normalizedQuotation.validUntil);
          if (!isNaN(d.getTime())) {
            validityStr = d.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        } catch (_) {}
      }

      setCustomerName(cName);
      setCustomerPhone(cPhone);
      setStatusFeedback(null);

      // Professional Quotation Caption
      setCaption(
        `Dear ${cName},\n\nPlease find attached our official Quotation #${qNum} from ${sName} for ₹${amountVal}.\n\n📅 Valid until: ${validityStr}\n\nThank you for considering our proposal. Please feel free to reach out to us if you have any questions or wish to proceed!`
      );
    }
  }, [isOpen, quotation, shopSettings]);

  if (!isOpen || !normalizedQuotation) return null;

  // Helper: Format phone number with Indian international code (+91)
  const getFormattedPhone = () => {
    const raw = (customerPhone || "").replace(/\D/g, "");
    if (!raw) return "";
    if (raw.length === 10) return `91${raw}`;
    if (raw.length === 12 && raw.startsWith("91")) return raw;
    return raw;
  };

  // Helper: Generate PDF blob and file from the rendered TaxInvoice element
  const generatePdfFile = async () => {
    const element = invoiceContainerRef.current?.querySelector(".tax-invoice-printable-root") || invoiceContainerRef.current;
    if (!element) {
      throw new Error("Quotation printable element not found in DOM");
    }

    // Preload images inside the invoice element (logo, signature, QR)
    await preloadPrintableImages(element);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc, clonedElement) => {
        sanitizeClonedDocumentForPdf(clonedDoc, clonedElement);
      },
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

    const safeNumber = (normalizedQuotation.quotationNumber || "QUOTATION").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `BILZET_Quotation_${safeNumber}.pdf`;
    const pdfBlob = pdf.output("blob");
    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

    return { pdf, pdfBlob, pdfFile, fileName };
  };

  // Share via WhatsApp Action (Document Attachment)
  const handleSendViaWhatsApp = async () => {
    setGeneratingPdf(true);
    setStatusFeedback(null);

    try {
      const { pdf, pdfFile, fileName } = await generatePdfFile();
      const phoneClean = getFormattedPhone();

      // Check if Web Share API with Files is supported (Mobile / Tablet / Modern Browser)
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: `Quotation ${normalizedQuotation.quotationNumber}`,
            text: caption,
            files: [pdfFile],
          });

          setStatusFeedback({
            type: "success",
            message: `Quotation document "${fileName}" shared to WhatsApp!`,
          });
          return;
        } catch (shareErr) {
          if (shareErr.name === "AbortError") {
            // User cancelled share dialog
            return;
          }
          console.warn("Navigator share failed, falling back to desktop WhatsApp Web flow:", shareErr);
        }
      }

      // Desktop Browser / WhatsApp Web Flow:
      // 1. Download the generated Quotation PDF file
      pdf.save(fileName);

      // 2. Open WhatsApp Web / WhatsApp app with recipient & prefilled message
      const waUrl = phoneClean
        ? `https://web.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(caption)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(caption)}`;

      window.open(waUrl, "_blank");

      setStatusFeedback({
        type: "success",
        message: `Quotation PDF downloaded ("${fileName}"). WhatsApp Web opened for ${customerName}! Click the paperclip icon in WhatsApp to attach the downloaded PDF.`,
      });
    } catch (err) {
      console.error("WhatsApp quotation generation failed:", err);
      setStatusFeedback({
        type: "error",
        message: err.message || "Failed to generate quotation PDF document. Please retry.",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Download PDF Only Handler
  const handleDownloadOnly = async () => {
    setGeneratingPdf(true);
    setStatusFeedback(null);
    try {
      const { pdf, fileName } = await generatePdfFile();
      pdf.save(fileName);
      setStatusFeedback({
        type: "success",
        message: `Quotation PDF saved to your device as "${fileName}".`,
      });
    } catch (err) {
      console.error("PDF download failed:", err);
      setStatusFeedback({
        type: "error",
        message: "Failed to download PDF.",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Copy Caption to Clipboard
  const handleCopyCaption = () => {
    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#F6F6F8] rounded-[24px] max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-[#E7E8EC] animate-in fade-in zoom-in-95 my-auto">
        {/* Modal Header */}
        <div className="bg-[#12151C] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-[#5BF07B] flex items-center justify-center font-bold">
              <MessageCircle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Send Quotation via WhatsApp (Document Attachment)
              </h3>
              <p className="text-[11px] text-[#A9ABB5]">
                Using active billing theme &middot; Official billing PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#A9ABB5] hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Main Content: Split View (Left: Quotation Document Preview, Right: WhatsApp Configuration) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Column: Live Master Document Preview (Col 7) */}
          <div className="lg:col-span-7 bg-[#EAEBED] p-3 sm:p-5 overflow-y-auto flex flex-col border-b lg:border-b-0 lg:border-r border-[#E7E8EC]">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#111318]">
                <FileText size={14} className="text-[#1E3A8A]" />
                <span>Quotation Document Preview (Billing Template)</span>
              </div>
              <span className="text-[10px] font-semibold text-[#0E2A16] bg-[#DFFFE6] px-2 py-0.5 rounded-full border border-[#5BF07B]/40">
                A4 Layout &middot; Heading: QUOTATION
              </span>
            </div>

            {/* Live rendered TaxInvoice container with active Business Settings theme */}
            <div
              ref={invoiceContainerRef}
              className="bg-white rounded-xl shadow-md border border-[#E7E8EC] overflow-x-auto p-1 sm:p-2"
            >
              <TaxInvoice
                invoice={normalizedQuotation}
                shopSettings={shopSettings}
                isModal={false}
                showActions={false}
              />
            </div>
          </div>

          {/* Right Column: WhatsApp Recipient & Message Configuration (Col 5) */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-white flex flex-col justify-between space-y-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Document Summary Pill */}
              <div className="p-3 rounded-2xl bg-[#F6F6F8] border border-[#E7E8EC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111318]">
                    {normalizedQuotation.quotationNumber}
                  </span>
                  <span className="font-mono font-bold text-xs text-[#0E2A16] bg-[#DFFFE6] px-2 py-0.5 rounded-full">
                    ₹{Number(normalizedQuotation.grandTotal || normalizedQuotation.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[11px] text-[#7C7F8A] flex items-center justify-between">
                  <span>Customer: <strong className="text-[#111318]">{customerName}</strong></span>
                  <span>Format: <strong className="text-[#111318]">PDF Document</strong></span>
                </div>
              </div>

              {/* Recipient Phone Input */}
              <div>
                <label className="block text-xs font-bold text-[#111318] mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-[#7C7F8A]" />
                  <span>Customer WhatsApp Number</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#7C7F8A]">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-11 pr-3 py-2 text-xs bg-[#F6F6F8] border border-[#E7E8EC] rounded-xl outline-none focus:border-[#5BF07B] font-mono font-medium text-[#111318] transition"
                  />
                </div>
                <p className="text-[10px] text-[#7C7F8A] mt-1">
                  WhatsApp will open with this customer's chat directly.
                </p>
              </div>

              {/* Optional WhatsApp Caption Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#111318] flex items-center gap-1.5">
                    <MessageCircle size={13} className="text-[#7C7F8A]" />
                    <span>WhatsApp Message Caption (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="text-[10px] font-semibold text-[#7C7F8A] hover:text-[#111318] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCaption ? <Check size={11} className="text-[#5BF07B]" /> : <Copy size={11} />}
                    <span>{copiedCaption ? "Copied" : "Copy text"}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter message caption to accompany the quotation PDF..."
                  className="w-full p-3 text-xs bg-[#F6F6F8] border border-[#E7E8EC] rounded-xl outline-none focus:border-[#5BF07B] text-[#111318] leading-relaxed resize-none font-medium transition"
                />
              </div>

              {/* Status & Feedback Alerts */}
              {statusFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border ${
                    statusFeedback.type === "success"
                      ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                      : "bg-rose-50 text-[#E5484D] border-rose-200"
                  }`}
                >
                  {statusFeedback.type === "success" ? (
                    <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-[#E5484D] shrink-0 mt-0.5" />
                  )}
                  <p className="flex-1 leading-snug font-medium">{statusFeedback.message}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-[#E7E8EC] space-y-2">
              {/* Primary Send via WhatsApp Button */}
              <button
                type="button"
                onClick={handleSendViaWhatsApp}
                disabled={generatingPdf}
                className="w-full py-3 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {generatingPdf ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Generating Quotation PDF...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} className="fill-current" />
                    <span>Send via WhatsApp (PDF Document)</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                {/* Download PDF Only Button */}
                <button
                  type="button"
                  onClick={handleDownloadOnly}
                  disabled={generatingPdf}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#E7E8EC] bg-white hover:bg-[#F6F6F8] text-[#111318] text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download size={14} className="text-[#7C7F8A]" />
                  <span>Download PDF Only</span>
                </button>

                {/* Cancel / Done */}
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-4 rounded-xl border border-[#E7E8EC] bg-[#F6F6F8] hover:bg-[#EDEDEF] text-[#7C7F8A] hover:text-[#111318] text-xs font-semibold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
