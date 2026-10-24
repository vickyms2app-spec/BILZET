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

export const PLAN_SEAT_LIMITS = {
  FREE: 0,
  PRO: 5,
  PREMIUM: -1,
  ENTERPRISE: -1,
};

export const PLAN_BILL_LIMITS = {
  FREE: 100,
  PRO: -1,
  PREMIUM: -1,
  ENTERPRISE: -1,
};

export const EXTRA_BILL_PACK_SIZE = 500;

export const FEATURE_CATALOG = {
  // ─── FREE FEATURES ───
  "billing.create": {
    minPlan: "FREE",
    name: "Sales Invoicing & Billing",
    module: "Sales & Billing",
    limit: 100,
    description: "Create sales invoices within the 100-bill annual allowance or purchased packs.",
    benefit: "Quick and reliable invoice creation for retail counters.",
  },
  "billing.extra_packs": {
    minPlan: "FREE",
    name: "Purchase 500-Bill Packs",
    module: "Sales & Billing",
    description: "Purchase additional 500-bill packs without changing plans.",
    benefit: "Pay-as-you-go flexibility without upgrading.",
  },
  "inventory.tracking": {
    minPlan: "FREE",
    name: "Inventory & Stock Tracking",
    module: "Inventory",
    description: "Track stock counts, low-stock warnings, godowns, and stock transfers.",
    benefit: "Real-time stock visibility across your stores and godowns.",
  },
  "reports.sales_daily_monthly": {
    minPlan: "FREE",
    name: "Daily & Monthly Sales Reports",
    module: "Reports & Analytics",
    description: "Standard daily and monthly sales summaries with invoice register.",
    benefit: "Understand store daily revenue and payment modes breakdown.",
  },
  "reports.gst_preview": {
    minPlan: "FREE",
    name: "GST Calculation Preview",
    module: "GST & Tax",
    description: "Basic invoice GST preview and rate break-ups.",
    benefit: "Compliant tax calculation for CGST, SGST, and IGST.",
  },
  "printing.standard_a4_a5": {
    minPlan: "FREE",
    name: "A4 / A5 Standard Print Layouts",
    module: "Business Settings",
    description: "Standard full-page A4 and half-page A5 invoice layouts with 3 templates.",
    benefit: "Standard professional tax invoice layout for laser and inkjet printers.",
  },

  // ─── PRO FEATURES ───
  "users.sub_users": {
    minPlan: "PRO",
    name: "Team & Cashier Sub-Users",
    module: "Operations & HR",
    limit: 5,
    description: "Add up to 5 sub-users on Pro and unlimited sub-users on Premium.",
    benefit: "Allow cashiers, managers, and staff to operate simultaneously.",
  },
  "users.standard_roles": {
    minPlan: "PRO",
    name: "Standard Role Assignments",
    module: "Team Management",
    description: "Assign standard roles: Manager, Cashier, and Staff.",
    benefit: "Operational role-based access control out of the box.",
  },
  "printing.thermal_80mm": {
    minPlan: "PRO",
    name: "Thermal 80mm Printing",
    module: "Business Settings",
    description: "Standard 80mm receipt roll printing for POS desktop thermal printers.",
    benefit: "High-speed roll printing designed for retail checkout counters.",
  },
  "invoice.remove_watermark": {
    minPlan: "PRO",
    name: "Remove BILZET Watermark",
    module: "Business Settings",
    description: "Eliminate 'Powered by BILZET' branding from printed bills and PDFs.",
    benefit: "Deliver 100% white-labeled professional invoices to your customers.",
  },
  "invoice.upi_qr": {
    minPlan: "PRO",
    name: "Bank Details & Scan-to-Pay UPI QR",
    module: "Business Settings",
    description: "Print bank account details and dynamic UPI QR codes directly on invoices.",
    benefit: "Enable instant customer payments directly into your business bank account.",
  },
  "reports.profit_loss": {
    minPlan: "PRO",
    name: "Profit & Loss Reports",
    module: "Reports & Analytics",
    description: "Access Gross & Net Profit reports and margin analytics.",
    benefit: "Deep financial visibility to optimize profit margins and eliminate loss-making items.",
  },
  "reports.xlsx_export": {
    minPlan: "PRO",
    name: "Excel (.xlsx) Data Export",
    module: "Reports & Analytics",
    description: "Export sales, customer, and inventory records directly to Microsoft Excel.",
    benefit: "Easily export and share financial data with external accounting tools.",
  },
  "gst.gstr1_draft": {
    minPlan: "PRO",
    name: "GSTR-1 Draft Pack Export",
    module: "GST & Tax",
    description: "Automated GSTR-1 draft export for B2B, B2CL, B2CS, and HSN summary tables.",
    benefit: "Save hours of manual accounting with one-click GST return preparation.",
  },
  "gst.gstr3b_summary": {
    minPlan: "PRO",
    name: "GSTR-3B Tax Summary",
    module: "GST & Tax",
    description: "Automated monthly outward tax liability and inward ITC computation summary.",
    benefit: "Instant figures ready for filing GSTR-3B on the GST portal.",
  },
  "communication.whatsapp_pdf": {
    minPlan: "PRO",
    name: "WhatsApp Invoice PDF Sharing",
    module: "Communication",
    description: "Send invoices directly to customers via WhatsApp.",
    benefit: "Instant digital invoice delivery to customer mobile phones.",
  },
  "communication.sms_alerts": {
    minPlan: "PRO",
    name: "SMS Dispatch Alerts & Campaigns",
    module: "SMS Marketing",
    description: "Automated order delivery SMS and promotional bulk campaigns.",
    benefit: "Keep customers engaged and informed with instant SMS delivery notices.",
  },
  "store.order_management": {
    minPlan: "PRO",
    name: "Online Store Order Management",
    module: "Online Orders",
    description: "Receive and process orders from your digital storefront.",
    benefit: "Expand your business with multi-channel order taking and dispatch.",
  },
  "purchases.orders": {
    minPlan: "PRO",
    name: "Advanced Purchase Orders & Vendor Management",
    module: "Purchases & Vendors",
    description: "Create, dispatch, and track official Purchase Orders issued to suppliers.",
    benefit: "Automate procurement, vendor lead times, and PO-to-bill conversions.",
  },
  "barcode.scanning": {
    minPlan: "PRO",
    name: "Barcode Scanning & Label Generation",
    module: "Inventory",
    description: "Scan barcodes for high-speed checkout and print retail barcode sticker labels.",
    benefit: "Reduce counter checkout time by 80% with instant barcode lookups.",
  },

  // ─── PREMIUM FEATURES ───
  "ca.connect": {
    minPlan: "PREMIUM",
    name: "CA Connect",
    module: "Accountant Collaboration",
    description: "Invite your Chartered Accountant for direct ledger access, GST audits, and reconciliations.",
    benefit: "Seamlessly collaborate with your CA for direct filing without manual CSV exports.",
  },
  "users.custom_roles": {
    minPlan: "PREMIUM",
    name: "Custom Roles & Permissions Studio",
    module: "Team Management",
    description: "Design custom staff roles with granular overrides for billing, inventory, and reports.",
    benefit: "Define tailored permissions for cashiers, store supervisors, and accountants.",
  },
  "users.permission_overrides": {
    minPlan: "PREMIUM",
    name: "Granular Permission Overrides per User",
    module: "Team Management",
    description: "Configure bespoke permission overrides directly on individual user accounts.",
    benefit: "Fine-tuned security without altering base team role templates.",
  },
  "stores.multi_store": {
    minPlan: "PREMIUM",
    name: "Multi-Store & Branch Management",
    module: "Multi-Location",
    description: "Manage multiple branches, outlets, warehouses, and switch store contexts seamlessly.",
    benefit: "Centralized visibility and control across your entire retail chain.",
  },
  "inventory.advanced": {
    minPlan: "PREMIUM",
    name: "Advanced Inventory & Batch Tracking",
    module: "Inventory",
    description: "Track batches, manufacture & expiry dates, and product serial numbers.",
    benefit: "Prevent spoilage and maintain full compliance with pharmaceutical and FMCG tracking.",
  },
  "analytics.ai_smart_predictions": {
    minPlan: "PREMIUM",
    name: "AI Analytics & Smart Stock Predictions",
    module: "AI & Analytics",
    description: "Predict inventory stockouts and get AI-driven sales trend recommendations.",
    benefit: "Never run out of high-margin inventory during seasonal demand spikes.",
  },
  "audit.logs": {
    minPlan: "PREMIUM",
    name: "Audit Logs & User Action Tracking",
    module: "Security & Compliance",
    description: "Track every user action, edit, price override, and security event.",
    benefit: "Complete accountability and anti-theft tracking for retail operations.",
  },
  "invoice.custom_templates": {
    minPlan: "PREMIUM",
    name: "Custom Invoice Templates",
    module: "Business Settings",
    description: "Create bespoke invoice templates with custom fields, layouts, and branding.",
    benefit: "Tailor invoices to exact enterprise corporate specifications.",
  },
  "branding.white_label": {
    minPlan: "PREMIUM",
    name: "Custom Domain & White-Label Portal",
    module: "Branding",
    description: "Access BILZET on your custom domain with complete white-label branding.",
    benefit: "Present a 100% branded software experience to staff and clients.",
  },
  "integration.open_api": {
    minPlan: "PREMIUM",
    name: "Open API & ERP Integrations",
    module: "Developer & Integrations",
    description: "Direct API access, webhooks, and third-party accounting/ERP syncing.",
    benefit: "Connect BILZET with external ERPs, e-commerce storefronts, and automated workflows.",
  },
  "printing.thermal_58mm": {
    minPlan: "PREMIUM",
    name: "Thermal 58mm Printing",
    module: "Business Settings",
    description: "Print compact 58mm receipts for handheld mobile POS Bluetooth printers.",
    benefit: "Optimized formatting for mobile portable thermal receipt rolls.",
  },
  "invoice.custom_brand_colors": {
    minPlan: "PREMIUM",
    name: "Custom Brand HEX Colors",
    module: "Business Settings",
    description: "Apply your exact corporate brand HEX colors to all customer invoices and receipts.",
    benefit: "Consistent brand identity across printed bills and digital PDFs.",
  },
  "documents.custom_terms": {
    minPlan: "PREMIUM",
    name: "Multi-Document Terms Customization",
    module: "Business Settings",
    description: "Configure independent custom terms of sale for Invoices, Estimates, and Delivery Challans.",
    benefit: "Legal protection tailored specifically for different transaction document types.",
  },
  "gst.advanced_classification": {
    minPlan: "PREMIUM",
    name: "Advanced GST Classifications",
    module: "GST & Tax",
    description: "Advanced reverse charge, composite tax rates, and special economic zone classifications.",
    benefit: "Enterprise-grade tax compliance for complex multi-state transactions.",
  },
  "gst.cmp08_prep": {
    minPlan: "PREMIUM",
    name: "Composition CMP-08 Filing Preparation",
    module: "GST & Tax",
    description: "Quarterly statement prep for composition taxpayers under CMP-08.",
    benefit: "Streamlined filing workflow for composition dealer stores.",
  },
  "sales.credit_debit_notes": {
    minPlan: "PREMIUM",
    name: "Credit and Debit Notes",
    module: "Sales & Purchases",
    description: "Formal GST-compliant credit note and debit note issuance against finalized invoices.",
    benefit: "Accurate tax-adjusted ledger credits for post-sale adjustments.",
  },
  "sales.returns": {
    minPlan: "PREMIUM",
    name: "Sales Returns & Reversals",
    module: "Sales Operations",
    description: "Comprehensive product return management with automated GST adjustments.",
    benefit: "Audit-ready inventory and tax ledger reconciliations for returns.",
  },
  "support.priority": {
    minPlan: "PREMIUM",
    name: "Priority Enterprise Support",
    module: "Support",
    description: "Direct dedicated priority support and onboarding specialist assistance.",
    benefit: "Guaranteed 2-hour response time for mission-critical store issues.",
  },
};

