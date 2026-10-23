import React from "react";

/**
 * Modern Billing & Operations Scene (Left-Side Illustration)
 * Professional vector SaaS mockup:
 * - Ultra-sleek minimalist monitor with POS invoice preview and bar chart
 * - Compact thermal receipt printer with soft drop shadow
 * - Inventory packages with barcode label
 * - Minimalist potted succulent
 */
export function OnboardingLeftScene({ className = "" }) {
  return (
    <div className={`relative select-none pointer-events-none ${className}`} aria-hidden="true">
      {/* Soft Ambient Radial Glow */}
      <div className="absolute -inset-8 bg-gradient-to-tr from-blue-100/40 via-indigo-50/30 to-transparent rounded-full blur-3xl -z-10" />

      <svg
        viewBox="0 0 320 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-md"
      >
        <defs>
          <linearGradient id="monitorBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="screenBgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          <linearGradient id="printerBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>

          <linearGradient id="boxGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>

          <linearGradient id="plantLeafGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <filter id="cardSoftShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* MONITOR STAND */}
        <path d="M125 210 L155 210 L150 232 L130 232 Z" fill="#94A3B8" />
        <rect x="115" y="232" width="50" height="5" rx="2.5" fill="#64748B" />

        {/* MONITOR DISPLAY */}
        <g filter="url(#cardSoftShadow)">
          {/* Bezel */}
          <rect
            x="40"
            y="55"
            width="200"
            height="146"
            rx="12"
            fill="url(#monitorBodyGrad)"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Screen Inner */}
          <rect
            x="46"
            y="61"
            width="188"
            height="134"
            rx="8"
            fill="url(#screenBgGrad)"
          />

          {/* Screen Header Bar */}
          <rect x="46" y="61" width="188" height="20" rx="8" fill="#F1F5F9" />
          <circle cx="58" cy="71" r="3" fill="#EF4444" opacity="0.8" />
          <circle cx="67" cy="71" r="3" fill="#F59E0B" opacity="0.8" />
          <circle cx="76" cy="71" r="3" fill="#10B981" opacity="0.8" />
          <rect x="90" y="68" width="46" height="5" rx="2.5" fill="#CBD5E1" />

          {/* Invoice Header on Monitor */}
          <rect x="56" y="89" width="70" height="7" rx="3.5" fill="#2563EB" />
          <rect x="56" y="100" width="42" height="4" rx="2" fill="#94A3B8" />

          {/* Invoice Table Rows */}
          <line x1="56" y1="110" x2="155" y2="110" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="56" y="116" width="48" height="4" rx="2" fill="#64748B" />
          <rect x="135" y="116" width="20" height="4" rx="2" fill="#0F172A" />

          <rect x="56" y="125" width="56" height="4" rx="2" fill="#64748B" />
          <rect x="139" y="125" width="16" height="4" rx="2" fill="#0F172A" />

          <rect x="56" y="134" width="38" height="4" rx="2" fill="#64748B" />
          <rect x="133" y="134" width="22" height="4" rx="2" fill="#0F172A" />

          {/* Total Badge */}
          <rect x="56" y="148" width="99" height="18" rx="5" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="1" />
          <rect x="62" y="154" width="28" height="6" rx="3" fill="#1E40AF" />
          <rect x="120" y="154" width="29" height="6" rx="3" fill="#10B981" />

          {/* Right Pane: Mini Sales Bar Chart */}
          <rect x="168" y="89" width="56" height="77" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="175" y="138" width="6" height="20" rx="2" fill="#93C5FD" />
          <rect x="185" y="125" width="6" height="33" rx="2" fill="#3B82F6" />
          <rect x="195" y="113" width="6" height="45" rx="2" fill="#2563EB" />
          <rect x="205" y="131" width="6" height="27" rx="2" fill="#60A5FA" />
        </g>

        {/* THERMAL RECEIPT PRINTER */}
        <g filter="url(#cardSoftShadow)">
          <rect
            x="185"
            y="200"
            width="88"
            height="68"
            rx="12"
            fill="url(#printerBodyGrad)"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          <rect x="193" y="208" width="72" height="20" rx="5" fill="#0F172A" />
          <rect x="203" y="215" width="52" height="3" rx="1.5" fill="#38BDF8" />

          {/* Status LED & Feed Button */}
          <circle cx="199" cy="242" r="3" fill="#10B981" />
          <rect x="209" y="240" width="22" height="4" rx="2" fill="#94A3B8" />

          {/* Receipt Ribbon */}
          <path
            d="M206 215 L206 172 L210 175 L214 172 L218 175 L222 172 L226 175 L230 172 L234 175 L238 172 L242 175 L246 172 L250 175 L250 215 Z"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="1"
          />
          <line x1="212" y1="182" x2="244" y2="182" stroke="#0F172A" strokeWidth="1.5" />
          <line x1="212" y1="188" x2="236" y2="188" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="212" y1="194" x2="240" y2="194" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
          <line x1="212" y1="200" x2="244" y2="200" stroke="#2563EB" strokeWidth="1" />
        </g>

        {/* INVENTORY PACKAGES */}
        <g filter="url(#cardSoftShadow)">
          {/* Main Box */}
          <rect
            x="32"
            y="240"
            width="78"
            height="54"
            rx="6"
            fill="url(#boxGrad)"
            stroke="#D97706"
            strokeWidth="1"
          />
          <rect x="67" y="240" width="8" height="54" fill="#F59E0B" opacity="0.6" />
          {/* Barcode label */}
          <rect x="40" y="255" width="22" height="15" rx="2" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
          <line x1="44" y1="260" x2="44" y2="266" stroke="#0F172A" strokeWidth="1" />
          <line x1="47" y1="260" x2="47" y2="266" stroke="#0F172A" strokeWidth="1.5" />
          <line x1="50" y1="260" x2="50" y2="266" stroke="#0F172A" strokeWidth="0.8" />
          <line x1="53" y1="260" x2="53" y2="266" stroke="#0F172A" strokeWidth="1.2" />
          <line x1="56" y1="260" x2="56" y2="266" stroke="#0F172A" strokeWidth="1" />

          {/* Stacked Top Box */}
          <rect
            x="49"
            y="206"
            width="54"
            height="36"
            rx="5"
            fill="#FEF9C3"
            stroke="#CA8A04"
            strokeWidth="0.8"
          />
          <rect x="73" y="206" width="6" height="36" fill="#EAB308" opacity="0.5" />
        </g>

        {/* POTTED SUCCULENT */}
        <g filter="url(#cardSoftShadow)">
          <path d="M126 288 L144 288 L141 310 L129 310 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="124" y="285" width="22" height="4" rx="2" fill="#E2E8F0" />
          <path d="M135 285 Q130 270 123 272 Q128 280 135 285" fill="url(#plantLeafGrad)" />
          <path d="M135 285 Q138 263 147 266 Q141 275 135 285" fill="url(#plantLeafGrad)" />
          <path d="M135 285 Q135 258 131 258 Q131 270 135 285" fill="#10B981" />
        </g>

        {/* Ground Shadow */}
        <ellipse cx="155" cy="312" rx="130" ry="6" fill="#E2E8F0" opacity="0.5" />
      </svg>
    </div>
  );
}

