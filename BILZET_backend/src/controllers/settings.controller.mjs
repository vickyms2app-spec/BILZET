import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { getActiveSubscription } from '../services/subscription.service.mjs';
import brandingService from '../services/branding.service.mjs';
import path from 'path';
import fs from 'fs';

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

// Helper to resolve active store ID for current user
const resolveUserStoreId = async (req) => {
  if (req.user?.businessId) return req.user.businessId;
  if (req.user?.id) {
    const owned = await prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (owned?.id) return owned.id;
  }
  return 'busi-01';
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

  // Resolve active store ID for tenant-isolated branding
  const activeStoreId = await resolveUserStoreId(req);

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

  // Load tenant-isolated branding (Company Logo & Owner Signature)
  const storeBranding = await brandingService.getStoreBranding(activeStoreId);

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
    businessId: activeStoreId,
    // Company Logo & Owner Signature branding fields
    logoUrl: storeBranding.logoUrl || null,
    signatureUrl: storeBranding.signatureUrl || null,
    showLogoOnInvoices: storeBranding.showLogoOnInvoices !== undefined ? storeBranding.showLogoOnInvoices : Boolean(storeBranding.logoUrl),
    showSignatureOnInvoices: storeBranding.showSignatureOnInvoices !== undefined ? storeBranding.showSignatureOnInvoices : Boolean(storeBranding.signatureUrl),
    // Backward-compatibility aliases for invoice renderers
    showLogo: storeBranding.showLogoOnInvoices !== undefined ? storeBranding.showLogoOnInvoices : Boolean(storeBranding.logoUrl),
    showSignatory: storeBranding.showSignatureOnInvoices !== undefined ? storeBranding.showSignatureOnInvoices : Boolean(storeBranding.signatureUrl),
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

  const activeStoreId = await resolveUserStoreId(req);

  // Handle branding preferences persistence per store
  const brandingUpdates = {};
  if (req.body.logoUrl !== undefined) brandingUpdates.logoUrl = req.body.logoUrl;
  if (req.body.signatureUrl !== undefined) brandingUpdates.signatureUrl = req.body.signatureUrl;
  if (req.body.showLogoOnInvoices !== undefined) brandingUpdates.showLogoOnInvoices = Boolean(req.body.showLogoOnInvoices);
  if (req.body.showSignatureOnInvoices !== undefined) brandingUpdates.showSignatureOnInvoices = Boolean(req.body.showSignatureOnInvoices);

  let updatedBranding = null;
  if (Object.keys(brandingUpdates).length > 0) {
    updatedBranding = await brandingService.saveStoreBranding(activeStoreId, brandingUpdates);
  } else {
    updatedBranding = await brandingService.getStoreBranding(activeStoreId);
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
  if (req.body.name && !req.body.shopName) {
    dbData.shopName = req.body.name;
  }
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

  // Also update or register active business for the user
  const effectiveShopName = (dbData.shopName || req.body.storeName || '').trim();
  const effectiveAddress = (dbData.address || req.body.storeLocation || '').trim();
  const effectivePhone = (dbData.phone || req.body.storePhone || '').trim();
  const effectiveEmail = (dbData.email || req.body.storeEmail || '').trim();
  const effectiveGstin = (dbData.gstin || '').trim();

  let targetBizId = req.user?.businessId;
  if (!targetBizId && req.user?.id) {
    const owned = await prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (owned) targetBizId = owned.id;
  }

  if (targetBizId) {
    try {
      const bizUpdate = {};
      if (effectiveShopName) bizUpdate.name = effectiveShopName;
      if (effectiveAddress) bizUpdate.address = effectiveAddress;
      if (effectivePhone) bizUpdate.phone = effectivePhone;
      if (effectiveEmail) bizUpdate.email = effectiveEmail;
      if (effectiveGstin) bizUpdate.gstin = effectiveGstin;
      if (Object.keys(bizUpdate).length > 0) {
        await prisma.business.update({
          where: { id: targetBizId },
          data: bizUpdate,
        });
      }
    } catch (_) {}
  } else if (req.user?.id && effectiveShopName) {
    // If user has NO store registered yet, automatically create and register it for them!
    try {
      const newBiz = await prisma.business.create({
        data: {
          ownerId: req.user.id,
          name: effectiveShopName,
          address: effectiveAddress || 'Main Branch',
          phone: effectivePhone || req.user.phone || '',
          email: effectiveEmail || req.user.email,
          gstin: effectiveGstin || '',
        },
      });
      await prisma.user.update({
        where: { id: req.user.id },
        data: { businessId: newBiz.id, isOwner: true, role: 'ADMIN' },
      }).catch(() => {});
      await prisma.businessMember.upsert({
        where: { userId_businessId: { userId: req.user.id, businessId: newBiz.id } },
        update: { role: 'ADMIN', status: 'ACTIVE' },
        create: { userId: req.user.id, businessId: newBiz.id, role: 'ADMIN', status: 'ACTIVE', acceptedAt: new Date() },
      }).catch(() => {});
    } catch (_) {}
  }

  const merged = {
    ...customizerStore,
    ...settings,
    terms: customizerStore.termsText || customizerStore.terms || req.body.terms,
    _id: settings.id,
    businessId: activeStoreId,
    logoUrl: updatedBranding.logoUrl || null,
    signatureUrl: updatedBranding.signatureUrl || null,
    showLogoOnInvoices: updatedBranding.showLogoOnInvoices !== undefined ? updatedBranding.showLogoOnInvoices : Boolean(updatedBranding.logoUrl),
    showSignatureOnInvoices: updatedBranding.showSignatureOnInvoices !== undefined ? updatedBranding.showSignatureOnInvoices : Boolean(updatedBranding.signatureUrl),
    showLogo: updatedBranding.showLogoOnInvoices !== undefined ? updatedBranding.showLogoOnInvoices : Boolean(updatedBranding.logoUrl),
    showSignatory: updatedBranding.showSignatureOnInvoices !== undefined ? updatedBranding.showSignatureOnInvoices : Boolean(updatedBranding.signatureUrl),
  };

  return sendResponse(res, 200, { settings: merged }, 'Shop settings updated successfully');
});

