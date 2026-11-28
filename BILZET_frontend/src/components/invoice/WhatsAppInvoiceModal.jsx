import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageCircle,
  QrCode,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Unplug,
  X,
  Smartphone,
} from "lucide-react";
import { whatsappApi } from "../../api";

const STATUS_META = {
  NOT_CONNECTED: { label: "Not Connected", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  CONNECTING: { label: "Connecting", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  WAITING_FOR_QR: { label: "Waiting for QR Scan", badgeClass: "bg-amber-50 text-amber-800 border-amber-200" },
  CONNECTED: { label: "Connected", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RECONNECTING: { label: "Reconnecting", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  DISCONNECTED: { label: "Disconnected", badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
  AUTH_FAILED: { label: "Authentication Failed", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  CONNECTION_ERROR: { label: "Connection Error", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function WhatsAppInvoiceModal({
  isOpen,
  onClose,
  invoice = {},
  businessName = "BILZET",
  onEnsureSavedInvoice,
}) {
  const [waState, setWaState] = useState({
    status: "NOT_CONNECTED",
    connected: false,
    phoneNumber: null,
    qrCode: null,
    qrExpiresAt: null,
    lastError: null,
  });
  const [loadingInit, setLoadingInit] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [messageHistory, setMessageHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [customerConsent, setCustomerConsent] = useState(true);

  const invoiceId = invoice?.id || invoice?._id || null;
  const invoiceNumber = invoice?.invoiceNumber || invoice?.billNumber || "INV-DRAFT";
  const customerName = invoice?.customer?.name || "Customer";
  const grandTotal = Number(invoice?.grandTotal || 0);
  const defaultPhone = invoice?.customer?.phone || "";

  const [customerPhone, setCustomerPhone] = useState(defaultPhone);
  const [customMessage, setCustomMessage] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setCustomerPhone(invoice?.customer?.phone || "");
    const formattedTotal = grandTotal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setCustomMessage(
      `Hello,\n\nYour invoice from ${businessName} is ready.\n\nInvoice Number: ${invoiceNumber}\nAmount: ₹${formattedTotal}\n\nPlease find your invoice attached.\n\nThank you!\n\n${businessName}`
    );
    setSendResult(null);
    setErrorMsg("");
    setCustomerConsent(true);
  }, [isOpen, invoiceNumber, grandTotal, businessName, invoice?.customer?.phone]);

  const fetchMessageHistory = useCallback(async () => {
    if (!invoiceId) {
      setMessageHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await whatsappApi.getMessages(invoiceId);
      setMessageHistory(Array.isArray(res?.messages) ? res.messages : []);
    } catch (_) {
      setMessageHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchMessageHistory();
    } else if (!isOpen) {
      setMessageHistory([]);
    }
  }, [isOpen, invoiceId, fetchMessageHistory]);

  const fetchStatusAndQr = useCallback(async () => {
    try {
      const statusRes = await whatsappApi.getStatus();
      const nextStatus = statusRes?.status || "NOT_CONNECTED";
      let qrCode = null;
      let qrExpiresAt = statusRes?.qrExpiresAt || null;

      if (nextStatus === "WAITING_FOR_QR" || nextStatus === "CONNECTING") {
        const qrRes = await whatsappApi.getQr().catch(() => null);
        if (qrRes?.qrCode) {
          qrCode = qrRes.qrCode;
          qrExpiresAt = qrRes.qrExpiresAt || qrExpiresAt;
        }
      }

      setWaState((prev) => ({
        ...prev,
        status: nextStatus,
        connected: Boolean(statusRes?.connected && nextStatus === "CONNECTED"),
        phoneNumber: statusRes?.phoneNumber || null,
        qrCode: nextStatus === "CONNECTED" ? null : qrCode,
        qrExpiresAt: nextStatus === "CONNECTED" ? null : qrExpiresAt,
        lastError: statusRes?.lastError || null,
      }));
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Unable to fetch WhatsApp status.");
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    setLoadingInit(true);
    fetchStatusAndQr().finally(() => setLoadingInit(false));

    pollRef.current = setInterval(() => {
      fetchStatusAndQr();
    }, 2200);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, fetchStatusAndQr]);

  useEffect(() => {
    if (!waState.qrExpiresAt || waState.connected) {
      setSecondsLeft(null);
      return;
    }
    const updateCountdown = () => {
      const diff = Math.max(0, Math.ceil((new Date(waState.qrExpiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [waState.qrExpiresAt, waState.connected]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg("");
    try {
      await whatsappApi.connect();
      await fetchStatusAndQr();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to start WhatsApp connection.");
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshQr = async () => {
    setRefreshingQr(true);
    setErrorMsg("");
    try {
      await whatsappApi.refreshQr();
      await fetchStatusAndQr();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to refresh QR code.");
    } finally {
      setRefreshingQr(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setErrorMsg("");
    try {
      await whatsappApi.disconnect({ unlink: true });
      await fetchStatusAndQr();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to disconnect WhatsApp.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendInvoice = async (e) => {
    e.preventDefault();
    if (sending) return;
    setErrorMsg("");
    setSendResult(null);

    if (!customerConsent) {
      setErrorMsg("Please confirm customer consent before sending this invoice via WhatsApp.");
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMsg("Please enter the customer's WhatsApp mobile number.");
      return;
    }

    setSending(true);
    try {
      let targetInvoiceId = invoiceId;
      if (!targetInvoiceId && typeof onEnsureSavedInvoice === "function") {
        const saved = await onEnsureSavedInvoice();
        targetInvoiceId = saved?.id || saved?._id;
      }

      if (!targetInvoiceId) {
        throw new Error("Please save the invoice first before sending via WhatsApp.");
      }

      const res = await whatsappApi.sendInvoice({
        invoiceId: targetInvoiceId,
        customerPhone: customerPhone.trim(),
        customMessage: customMessage.trim() || undefined,
      });

      setSendResult({
        type: "success",
        text: res?.message || `Invoice ${invoiceNumber} sent via WhatsApp!`,
      });
      fetchMessageHistory();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to send invoice via WhatsApp.";
      setErrorMsg(msg);
      setSendResult({ type: "error", text: msg });
      fetchMessageHistory();
    } finally {
      setSending(false);
    }
  };

  const handleRetryMessage = async (msg) => {
    if (!invoiceId || retryingId || sending) return;
    setRetryingId(msg.id);
    setErrorMsg("");
    setSendResult(null);
    try {
      const res = await whatsappApi.sendInvoice({
        invoiceId,
        customerPhone: msg.customerPhone,
        customMessage: customMessage.trim() || undefined,
        allowDuplicate: true,
      });
      setSendResult({
        type: "success",
        text: res?.message || `Invoice ${invoiceNumber} retried successfully!`,
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Retry failed.");
    } finally {
      setRetryingId(null);
      fetchMessageHistory();
    }
  };

  const statusMeta = STATUS_META[waState.status] || STATUS_META.NOT_CONNECTED;
  const showQrPanel =
    !waState.connected &&
    (waState.status === "WAITING_FOR_QR" || waState.status === "CONNECTING" || Boolean(waState.qrCode));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-[24px] border border-[#E2E8F0] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#F4F9FF] border-b border-[#DCEAFE] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#25D366]/15 text-[#128C7E] flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F2747]">Send Invoice via WhatsApp</h3>
              <p className="text-[11px] text-slate-500">Business WhatsApp PDF Delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}>
              {statusMeta.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition cursor-pointer"
              aria-label="Close WhatsApp modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {waState.lastError && !errorMsg && !waState.connected && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{waState.lastError}</span>
            </div>
          )}

          {loadingInit ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 size={22} className="animate-spin text-blue-600" />
              <span>Checking WhatsApp session status...</span>
            </div>
          ) : !waState.connected ? (
            <div className="space-y-4">
              {!showQrPanel ? (
                <div className="p-5 rounded-2xl bg-[#F8FBFF] border border-[#DCEAFE] text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCEAFE] text-[#128C7E] mx-auto flex items-center justify-center shadow-2xs">
                    <QrCode size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-[#0F2747]">Connect WhatsApp</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Connect your business WhatsApp account to send invoices directly to your customers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    {connecting ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                    <span>{connecting ? "Initializing..." : "Connect WhatsApp"}</span>
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#F8FBFF] border border-[#DCEAFE] flex flex-col items-center text-center space-y-3">
                  <div className="text-xs font-semibold text-[#0F2747]">
                    Scan QR via WhatsApp &rarr; Linked Devices &rarr; Link a Device
                  </div>

                  {waState.qrCode ? (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      <img
                        src={waState.qrCode}
                        alt="WhatsApp Pairing QR Code"
                        className="w-56 h-56 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-56 h-56 rounded-2xl bg-white border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 size={22} className="animate-spin text-blue-600" />
                      <span>Generating pairing QR code...</span>
                    </div>
                  )}

                  {secondsLeft !== null && (
                    <p className="text-[11px] text-slate-500 font-medium">
                      {secondsLeft > 0
                        ? `QR expires in ${secondsLeft}s`
                        : "QR expired — click Regenerate QR below."}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    disabled={refreshingQr}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={refreshingQr ? "animate-spin" : ""} />
                    <span>{refreshingQr ? "Refreshing..." : "Regenerate QR"}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSendInvoice} className="space-y-4">
              {/* Connected Account Banner */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-emerald-900">
                  <Smartphone size={15} className="text-emerald-700" />
                  <div>
                    <span className="font-bold block">WhatsApp Connected</span>
                    {waState.phoneNumber && (
                      <span className="text-[11px] font-mono text-emerald-700">{waState.phoneNumber}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRefreshQr}
                    disabled={refreshingQr || disconnecting}
                    className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer inline-flex items-center gap-1"
                  >
                    <Unplug size={11} />
                    <span>{disconnecting ? "Disconnecting..." : "Disconnect"}</span>
                  </button>
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F8FBFF] border border-[#DCEAFE] text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Invoice No</span>
                  <span className="font-mono font-bold text-[#0F2747]">{invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Customer</span>
                  <span className="font-semibold text-[#0F2747] truncate block">{customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total</span>
                  <span className="font-mono font-bold text-[#0F2747]">
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Customer WhatsApp Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Editable Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message (Editable)
                </label>
                <textarea
                  rows={5}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Customer Consent & Rate Notice */}
              <label className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customerConsent}
                  onChange={(e) => setCustomerConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600"
                />
                <span>
                  Customer consented to receive invoice <strong>{invoiceNumber}</strong> on WhatsApp. Unofficial WhatsApp Web sessions apply conservative sending limits.
                </span>
              </label>

              {sendResult?.type === "success" && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{sendResult.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{sending ? "Sending PDF..." : "Send Invoice"}</span>
                </button>
              </div>

              {/* Invoice-level Message History */}
              {invoiceId && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#0F2747] uppercase tracking-wider">
                      Invoice WhatsApp History
                    </span>
                    {loadingHistory && <Loader2 size={12} className="animate-spin text-slate-400" />}
                  </div>
                  {messageHistory.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      No WhatsApp sends recorded for this invoice yet.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {messageHistory.map((m) => (
                        <div
                          key={m.id}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-semibold text-slate-800 truncate">
                              {m.customerPhone}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {new Date(m.createdAt).toLocaleString("en-IN")}
                            </div>
                            {m.errorMessage && (
                              <div className="text-[10px] text-rose-600 truncate">
                                {m.errorMessage}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.messageStatus === "SENT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : m.messageStatus === "FAILED"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {m.messageStatus === "SENT" ? "Sent" : m.messageStatus}
                            </span>
                            {m.messageStatus === "FAILED" && (
                              <button
                                type="button"
                                onClick={() => handleRetryMessage(m)}
                                disabled={retryingId === m.id}
                                className="px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                {retryingId === m.id ? "Retrying..." : "Retry"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
