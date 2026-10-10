import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import prisma from '../config/prisma.mjs';
import { getActiveSubscription } from '../services/subscription.service.mjs';

let customizerStore = {
  template: 'modern',
  themeColor: '#1a5cff',
  invoiceTitle: 'TAX INVOICE',
  showHsnSummary: true,
  showBankDetails: true,
  showQrCode: true,
  showSignatory: true,
  showTerms: true,
  showAmountInWords: true,
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200012345678',
  ifsc: 'HDFC0001234',
  accountHolder: 'BILZET Retail Mart',
  upiId: 'bilzet@hdfcbank',
};

export const getShopSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.shopSettings.findFirst();
  if (!settings) {
    settings = await prisma.shopSettings.create({
      data: {
        shopName: 'BILZET Retail Mart',
        ownerName: 'demo',
        phone: '+91 9876543210',
        email: 'billing@bilzet.app',
        address: '123 Commercial Plaza, Main Market',
        gstin: '33AAAAA0000A1Z5',
        state: 'Tamil Nadu',
        stateCode: '33',
        invoicePrefix: 'INV-2026-',
        paperSize: 'A4',
      },
    });
  }

  // Restore any persisted invoice customization from database
  if (settings.terms && typeof settings.terms === 'string' && settings.terms.startsWith('{')) {
    try {
      const parsed = JSON.parse(settings.terms);
      customizerStore = { ...customizerStore, ...parsed };
    } catch (e) {}
  }

  // If user is operating in an active store context, merge store profile
  if (req.user?.businessId) {
    try {
      const currentStore = await prisma.business.findUnique({ where: { id: req.user.businessId } });
      if (currentStore) {
        if (currentStore.name) settings.shopName = currentStore.name;
        if (currentStore.address) settings.address = currentStore.address;
        if (currentStore.phone) settings.phone = currentStore.phone;
        if (currentStore.email) settings.email = currentStore.email;
        if (currentStore.gstin) settings.gstin = currentStore.gstin;
      }
    } catch (_) {}
  }

  let effectiveTier = 'FREE';
  let planName = 'Free Starter';
  if (req.user?.role === 'SUPER_ADMIN' || req.user?.isSuperAdmin) {
    effectiveTier = 'PREMIUM';
    planName = 'Super Admin Enterprise';
  } else if (req.user) {
    try {
      const subInfo = await getActiveSubscription(req.user.businessId, req.user.id);
      effectiveTier = (subInfo.isActive ? (subInfo.actualPlanTier || subInfo.planTier) : 'FREE') || 'FREE';
      planName = subInfo.planName || 'Free Starter';
    } catch (_) {}
  }

  const merged = {
    ...customizerStore,
    ...settings,
    terms: customizerStore.termsText || customizerStore.terms || (settings.terms?.startsWith('{') ? customizerStore.terms : settings.terms),
    _id: settings.id,
    subscriptionTier: effectiveTier,
    subscriptionPlanName: planName,
  };

  return sendResponse(res, 200, { settings: merged }, 'Shop settings fetched successfully');
});

export const updateShopSettings = asyncHandler(async (req, res) => {
  // Subscription Plan Entitlement Validation (Anti-Bypass Backend Enforcement)
  if (req.user?.role !== 'SUPER_ADMIN' && !req.user?.isSuperAdmin) {
    const subInfo = await getActiveSubscription(req.user?.businessId, req.user?.id);
    const effectiveTier = (subInfo.isActive ? (subInfo.actualPlanTier || subInfo.planTier) : 'FREE') || 'FREE';

    const tierRank = { FREE: 1, PRO: 2, PREMIUM: 3, ENTERPRISE: 4 };
    const userRank = tierRank[effectiveTier.toUpperCase()] || 1;

    // Check Premium-only features
    const isThermal58 = req.body.paperSize === 'Thermal 58mm';
    const hasCustomHexColor = Boolean(req.body.customColor && req.body.customColor.trim());
    const hasAdvancedTerms = req.body.multiDocumentTerms !== undefined;

    if ((isThermal58 || hasCustomHexColor || hasAdvancedTerms) && userRank < 3) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        error: 'Premium subscription required',
        message: 'Thermal 58mm printing and custom brand color customization require an active Premium subscription.',
        currentPlan: effectiveTier,
        requiredPlan: 'PREMIUM',
      });
    }

    // Check Pro-only features
    const isThermal80 = req.body.paperSize === 'Thermal 80mm';
    const isWatermarkRemoved = req.body.removeWatermark === true || req.body.showWatermark === false;
    const isBankOrUpiExplicit = (req.body.showBankDetails === true || req.body.showQrCode === true) && Boolean(req.body.upiId?.trim() || req.body.bankName?.trim());
    const isCustomSignatory = req.body.showSignatory === true && Boolean(req.body.authorizedPerson?.trim());

    if ((isThermal80 || isWatermarkRemoved || isBankOrUpiExplicit || isCustomSignatory) && userRank < 2) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        error: 'Pro subscription required',
        message: 'Thermal 80mm printing, UPI QR display, and watermark removal require an upgrade to Pro.',
        currentPlan: effectiveTier,
        requiredPlan: 'PRO',
      });
    }
  }

  let settings = await prisma.shopSettings.findFirst();

  // Merge any incoming customization fields
  customizerStore = {
    ...customizerStore,
    ...req.body,
  };

  // Database-supported columns in Prisma schema
  const dbAllowed = [
    'shopName', 'ownerName', 'phone', 'email', 'address',
    'gstin', 'state', 'stateCode', 'invoicePrefix', 'paperSize'
  ];
  const dbData = {};
  for (const key of dbAllowed) {
    if (req.body[key] !== undefined) {
      dbData[key] = req.body[key];
    }
  }

  // Persist full customization store directly in database (terms column)
  dbData.terms = JSON.stringify(customizerStore);

  if (!settings) {
    settings = await prisma.shopSettings.create({ data: dbData });
  } else {
    settings = await prisma.shopSettings.update({
      where: { id: settings.id },
      data: dbData,
    });
  }

  // Also update active store if businessId present
  if (req.user?.businessId) {
    try {
      const bizUpdate = {};
      if (dbData.shopName) bizUpdate.name = dbData.shopName;
      if (dbData.address) bizUpdate.address = dbData.address;
      if (dbData.phone) bizUpdate.phone = dbData.phone;
      if (dbData.email) bizUpdate.email = dbData.email;
      if (dbData.gstin) bizUpdate.gstin = dbData.gstin;
      if (Object.keys(bizUpdate).length > 0) {
        await prisma.business.update({
          where: { id: req.user.businessId },
          data: bizUpdate,
        });
      }
    } catch (_) {}
  }

  const merged = {
    ...customizerStore,
    ...settings,
    terms: customizerStore.termsText || customizerStore.terms || req.body.terms,
    _id: settings.id,
  };

  return sendResponse(res, 200, { settings: merged }, 'Shop settings updated successfully');
});

export default {
  getShopSettings,
  updateShopSettings,
};
