/**
 * Centralized Subscription Plan and Feature Entitlement Configuration.
 * Single source of truth for plan tiers, feature access rules, seat limits, and bill limits.
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
  PREMIUM: -1, // -1 denotes Unlimited seats
  ENTERPRISE: -1,
};

export const PLAN_BILL_LIMITS = {
  FREE: 100, // 100 included bills / 1 year
  PRO: -1,   // Unlimited bills
  PREMIUM: -1, // Unlimited bills
  ENTERPRISE: -1,
};

export const EXTRA_BILL_PACK_SIZE = 500;
export const EXTRA_BILL_PACK_PRICE = 299;

export const DEFAULT_PLAN_LIMIT = 0;

export const getPlanSeatLimit = (planTier) => {
  if (!planTier) return DEFAULT_PLAN_LIMIT;
  const normalized = String(planTier).toUpperCase();
  return PLAN_SEAT_LIMITS[normalized] ?? DEFAULT_PLAN_LIMIT;
};

export const getPlanBillLimit = (planTier) => {
  if (!planTier) return PLAN_BILL_LIMITS.FREE;
  const normalized = String(planTier).toUpperCase();
  return PLAN_BILL_LIMITS[normalized] ?? PLAN_BILL_LIMITS.FREE;
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
    maxSubUsers: -1,
    billLimit: 'Unlimited',
    features: [
      'Unlimited bills for 1 year',
      'Everything in Pro plan',
      'Unlimited Team Sub-Users',
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

/**
 * Canonical Feature Registry.
 * Defines exact tier entitlement, module, description, and limits for every feature.
 */
