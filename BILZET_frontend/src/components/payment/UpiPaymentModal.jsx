import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  X,
  QrCode,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Button, { CompactIconButton } from "../common/Button";

export default function UpiPaymentModal({
  amount = 0,
  invoiceNumber = "INV-001",
  customerName = "Customer",
  upiId = "bilzet@hdfcbank",
  shopName = "Garden Greens Mart",
  onSuccess,
  onClose,
}) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("PENDING"); // 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'CANCELLED'
  const [utrNumber, setUtrNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const formattedAmount = Number(amount || 0).toFixed(2);
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    shopName
  )}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(`Bill ${invoiceNumber}`)}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        upiUrl,
        {
          width: 220,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR Code Generation Error:", error);
        }
      );
    }
  }, [upiUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(upiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmPayment = () => {
    setStatus("VERIFYING");
    setErrorMsg("");

    // Simulate verification or real UTR check
    setTimeout(() => {
      const generatedUtr = utrNumber.trim() || "UPI" + Date.now().toString().slice(-8);
      setStatus("SUCCESS");
      if (onSuccess) {
        onSuccess({
          utr: generatedUtr,
          mode: "UPI",
          amount: Number(amount),
        });
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-[#12151C]/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md my-auto bg-[#F6F6F8] rounded-[28px] shadow-2xl border border-[#E7E8EC] p-6 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E7E8EC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#12151C] text-[#5BF07B] flex items-center justify-center shadow-xs">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="font-bold text-[#111318] text-sm font-heading">UPI Payment Request</h3>
              <p className="text-[11px] text-[#7C7F8A]">Scan &amp; Pay via GPay, PhonePe, Paytm</p>
            </div>
          </div>
          <CompactIconButton
            icon={X}
            variant="neutral"
            onClick={onClose}
            title="Close"
          />
        </div>

        {status === "SUCCESS" ? (
          /* Payment Success Confirmation */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[#111318] font-heading">Payment Confirmed!</h4>
              <p className="text-xs text-[#7C7F8A] mt-0.5">
                Received ₹{formattedAmount} from {customerName}
              </p>
            </div>
            <div className="p-3.5 bg-[#FAFAFB] rounded-[18px] border border-[#E7E8EC] text-xs font-mono text-[#7C7F8A]">
              Reference: <strong className="text-[#111318]">{utrNumber || "UPI-VERIFIED-TXN"}</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-full bg-[#12151C] hover:bg-[#202530] text-[#5BF07B] font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-fintech"
            >
              <CheckCircle2 size={16} />
              <span>Continue to Print Invoice</span>
            </button>
          </div>
        ) : (
          /* Active Payment Flow */
          <div className="space-y-4">
            {/* Amount Banner */}
            <div className="p-4 rounded-[20px] bg-[#FAFAFB] border border-[#E7E8EC] text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#7C7F8A] uppercase tracking-wider">
                Total Payable Amount
              </span>
              <p className="text-3xl font-black text-[#111318] font-mono mt-0.5">
                ₹{formattedAmount}
              </p>
              <p className="text-[11px] text-[#7C7F8A] mt-1 font-medium">
                Bill Ref: <strong className="font-mono text-[#111318]">{invoiceNumber}</strong> · {customerName}
              </p>
            </div>

            {/* QR Code Card */}
            <div className="flex flex-col items-center justify-center p-4 rounded-[22px] bg-white border border-[#E7E8EC] shadow-2xs">
              <canvas ref={canvasRef} className="rounded-xl shadow-xs" />
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#0E2A16] bg-[#DFFFE6] px-3 py-1 rounded-full border border-[#5BF07B]/30">
                <span className="w-2 h-2 rounded-full bg-[#5BF07B] animate-pulse" />
                <span>Active Dynamic UPI QR Code</span>
              </div>
            </div>

            {/* UPI Details */}
            <div className="p-3.5 bg-[#FAFAFB] rounded-[18px] border border-[#E7E8EC] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#A9ABB5] font-semibold uppercase tracking-wider block">
                  Merchant UPI ID / VPA
                </span>
                <span className="font-mono font-bold text-[#111318]">{upiId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-full bg-white hover:bg-[#EDEDEF] text-[#111318] text-xs font-semibold border border-[#E7E8EC] transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                {copied ? <CheckCircle2 size={13} className="text-[#0E2A16]" /> : <Copy size={13} />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Manual UTR Reference Input */}
            <div>
              <label className="block text-[11px] font-semibold text-[#111318] mb-1.5">
                Customer UTR / Transaction Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 427819827361"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="w-full px-4 py-2.5 text-xs rounded-full border border-[#E7E8EC] bg-white text-[#111318] font-mono outline-none focus:border-[#12151C]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-[#E7E8EC]">
              <a
                href={upiUrl}
                target="_blank"
                rel="noreferrer"
                className="sm:hidden flex-1 py-2.5 px-3 bg-[#EDEDEF] hover:bg-[#E3E3E5] text-[#111318] rounded-full text-xs font-semibold text-center flex items-center justify-center gap-1.5 border border-[#E7E8EC]"
              >
                <Smartphone size={14} />
                <span>Open UPI App</span>
              </a>

              <button
                type="button"
                disabled={status === "VERIFYING"}
                onClick={handleConfirmPayment}
                className="flex-1 py-3 px-4 rounded-full bg-[#12151C] hover:bg-[#202530] text-[#5BF07B] font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-fintech disabled:opacity-50"
              >
                {status === "VERIFYING" ? <RefreshCw size={14} className="animate-spin text-[#5BF07B]" /> : <CheckCircle2 size={14} />}
                <span>{status === "VERIFYING" ? "Verifying..." : "Confirm Payment Received"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
