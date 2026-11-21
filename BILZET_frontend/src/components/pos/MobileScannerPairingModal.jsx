import { useEffect, useState } from "react";
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Zap,
  Radio,
} from "lucide-react";
import { scannerApi } from "../../api";

export default function MobileScannerPairingModal({
  isOpen,
  onClose,
  pairedDevices = [],
  activeDevice = null,
  connectionStatus = "disconnected", // 'connected' | 'reconnecting' | 'disconnected'
  onDeviceRevoked = null,
  onDeviceDisconnected = null,
  recentScans = [],
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pairSession, setPairSession] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showQrView, setShowQrView] = useState(false);

  // Fetch or generate QR code session
  const generatePairSession = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await scannerApi.createPairRequest();
      setPairSession(res);
      setShowQrView(true);
    } catch (err) {
      console.error("Pairing request failed:", err);
      setError(err?.response?.data?.message || err.message || "Failed to generate pairing session");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (pairedDevices.length === 0 || !activeDevice) {
        generatePairSession();
      } else {
        setShowQrView(false);
      }
    }
  }, [isOpen, pairedDevices.length, activeDevice]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!pairSession?.pairingUrl) return;
    navigator.clipboard.writeText(pairSession.pairingUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#F6F6F8] rounded-[24px] max-w-lg w-full overflow-hidden shadow-fintech border border-[#E7E8EC] animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-[#12151C] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#5BF07B] shadow-xs">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Mobile Barcode Scanner</h3>
              <p className="text-[11px] text-[#A9ABB5]">
                One-time persistent device pairing · Auto-reconnects
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

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Connection Status Pill Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E7E8EC] shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                {connectionStatus === "connected" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5BF07B] opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    connectionStatus === "connected"
                      ? "bg-[#5BF07B]"
                      : connectionStatus === "reconnecting"
                      ? "bg-amber-400"
                      : "bg-[#A9ABB5]"
                  }`}
                />
              </span>
              <div>
                <p className="text-xs font-bold text-[#111318]">
                  {connectionStatus === "connected"
                    ? "Mobile Scanner Connected"
                    : connectionStatus === "reconnecting"
                    ? "Reconnecting Mobile Scanner..."
                    : "No Scanner Connected"}
                </p>
                <p className="text-[11px] text-[#7C7F8A]">
                  {activeDevice
                    ? `Paired Device: ${activeDevice.deviceName}`
                    : "Scan QR code to authorize mobile device"}
                </p>
              </div>
            </div>

            {/* View Switcher Button */}
            {pairedDevices.length > 0 && (
              <button
                type="button"
                onClick={() => setShowQrView(!showQrView)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[#E7E8EC] bg-[#F6F6F8] hover:bg-white text-[#111318] transition cursor-pointer"
              >
                {showQrView ? "View Paired Device" : "+ Pair New Device"}
              </button>
            )}
          </div>

          {/* Active Device Info Card (When Paired & Not in QR Mode) */}
          {!showQrView && activeDevice && (
            <div className="p-4 rounded-2xl bg-white border border-[#E7E8EC] space-y-3.5 shadow-2xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 flex items-center justify-center font-bold">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111318]">{activeDevice.deviceName}</h4>
                    <p className="text-[11px] text-[#7C7F8A]">
                      Platform: {activeDevice.platform || "Mobile"} · Status:{" "}
                      <span className="font-semibold text-[#0E2A16] bg-[#DFFFE6] px-1.5 py-0.5 rounded">
                        Authorized
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#7C7F8A]">
                  <span>Last active:</span>
                  <span className="block font-medium text-[#111318]">
                    {activeDevice.lastActiveAt
                      ? new Date(activeDevice.lastActiveAt).toLocaleTimeString()
                      : "Just now"}
                  </span>
                </div>
              </div>

              {/* Status Explanation */}
              <div className="p-2.5 rounded-xl bg-[#F6F6F8] border border-[#E7E8EC] text-xs text-[#7C7F8A] leading-relaxed flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#5BF07B] shrink-0" />
                <span>
                  This device is authorized for this store. On your phone, tap{" "}
                  <strong className="text-[#111318]">Start Scanning</strong> to transmit barcodes in real-time.
                </span>
              </div>

              {/* Device Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E7E8EC]">
                <button
                  type="button"
                  onClick={() => onDeviceDisconnected && onDeviceDisconnected(activeDevice.deviceId)}
                  className="px-3 py-1.5 rounded-xl border border-[#E7E8EC] text-xs font-semibold text-[#7C7F8A] hover:bg-[#F6F6F8] hover:text-[#111318] transition cursor-pointer"
                >
                  Disconnect Session
                </button>

                <button
                  type="button"
                  onClick={() => onDeviceRevoked && onDeviceRevoked(activeDevice.deviceId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#E5484D] text-xs font-bold transition cursor-pointer"
                  title="Revoke device credentials permanently"
                >
                  <Trash2 size={13} />
                  <span>Revoke Device</span>
                </button>
              </div>
            </div>
          )}

          {/* QR Code First-Time Pairing View */}
          {(showQrView || pairedDevices.length === 0) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E7E8EC] text-center space-y-4 shadow-2xs">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#111318]">
                  Scan QR with Mobile Phone Camera
                </h4>
                <p className="text-xs text-[#7C7F8A]">
                  One-time authorization. Your phone will auto-reconnect on future visits.
                </p>
              </div>

              {loading ? (
                <div className="py-12 text-center text-[#7C7F8A] space-y-2">
                  <RefreshCw size={26} className="animate-spin text-[#12151C] mx-auto" />
                  <p className="text-xs font-medium">Generating secure pairing token...</p>
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#E5484D] space-y-2">
                  <AlertCircle size={20} className="mx-auto" />
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={generatePairSession}
                    className="px-3 py-1 rounded-lg bg-[#12151C] text-white text-xs font-semibold cursor-pointer"
                  >
                    Retry QR
                  </button>
                </div>
              ) : pairSession?.qrDataUrl ? (
                <div className="space-y-3">
                  <div className="inline-block p-3 rounded-2xl bg-white border-2 border-[#12151C]/10 shadow-md">
                    <img
                      src={pairSession.qrDataUrl}
                      alt="Mobile Scanner Pairing QR Code"
                      className="w-52 h-52 sm:w-60 sm:h-60 mx-auto object-contain"
                    />
                  </div>

                  {/* Manual Link Copy Option */}
                  <div className="flex items-center gap-2 max-w-sm mx-auto">
                    <input
                      type="text"
                      readOnly
                      value={pairSession.pairingUrl || ""}
                      className="flex-1 px-3 py-1.5 text-[11px] font-mono bg-[#F6F6F8] border border-[#E7E8EC] rounded-xl text-[#7C7F8A] truncate outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-xl bg-[#12151C] text-white text-xs font-semibold hover:bg-black transition cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {copiedUrl ? <Check size={13} className="text-[#5BF07B]" /> : <Copy size={13} />}
                      <span>{copiedUrl ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[#A9ABB5]">
                    Pairing token expires in 15 minutes. Once paired, you will never need to scan again.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Real-time Incoming Scans Log */}
          {recentScans.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#7C7F8A] uppercase tracking-wider">
                Recent Scans from Mobile ({recentScans.length}):
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-none">
                {recentScans.slice(0, 5).map((scan, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E7E8EC] text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 size={14} className="text-[#0E2A16] shrink-0" />
                      <span className="font-semibold text-[#111318] truncate">
                        {scan.productName || scan.barcode}
                      </span>
                      <span className="text-[10px] text-[#7C7F8A] font-mono">({scan.barcode})</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-[#7C7F8A]">
                        {scan.time ? new Date(scan.time).toLocaleTimeString() : "Just now"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Close */}
          <div className="pt-2 border-t border-[#E7E8EC] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#12151C] hover:bg-black text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
