import { useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  AlertCircle,
  CheckCircle2,
  Scan,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
  HelpCircle,
} from "lucide-react";
import { productsApi } from "../../api";

// Subtle pleasant feedback sounds via Web Audio API
const playFeedbackSound = (type = "success") => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); // E6 note
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Silent fail if blocked
  }
};

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onProductScanned,
  availableProducts = [],
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScannedCodeRef = useRef("");
  const lastScanTimeRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [scanStatus, setScanStatus] = useState({ type: "", message: "" });
  const [recentScans, setRecentScans] = useState([]);

  // Process code (from camera or manual input)
  const processBarcode = async (codeRaw) => {
    const code = (codeRaw || "").trim();
    if (!code) return;

    // Throttle identical barcode within 2.5 seconds to prevent runaway duplicate scans
    const now = Date.now();
    if (
      lastScannedCodeRef.current === code &&
      now - lastScanTimeRef.current < 2500
    ) {
      return;
    }

    lastScannedCodeRef.current = code;
    lastScanTimeRef.current = now;
    setSearching(true);

    try {
      // 1. Fast match from currently loaded products (by barcode, SKU, code, or ID)
      const normalizedCode = code.toLowerCase();
      let matchedProduct = availableProducts.find((p) => {
        const pBarcode = (p.barcode || "").toLowerCase();
        const pSku = (p.sku || "").toLowerCase();
        const pCode = (p.code || "").toLowerCase();
        const pId = String(p.id || p._id || "").toLowerCase();
        return (
          pBarcode === normalizedCode ||
          pSku === normalizedCode ||
          pCode === normalizedCode ||
          pId === normalizedCode
        );
      });

      // 2. Fallback: Query backend API by barcode if not in initial 100 cache
      if (!matchedProduct) {
        try {
          const apiRes = await productsApi.barcode(code);
          if (apiRes && (apiRes.id || apiRes._id || apiRes.product)) {
            matchedProduct = apiRes.product || apiRes;
          }
        } catch (apiErr) {
          // not found in backend either
        }
      }

      if (matchedProduct) {
        playFeedbackSound("success");
        setScanStatus({
          type: "success",
          message: `Added "${matchedProduct.name}" · ₹${matchedProduct.sellingPrice || matchedProduct.price || 0}`,
        });
        setRecentScans((prev) => [
          {
            code,
            name: matchedProduct.name,
            price: matchedProduct.sellingPrice || matchedProduct.price || 0,
            time: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 4),
        ]);

        if (onProductScanned) {
          onProductScanned(matchedProduct);
        }
      } else {
        playFeedbackSound("error");
        setScanStatus({
          type: "error",
          message: `Product not found for barcode / SKU "${code}".`,
        });
      }
    } catch (err) {
      console.error("Barcode lookup failed:", err);
      setScanStatus({
        type: "error",
        message: "Product lookup failed. Please retry.",
      });
    } finally {
      setSearching(false);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError("");

    // Stop any existing tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Camera access is not supported by your browser or environment. You can enter or scan the barcode manually below."
      );
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

      setCameraActive(true);
      setCameraLoading(false);

      // Start Barcode detection loop
      initBarcodeDetection();
    } catch (err) {
      console.warn("Camera init error:", err);
      setCameraLoading(false);
      setCameraActive(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera access in your browser address bar/settings to scan barcodes."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError(
          "No camera hardware detected on this device. You can type or paste the barcode manually below."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError(
          "The camera is currently locked or in use by another program. Please close other camera apps and retry."
        );
      } else {
        setCameraError(
          `Unable to access camera: ${err.message || "Unknown error"}. Use manual barcode entry below.`
        );
      }
    }
  };

  // Detection loop using native BarcodeDetector if available
  const initBarcodeDetection = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    if ("BarcodeDetector" in window) {
      try {
        const barcodeDetector = new window.BarcodeDetector({
          formats: [
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "qr_code",
            "itf",
          ],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (
            videoRef.current &&
            videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
          ) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const raw = barcodes[0].rawValue;
                if (raw) {
                  processBarcode(raw);
                }
              }
            } catch (detectionErr) {
              // Frame dropped or unreadable, continue loop
            }
          }
        }, 280);
      } catch (e) {
        console.warn("BarcodeDetector initialization note:", e);
      }
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScanStatus({ type: "", message: "" });
      setManualCode("");
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Scan size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Live Camera Barcode Scanner</h3>
              <p className="text-[11px] text-slate-400">
                Point camera at product barcode or enter SKU
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Close scanner"
          >
            <X size={16} />
          </button>
        </div>

        {/* Camera Viewport & Overlay */}
        <div className="relative bg-slate-950 aspect-4/3 max-h-72 w-full flex items-center justify-center overflow-hidden">
          {cameraLoading ? (
            <div className="text-center text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin text-blue-500 mx-auto" />
              <p className="text-xs font-medium">Requesting camera access...</p>
            </div>
          ) : cameraError ? (
            <div className="p-6 text-center max-w-sm space-y-3">
              <AlertCircle size={32} className="text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw size={13} />
                <span>Retry Camera</span>
              </button>
            </div>
          ) : (
            <>
              {/* Active Video Stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Scanning Target Reticle & Red Laser Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-dashed border-blue-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  {/* Laser Scanning Line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-bounce" />

                  {/* Corner Targets */}
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-400" />
                </div>
              </div>

              {/* Continuous Scanner Badge */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Scanner Ready · Continuous Mode</span>
                </span>
                <span className="text-white/60">Hold steady</span>
              </div>
            </>
          )}
        </div>

        {/* Live Feedback Banner */}
        {scanStatus.message && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              scanStatus.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {scanStatus.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
            )}
            <span className="truncate">{scanStatus.message}</span>
          </div>
        )}

        {/* Manual Barcode / USB Gun Input Section */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Manual Barcode / SKU / USB Scanner Input
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processBarcode(manualCode);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type barcode or scan with USB gun..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-medium focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !manualCode.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {searching ? "Searching…" : "Add"}
              </button>
            </form>
          </div>

          {/* Quick Click Chips for Products with Barcodes (For testing/convenience) */}
          {availableProducts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Test From Catalog:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {availableProducts.slice(0, 6).map((p) => {
                  const code = p.barcode || p.sku || p.code || p.id;
                  return (
                    <button
                      key={p.id || p._id}
                      type="button"
                      onClick={() => processBarcode(code)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-[11px] font-medium text-slate-700 transition"
                      title={`Add ${p.name}`}
                    >
                      {p.name} ({code})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Scans in this session */}
          {recentScans.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Scanned in This Session ({recentScans.length}):
              </p>
              <div className="space-y-1">
                {recentScans.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {item.name}
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{item.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">
              Products are automatically added to active cart.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              Done Scanning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