/**
 * Upload company logo or owner signature image
 */
export const uploadBrandingImage = asyncHandler(async (req, res) => {
  const isAuthorized = req.user?.isOwner || req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
  if (!isAuthorized) {
    throw ApiError.forbidden('Only business owners or administrators can upload invoice branding.');
  }

  const activeStoreId = await resolveUserStoreId(req);
  const { type, fileData } = req.body;

  const result = await brandingService.processBrandingUpload({
    storeId: activeStoreId,
    type,
    fileData,
    user: req.user,
  });

  return sendResponse(res, 200, result, result.message);
});

/**
 * Remove an uploaded logo or signature
 */
export const removeBrandingImage = asyncHandler(async (req, res) => {
  const isAuthorized = req.user?.isOwner || req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
  if (!isAuthorized) {
    throw ApiError.forbidden('Only business owners or administrators can remove invoice branding.');
  }

  const activeStoreId = await resolveUserStoreId(req);
  const { type } = req.params;

  const result = await brandingService.removeBrandingFile({
    storeId: activeStoreId,
    type,
  });

  return sendResponse(res, 200, result, result.message);
});

/**
 * Update logo or signature visibility preferences
 */
export const updateBrandingPreferences = asyncHandler(async (req, res) => {
  const isAuthorized = req.user?.isOwner || req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
  if (!isAuthorized) {
    throw ApiError.forbidden('Only business owners or administrators can update branding preferences.');
  }

  const activeStoreId = await resolveUserStoreId(req);
  const updates = {};
  if (req.body.showLogoOnInvoices !== undefined) {
    updates.showLogoOnInvoices = Boolean(req.body.showLogoOnInvoices);
  }
  if (req.body.showSignatureOnInvoices !== undefined) {
    updates.showSignatureOnInvoices = Boolean(req.body.showSignatureOnInvoices);
  }

  const updatedBranding = await brandingService.saveStoreBranding(activeStoreId, updates);

  return sendResponse(
    res,
    200,
    { branding: updatedBranding },
    'Invoice branding visibility preferences updated successfully'
  );
});

/**
 * Serve uploaded branding image files with CORS headers and traversal protection
 */
export const serveBrandingFile = (req, res) => {
  const { businessId, filename } = req.params;

  // Strict path traversal defense: no directory separators or parent paths
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).send('Invalid file path request');
  }

  const safeStoreId = brandingService.sanitizeStoreId(businessId);
  const filePath = path.join(brandingService.BRANDING_DIR, safeStoreId, filename);

  // Security check: ensure resolved path is strictly inside BRANDING_DIR
  if (!filePath.startsWith(brandingService.BRANDING_DIR)) {
    return res.status(403).send('Access denied');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Branding file not found');
  }

  // Determine content type
  let contentType = 'application/octet-stream';
  if (filename.endsWith('.png')) contentType = 'image/png';
  else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (filename.endsWith('.webp')) contentType = 'image/webp';

  // Set permissive CORS so html2canvas and canvas exports can read cross-origin images without tainting
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  return res.sendFile(filePath);
};

export default {
  getShopSettings,
  updateShopSettings,
  uploadBrandingImage,
  removeBrandingImage,
  updateBrandingPreferences,
  serveBrandingFile,
};