// ─── BACKWARD COMPATIBILITY ALIASES (snake_case -> dot notation) ───
const FEATURE_ALIASES = {
  ca_connect: "ca.connect",
  custom_roles: "users.custom_roles",
  thermal_58mm: "printing.thermal_58mm",
  custom_color: "invoice.custom_brand_colors",
  advanced_terms: "documents.custom_terms",
  thermal_80mm: "printing.thermal_80mm",
  remove_watermark: "invoice.remove_watermark",
  bank_upi_qr: "invoice.upi_qr",
  team_subusers: "users.sub_users",
  advanced_reports: "reports.profit_loss",
  gst_filing: "gst.gstr1_draft",
  online_orders: "store.order_management",
  sms_campaigns: "communication.sms_alerts",
  purchase_orders: "purchases.orders",
  barcode_scanner: "barcode.scanning",
  multi_store: "stores.multi_store",
  advanced_inventory: "inventory.advanced",
  ai_analytics: "analytics.ai_smart_predictions",
  audit_logs: "audit.logs",
  custom_invoice_templates: "invoice.custom_templates",
  white_label_portal: "branding.white_label",
  open_api: "integration.open_api",
};

// Register aliases directly into FEATURE_CATALOG for seamless dual-key lookups
for (const [alias, canonicalKey] of Object.entries(FEATURE_ALIASES)) {
  if (FEATURE_CATALOG[canonicalKey]) {
    FEATURE_CATALOG[alias] = FEATURE_CATALOG[canonicalKey];
  }
}

