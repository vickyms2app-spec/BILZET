import React from "react";

/**
 * BILZET Premium Layered Wave Background
 *
 * Reproduces the exact wave reference design:
 *   - Predominantly white/light-grey upper section (#FAFAFB, #F6F6F8)
 *   - Soft light-grey wave curves transitioning downward (#E9EEF0)
 *   - Pale mint/aqua-green lower layers (#E2F6F3, #CDEBE7, #A9DAD3)
 *   - Multiple overlapping organic Bézier paths — no neon green
 *   - Static, subtle, low-contrast, elegant fintech appearance
 *
 * Layer order (back → front):
 *   bg    White canvas base
 *   L1    Light-grey upper sweep
 *   L2    Pale grey asymmetric horizontal wave
 *   L3    Very pale grey-mint overlap
 *   L4    Pale aqua-green mid-lower wave (middle-left → lower-right)
 *   L5    Soft aqua-green bottom finish
 */
export default function WaveBackground({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ backgroundColor: "#FAFAFB" }}
    >
      {/* Full-viewport SVG — preserveAspectRatio="none" stretches paths to fill every screen */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          {/* ── Gradient definitions ─────────────────────────────────── */}

          {/* L1: Soft white → light grey upper sweep */}
          <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FAFAFB" />
            <stop offset="100%" stopColor="#F6F6F8" />
          </linearGradient>

          {/* L2: Light grey large horizontal wave */}
          <linearGradient id="waveL2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#F0F3F5" />
            <stop offset="60%"  stopColor="#E9EEF0" />
            <stop offset="100%" stopColor="#E4E9EB" />
          </linearGradient>

          {/* L3: Very pale grey-mint overlap */}
          <linearGradient id="waveL3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#EAF4F2" />
            <stop offset="50%"  stopColor="#E2F6F3" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#D8F0ED" stopOpacity="0.70" />
          </linearGradient>

          {/* L4: Pale aqua-green mid wave */}
          <linearGradient id="waveL4" x1="0" y1="0.4" x2="1" y2="1">
            <stop offset="0%"   stopColor="#CDEBE7" />
            <stop offset="55%"  stopColor="#C3E5E1" />
            <stop offset="100%" stopColor="#B8DDD9" stopOpacity="0.90" />
          </linearGradient>

          {/* L5: Bottom aqua-green finish */}
          <linearGradient id="waveL5" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%"   stopColor="#BADEDB" />
            <stop offset="45%"  stopColor="#A9DAD3" />
            <stop offset="100%" stopColor="#9DD3CC" />
          </linearGradient>

          {/* Very soft feather blur — keeps edges natural */}
          <filter id="feather" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>

        {/* ════════════════════════════════════════════════════════════
            LAYER 1 — White canvas background (base rect)
            Covers entire viewport with gentle top→bottom grey tint
            ════════════════════════════════════════════════════════════ */}
        <rect width="1440" height="900" fill="url(#bgGrad)" />

        {/* ════════════════════════════════════════════════════════════
            LAYER 2 — Light grey large asymmetric horizontal wave
            Single broad sweep across the upper-middle section.
            Left crest high (~35% from top), right crest low (~55%).
            ════════════════════════════════════════════════════════════ */}
        <path
          d="
            M0,900
            L0,420
            C180,370 340,460 540,400
            C740,340 920,430 1120,370
            C1250,335 1360,390 1440,360
            L1440,900
            Z
          "
          fill="url(#waveL2)"
          opacity="0.72"
          filter="url(#feather)"
        />
        {/* Secondary lighter crest to add natural depth to L2 */}
        <path
          d="
            M0,900
            L0,480
            C140,440 300,520 500,460
            C680,405 860,490 1060,435
            C1220,395 1360,450 1440,420
            L1440,900
            Z
          "
          fill="url(#waveL2)"
          opacity="0.40"
          filter="url(#feather)"
        />

        {/* ════════════════════════════════════════════════════════════
            LAYER 3 — Very pale grey-mint overlap
            Overlaps L2 to create smooth depth, sits a bit lower.
            ════════════════════════════════════════════════════════════ */}
        <path
          d="
            M0,900
            L0,560
            C220,490 420,610 680,535
            C900,470 1100,575 1300,510
            C1380,484 1420,510 1440,500
            L1440,900
            Z
          "
          fill="url(#waveL3)"
          opacity="0.78"
          filter="url(#feather)"
        />
        {/* Subtle lighter sub-wave to soften the grey-mint edge */}
        <path
          d="
            M-20,900
            L-20,620
            C180,560 380,660 620,590
            C840,525 1060,620 1280,560
            C1380,528 1430,562 1460,548
            L1460,900
            Z
          "
          fill="url(#waveL3)"
          opacity="0.38"
          filter="url(#feather)"
        />

        {/* ════════════════════════════════════════════════════════════
            LAYER 4 — Pale aqua-green mid-lower wave
            Starts from middle-left and flows gently toward lower-right.
            ════════════════════════════════════════════════════════════ */}
        <path
          d="
            M0,900
            L0,660
            C160,600 320,700 540,635
            C740,575 940,660 1180,598
            C1320,558 1400,590 1440,575
            L1440,900
            Z
          "
          fill="url(#waveL4)"
          opacity="0.82"
          filter="url(#feather)"
        />
        {/* Additional crest for organic layering */}
        <path
          d="
            M0,900
            L0,720
            C200,668 400,752 660,692
            C880,638 1100,718 1340,660
            C1400,640 1430,660 1440,650
            L1440,900
            Z
          "
          fill="url(#waveL4)"
          opacity="0.50"
          filter="url(#feather)"
        />

        {/* ════════════════════════════════════════════════════════════
            LAYER 5 — Soft aqua-green bottom finish
            Smooth lower-edge wave, slightly stronger color.
            ════════════════════════════════════════════════════════════ */}
        <path
          d="
            M0,900
            L0,775
            C160,730 340,810 580,752
            C800,698 1020,768 1240,712
            C1360,676 1420,706 1440,694
            L1440,900
            Z
          "
          fill="url(#waveL5)"
          opacity="0.90"
          filter="url(#feather)"
        />
        {/* Bottom solid edge so there's no visible gap at page bottom */}
        <path
          d="
            M0,900
            L0,845
            C280,820 560,860 900,838
            C1140,822 1340,848 1440,836
            L1440,900
            Z
          "
          fill="#A9DAD3"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}
