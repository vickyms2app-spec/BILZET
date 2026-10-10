import React from "react";
import { Lock, Crown, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";

export const PLAN_TIERS = {
  FREE: "FREE",
  PRO: "PRO",
  PREMIUM: "PREMIUM",
  ENTERPRISE: "ENTERPRISE",
};

export const TIER_RANKS = {
  FREE: 1,
  PRO: 2,
  PREMIUM: 3,
  ENTERPRISE: 4,
};

export const FEATURE_CATALOG = {
  // CA Connect (Strictly Premium)
  ca_connect: {
    minPlan: "PREMIUM",
    name: "CA Connect",
    module: "Accountant Collaboration",
    description: "Connect your Chartered Accountant for direct ledger access, GST audits, and reconciliations.",
    benefit: "Seamlessly collaborate with your CA for direct filing without manual CSV exports.",
  },
  // Custom Roles & Permissions Studio (Premium)
  custom_roles: {
    minPlan: "PREMIUM",
    name: "Custom Roles & Permissions",
    module: "Team Management",
    description: "Design custom staff roles with granular overrides for billing, inventory, and reports.",
    benefit: "Define tailored permissions for cashiers, store supervisors, and accountants.",
  },
  // Thermal 58mm Printing (Premium)
  thermal_58mm: {
    minPlan: "PREMIUM",
    name: "Thermal 58mm Printing",
    module: "Business Settings",
    description: "Print compact 58mm receipts for handheld mobile POS Bluetooth printers.",
    benefit: "Optimized formatting for mobile portable thermal receipt rolls.",
  },
  // Custom Brand HEX Color (Premium)
  custom_color: {
    minPlan: "PREMIUM",
    name: "Custom Brand HEX Colors",
    module: "Business Settings",
    description: "Apply your exact corporate brand HEX colors to all customer invoices and receipts.",
    benefit: "Consistent brand identity across printed bills and digital PDFs.",
  },
  // Multi-Document Custom Terms (Premium)
  advanced_terms: {
    minPlan: "PREMIUM",
    name: "Multi-Document Terms",
    module: "Business Settings",
    description: "Configure independent custom terms of sale for Invoices, Estimates, and Delivery Challans.",
    benefit: "Legal protection tailored specifically for different transaction document types.",
  },

  // Thermal 80mm Printing (Pro)
  thermal_80mm: {
    minPlan: "PRO",
    name: "Thermal 80mm Printing",
    module: "Business Settings",
    description: "Standard 80mm receipt roll printing for POS desktop thermal printers.",
    benefit: "High-speed roll printing designed for retail checkout counters.",
  },
  // Watermark Removal (Pro)
  remove_watermark: {
    minPlan: "PRO",
    name: "Remove BILZET Watermark",
    module: "Business Settings",
    description: "Eliminate 'Powered by BILZET' branding from printed bills and PDFs.",
    benefit: "Deliver 100% white-labeled professional invoices to your customers.",
  },
  // Bank Settlement & Dynamic UPI QR (Pro)
  bank_upi_qr: {
    minPlan: "PRO",
    name: "Bank Details & Scan-to-Pay UPI QR",
    module: "Business Settings",
    description: "Print bank account details and dynamic UPI QR codes directly on invoices.",
    benefit: "Enable instant customer payments directly into your business bank account.",
  },
  // Team Sub-Users (Pro)
  team_subusers: {
    minPlan: "PRO",
    name: "Team & Cashier Sub-Users",
    module: "Operations & HR",
    description: "Add up to 5 sub-users on Pro and up to 15 sub-users on Premium.",
    benefit: "Allow your cashier, manager, and warehouse staff to operate simultaneously.",
  },
  // Advanced Reports & Profit Analysis (Pro)
  advanced_reports: {
    minPlan: "PRO",
    name: "Profit & Loss and Advanced Analytics",
    module: "Reports & Analytics",
    description: "Access Gross & Net Profit reports, category margin analytics, and Excel exports.",
    benefit: "Deep financial visibility to optimize profit margins and eliminate loss-making items.",
  },
  // GSTR-1 & GSTR-3B Tax Filing (Pro)
  gst_filing: {
    minPlan: "PRO",
    name: "GSTR-1 & GSTR-3B Tax Filing Packs",
    module: "GST & Tax",
    description: "Automated GSTR-1 draft export and GSTR-3B monthly tax summary.",
    benefit: "Save hours of manual accounting with one-click GST return preparation.",
  },
  // Online Store Orders (Pro)
  online_orders: {
    minPlan: "PRO",
    name: "Online Store Orders",
    module: "Online Orders",
    description: "Receive and process orders from your digital storefront.",
    benefit: "Expand your business with multi-channel order taking and dispatch.",
  },
  // SMS Campaigns (Pro)
  sms_campaigns: {
    minPlan: "PRO",
    name: "Promotional SMS Campaigns",
    module: "SMS Marketing",
    description: "Automated order delivery SMS and bulk promotional campaigns to customers.",
    benefit: "Drive repeat purchases with instant SMS promotions and order status updates.",
  },
};

/**
 * Validates if the current tier has permission to access a feature.
 */
export const isFeatureAllowed = (featureKey, currentTier = "FREE", isActive = true) => {
  const feat = FEATURE_CATALOG[featureKey];
  if (!feat) return true; // Unrestricted if not cataloged

  if (!isActive) return false;

  const currentRank = TIER_RANKS[String(currentTier).toUpperCase()] || 1;
  const requiredRank = TIER_RANKS[String(feat.minPlan).toUpperCase()] || 1;

  return currentRank >= requiredRank;
};

/**
 * Returns feature details by key.
 */
export const getFeatureDetails = (featureKey) => {
  return (
    FEATURE_CATALOG[featureKey] || {
      minPlan: "PRO",
      name: featureKey,
      module: "General",
      description: "Advanced business functionality.",
      benefit: "Upgrade your plan to unlock this functionality.",
    }
  );
};

/**
 * Inline chip badge indicating required subscription tier.
 */
export function PlanLockBadge({ requiredTier = "PRO", className = "" }) {
  const isPremium = requiredTier.toUpperCase() === "PREMIUM";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        isPremium
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-blue-50 text-blue-700 border-blue-200"
      } ${className}`}
    >
      <Lock size={10} />
      <span>{requiredTier.toUpperCase()}</span>
    </span>
  );
}

/**
 * Centralized locked feature gate container.
 * If unlocked, displays children.
 * If locked, displays a clear, informative lock state with explanation, benefit, and upgrade CTA.
 */
export function LockedFeatureGate({
  featureKey,
  currentTier = "FREE",
  isActive = true,
  children,
  fallback = null,
  title,
  description,
}) {
  const navigate = useNavigate();
  const unlocked = isFeatureAllowed(featureKey, currentTier, isActive);

  if (unlocked) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const feat = getFeatureDetails(featureKey);
  const requiredPlan = feat.minPlan;
  const isPremium = requiredPlan === "PREMIUM";
  const displayTitle = title || feat.name;
  const displayDescription = description || feat.description;

  return (
    <div className="p-6 sm:p-8 rounded-2xl border border-slate-200/90 bg-white shadow-xs text-center space-y-4 max-w-xl mx-auto my-6">
      <div
        className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
          isPremium
            ? "bg-amber-50 text-amber-600 border border-amber-200"
            : "bg-blue-50 text-blue-600 border border-blue-200"
        }`}
      >
        <Lock size={22} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <PlanLockBadge requiredTier={requiredPlan} />
          <span className="text-xs font-semibold text-slate-500">Feature Locked</span>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          {displayTitle}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          {displayDescription}
        </p>
      </div>

      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-left max-w-md mx-auto space-y-1 text-xs">
        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
          Benefit of {requiredPlan}:
        </span>
        <p className="text-[11px] text-slate-600 leading-normal">{feat.benefit}</p>
      </div>

      <div className="pt-2">
        <Button
          variant="primary"
          size="md"
          icon={isPremium ? Crown : Sparkles}
          onClick={() => navigate(`/plans?tier=${requiredPlan}`)}
          className="mx-auto"
        >
          Upgrade to {isPremium ? "Premium" : "Pro"}
        </Button>
      </div>
    </div>
  );
}

export default {
  PLAN_TIERS,
  TIER_RANKS,
  FEATURE_CATALOG,
  isFeatureAllowed,
  getFeatureDetails,
  PlanLockBadge,
  LockedFeatureGate,
};