export const FEATURE_ENTITLEMENTS = {
  // ─── FREE FEATURES ───
  'billing.create': {
    minPlan: 'FREE',
    name: 'Sales Invoicing & Billing',
    module: 'Sales & Billing',
    limit: 100,
    description: 'Create sales invoices within the 100-bill annual allowance or purchased packs.',
    benefit: 'Quick and reliable invoice creation for retail counters.',
  },
  'billing.extra_packs': {
    minPlan: 'FREE',
    name: 'Purchase 500-Bill Packs',
    module: 'Sales & Billing',
    description: 'Purchase additional 500-bill packs without changing plans.',
    benefit: 'Pay-as-you-go flexibility without upgrading.',
  },
  'inventory.tracking': {
    minPlan: 'FREE',
    name: 'Inventory & Stock Tracking',
    module: 'Inventory',
    description: 'Track stock counts, low-stock warnings, godowns, and stock transfers.',
    benefit: 'Real-time stock visibility across your stores and godowns.',
  },
  'reports.sales_daily_monthly': {
    minPlan: 'FREE',
    name: 'Daily & Monthly Sales Reports',
    module: 'Reports & Analytics',
    description: 'Standard daily and monthly sales summaries with invoice register.',
    benefit: 'Understand store daily revenue and payment modes breakdown.',
  },
  'reports.gst_preview': {
    minPlan: 'FREE',
    name: 'GST Calculation Preview',
    module: 'GST & Tax',
    description: 'Basic invoice GST preview and rate break-ups.',
    benefit: 'Compliant tax calculation for CGST, SGST, and IGST.',
  },
  'printing.standard_a4_a5': {
    minPlan: 'FREE',
    name: 'A4 / A5 Standard Print Layouts',
    module: 'Business Settings',
    description: 'Standard full-page A4 and half-page A5 invoice layouts with 3 templates.',
    benefit: 'Standard professional tax invoice layout for laser and inkjet printers.',
  },

  // ─── PRO FEATURES ───
  'users.sub_users': {
    minPlan: 'PRO',
    name: 'Team & Cashier Sub-Users',
    module: 'Operations & HR',
    limit: 5,
    description: 'Add up to 5 sub-users on Pro and unlimited sub-users on Premium.',
    benefit: 'Allow cashiers, managers, and staff to operate simultaneously.',
  },
  'users.standard_roles': {
    minPlan: 'PRO',
    name: 'Standard Role Assignments',
    module: 'Team Management',
    description: 'Assign standard roles: Manager, Cashier, and Staff.',
    benefit: 'Operational role-based access control out of the box.',
  },
  'printing.thermal_80mm': {
    minPlan: 'PRO',
    name: 'Thermal 80mm Printing',
    module: 'Business Settings',
    description: 'Standard 80mm receipt roll printing for POS desktop thermal printers.',
    benefit: 'High-speed roll printing designed for retail checkout counters.',
  },
  'invoice.remove_watermark': {
    minPlan: 'PRO',
    name: 'Remove BILZET Watermark',
    module: 'Business Settings',
    description: 'Eliminate "Powered by BILZET" branding from printed bills and PDFs.',
    benefit: 'Deliver 100% white-labeled professional invoices to your customers.',
  },
  'invoice.upi_qr': {
    minPlan: 'PRO',
    name: 'Bank Details & Scan-to-Pay UPI QR',
    module: 'Business Settings',
    description: 'Print bank account details and dynamic UPI QR codes directly on invoices.',
    benefit: 'Enable instant customer payments directly into your business bank account.',
  },
  'reports.profit_loss': {
    minPlan: 'PRO',
    name: 'Profit & Loss Reports',
    module: 'Reports & Analytics',
    description: 'Access Gross & Net Profit reports and margin analytics.',
    benefit: 'Deep financial visibility to optimize profit margins and eliminate loss-making items.',
  },
  'reports.xlsx_export': {
    minPlan: 'PRO',
    name: 'Excel (.xlsx) Data Export',
    module: 'Reports & Analytics',
    description: 'Export sales, customer, and inventory records directly to Microsoft Excel.',
    benefit: 'Easily export and share financial data with external accounting tools.',
  },
  'gst.gstr1_draft': {
    minPlan: 'PRO',
    name: 'GSTR-1 Draft Pack Export',
    module: 'GST & Tax',
    description: 'Automated GSTR-1 draft export for B2B, B2CL, B2CS, and HSN summary tables.',
    benefit: 'Save hours of manual accounting with one-click GST return preparation.',
  },
  'gst.gstr3b_summary': {
    minPlan: 'PRO',
    name: 'GSTR-3B Tax Summary',
    module: 'GST & Tax',
    description: 'Automated monthly outward tax liability and inward ITC computation summary.',
    benefit: 'Instant figures ready for filing GSTR-3B on the GST portal.',
  },
  'communication.whatsapp_pdf': {
    minPlan: 'PRO',
    name: 'WhatsApp Invoice PDF Sharing',
    module: 'Communication',
    description: 'Send invoices directly to customers via WhatsApp.',
    benefit: 'Instant digital invoice delivery to customer mobile phones.',
  },
  'communication.sms_alerts': {
    minPlan: 'PRO',
    name: 'SMS Dispatch Alerts & Campaigns',
    module: 'SMS Marketing',
    description: 'Automated order delivery SMS and promotional bulk campaigns.',
    benefit: 'Keep customers engaged and informed with instant SMS delivery notices.',
  },
  'store.order_management': {
    minPlan: 'PRO',
    name: 'Online Store Order Management',
    module: 'Online Orders',
    description: 'Receive and process orders from your digital storefront.',
    benefit: 'Expand your business with multi-channel order taking and dispatch.',
  },
  'purchases.orders': {
    minPlan: 'PRO',
    name: 'Advanced Purchase Orders & Vendor Management',
    module: 'Purchases & Vendors',
    description: 'Create, dispatch, and track official Purchase Orders issued to suppliers.',
    benefit: 'Automate procurement, vendor lead times, and PO-to-bill conversions.',
  },
  'barcode.scanning': {
    minPlan: 'PRO',
    name: 'Barcode Scanning & Label Generation',
    module: 'Inventory',
    description: 'Scan barcodes for high-speed checkout and print retail barcode sticker labels.',
    benefit: 'Reduce counter checkout time by 80% with instant barcode lookups.',
  },

  // ─── PREMIUM FEATURES ───
  'ca.connect': {
    minPlan: 'PREMIUM',
    name: 'CA Connect',
    module: 'Accountant Collaboration',
    description: 'Invite your Chartered Accountant for direct ledger access, GST audits, and reconciliations.',
    benefit: 'Seamlessly collaborate with your CA for direct filing without manual CSV exports.',
  },
  'users.custom_roles': {
    minPlan: 'PREMIUM',
    name: 'Custom Roles & Permissions Studio',
    module: 'Team Management',
    description: 'Design custom staff roles with granular overrides for billing, inventory, and reports.',
    benefit: 'Define tailored permissions for cashiers, store supervisors, and accountants.',
  },
  'users.permission_overrides': {
    minPlan: 'PREMIUM',
    name: 'Granular Permission Overrides per User',
    module: 'Team Management',
    description: 'Configure bespoke permission overrides directly on individual user accounts.',
    benefit: 'Fine-tuned security without altering base team role templates.',
  },
  'stores.multi_store': {
    minPlan: 'PREMIUM',
    name: 'Multi-Store & Branch Management',
    module: 'Multi-Location',
    description: 'Manage multiple branches, outlets, warehouses, and switch store contexts seamlessly.',
    benefit: 'Centralized visibility and control across your entire retail chain.',
  },
  'inventory.advanced': {
    minPlan: 'PREMIUM',
    name: 'Advanced Inventory & Batch Tracking',
    module: 'Inventory',
    description: 'Track batches, manufacture & expiry dates, and product serial numbers.',
    benefit: 'Prevent spoilage and maintain full compliance with pharmaceutical and FMCG tracking.',
  },
  'analytics.ai_smart_predictions': {
    minPlan: 'PREMIUM',
    name: 'AI Analytics & Smart Stock Predictions',
    module: 'AI & Analytics',
    description: 'Predict inventory stockouts and get AI-driven sales trend recommendations.',
    benefit: 'Never run out of high-margin inventory during seasonal demand spikes.',
  },
  'audit.logs': {
    minPlan: 'PREMIUM',
    name: 'Audit Logs & User Action Tracking',
    module: 'Security & Compliance',
    description: 'Track every user action, edit, price override, and security event.',
    benefit: 'Complete accountability and anti-theft tracking for retail operations.',
  },
  'invoice.custom_templates': {
    minPlan: 'PREMIUM',
    name: 'Custom Invoice Templates',
    module: 'Business Settings',
    description: 'Create bespoke invoice templates with custom fields, layouts, and branding.',
    benefit: 'Tailor invoices to exact enterprise corporate specifications.',
  },
  'branding.white_label': {
    minPlan: 'PREMIUM',
    name: 'Custom Domain & White-Label Portal',
    module: 'Branding',
    description: 'Access BILZET on your custom domain with complete white-label branding.',
    benefit: 'Present a 100% branded software experience to staff and clients.',
  },
  'integration.open_api': {
    minPlan: 'PREMIUM',
    name: 'Open API & ERP Integrations',
    module: 'Developer & Integrations',
    description: 'Direct API access, webhooks, and third-party accounting/ERP syncing.',
    benefit: 'Connect BILZET with external ERPs, e-commerce storefronts, and automated workflows.',
  },
  'printing.thermal_58mm': {
    minPlan: 'PREMIUM',
    name: 'Thermal 58mm Printing',
    module: 'Business Settings',
    description: 'Print compact 58mm receipts for handheld mobile POS Bluetooth printers.',
    benefit: 'Optimized formatting for mobile portable thermal receipt rolls.',
  },
  'invoice.custom_brand_colors': {
    minPlan: 'PREMIUM',
    name: 'Custom Brand HEX Colors',
    module: 'Business Settings',
    description: 'Apply your exact corporate brand HEX colors to all customer invoices and receipts.',
    benefit: 'Consistent brand identity across printed bills and digital PDFs.',
  },
  'documents.custom_terms': {
    minPlan: 'PREMIUM',
    name: 'Multi-Document Terms Customization',
    module: 'Business Settings',
    description: 'Configure independent custom terms of sale for Invoices, Estimates, and Delivery Challans.',
    benefit: 'Legal protection tailored specifically for different transaction document types.',
  },
  'gst.advanced_classification': {
    minPlan: 'PREMIUM',
    name: 'Advanced GST Classifications',
    module: 'GST & Tax',
    description: 'Advanced reverse charge, composite tax rates, and special economic zone classifications.',
    benefit: 'Enterprise-grade tax compliance for complex multi-state transactions.',
  },
  'gst.cmp08_prep': {
    minPlan: 'PREMIUM',
    name: 'Composition CMP-08 Filing Preparation',
    module: 'GST & Tax',
    description: 'Quarterly statement prep for composition taxpayers under CMP-08.',
    benefit: 'Streamlined filing workflow for composition dealer stores.',
  },
  'sales.credit_debit_notes': {
    minPlan: 'PREMIUM',
    name: 'Credit and Debit Notes',
    module: 'Sales & Purchases',
    description: 'Formal GST-compliant credit note and debit note issuance against finalized invoices.',
    benefit: 'Accurate tax-adjusted ledger credits for post-sale adjustments.',
  },
  'sales.returns': {
    minPlan: 'PREMIUM',
    name: 'Sales Returns & Reversals',
    module: 'Sales Operations',
    description: 'Comprehensive product return management with automated GST adjustments.',
    benefit: 'Audit-ready inventory and tax ledger reconciliations for returns.',
  },
  'support.priority': {
    minPlan: 'PREMIUM',
    name: 'Priority Enterprise Support',
    module: 'Support',
    description: 'Direct dedicated priority support and onboarding specialist assistance.',
    benefit: 'Guaranteed 2-hour response time for mission-critical store issues.',
  },
};

