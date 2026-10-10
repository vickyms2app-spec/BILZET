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
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md my-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">UPI Payment Request</h3>
              <p className="text-[11px] text-slate-400">Scan &amp; Pay via GPay, PhonePe, Paytm</p>
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
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Payment Confirmed!</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Received ₹{formattedAmount} from {customerName}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs font-mono text-slate-600">
              Reference: <strong className="text-slate-900">{utrNumber || "UPI-VERIFIED-TXN"}</strong>
            </div>
            <Button
              type="button"
              variant="success"
              icon={CheckCircle2}
              onClick={onClose}
              className="w-full"
            >
              Continue to Print Invoice
            </Button>
          </div>
        ) : (
          /* Active Payment Flow */
          <div className="space-y-4">
            {/* Amount Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-100 text-center">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                Total Payable Amount
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-0.5">
                ₹{formattedAmount}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Bill Ref: <strong className="font-mono text-slate-700">{invoiceNumber}</strong> · {customerName}
              </p>
            </div>

            {/* QR Code Card */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <canvas ref={canvasRef} className="rounded-xl shadow-xs" />
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Dynamic UPI QR Code</span>
              </div>
            </div>

            {/* UPI Details */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
                  Merchant UPI ID / VPA
                </span>
                <span className="font-mono font-bold text-slate-800">{upiId}</span>
              </div>
              <Button
                size="xs"
                variant="neutral"
                icon={copied ? CheckCircle2 : Copy}
                onClick={handleCopyLink}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            {/* Manual UTR Reference Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Customer UTR / Transaction Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 427819827361"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
              <a
                href={upiUrl}
                target="_blank"
                rel="noreferrer"
                className="sm:hidden flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5"
              >
                <Smartphone size={14} />
                <span>Open UPI App</span>
              </a>

              <Button
                type="button"
                variant="success"
                icon={CheckCircle2}
                disabled={status === "VERIFYING"}
                loading={status === "VERIFYING"}
                onClick={handleConfirmPayment}
                className="flex-1"
              >
                Confirm Payment Received
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
