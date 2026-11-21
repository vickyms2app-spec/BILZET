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
  Zap,
  ZapOff,
  ZoomIn,
  PackagePlus,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { productsApi } from "../../api";

// Feedback sound chimes using Web Audio API
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
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (e) {
    // Audio context may be muted or blocked by user gesture policy
  }
};

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onProductScanned,
  onRegisterNewProduct,
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
  const [scanStatus, setScanStatus] = useState({ type: "", message: "", product: null, barcode: "" });
  const [recentScans, setRecentScans] = useState([]);

  // Hardware controls: Torch (flashlight) & Zoom
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 3, step: 0.5 });

  // Inspect stream track capabilities once video is active
  const checkTrackCapabilities = (stream) => {
    try {
      const track = stream?.getVideoTracks()?.[0];
      if (!track) return;

      if (typeof track.getCapabilities === "function") {
        const capabilities = track.getCapabilities();
        if ("torch" in capabilities) {
          setTorchSupported(true);
        }
        if ("zoom" in capabilities) {
          setZoomSupported(true);
          setZoomRange({
            min: capabilities.zoom.min || 1,
            max: capabilities.zoom.max || 3,
            step: capabilities.zoom.step || 0.5,
          });
        }
      }
    } catch (e) {
      console.warn("Capabilities detection note:", e);
    }
  };

  // Toggle Flashlight / Torch
  const toggleTorch = async () => {
    try {
      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track) return;
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn("Flashlight constraint error:", err);
    }
  };

  // Adjust Camera Zoom
  const applyZoom = async (newZoom) => {
    try {
      const track = streamRef.current?.getVideoTracks()?.[0];
      if (!track) return;
      await track.applyConstraints({
        advanced: [{ zoom: newZoom }],
      });
      setZoomLevel(newZoom);
    } catch (err) {
      console.warn("Zoom constraint error:", err);
    }
  };

  // Process Scanned or Manually Entered Barcode
  const processBarcode = async (codeRaw) => {
    const code = (codeRaw || "").trim();
    if (!code) return;

    // Throttle identical barcode within 2.5s to prevent runaway duplicate triggers
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
      // 1. Fast match from local memory catalog (by barcode, SKU, code, or ID)
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

      // 2. Fallback: Query backend API if not in initial local list
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
        // Delegate to invoice cart
        let addResult = { success: true };
        if (onProductScanned) {
          addResult = onProductScanned(matchedProduct) || { success: true };
        }

        if (addResult.success === false) {
          playFeedbackSound("error");
          setScanStatus({
            type: "warning",
            message: addResult.reason || `Insufficient stock for "${matchedProduct.name}".`,
            product: matchedProduct,
            barcode: code,
          });
        } else {
          playFeedbackSound("success");
          const rate = matchedProduct.sellingPrice || matchedProduct.price || 0;
          setScanStatus({
            type: "success",
            message: `Added "${matchedProduct.name}" · ₹${rate}${addResult.qty ? ` (Qty: ${addResult.qty})` : ""}`,
            product: matchedProduct,
            barcode: code,
          });

          setRecentScans((prev) => [
            {
              code,
              name: matchedProduct.name,
              price: rate,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            },
            ...prev.slice(0, 4),
          ]);
        }
      } else {
        playFeedbackSound("error");
        setScanStatus({
          type: "not_found",
          message: `Product Not Found for barcode "${code}".`,
          product: null,
          barcode: code,
        });
      }
    } catch (err) {
      console.error("Barcode lookup failed:", err);
      setScanStatus({
        type: "error",
        message: "Product lookup failed. Please retry or enter manually.",
        product: null,
        barcode: code,
      });
    } finally {
      setSearching(false);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError("");
    setTorchOn(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Camera access is not supported by this browser environment. You can enter barcodes manually or use a USB scanner below."
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

      checkTrackCapabilities(stream);
      setCameraActive(true);
      setCameraLoading(false);

      initBarcodeDetection();
    } catch (err) {
      console.warn("Camera init error:", err);
      setCameraLoading(false);
      setCameraActive(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was denied. Please allow camera permissions in your browser or device settings to scan barcodes."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError(
          "No camera hardware detected on this device. You can type or paste the barcode manually below."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError(
          "The camera is currently locked by another application. Please close other camera apps and retry."
        );
      } else {
        setCameraError(
          `Unable to access camera: ${err.message || "Unknown error"}. Use manual barcode entry below.`
        );
      }
    }
  };

  // Continuous Barcode Detection Loop (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR)
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
              // Frame dropped or unreadable, continue continuous loop
            }
          }
        }, 280);
      } catch (e) {
        console.warn("BarcodeDetector initialization note:", e);
      }
    }
  };

  // Stop Camera
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
      setScanStatus({ type: "", message: "", product: null, barcode: "" });
      setManualCode("");
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#F6F6F8] rounded-[24px] max-w-lg w-full overflow-hidden shadow-fintech border border-[#E7E8EC] animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-[#12151C] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#5BF07B] shadow-xs">
              <Scan size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Mobile Camera Barcode Scanner</h3>
              <p className="text-[11px] text-[#A9ABB5]">
                Align barcode within frame · Continuous auto-scan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#A9ABB5] hover:text-white transition cursor-pointer"
            title="Close scanner"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Camera Viewport with Frame & Controls */}
        <div className="relative bg-[#12151C] aspect-4/3 max-h-76 w-full flex items-center justify-center overflow-hidden">
          {cameraLoading ? (
            <div className="text-center text-[#A9ABB5] space-y-2">
              <RefreshCw size={26} className="animate-spin text-[#5BF07B] mx-auto" />
              <p className="text-xs font-medium">Starting mobile camera preview...</p>
            </div>
          ) : cameraError ? (
            <div className="p-6 text-center max-w-sm space-y-3">
              <AlertCircle size={32} className="text-[#E5484D] mx-auto" />
              <p className="text-xs text-white leading-relaxed font-medium">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-3.5 py-1.5 rounded-xl bg-[#12151C] hover:bg-black text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-fintech border border-[#5BF07B]/40 cursor-pointer"
              >
                <RefreshCw size={13} className="text-[#5BF07B]" />
                <span>Retry Camera</span>
              </button>
            </div>
          ) : (
            <>
              {/* Active Live Video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Overlay with Darkened Vignette */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Centered Barcode Scanning Frame */}
                <div className="w-64 h-40 sm:w-72 sm:h-44 border-2 border-[#5BF07B]/80 rounded-2xl relative shadow-[0_0_24px_rgba(91,240,123,0.35)] overflow-hidden">
                  {/* Animated Laser Scanning Line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#5BF07B] to-transparent shadow-[0_0_12px_#5BF07B] animate-scan-laser pointer-events-none" />

                  {/* Corner Target Accents */}
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#5BF07B] rounded-tl-sm" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#5BF07B] rounded-tr-sm" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#5BF07B] rounded-bl-sm" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#5BF07B] rounded-br-sm" />
                </div>
              </div>

              {/* Top Controls Overlay: Flashlight (Torch) & Zoom */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                {/* Flashlight Toggle */}
                {torchSupported ? (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-md backdrop-blur-md cursor-pointer ${
                      torchOn
                        ? "bg-[#5BF07B] text-[#0E2A16] border border-[#5BF07B]"
                        : "bg-black/60 text-white border border-white/20 hover:bg-black/80"
                    }`}
                    title={torchOn ? "Turn Flashlight OFF" : "Turn Flashlight ON"}
                  >
                    {torchOn ? <Zap size={14} className="fill-current" /> : <ZapOff size={14} />}
                    <span>{torchOn ? "Torch ON" : "Torch"}</span>
                  </button>
                ) : (
                  <div />
                )}

                {/* Zoom Controls */}
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

              {/* Bottom Status Pill */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#5BF07B] animate-pulse" />
                  <span className="font-medium">Camera Active · EAN / UPC / QR / Code128</span>
                </span>
                <span className="text-white/60 text-[10px]">Continuous Scan</span>
              </div>
            </>
          )}
        </div>

        {/* Live Feedback Banner & Unknown Product Actions */}
        {scanStatus.message && (
          <div
            className={`px-4 py-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b transition-all ${
              scanStatus.type === "success"
                ? "bg-[#DFFFE6] text-[#0E2A16] border-[#5BF07B]/40"
                : scanStatus.type === "warning"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-[#FBD3D3] text-[#E5484D] border-[#E5484D]/30"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {scanStatus.type === "success" && (
                <CheckCircle2 size={16} className="text-[#0E2A16] shrink-0" />
              )}
              {scanStatus.type === "warning" && (
                <ShieldAlert size={16} className="text-amber-700 shrink-0" />
              )}
              {scanStatus.type !== "success" && scanStatus.type !== "warning" && (
                <AlertCircle size={16} className="text-[#E5484D] shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-bold block truncate">{scanStatus.message}</span>
                {scanStatus.product && (
                  <span className="text-[11px] opacity-80 block">
                    SKU: {scanStatus.product.sku || "N/A"} · Stock: {scanStatus.product.stock ?? "N/A"} · GST: {scanStatus.product.gstRate || 18}%
                  </span>
                )}
              </div>
            </div>

            {/* Unknown Product Action */}
            {scanStatus.type === "not_found" && onRegisterNewProduct && (
              <button
                type="button"
                onClick={() => onRegisterNewProduct(scanStatus.barcode)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#12151C] hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <PackagePlus size={13} className="text-[#5BF07B]" />
                <span>+ Register New Product</span>
              </button>
            )}
          </div>
        )}

        {/* Manual Barcode / USB Scanner Input Section */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#111318] mb-1.5">
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
                <Search size={14} className="absolute left-3 top-2.5 text-[#7C7F8A]" />
                <input
                  type="text"
                  placeholder="Type barcode (e.g. 8901030383742) or scan with USB gun..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#E7E8EC] rounded-xl outline-none focus:border-[#5BF07B] focus:ring-2 focus:ring-[#5BF07B]/15 font-mono font-medium text-[#111318] transition"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !manualCode.trim()}
                className="px-4 py-2 bg-[#12151C] hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-fintech transition cursor-pointer"
              >
                {searching ? "Searching…" : "Add"}
              </button>
            </form>
          </div>

          {/* Quick-test Catalog Chips */}
          {availableProducts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#7C7F8A] uppercase tracking-wider mb-1.5">
                Quick Test from Catalog:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-none">
                {availableProducts.slice(0, 6).map((p) => {
                  const code = p.barcode || p.sku || p.code || p.id;
                  return (
                    <button
                      key={p.id || p._id}
                      type="button"
                      onClick={() => processBarcode(code)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#DFFFE6] hover:text-[#0E2A16] border border-[#E7E8EC] text-[11px] font-medium text-[#111318] transition cursor-pointer shadow-2xs"
                      title={`Add ${p.name}`}
                    >
                      {p.name} ({code})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Scans in Current Session */}
          {recentScans.length > 0 && (
            <div className="pt-2 border-t border-[#E7E8EC]">
              <p className="text-[10px] font-bold text-[#7C7F8A] uppercase tracking-wider mb-1.5">
                Scanned in This Session ({recentScans.length}):
              </p>
              <div className="space-y-1">
                {recentScans.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-[#E7E8EC]"
                  >
                    <span className="font-semibold text-[#111318] truncate max-w-[220px]">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#7C7F8A]">{item.time}</span>
                      <span className="font-mono font-bold text-[#0E2A16] bg-[#DFFFE6] px-1.5 py-0.5 rounded">
                        ₹{item.price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#E7E8EC] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#7C7F8A]">
              Items are added to active bill automatically.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#EDEDEF] border border-[#E7E8EC] text-[#111318] font-bold transition cursor-pointer shadow-xs"
            >
              Done Scanning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
