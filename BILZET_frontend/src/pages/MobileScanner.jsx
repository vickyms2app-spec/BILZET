import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Smartphone,
  Scan,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Search,
  Power,
  ShieldCheck,
  Building2,
  ArrowRight,
  LogOut,
  Camera,
} from "lucide-react";
import { scannerApi } from "../api";

// Subtle Web Audio Feedback chime
const playAudioBeep = (type = "success") => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 note
      osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.1); // E6 note
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (e) {
    // Audio context may be suspended or blocked
  }
};

const STORAGE_KEY = "bilzet_paired_scanner_device";

export default function MobileScanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pairTokenFromUrl = searchParams.get("pairToken");
  const businessIdFromUrl = searchParams.get("businessId");

  // Device & Connection State
  const [deviceData, setDeviceData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const [connectionStatus, setConnectionStatus] = useState("connecting"); // 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'revoked'
  const [statusMessage, setStatusMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [sendingManual, setSendingManual] = useState(false);
  const [recentTransmissions, setRecentTransmissions] = useState([]);
  const [lastScanAlert, setLastScanAlert] = useState(null);

  // Camera State (Must remain OFF by default until user taps "Start Scanning")
  const [isScanning, setIsScanning] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScannedCodeRef = useRef("");
  const lastScanTimeRef = useRef(0);

  // 1. Initial Connection or First-Time Pairing
  useEffect(() => {
    let isMounted = true;

    async function initConnection() {
      // Case A: QR Code scan with fresh pairToken
      if (pairTokenFromUrl && businessIdFromUrl) {
        setConnectionStatus("connecting");
        setStatusMessage("Authorizing mobile device with BILZET Core...");
        try {
          const authRes = await scannerApi.verifyPair({
            pairToken: pairTokenFromUrl,
            businessId: businessIdFromUrl,
            deviceInfo: {
              deviceName: `${navigator.platform || "Mobile"} Scanner`,
              platform: navigator.platform || "Mobile",
            },
          });

          if (isMounted) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(authRes));
            setDeviceData(authRes);
            setConnectionStatus("connected");
            setStatusMessage(`Device authorized permanently for ${authRes.businessName || "Store"}`);
            // Clean URL query parameters so refresh doesn't replay the pairToken
            setSearchParams({}, { replace: true });
          }
        } catch (err) {
          console.error("Pairing verification failed:", err);
          if (isMounted) {
            setConnectionStatus("disconnected");
            setStatusMessage(
              err?.response?.data?.message ||
                err.message ||
                "Failed to authorize device. Please scan a fresh QR code from your laptop."
            );
          }
        }
        return;
      }

      // Case B: Subsequent visit — Auto-reconnect using saved device credentials
      const saved = deviceData || (() => {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY));
        } catch (_) {
          return null;
        }
      })();

      if (saved?.deviceId && saved?.deviceToken && saved?.businessId) {
        setConnectionStatus("connecting");
        setStatusMessage("Reconnecting to BILZET Billing session...");
        try {
          const reconRes = await scannerApi.reconnect({
            deviceId: saved.deviceId,
            deviceToken: saved.deviceToken,
            businessId: saved.businessId,
          });

          if (isMounted) {
            setConnectionStatus("connected");
            setStatusMessage(`Connected to ${reconRes.businessName || saved.businessName || "Billing Session"}`);
          }
        } catch (err) {
          console.warn("Reconnection failed:", err);
          if (isMounted) {
            if (err?.response?.status === 401 || err?.response?.data?.message?.includes("revoked")) {
              setConnectionStatus("revoked");
              setStatusMessage("This device authorization was revoked by the laptop billing operator. Please scan the QR code again to pair.");
              localStorage.removeItem(STORAGE_KEY);
              setDeviceData(null);
            } else {
              setConnectionStatus("reconnecting");
              setStatusMessage("Connection temporary lost. Tap reconnect below.");
            }
          }
        }
      } else {
        // No stored credentials and no QR token
        if (isMounted) {
          setConnectionStatus("disconnected");
          setStatusMessage("This device is not paired yet. Open Billing on your laptop, click 'Connect Mobile Scanner', and scan the QR code.");
        }
      }
    }

    initConnection();

    return () => {
      isMounted = false;
    };
  }, [pairTokenFromUrl, businessIdFromUrl]);

  // 2. Camera Controls (Active only when user taps "Start Scanning")
  const startCamera = async () => {
    setIsScanning(true);
    setCameraLoading(true);
    setCameraError("");
    setTorchOn(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access is not supported by your browser. You can enter barcodes manually below.");
      setCameraLoading(false);
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }

      // Check Torch & Zoom support
      try {
        const track = stream.getVideoTracks()?.[0];
        if (track && typeof track.getCapabilities === "function") {
          const caps = track.getCapabilities();
          if ("torch" in caps) setTorchSupported(true);
          if ("zoom" in caps) setZoomSupported(true);
        }
      } catch (_) {}

      setCameraLoading(false);
      initBarcodeDetection();
    } catch (err) {
      console.warn("Camera init error:", err);
      setCameraLoading(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please enable camera access in your browser settings.");
      } else if (err.name === "NotReadableError") {
        setCameraError("Camera is currently in use by another app. Please close other camera apps and retry.");
      } else {
        setCameraError(`Camera error: ${err.message || "Unknown error"}. Use manual barcode input.`);
      }
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    try {
      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track) return;
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch (err) {
      console.warn("Torch error:", err);
    }
  };

  // Apply Zoom
  const applyZoom = async (lvl) => {
    try {
      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track) return;
      await track.applyConstraints({ advanced: [{ zoom: lvl }] });
      setZoomLevel(lvl);
    } catch (err) {
      console.warn("Zoom error:", err);
    }
  };

  // 3. Continuous Barcode Recognition & Transmission Loop
  const initBarcodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    if ("BarcodeDetector" in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "itf"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const raw = barcodes[0].rawValue;
                if (raw) {
                  transmitBarcode(raw);
                }
              }
            } catch (_) {}
          }
        }, 280);
      } catch (e) {
        console.warn("BarcodeDetector init note:", e);
      }
    }
  };

  // 4. Transmit Barcode to Laptop Billing Operator
  const transmitBarcode = async (rawCode) => {
    const code = (rawCode || "").trim();
    if (!code) return;

    // Throttle identical barcode within 2.5s
    const now = Date.now();
    if (lastScannedCodeRef.current === code && now - lastScanTimeRef.current < 2500) {
      return;
    }

    lastScannedCodeRef.current = code;
    lastScanTimeRef.current = now;

    if (!deviceData?.deviceId || !deviceData?.deviceToken || !deviceData?.businessId) {
      setLastScanAlert({
        type: "error",
        message: "Device not authorized. Please re-pair with QR code.",
      });
      return;
    }

    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    try {
      playAudioBeep("success");
      setLastScanAlert({
        type: "success",
        message: `Transmitted "${code}" to Laptop Billing!`,
        code,
      });

      setRecentTransmissions((prev) => [
        {
          code,
          time: new Date().toLocaleTimeString(),
          id: scanId,
        },
        ...prev.slice(0, 9),
      ]);

      await scannerApi.sendScan({
        deviceId: deviceData.deviceId,
        deviceToken: deviceData.deviceToken,
        businessId: deviceData.businessId,
        barcode: code,
        scanId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Barcode transmission error:", err);
      playAudioBeep("error");
      if (err?.response?.status === 401) {
        setConnectionStatus("revoked");
        setStatusMessage("Device revoked by laptop. Please scan QR code again.");
        stopCamera();
      } else {
        setLastScanAlert({
          type: "error",
          message: "Failed to reach server. Please check internet connection.",
          code,
        });
      }
    }
  };

  // Manual Code Send Handler
  const handleManualSend = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setSendingManual(true);
    await transmitBarcode(manualCode.trim());
    setManualCode("");
    setSendingManual(false);
  };

  // Disconnect / Unpair Handler
  const handleDisconnect = async () => {
    if (window.confirm("Are you sure you want to disconnect this mobile scanner? You will need to scan the QR code again to pair.")) {
      stopCamera();
      try {
        if (deviceData?.deviceId && deviceData?.businessId) {
          await scannerApi.disconnect({
            deviceId: deviceData.deviceId,
            businessId: deviceData.businessId,
          });
        }
      } catch (_) {}
      localStorage.removeItem(STORAGE_KEY);
      setDeviceData(null);
      setConnectionStatus("disconnected");
      setStatusMessage("Device disconnected. Scan pairing QR on desktop to reconnect.");
    }
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F6F8] text-[#111318] flex flex-col font-['Inter',sans-serif]">
      {/* Mobile App Header */}
      <header className="bg-[#12151C] text-white px-4 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 text-[#5BF07B] flex items-center justify-center font-bold">
            <Smartphone size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">BILZET Mobile Scanner</h1>
            <p className="text-[11px] text-[#A9ABB5] truncate max-w-[200px]">
              {deviceData?.businessName || "Store Terminal"}
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              connectionStatus === "connected"
                ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                : connectionStatus === "connecting" || connectionStatus === "reconnecting"
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-rose-100 text-[#E5484D] border-rose-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-[#5BF07B] animate-pulse"
                  : connectionStatus === "connecting" || connectionStatus === "reconnecting"
                  ? "bg-amber-500 animate-spin"
                  : "bg-[#E5484D]"
              }`}
            />
            <span className="capitalize">{connectionStatus}</span>
          </span>

          {deviceData && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition"
              title="Disconnect device"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 max-w-lg w-full mx-auto space-y-4">
        {/* Status Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 border shadow-2xs ${
              connectionStatus === "connected"
                ? "bg-white text-[#111318] border-[#E7E8EC]"
                : connectionStatus === "revoked"
                ? "bg-rose-50 text-[#E5484D] border-rose-200"
                : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            {connectionStatus === "connected" ? (
              <ShieldCheck size={18} className="text-[#5BF07B] shrink-0" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <p className="flex-1 leading-snug font-medium">{statusMessage}</p>
          </div>
        )}

        {/* Live Feedback Notification Banner */}
        {lastScanAlert && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border animate-in fade-in slide-in-from-top-2 ${
              lastScanAlert.type === "success"
                ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                : "bg-rose-100 text-[#E5484D] border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {lastScanAlert.type === "success" ? (
                <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span className="truncate">{lastScanAlert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setLastScanAlert(null)}
              className="text-current opacity-60 hover:opacity-100 p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Primary Action: Camera Scanning Area */}
        <section className="bg-white rounded-[24px] border border-[#E7E8EC] overflow-hidden shadow-fintech space-y-3">
          {/* Active Camera Viewport or Idle Dashboard */}
          {isScanning ? (
            <div className="relative bg-[#12151C] aspect-4/3 w-full flex items-center justify-center overflow-hidden">
              {cameraLoading ? (
                <div className="text-center text-[#A9ABB5] space-y-2">
                  <RefreshCw size={28} className="animate-spin text-[#5BF07B] mx-auto" />
                  <p className="text-xs font-medium">Starting mobile camera stream...</p>
                </div>
              ) : cameraError ? (
                <div className="p-5 text-center text-white space-y-2.5">
                  <AlertCircle size={28} className="text-[#E5484D] mx-auto" />
                  <p className="text-xs leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-xl bg-white text-[#111318] text-xs font-bold"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Centered Reticle & Laser Beam */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-40 border-2 border-[#5BF07B]/80 rounded-2xl relative shadow-[0_0_24px_rgba(91,240,123,0.35)] overflow-hidden">
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#5BF07B] to-transparent shadow-[0_0_12px_#5BF07B] animate-scan-laser pointer-events-none" />
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#5BF07B] rounded-tl-sm" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#5BF07B] rounded-tr-sm" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#5BF07B] rounded-bl-sm" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#5BF07B] rounded-br-sm" />
                    </div>
                  </div>

                  {/* Top Viewport Controls: Flashlight & Zoom */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                    {torchSupported ? (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition backdrop-blur-md cursor-pointer ${
                          torchOn
                            ? "bg-[#5BF07B] text-[#0E2A16] border border-[#5BF07B]"
                            : "bg-black/60 text-white border border-white/20 hover:bg-black/80"
                        }`}
                      >
                        {torchOn ? <Zap size={13} className="fill-current" /> : <ZapOff size={13} />}
                        <span>{torchOn ? "Torch ON" : "Torch"}</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {zoomSupported && (
                      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/20">
                        {[1, 2].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => applyZoom(lvl)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                              zoomLevel === lvl
                                ? "bg-[#5BF07B] text-[#0E2A16]"
                                : "text-white/80 hover:text-white"
                            }`}
                          >
                            {lvl}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Scan Prompt */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-center text-[11px] text-white/90 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                    Point camera at barcode · Auto-transmits to laptop
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Idle Dashboard (Camera OFF by default) */
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#EDEDEF] text-[#111318] flex items-center justify-center mx-auto border border-[#E7E8EC] shadow-xs">
                <Scan size={32} />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#111318]">
                  {connectionStatus === "connected"
                    ? "Scanner Ready to Scan"
                    : "Mobile Scanner Standby"}
                </h2>
                <p className="text-xs text-[#7C7F8A] max-w-xs mx-auto">
                  Camera is turned off to save battery. Tap below to start the camera and scan physical products.
                </p>
              </div>

              {connectionStatus === "connected" && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFFFE6] text-[#0E2A16] border border-[#5BF07B]/40 text-xs font-semibold">
                  <ShieldCheck size={14} className="text-[#0E2A16]" />
                  <span>Authenticated as Authorized Scanner</span>
                </div>
              )}
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="p-4 pt-0">
            {isScanning ? (
              <button
                type="button"
                onClick={stopCamera}
                className="w-full py-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-[#E5484D] font-bold text-sm transition flex items-center justify-center gap-2 border border-rose-200 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <Power size={18} />
                <span>Stop Camera Scanning</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                disabled={connectionStatus !== "connected"}
                className="w-full py-3.5 rounded-2xl bg-[#12151C] hover:bg-black disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-fintech cursor-pointer active:scale-[0.99]"
              >
                <Camera size={18} className="text-[#5BF07B]" />
                <span>Start Scanning</span>
              </button>
            )}
          </div>
        </section>

        {/* Manual Barcode Entry Fallback */}
        <section className="bg-white rounded-[24px] border border-[#E7E8EC] p-4 space-y-2.5 shadow-2xs">
          <label className="block text-xs font-bold text-[#111318]">
            Manual Barcode Entry (Optional)
          </label>
          <form onSubmit={handleManualSend} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-[#7C7F8A]" />
              <input
                type="text"
                placeholder="Type or paste barcode..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-[#F6F6F8] border border-[#E7E8EC] rounded-xl outline-none focus:border-[#5BF07B] font-mono text-[#111318]"
              />
            </div>
            <button
              type="submit"
              disabled={sendingManual || !manualCode.trim() || connectionStatus !== "connected"}
              className="px-4 py-2 bg-[#12151C] hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              {sendingManual ? "Sending…" : "Send"}
            </button>
          </form>
        </section>

        {/* Recent Transmissions Log */}
        {recentTransmissions.length > 0 && (
          <section className="bg-white rounded-[24px] border border-[#E7E8EC] p-4 space-y-2.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111318] uppercase tracking-wider">
              Recent Transmitted Barcodes ({recentTransmissions.length})
            </h3>
            <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-none">
              {recentTransmissions.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#F6F6F8] border border-[#E7E8EC] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-[#0E2A16]" />
                    <span className="font-mono font-bold text-[#111318]">{scan.code}</span>
                  </div>
                  <span className="text-[10px] text-[#7C7F8A]">{scan.time}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