/**
 * Business Analytics & Growth Scene (Right-Side Illustration)
 * Professional vector SaaS mockup:
 * - Floating glassmorphism analytics card with smooth revenue curve
 * - Circular progress metric card
 * - Minimalist potted succulent
 * - Soft geometric ambient shapes
 */
export function OnboardingRightScene({ className = "" }) {
  return (
    <div className={`relative select-none pointer-events-none ${className}`} aria-hidden="true">
      {/* Soft Ambient Radial Glow */}
      <div className="absolute -inset-8 bg-gradient-to-tl from-teal-100/40 via-blue-50/30 to-transparent rounded-full blur-3xl -z-10" />

      <svg
        viewBox="0 0 320 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-md"
      >
        <defs>
          <linearGradient id="analyticsCardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C4CC" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
          </linearGradient>

          <filter id="rightCardSoftShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* Ambient Decorative Rings */}
        <circle cx="265" cy="65" r="26" stroke="#BFDBFE" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
        <rect x="220" y="24" width="20" height="20" rx="5" stroke="#99F6E4" strokeWidth="1.2" opacity="0.6" />

        {/* 1. MAIN FLOATING ANALYTICS CARD */}
        <g filter="url(#rightCardSoftShadow)">
          <rect
            x="40"
            y="65"
            width="220"
            height="180"
            rx="16"
            fill="url(#analyticsCardGrad)"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />

          {/* Header */}
          <rect x="55" y="80" width="65" height="8" rx="4" fill="#0F172A" />
          <rect x="55" y="92" width="42" height="4" rx="2" fill="#94A3B8" />

          {/* Growth Pill */}
          <rect x="185" y="80" width="60" height="18" rx="9" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1" />
          <path d="M195 90 L201 84 M201 84 L197 84 M201 84 L201 88" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="206" y="87" width="28" height="4" rx="2" fill="#059669" />

          {/* KPI Value */}
          <rect x="55" y="110" width="80" height="13" rx="3" fill="#2563EB" />

          {/* Trend Area Curve */}
          <path
            d="M55 178 L55 158 C80 148, 105 163, 135 143 C165 123, 195 131, 245 118 L245 178 Z"
            fill="url(#trendAreaGrad)"
          />
          <path
            d="M55 158 C80 148, 105 163, 135 143 C165 123, 195 131, 245 118"
            stroke="#00C4CC"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <circle cx="135" cy="143" r="3" fill="#FFFFFF" stroke="#00C4CC" strokeWidth="2" />
          <circle cx="245" cy="118" r="3" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />

          {/* Bottom Metric Tags */}
          <line x1="55" y1="192" x2="245" y2="192" stroke="#F1F5F9" strokeWidth="1" />
          <rect x="55" y="202" width="42" height="5" rx="2.5" fill="#64748B" />
          <rect x="110" y="202" width="42" height="5" rx="2.5" fill="#64748B" />
          <rect x="165" y="202" width="50" height="5" rx="2.5" fill="#0D9488" />
        </g>

        {/* 2. PROGRESS RING CARD */}
        <g filter="url(#rightCardSoftShadow)">
          <rect
            x="160"
            y="205"
            width="115"
            height="80"
            rx="12"
            fill="#FFFFFF"
            stroke="#CCFBF1"
            strokeWidth="1.2"
          />
          <circle cx="192" cy="245" r="16" stroke="#E2E8F0" strokeWidth="3.5" fill="none" />
          <circle
            cx="192"
            cy="245"
            r="16"
            stroke="#0D9488"
            strokeWidth="3.5"
            strokeDasharray="100"
            strokeDashoffset="28"
            strokeLinecap="round"
            fill="none"
            transform="rotate(-90 192 245)"
          />
          <circle cx="192" cy="245" r="4.5" fill="#14B8A6" />

          <rect x="218" y="233" width="42" height="5" rx="2.5" fill="#0F172A" />
          <rect x="218" y="242" width="28" height="4" rx="2" fill="#10B981" />
          <rect x="218" y="250" width="20" height="4" rx="2" fill="#94A3B8" />
        </g>

        {/* 3. DESK SUCCULENT */}
        <g filter="url(#rightCardSoftShadow)">
          <path d="M68 285 L86 285 L83 308 L71 308 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="66" y="282" width="22" height="4" rx="2" fill="#E2E8F0" />
          <path d="M77 282 Q70 262 59 265 Q66 275 77 282" fill="#10B981" />
          <path d="M77 282 Q82 256 92 260 Q86 271 77 282" fill="#059669" />
          <path d="M77 282 Q75 252 81 250 Q82 263 77 282" fill="#34D399" />
        </g>

        {/* Ground shadow */}
        <ellipse cx="160" cy="316" rx="120" ry="6" fill="#E2E8F0" opacity="0.5" />
      </svg>
    </div>
  );
}