// ─── BACKWARD COMPATIBILITY ALIASES (snake_case -> dot notation) ───
const FEATURE_ALIASES = {
  ca_connect: 'ca.connect',
  custom_roles: 'users.custom_roles',
  thermal_58mm: 'printing.thermal_58mm',
  custom_color: 'invoice.custom_brand_colors',
  advanced_terms: 'documents.custom_terms',
  thermal_80mm: 'printing.thermal_80mm',
  remove_watermark: 'invoice.remove_watermark',
  bank_upi_qr: 'invoice.upi_qr',
  team_subusers: 'users.sub_users',
  advanced_reports: 'reports.profit_loss',
  gst_filing: 'gst.gstr1_draft',
  online_orders: 'store.order_management',
  sms_campaigns: 'communication.sms_alerts',
  purchase_orders: 'purchases.orders',
  barcode_scanner: 'barcode.scanning',
  multi_store: 'stores.multi_store',
  advanced_inventory: 'inventory.advanced',
  ai_analytics: 'analytics.ai_smart_predictions',
  audit_logs: 'audit.logs',
  custom_invoice_templates: 'invoice.custom_templates',
  white_label_portal: 'branding.white_label',
  open_api: 'integration.open_api',
};

// Register aliases directly into FEATURE_ENTITLEMENTS for transparent dual-key lookups
for (const [alias, canonicalKey] of Object.entries(FEATURE_ALIASES)) {
  if (FEATURE_ENTITLEMENTS[canonicalKey]) {
    FEATURE_ENTITLEMENTS[alias] = FEATURE_ENTITLEMENTS[canonicalKey];
  }
}

