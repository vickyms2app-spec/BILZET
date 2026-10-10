/**
 * Centralized Subscription Plan and Feature Entitlement Configuration.
 * Controls tier limits, feature access rules, and pricing comparison.
 */

export const PLAN_TIERS = {
  FREE: 'FREE',
  PRO: 'PRO',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE',
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
  PREMIUM: 15,
  ENTERPRISE: 15,
};

export const DEFAULT_PLAN_LIMIT = 0;

export const getPlanSeatLimit = (planTier) => {
  if (!planTier) return DEFAULT_PLAN_LIMIT;
  const normalized = String(planTier).toUpperCase();
  return PLAN_SEAT_LIMITS[normalized] ?? DEFAULT_PLAN_LIMIT;
};

export const PLAN_DETAILS = {
  FREE: {
    id: 'FREE',
    name: 'Free Starter',
    tier: 'FREE',
    price: '₹0',
    amount: 0,
    billingPeriod: '/ year',
    badge: 'FREE',
    description: '100 included bills + optional 500-bill packs · 365 days',
    maxSubUsers: 0,
    billLimit: '100 bills / year',
    features: [
      'First 100 bills included for 1 year',
      'Single-user owner account (0 sub-users)',
      'Basic product catalog & stock overview',
      'Warehouse & godown management',
      'Stock transfers between godowns',
      'A4 / A5 standard print layouts',
      '3 invoice templates & color themes',
      'Daily and monthly sales reports',
      'Basic GST calculation preview',
      'Fixed BILZET watermark on bills',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro Business',
    tier: 'PRO',
    price: '₹1,499.00',
    amount: 1499,
    billingPeriod: '/ year',
    badge: 'PRO',
    description: 'Unlimited bills · 365 days',
    maxSubUsers: 5,
    billLimit: 'Unlimited',
    features: [
      'Unlimited bills for 1 year',
      'Everything in Free plan',
      'Up to 5 Team & Cashier Sub-Users',
      'Standard Role Assignments (Manager, Cashier, Staff)',
      'Thermal 80mm POS receipt roll printer',
      'Remove BILZET watermark from bills',
      'Direct Bank details & scan-to-pay UPI QR on invoices',
      'Automated payroll calculation & attendance deduction rules',
      'Profit & Loss reports & Excel (.xlsx) data export',
      'GSTR-1 draft export & GSTR-3B tax summary',
      'WhatsApp invoice PDF sharing & SMS dispatch alerts',
      'Online store orders reception & management',
    ],
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Premium Enterprise',
    tier: 'PREMIUM',
    price: '₹2,999.00',
    amount: 2999,
    billingPeriod: '/ year',
    badge: 'PREMIUM',
    description: 'Unlimited bills · 365 days',
    maxSubUsers: 15,
    billLimit: 'Unlimited',
    features: [
      'Unlimited bills for 1 year',
      'Everything in Pro plan',
      'Up to 15 Team Sub-Users',
      'CA Connect — Chartered Accountant collaboration portal',
      'Custom Roles & Permissions Studio',
      'Granular Permission Overrides per user',
      'Thermal 58mm ultra-compact mobile handheld roll',
      'Custom Brand HEX Color picker for invoice branding',
      'Multi-document terms customization (Invoices, Quotes, Challans)',
      'Advanced GST classifications & composition CMP-08 filing prep',
      'Credit & Debit notes / Sales returns',
      'Priority partner-level enterprise support',
    ],
  },
};

export const FEATURE_ENTITLEMENTS = {
  // CA Connect (Strictly Premium)
  ca_connect: {
    minPlan: 'PREMIUM',
    name: 'CA Connect',
    module: 'Accountant Collaboration',
    description: 'Invite your Chartered Accountant for direct ledger access, GST audits, and reconciliations.',
    benefit: 'Seamlessly collaborate with your CA for direct filing without manual CSV exports.',
  },
  // Custom Roles & Permissions Studio (Premium)
  custom_roles: {
    minPlan: 'PREMIUM',
    name: 'Custom Roles & Permissions',
    module: 'Team Management',
    description: 'Design custom staff roles with granular overrides for billing, inventory, and reports.',
    benefit: 'Define tailored permissions for cashiers, store supervisors, and accountants.',
  },
  // Thermal 58mm Printing (Premium)
  thermal_58mm: {
    minPlan: 'PREMIUM',
    name: 'Thermal 58mm Printing',
    module: 'Business Settings',
    description: 'Print compact 58mm receipts for handheld mobile POS Bluetooth printers.',
    benefit: 'Optimized formatting for mobile portable thermal receipt rolls.',
  },
  // Custom Brand HEX Color (Premium)
  custom_color: {
    minPlan: 'PREMIUM',
    name: 'Custom Brand HEX Colors',
    module: 'Business Settings',
    description: 'Apply your exact corporate brand HEX colors to all customer invoices and receipts.',
    benefit: 'Consistent brand identity across printed bills and digital PDFs.',
  },
  // Multi-Document Custom Terms (Premium)
  advanced_terms: {
    minPlan: 'PREMIUM',
    name: 'Multi-Document Terms',
    module: 'Business Settings',
    description: 'Configure independent custom terms of sale for Invoices, Estimates, and Delivery Challans.',
    benefit: 'Legal protection tailored specifically for different transaction document types.',
  },

  // Thermal 80mm Printing (Pro)
  thermal_80mm: {
    minPlan: 'PRO',
    name: 'Thermal 80mm Printing',
    module: 'Business Settings',
    description: 'Standard 80mm receipt roll printing for POS desktop thermal printers.',
    benefit: 'High-speed roll printing designed for retail checkout counters.',
  },
  // Watermark Removal (Pro)
  remove_watermark: {
    minPlan: 'PRO',
    name: 'Remove BILZET Watermark',
    module: 'Business Settings',
    description: 'Eliminate "Powered by BILZET" branding from printed bills and PDFs.',
    benefit: 'Deliver 100% white-labeled professional invoices to your customers.',
  },
  // Bank Settlement & Dynamic UPI QR (Pro)
  bank_upi_qr: {
    minPlan: 'PRO',
    name: 'Bank Details & Scan-to-Pay UPI QR',
    module: 'Business Settings',
    description: 'Print bank account details and dynamic UPI QR codes directly on invoices.',
    benefit: 'Enable instant customer payments directly into your business bank account.',
  },
  // Team Sub-Users (Pro)
  team_subusers: {
    minPlan: 'PRO',
    name: 'Team & Cashier Sub-Users',
    module: 'Operations & HR',
    description: 'Add up to 5 sub-users on Pro and up to 15 sub-users on Premium.',
    benefit: 'Allow your cashier, manager, and warehouse staff to operate simultaneously.',
  },
  // Advanced Reports & Profit Analysis (Pro)
  advanced_reports: {
    minPlan: 'PRO',
    name: 'Profit & Loss and Advanced Analytics',
    module: 'Reports & Analytics',
    description: 'Access Gross & Net Profit reports, category margin analytics, and Excel exports.',
    benefit: 'Deep financial visibility to optimize profit margins and eliminate loss-making items.',
  },
  // GSTR-1 & GSTR-3B Tax Filing (Pro)
  gst_filing: {
    minPlan: 'PRO',
    name: 'GSTR-1 & GSTR-3B Tax Filing Packs',
    module: 'GST & Tax',
    description: 'Automated GSTR-1 draft export and GSTR-3B monthly tax summary.',
    benefit: 'Save hours of manual accounting with one-click GST return preparation.',
  },
  // Online Store Orders (Pro)
  online_orders: {
    minPlan: 'PRO',
    name: 'Online Store Orders',
    module: 'Online Orders',
    description: 'Receive and process orders from your digital storefront.',
    benefit: 'Expand your business with multi-channel order taking and dispatch.',
  },
  // SMS Campaigns (Pro)
  sms_campaigns: {
    minPlan: 'PRO',
    name: 'Promotional SMS Campaigns',
    module: 'SMS Marketing',
    description: 'Automated order delivery SMS and bulk promotional campaigns to customers.',
    benefit: 'Drive repeat purchases with instant SMS promotions and order status updates.',
  },
};

/**
 * Checks if a plan tier has access to a specific feature.
 * @param {string} featureKey
 * @param {string} userTier - 'FREE' | 'PRO' | 'PREMIUM'
 * @param {boolean} [isActive=true]
 */
export const isFeatureAllowedByTier = (featureKey, userTier = 'FREE', isActive = true) => {
  const feature = FEATURE_ENTITLEMENTS[featureKey];
  if (!feature) return true; // Unrestricted if not cataloged

  if (!isActive) return false;

  const currentRank = TIER_RANKS[String(userTier).toUpperCase()] || 1;
  const requiredRank = TIER_RANKS[String(feature.minPlan).toUpperCase()] || 1;

  return currentRank >= requiredRank;
};

export default {
  PLAN_TIERS,
  TIER_RANKS,
  PLAN_SEAT_LIMITS,
  DEFAULT_PLAN_LIMIT,
  getPlanSeatLimit,
  PLAN_DETAILS,
  FEATURE_ENTITLEMENTS,
  isFeatureAllowedByTier,
};