/**
 * Small Storefront Illustration (Inside Card A: Set Up Your Business)
 * Clean, lightweight 2D storefront with blue striped awning and glass display.
 */
export function StorefrontCardIllustration({ className = "w-18 h-14" }) {
  return (
    <svg
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Soft card backdrop */}
      <rect x="12" y="20" width="76" height="52" rx="6" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />

      {/* Awning */}
      <g>
        <path d="M10 20 L13 8 L22 8 L20 20 Z" fill="#2563EB" />
        <path d="M20 20 L22 8 L31 8 L29 20 Z" fill="#DBEAFE" />
        <path d="M29 20 L31 8 L40 8 L38 20 Z" fill="#2563EB" />
        <path d="M38 20 L40 8 L49 8 L47 20 Z" fill="#DBEAFE" />
        <path d="M47 20 L49 8 L58 8 L56 20 Z" fill="#2563EB" />
        <path d="M56 20 L58 8 L67 8 L65 20 Z" fill="#DBEAFE" />
        <path d="M65 20 L67 8 L76 8 L74 20 Z" fill="#2563EB" />
        <path d="M74 20 L76 8 L85 8 L83 20 Z" fill="#DBEAFE" />
        <path d="M83 20 L85 8 L90 8 L88 20 Z" fill="#2563EB" />
      </g>
      <path
        d="M10 20 Q15 24 20 20 Q25 24 29 20 Q34 24 38 20 Q43 24 47 20 Q52 24 56 20 Q61 24 65 20 Q70 24 74 20 Q79 24 83 20 Q86 24 88 20"
        stroke="#1E40AF"
        strokeWidth="1"
        fill="none"
      />

      {/* Store Window */}
      <rect x="18" y="28" width="28" height="26" rx="2" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="0.8" />
      <line x1="22" y1="32" x2="32" y2="44" stroke="#DBEAFE" strokeWidth="1" strokeLinecap="round" />

      {/* Glass Door */}
      <rect x="52" y="28" width="26" height="44" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
      <rect x="56" y="32" width="18" height="22" rx="1" fill="#F1F5F9" />
      <circle cx="56" cy="50" r="1.5" fill="#2563EB" />

      {/* Signboard */}
      <rect x="36" y="2" width="28" height="7" rx="2" fill="#2563EB" />
      <rect x="41" y="4.5" width="18" height="2" rx="1" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Small Team Collaboration Illustration (Inside Card B: Join a Team)
 * Features abstract user figures, invitation card, and teal connection lines.
 */
export function TeamCollaborationCardIllustration({ className = "w-18 h-14" }) {
  return (
    <svg
      viewBox="0 0 100 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Collaboration Connection Arc */}
      <path
        d="M26 44 C36 28, 64 28, 74 44"
        stroke="#99F6E4"
        strokeWidth="2"
        strokeDasharray="3 3"
        fill="none"
      />

      {/* User 1 (Left) */}
      <g>
        <circle cx="26" cy="34" r="8" fill="#CCFBF1" stroke="#0D9488" strokeWidth="1" />
        <path d="M16 54 C16 46, 20 44, 26 44 C32 44, 36 46, 36 54" fill="#0D9488" />
        <circle cx="26" cy="34" r="3.5" fill="#0D9488" />
      </g>

      {/* Floating Envelope */}
      <g>
        <rect x="38" y="15" width="24" height="17" rx="3" fill="#FFFFFF" stroke="#0D9488" strokeWidth="1" />
        <path d="M38 17 L50 24 L62 17" stroke="#14B8A6" strokeWidth="1" strokeLinecap="round" />
        <circle cx="50" cy="32" r="4.5" fill="#10B981" />
        <path d="M48 32 L49.5 33.5 L52.5 30.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* User 2 (Right) */}
      <g>
        <circle cx="74" cy="34" r="8" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1" />
        <path d="M64 54 C64 46, 68 44, 74 44 C80 44, 84 46, 84 54" fill="#0284C7" />
        <circle cx="74" cy="34" r="3.5" fill="#0284C7" />
      </g>

      {/* Role tag badge below */}
      <rect x="34" y="60" width="32" height="9" rx="4.5" fill="#F0FDFA" stroke="#99F6E4" strokeWidth="0.8" />
      <rect x="39" y="63" width="22" height="3" rx="1.5" fill="#0D9488" />
    </svg>
  );
}