export const resolveFeatureKey = (key) => {
  if (!key) return key;
  return FEATURE_ALIASES[key] || key;
};

/**
 * Validates if the current tier has permission to access a feature.
 */
export const isFeatureAllowed = (featureKey, currentTier = "FREE", isActive = true) => {
  const canonicalKey = resolveFeatureKey(featureKey);
  const feat = FEATURE_CATALOG[canonicalKey] || FEATURE_CATALOG[featureKey];
  if (!feat) return true; // Unrestricted if not cataloged

  if (!isActive) return false;

  const currentRank = TIER_RANKS[String(currentTier).toUpperCase()] || 1;
  const requiredRank = TIER_RANKS[String(feat.minPlan).toUpperCase()] || 1;

  return currentRank >= requiredRank;
};

/**
 * Alias for isFeatureAllowed with (planTier, featureKey, isActive) signature.
 */
export const hasFeature = (planTier = "FREE", featureKey, isActive = true) => {
  return isFeatureAllowed(featureKey, planTier, isActive);
};

/**
 * Returns all canonical feature keys entitled to a given plan tier.
 */
export const getPlanEntitlements = (planTier = "FREE") => {
  const currentRank = TIER_RANKS[String(planTier).toUpperCase()] || 1;
  const entitled = [];

  for (const [key, feat] of Object.entries(FEATURE_CATALOG)) {
    if (key.includes(".")) {
      const requiredRank = TIER_RANKS[String(feat.minPlan).toUpperCase()] || 1;
      if (currentRank >= requiredRank) {
        entitled.push(key);
      }
    }
  }

  return entitled;
};