/**
 * Resolves canonical feature key.
 */
export const resolveFeatureKey = (key) => {
  if (!key) return key;
  return FEATURE_ALIASES[key] || key;
};

/**
 * Checks if a plan tier has access to a specific feature.
 * @param {string} featureKey
 * @param {string} userTier - 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE'
 * @param {boolean} [isActive=true]
 */
export const isFeatureAllowedByTier = (featureKey, userTier = 'FREE', isActive = true) => {
  const canonicalKey = resolveFeatureKey(featureKey);
  const feature = FEATURE_ENTITLEMENTS[canonicalKey] || FEATURE_ENTITLEMENTS[featureKey];
  if (!feature) return true; // Unrestricted if not cataloged

  if (!isActive) return false;

  const currentRank = TIER_RANKS[String(userTier).toUpperCase()] || 1;
  const requiredRank = TIER_RANKS[String(feature.minPlan).toUpperCase()] || 1;

  return currentRank >= requiredRank;
};

/**
 * Alias for isFeatureAllowedByTier with (planTier, featureKey, isActive) signature.
 */
export const hasFeature = (planTier = 'FREE', featureKey, isActive = true) => {
  return isFeatureAllowedByTier(featureKey, planTier, isActive);
};

/**
 * Returns all feature keys entitled to a given plan tier.
 */
export const getPlanEntitlements = (planTier = 'FREE') => {
  const currentRank = TIER_RANKS[String(planTier).toUpperCase()] || 1;
  const entitled = [];

  for (const [key, feat] of Object.entries(FEATURE_ENTITLEMENTS)) {
    // Only return canonical keys (exclude alias clones)
    if (key.includes('.')) {
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
export const getFeatureLimit = (planTier = 'FREE', featureKey) => {
  const canonicalKey = resolveFeatureKey(featureKey);
  const feat = FEATURE_ENTITLEMENTS[canonicalKey];
  if (!feat) return -1;

  const allowed = isFeatureAllowedByTier(canonicalKey, planTier, true);
  if (!allowed) return 0;

  if (canonicalKey === 'billing.create') {
    return getPlanBillLimit(planTier);
  }
  if (canonicalKey === 'users.sub_users') {
    return getPlanSeatLimit(planTier);
  }

  return feat.limit ?? -1;
};

export default {
  PLAN_TIERS,
  TIER_RANKS,
  PLAN_SEAT_LIMITS,
  PLAN_BILL_LIMITS,
  EXTRA_BILL_PACK_SIZE,
  EXTRA_BILL_PACK_PRICE,
  DEFAULT_PLAN_LIMIT,
  getPlanSeatLimit,
  getPlanBillLimit,
  PLAN_DETAILS,
  FEATURE_ENTITLEMENTS,
  resolveFeatureKey,
  isFeatureAllowedByTier,
  hasFeature,
  getPlanEntitlements,
  getFeatureLimit,
};
