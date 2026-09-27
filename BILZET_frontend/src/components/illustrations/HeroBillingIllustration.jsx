import React from "react";

export default function HeroBillingIllustration({ className = "w-full max-w-md h-auto" }) {
  return (
    <div className={`relative select-none ${className}`}>
      {/* Background radial glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500/20 via-blue-600/15 to-indigo-500/20 rounded-3xl blur-2xl -z-10 animate-pulse" />

      <svg
        viewBox="0 0 540 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="terminalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="100%" stopColor="#1C2541" />
          </linearGradient>

          <linearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00C4CC" />
            <stop offset="100%" stopColor="#1A5CFF" />
          </linearGradient>

          <linearGradient id="accentGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#00C4CC" />
          </linearGradient>

          <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Ambient Grid Lines */}
        <g opacity="0.15" stroke="#38BDF8" strokeWidth="1" strokeDasharray="4 4">
          <line x1="20" y1="80" x2="520" y2="80" />
          <line x1="20" y1="180" x2="520" y2="180" />
          <line x1="20" y1="280" x2="520" y2="280" />
          <line x1="120" y1="20" x2="120" y2="380" />
          <line x1="260" y1="20" x2="260" y2="380" />
          <line x1="400" y1="20" x2="400" y2="380" />
        </g>

        {/* MAIN POS / TABLET DEVICE */}
        <g filter="url(#cardShadow)">
          {/* Tablet Outer Shell */}
          <rect
            x="90"
            y="50"
            width="340"
            height="270"
            rx="24"
            fill="url(#terminalGrad)"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
          />

          {/* Screen Inner Bezel */}
          <rect
            x="104"
            y="64"
            width="312"
            height="242"
            rx="16"
            fill="url(#screenGrad)"
            stroke="rgba(0,196,204,0.2)"
            strokeWidth="1.5"
          />

          {/* Screen Top Bar */}
          <rect x="104" y="64" width="312" height="34" rx="16" fill="rgba(255,255,255,0.04)" />
          <circle cx="122" cy="81" r="4" fill="#EF4444" opacity="0.8" />
          <circle cx="134" cy="81" r="4" fill="#F59E0B" opacity="0.8" />
          <circle cx="146" cy="81" r="4" fill="#10B981" opacity="0.8" />
          <rect x="170" y="76" width="90" height="10" rx="5" fill="rgba(255,255,255,0.12)" />

          {/* Bill Preview inside Tablet */}
          <rect x="122" y="112" width="160" height="174" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" />
          <rect x="134" y="124" width="80" height="8" rx="4" fill="#38BDF8" opacity="0.9" />
          <rect x="134" y="138" width="50" height="6" rx="3" fill="rgba(255,255,255,0.3)" />

          {/* Line items in bill */}
          <line x1="134" y1="156" x2="270" y2="156" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <rect x="134" y="164" width="70" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
          <rect x="238" y="164" width="32" height="6" rx="3" fill="#10B981" />

          <rect x="134" y="178" width="85" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
          <rect x="242" y="178" width="28" height="6" rx="3" fill="#10B981" />

          <rect x="134" y="192" width="60" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
          <rect x="234" y="192" width="36" height="6" rx="3" fill="#10B981" />

          {/* Subtotal & Tax */}
          <line x1="134" y1="210" x2="270" y2="210" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <rect x="134" y="218" width="50" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
          <rect x="230" y="218" width="40" height="6" rx="3" fill="rgba(255,255,255,0.7)" />

          <rect x="134" y="232" width="40" height="7" rx="3" fill="#00C4CC" />
          <rect x="220" y="232" width="50" height="8" rx="4" fill="url(#tealGrad)" />

          {/* Right mini chart inside tablet */}
          <rect x="294" y="112" width="108" height="174" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" />
          <rect x="306" y="124" width="60" height="7" rx="3.5" fill="rgba(255,255,255,0.6)" />
          {/* Bar Chart Bars */}
          <rect x="310" y="210" width="12" height="60" rx="3" fill="#1A5CFF" opacity="0.6" />
          <rect x="328" y="180" width="12" height="90" rx="3" fill="#00C4CC" opacity="0.75" />
          <rect x="346" y="160" width="12" height="110" rx="3" fill="#10B981" opacity="0.9" />
          <rect x="364" y="140" width="12" height="130" rx="3" fill="url(#tealGrad)" />
        </g>

        {/* FLOATING CARD 1: PAYMENT SUCCESS (Top Right) */}
        <g filter="url(#cardShadow)" className="animate-bounce" style={{ animationDuration: "6s" }}>
          <rect
            x="330"
            y="25"
            width="175"
            height="70"
            rx="16"
            fill="#0F1F38"
            stroke="rgba(0,196,204,0.4)"
            strokeWidth="1.5"
          />
          {/* Checkmark circle */}
          <circle cx="360" cy="60" r="18" fill="url(#accentGlow)" />
          <path
            d="M352 60L358 66L368 54"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x="388" y="52" fill="#94A3B8" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            PAYMENT PAID
          </text>
          <text x="388" y="70" fill="#FFFFFF" fontSize="15" fontWeight="900" fontFamily="sans-serif">
            ₹4,947.00
          </text>
        </g>

        {/* FLOATING CARD 2: GST COMPLIANCE SHIELD (Bottom Left) */}
        <g filter="url(#cardShadow)">
          <rect
            x="30"
            y="260"
            width="165"
            height="65"
            rx="16"
            fill="#0B1B33"
            stroke="rgba(56,189,248,0.35)"
            strokeWidth="1.5"
          />
          <rect x="46" y="278" width="30" height="30" rx="8" fill="#1A5CFF" opacity="0.25" />
          <path
            d="M61 282L69 286V294C69 299 65 303 61 304C57 303 53 299 53 294V286L61 282Z"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text x="86" y="288" fill="#00C4CC" fontSize="10" fontWeight="800" fontFamily="sans-serif">
            GST INVOICE
          </text>
          <text x="86" y="304" fill="#E2E8F0" fontSize="11" fontWeight="700" fontFamily="sans-serif">
            CGST + SGST 100%
          </text>
        </g>

        {/* FLOATING CARD 3: DYNAMIC UPI QR SCAN (Bottom Right) */}
        <g filter="url(#cardShadow)">
          <rect
            x="360"
            y="245"
            width="145"
            height="115"
            rx="18"
            fill="#0F1F38"
            stroke="rgba(0,196,204,0.35)"
            strokeWidth="1.5"
          />
          <text x="376" y="268" fill="#38BDF8" fontSize="10" fontWeight="800" fontFamily="sans-serif">
            SCAN &amp; PAY (UPI)
          </text>
          {/* Stylized QR Box */}
          <rect x="376" y="276" width="60" height="60" rx="8" fill="#FFFFFF" />
          {/* QR Pattern simulated */}
          <rect x="382" y="282" width="16" height="16" fill="#0F172A" rx="2" />
          <rect x="386" y="286" width="8" height="8" fill="#FFFFFF" />
          <rect x="414" y="282" width="16" height="16" fill="#0F172A" rx="2" />
          <rect x="418" y="286" width="8" height="8" fill="#FFFFFF" />
          <rect x="382" y="314" width="16" height="16" fill="#0F172A" rx="2" />
          <rect x="386" y="318" width="8" height="8" fill="#FFFFFF" />
          <rect x="404" y="294" width="6" height="14" fill="#00C4CC" rx="1" />
          <rect x="414" y="314" width="14" height="6" fill="#1A5CFF" rx="1" />

          {/* Quick GPay / PhonePe badge */}
          <rect x="444" y="282" width="50" height="16" rx="4" fill="rgba(255,255,255,0.08)" />
          <text x="450" y="294" fill="#38BDF8" fontSize="9" fontWeight="700">GPay</text>
          <rect x="444" y="304" width="50" height="16" rx="4" fill="rgba(255,255,255,0.08)" />
          <text x="448" y="316" fill="#00C4CC" fontSize="9" fontWeight="700">PhonePe</text>
        </g>
      </svg>
    </div>
  );
}