/**
 * Returns numerical limit for a feature under a plan tier (-1 = unlimited, 0 = unavailable, >0 = limit).
 */
export const getFeatureLimit = (planTier = "FREE", featureKey) => {
  const canonicalKey = resolveFeatureKey(featureKey);
  const feat = FEATURE_CATALOG[canonicalKey];
  if (!feat) return -1;

  const allowed = isFeatureAllowed(canonicalKey, planTier, true);
  if (!allowed) return 0;

  if (canonicalKey === "billing.create") {
    return PLAN_BILL_LIMITS[String(planTier).toUpperCase()] ?? 100;
  }
  if (canonicalKey === "users.sub_users") {
    return PLAN_SEAT_LIMITS[String(planTier).toUpperCase()] ?? 0;
  }

  return feat.limit ?? -1;
};

/**
 * Returns feature details by key.
 */
export const getFeatureDetails = (featureKey) => {
  const canonicalKey = resolveFeatureKey(featureKey);
  return (
    FEATURE_CATALOG[canonicalKey] ||
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
  PLAN_SEAT_LIMITS,
  PLAN_BILL_LIMITS,
  EXTRA_BILL_PACK_SIZE,
  FEATURE_CATALOG,
  resolveFeatureKey,
  isFeatureAllowed,
  hasFeature,
  getPlanEntitlements,
  getFeatureLimit,
  getFeatureDetails,
  PlanLockBadge,
  LockedFeatureGate,
};
