import React from "react";

export default function EmptyStateIllustration({ className = "w-44 h-auto mx-auto" }) {
  return (
    <div className={`select-none ${className}`}>
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <linearGradient id="emptyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1A5CFF" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="boxGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
        </defs>

        {/* Soft shadow base */}
        <ellipse cx="100" cy="138" rx="60" ry="10" fill="#E2E8F0" opacity="0.6" />

        {/* Isometric Box / Folder */}
        <path d="M60 70 L100 50 L140 70 L100 90 Z" fill="url(#boxGrad)" stroke="#CBD5E1" strokeWidth="1.5" />
        <path d="M60 70 L100 90 L100 130 L60 110 Z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
        <path d="M100 90 L140 70 L140 110 L100 130 Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />

        {/* Floating Empty Document */}
        <g transform="translate(70, 20) rotate(-6)">
          <rect x="0" y="0" width="55" height="70" rx="6" fill="#FFFFFF" stroke="#00C4CC" strokeWidth="1.5" />
          <line x1="8" y1="14" x2="35" y2="14" stroke="#00C4CC" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="8" y1="24" x2="46" y2="24" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="32" x2="40" y2="32" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="40" x2="44" y2="40" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="54" r="5" fill="#38BDF8" opacity="0.25" />
        </g>

        {/* Sparkles */}
        <path d="M145 35 L148 42 L155 45 L148 48 L145 55 L142 48 L135 45 L142 42 Z" fill="#00C4CC" opacity="0.7" />
        <circle cx="45" cy="45" r="3" fill="#1A5CFF" opacity="0.4" />
        <circle cx="160" cy="85" r="2" fill="#F59E0B" opacity="0.6" />
      </svg>
    </div>
  );
}
