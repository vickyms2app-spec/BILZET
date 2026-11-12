import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { PLAN_DETAILS } from '../config/plans.config.mjs';

// Default initial dealer offers seed conforming to BILZET Dealer Special Offers
const DEFAULT_DEALER_OFFERS = [
  {
    id: 'offer-dealer-basic-20',
    code: 'DEALERBASIC20',
    title: 'Dealer Basic Plan',
    dealerPlan: 'Dealer Basic',
    badge: 'Entry-level plan',
    description: 'Dealer Basic entry plan with product inventory, invoicing & sales reports.',
    discountType: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
    discountValue: 20,
    monthlyOriginalPrice: 199,
    yearlyOriginalPrice: 2388,
    monthlyPrice: 159,
    yearlyPrice: 1910,
    applicablePlans: ['BASIC', 'DEALER_BASIC', 'FREE', 'PRO'],
    billingCycles: ['MONTHLY', 'YEARLY', 'ANNUAL'],
    validFrom: new Date('2026-01-01T00:00:00Z').toISOString(),
    validUntil: new Date('2026-12-31T23:59:59Z').toISOString(),
    isActive: true,
    dealerBenefits: [
      'Billing & Invoicing',
      'Product Catalog',
      'Basic Inventory',
      'Customer and Supplier Management',
      'Basic Sales Reports',
      '500 included bills/month',
    ],
    maxRedemptions: 1000,
    timesRedeemed: 28,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-dealer-30',
    code: 'DEALER30',
    title: 'Dealer Pro Plan',
    dealerPlan: 'Dealer Pro',
    badge: 'Most Popular',
    description: 'Dealer Pro with advanced stock overview, movements, purchase management & GST reports.',
    discountType: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
    discountValue: 30,
    monthlyOriginalPrice: 349,
    yearlyOriginalPrice: 4188,
    monthlyPrice: 244,
    yearlyPrice: 2932,
    applicablePlans: ['PRO', 'DEALER_PRO'],
    billingCycles: ['MONTHLY', 'YEARLY', 'ANNUAL'],
    validFrom: new Date('2026-01-01T00:00:00Z').toISOString(),
    validUntil: new Date('2026-12-31T23:59:59Z').toISOString(),
    isActive: true,
    dealerBenefits: [
      'Everything in Basic',
      'Advanced Stock Overview',
      'Stock Movements',
      'Purchase Management',
      'Advanced Reports and Analytics',
      'GST Reports',
      'Expanded Multi-user Access',
    ],
    maxRedemptions: 1000,
    timesRedeemed: 42,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-dealer-vip40',
    code: 'DEALERVIP40',
    title: 'Dealer Premium Plan',
    dealerPlan: 'Dealer Premium',
    badge: 'Best Value',
    description: 'Dealer Premium with multi-store management, CA connect, centralized inventory & priority support.',
    discountType: 'PERCENTAGE',
    discountValue: 40,
    monthlyOriginalPrice: 499,
    yearlyOriginalPrice: 5988,
    monthlyPrice: 299,
    yearlyPrice: 3593,
    applicablePlans: ['PREMIUM', 'DEALER_PREMIUM', 'ENTERPRISE'],
    billingCycles: ['MONTHLY', 'YEARLY', 'ANNUAL'],
    validFrom: new Date('2026-01-01T00:00:00Z').toISOString(),
    validUntil: new Date('2026-12-31T23:59:59Z').toISOString(),
    isActive: true,
    dealerBenefits: [
      'Everything in Pro',
      'Multi-Store Management',
      'Advanced Staff Management',
      'Role and Permission Management',
      'CA Connect',
      'Advanced GST Analytics',
      'Centralized Inventory',
      'Priority Support',
    ],
    maxRedemptions: 500,
    timesRedeemed: 19,
    createdAt: new Date().toISOString(),
  },
];

// In-memory runtime cache for high resilience
let inMemoryOffers = [...DEFAULT_DEALER_OFFERS];

/**
 * Calculates complete pricing breakdown for an offer under specified billingCycle ('MONTHLY' | 'YEARLY' | 'ANNUAL').
 * Computes: originalPrice, discountAmount (savings), net discountedPrice, 18% GST (rounded), and totalWithGst.
 */
export function calculateOfferPricing(offer, billingCycle = 'YEARLY') {
  const isMonthly = String(billingCycle).toUpperCase() === 'MONTHLY';
  const cycleKey = isMonthly ? 'MONTHLY' : 'YEARLY';

  // 1. Determine plan tier
  const planName = String(offer.dealerPlan || offer.title || '').toUpperCase();
  const isPremium = planName.includes('PREMIUM') || (offer.applicablePlans || []).some((p) => String(p).toUpperCase().includes('PREMIUM'));
  const isPro = !isPremium && (planName.includes('PRO') || (offer.applicablePlans || []).some((p) => String(p).toUpperCase().includes('PRO')));
  const tier = isPremium ? 'PREMIUM' : isPro ? 'PRO' : 'BASIC';

  // 2. Determine base / original price
  let baseAmount = 0;
  if (isMonthly) {
    if (offer.monthlyOriginalPrice !== undefined && Number(offer.monthlyOriginalPrice) > 0) {
      baseAmount = Number(offer.monthlyOriginalPrice);
    } else {
      baseAmount = tier === 'PREMIUM' ? 499 : tier === 'PRO' ? 349 : 199;
    }
  } else {
    if (offer.yearlyOriginalPrice !== undefined && Number(offer.yearlyOriginalPrice) > 0) {
      baseAmount = Number(offer.yearlyOriginalPrice);
    } else {
      baseAmount = tier === 'PREMIUM' ? 5988 : tier === 'PRO' ? 4188 : 2388;
    }
  }

  // 3. Discount calculation
  let discountAmount = 0;
  let finalAmount = 0;

  if (offer.discountType === 'PERCENTAGE') {
    const pct = Number(offer.discountValue || 0);
    discountAmount = Math.round((baseAmount * pct) / 100);
    finalAmount = Math.max(0, baseAmount - discountAmount);
  } else {
    discountAmount = Math.min(baseAmount, Number(offer.discountValue || 0));
    finalAmount = Math.max(0, baseAmount - discountAmount);
  }

  // Explicit target overrides if specified
  if (isMonthly && offer.monthlyPrice !== undefined && Number(offer.monthlyPrice) > 0) {
    finalAmount = Number(offer.monthlyPrice);
    discountAmount = Math.max(0, baseAmount - finalAmount);
  } else if (!isMonthly && offer.yearlyPrice !== undefined && Number(offer.yearlyPrice) > 0) {
    finalAmount = Number(offer.yearlyPrice);
    discountAmount = Math.max(0, baseAmount - finalAmount);
  }

  const savingsAmount = discountAmount;
  const discountPercentage = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 100) : 0;

  // 18% GST calculation (rounded to nearest rupee)
  const gstRate = 0.18;
  const gstAmount = Math.round(finalAmount * gstRate);
  const totalWithGst = finalAmount + gstAmount;

  return {
    tier,
    billingCycle: cycleKey,
    billingDuration: isMonthly ? 'Monthly' : 'Annual (365 Days)',
    durationLabel: isMonthly ? '/month' : '/year',
    originalPrice: baseAmount,
    discountedPrice: finalAmount,
    savingsAmount,
    discountPercentage,
    gstRate: 18,
    gstAmount,
    totalWithGst,
  };
}

/**
 * Validates strict hierarchy constraint: Dealer Basic < Dealer Pro < Dealer Premium across both Monthly and Yearly.
 * Throws ApiError.badRequest if the hierarchy is violated.
 */
export function validatePricingHierarchy(offers) {
  const basic = offers.find((o) => String(o.dealerPlan || o.title || '').toUpperCase().includes('BASIC'));
  const pro = offers.find((o) => {
    const n = String(o.dealerPlan || o.title || '').toUpperCase();
    return n.includes('PRO') && !n.includes('PREMIUM');
  });
  const premium = offers.find((o) => String(o.dealerPlan || o.title || '').toUpperCase().includes('PREMIUM'));

  if (basic && pro) {
    const basicM = calculateOfferPricing(basic, 'MONTHLY');
    const proM = calculateOfferPricing(pro, 'MONTHLY');
    if (basicM.discountedPrice >= proM.discountedPrice) {
      throw ApiError.badRequest(
        `Price hierarchy violation: Dealer Basic monthly price (₹${basicM.discountedPrice}) must be less than Dealer Pro monthly price (₹${proM.discountedPrice}).`
      );
    }
    const basicY = calculateOfferPricing(basic, 'YEARLY');
    const proY = calculateOfferPricing(pro, 'YEARLY');
    if (basicY.discountedPrice >= proY.discountedPrice) {
      throw ApiError.badRequest(
        `Price hierarchy violation: Dealer Basic yearly price (₹${basicY.discountedPrice}) must be less than Dealer Pro yearly price (₹${proY.discountedPrice}).`
      );
    }
  }

  if (pro && premium) {
    const proM = calculateOfferPricing(pro, 'MONTHLY');
    const premiumM = calculateOfferPricing(premium, 'MONTHLY');
    if (proM.discountedPrice >= premiumM.discountedPrice) {
      throw ApiError.badRequest(
        `Price hierarchy violation: Dealer Pro monthly price (₹${proM.discountedPrice}) must be less than Dealer Premium monthly price (₹${premiumM.discountedPrice}).`
      );
    }
    const proY = calculateOfferPricing(pro, 'YEARLY');
    const premiumY = calculateOfferPricing(premium, 'YEARLY');
    if (proY.discountedPrice >= premiumY.discountedPrice) {
      throw ApiError.badRequest(
        `Price hierarchy violation: Dealer Pro yearly price (₹${proY.discountedPrice}) must be less than Dealer Premium yearly price (₹${premiumY.discountedPrice}).`
      );
    }
  }
}

/**
 * Loads offers from AppConfig announcement/config store, falling back to inMemoryOffers.
 */
async function loadStoredOffers() {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 'global-config' },
    });
    if (config?.announcementText && config.announcementText.startsWith('__DEALER_OFFERS__=')) {
      const jsonStr = config.announcementText.replace('__DEALER_OFFERS__=', '');
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryOffers = parsed;
        return inMemoryOffers;
      }
    }
  } catch (err) {
    console.warn('Dealer offers DB read fallback to memory:', err?.message);
  }
  return inMemoryOffers;
}

/**
 * Persists offers to AppConfig store and runtime memory.
 */
async function saveOffers(offers) {
  inMemoryOffers = offers;
  try {
    const payload = '__DEALER_OFFERS__=' + JSON.stringify(offers);
    await prisma.appConfig.upsert({
      where: { id: 'global-config' },
      update: {
        announcementText: payload,
      },
      create: {
        id: 'global-config',
        announcementText: payload,
        announcementType: 'info',
        maintenanceMode: false,
      },
    });
  } catch (err) {
    console.warn('Dealer offers DB persist warning (using memory):', err?.message);
  }
  return inMemoryOffers;
}

export const dealerOfferService = {
  /**
   * List all dealer offers (optionally filter active & valid only)
   * Computes authoritative price breakdown per offer for requested billingCycle ('ANNUAL' | 'YEARLY' | 'MONTHLY').
   */
  async listOffers({ activeOnly = false, billingCycle = 'YEARLY' } = {}) {
    const all = await loadStoredOffers();
    const now = new Date();

    const filtered = activeOnly
      ? all.filter((offer) => {
          if (!offer.isActive) return false;
          if (offer.validFrom && new Date(offer.validFrom) > now) return false;
          if (offer.validUntil && new Date(offer.validUntil) < now) return false;
          if (offer.maxRedemptions && offer.timesRedeemed >= offer.maxRedemptions) return false;
          return true;
        })
      : all;

    return filtered.map((offer) => {
      const pricing = calculateOfferPricing(offer, billingCycle);
      return {
        ...offer,
        billingCycle: pricing.billingCycle,
        billingDuration: pricing.billingDuration,
        durationLabel: pricing.durationLabel,
        originalPrice: pricing.originalPrice,
        discountedPrice: pricing.discountedPrice,
        savingsAmount: pricing.savingsAmount,
        discountPercentage: pricing.discountPercentage,
        gstRate: pricing.gstRate,
        gstAmount: pricing.gstAmount,
        totalWithGst: pricing.totalWithGst,
      };
    });
  },

  /**
   * Get single dealer offer by ID or Code
   */
  async getOffer(idOrCode) {
    if (!idOrCode) return null;
    const clean = String(idOrCode).trim().toUpperCase();
    const all = await loadStoredOffers();
    return all.find((o) => o.id === idOrCode || (o.code && o.code.toUpperCase() === clean)) || null;
  },

  /**
   * Validate a dealer promo code for a target plan and billing cycle
   */
  async validateOffer({ code, planTier = 'PRO', billingCycle = 'YEARLY', userEmail }) {
    if (!code || typeof code !== 'string') {
      throw ApiError.badRequest('Offer code is required.');
    }

    const cleanCode = code.trim().toUpperCase();
    const normalizedPlan = String(planTier).toUpperCase();
    const normalizedCycle = String(billingCycle).toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'YEARLY';

    const all = await loadStoredOffers();
    const offer = all.find((o) => o.code && o.code.toUpperCase() === cleanCode);

    if (!offer) {
      throw ApiError.notFound(`Offer code '${cleanCode}' is invalid or does not exist.`);
    }

    if (!offer.isActive) {
      throw ApiError.badRequest(`Offer code '${cleanCode}' is currently inactive.`);
    }

    const now = new Date();
    if (offer.validFrom && new Date(offer.validFrom) > now) {
      throw ApiError.badRequest(`Offer code '${cleanCode}' is not active yet.`);
    }

    if (offer.validUntil && new Date(offer.validUntil) < now) {
      throw ApiError.badRequest(`Offer code '${cleanCode}' expired on ${new Date(offer.validUntil).toLocaleDateString()}.`);
    }

    if (offer.maxRedemptions && offer.timesRedeemed >= offer.maxRedemptions) {
      throw ApiError.badRequest(`Offer code '${cleanCode}' redemption limit has been reached.`);
    }

    if (userEmail && Array.isArray(offer.eligibleDealers) && offer.eligibleDealers.length > 0) {
      const allowed = offer.eligibleDealers.map((e) => String(e).toLowerCase().trim());
      if (!allowed.includes(String(userEmail).toLowerCase().trim())) {
        throw ApiError.forbidden(`This dealer offer is restricted to authorized dealer partner accounts.`);
      }
    }

    const planEligible = (offer.applicablePlans || []).some(
      (p) => String(p).toUpperCase() === normalizedPlan ||
             (normalizedPlan === 'PRO' && (p === 'DEALER_PRO' || p === 'BASIC' || p === 'DEALER_BASIC')) ||
             (normalizedPlan === 'PREMIUM' && (p === 'DEALER_PREMIUM' || p === 'ENTERPRISE')) ||
             (normalizedPlan === 'BASIC' && (p === 'DEALER_BASIC' || p === 'FREE'))
    );
    if (!planEligible) {
      throw ApiError.badRequest(
        `Offer code '${cleanCode}' is not applicable to the ${normalizedPlan} plan (applies to: ${offer.applicablePlans.join(', ')}).`
      );
    }

    // Authoritative pricing breakdown calculation
    const pricing = calculateOfferPricing(offer, normalizedCycle);

    return {
      valid: true,
      code: offer.code,
      title: offer.title,
      dealerPlan: offer.dealerPlan || (normalizedPlan === 'PREMIUM' ? 'Dealer Premium' : normalizedPlan === 'PRO' ? 'Dealer Pro' : 'Dealer Basic'),
      badge: offer.badge || 'Dealer Special',
      discountAmount: pricing.savingsAmount,
      discountedPrice: pricing.discountedPrice,
      originalPrice: pricing.originalPrice,
      savingsAmount: pricing.savingsAmount,
      savingsPercentage: pricing.discountPercentage,
      discountPercentage: pricing.discountPercentage,
      billingCycle: pricing.billingCycle,
      billingDuration: pricing.billingDuration,
      durationLabel: pricing.durationLabel,
      gstRate: pricing.gstRate,
      gstAmount: pricing.gstAmount,
      totalWithGst: pricing.totalWithGst,
      validUntil: offer.validUntil,
      offer: {
        id: offer.id,
        code: offer.code,
        title: offer.title,
        dealerPlan: offer.dealerPlan,
        badge: offer.badge,
        description: offer.description,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        applicablePlans: offer.applicablePlans,
        dealerBenefits: offer.dealerBenefits || [],
        validUntil: offer.validUntil,
      },
      pricing: {
        planTier: normalizedPlan,
        billingCycle: pricing.billingCycle,
        originalAmount: pricing.originalPrice,
        discountAmount: pricing.savingsAmount,
        finalAmount: pricing.discountedPrice,
        savingsPercentage: pricing.discountPercentage,
        gstRate: pricing.gstRate,
        gstAmount: pricing.gstAmount,
        totalWithGst: pricing.totalWithGst,
        currency: 'INR',
        formattedOriginal: `₹${pricing.originalPrice.toLocaleString('en-IN')}`,
        formattedDiscount: `₹${pricing.savingsAmount.toLocaleString('en-IN')}`,
        formattedFinal: `₹${pricing.discountedPrice.toLocaleString('en-IN')}`,
        formattedGst: `₹${pricing.gstAmount.toLocaleString('en-IN')}`,
        formattedTotalWithGst: `₹${pricing.totalWithGst.toLocaleString('en-IN')}`,
      },
    };
  },

  /**
   * Apply an offer upon successful checkout/subscription switch
   */
  async recordRedemption(code) {
    if (!code) return;
    const cleanCode = String(code).trim().toUpperCase();
    const all = await loadStoredOffers();
    const updated = all.map((o) => {
      if (o.code && o.code.toUpperCase() === cleanCode) {
        return { ...o, timesRedeemed: (o.timesRedeemed || 0) + 1 };
      }
      return o;
    });
    await saveOffers(updated);
  },

  /**
   * Admin / Super Admin Create Dealer Offer with Hierarchy Validation
   */
  async createOffer(data, adminUser) {
    const {
      code,
      title,
      description,
      discountType = 'PERCENTAGE',
      discountValue,
      applicablePlans = ['PRO', 'PREMIUM'],
      billingCycles = ['MONTHLY', 'YEARLY'],
      validFrom,
      validUntil,
      dealerBenefits = [],
      maxRedemptions = 500,
      monthlyOriginalPrice,
      yearlyOriginalPrice,
      monthlyPrice,
      yearlyPrice,
    } = data;

    if (!code || !title || discountValue === undefined) {
      throw ApiError.badRequest('Code, title, and discountValue are required.');
    }

    const cleanCode = code.trim().toUpperCase();
    const all = await loadStoredOffers();

    if (all.some((o) => o.code && o.code.toUpperCase() === cleanCode)) {
      throw ApiError.conflict(`An offer with code '${cleanCode}' already exists.`);
    }

    const newOffer = {
      id: `offer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: cleanCode,
      title: title.trim(),
      dealerPlan: data.dealerPlan || 'Dealer Pro',
      badge: data.badge || 'Dealer Special',
      description: description ? description.trim() : '',
      discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      discountValue: Number(discountValue),
      monthlyOriginalPrice: monthlyOriginalPrice !== undefined ? Number(monthlyOriginalPrice) : undefined,
      yearlyOriginalPrice: yearlyOriginalPrice !== undefined ? Number(yearlyOriginalPrice) : undefined,
      monthlyPrice: monthlyPrice !== undefined ? Number(monthlyPrice) : undefined,
      yearlyPrice: yearlyPrice !== undefined ? Number(yearlyPrice) : undefined,
      applicablePlans: Array.isArray(applicablePlans) ? applicablePlans : ['PRO', 'PREMIUM'],
      billingCycles: Array.isArray(billingCycles) ? billingCycles : ['MONTHLY', 'YEARLY', 'ANNUAL'],
      validFrom: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      isActive: data.isActive !== false,
      eligibleDealers: Array.isArray(data.eligibleDealers) ? data.eligibleDealers : [],
      dealerBenefits: Array.isArray(dealerBenefits) ? dealerBenefits : [],
      maxRedemptions: Number(maxRedemptions) || null,
      timesRedeemed: 0,
      createdById: adminUser?.id || 'admin',
      createdAt: new Date().toISOString(),
    };

    const nextList = [newOffer, ...all];
    // Enforce strict price hierarchy validation
    validatePricingHierarchy(nextList);

    await saveOffers(nextList);
    return newOffer;
  },

  /**
   * Admin / Super Admin Update Dealer Offer with Hierarchy Validation
   */
  async updateOffer(idOrCode, data) {
    const all = await loadStoredOffers();
    const clean = String(idOrCode || '').trim().toUpperCase();
    const idx = all.findIndex((o) => o.id === idOrCode || (o.code && o.code.toUpperCase() === clean));
    if (idx === -1) {
      throw ApiError.notFound('Dealer offer not found.');
    }

    const existing = all[idx];
    const updated = {
      ...existing,
      ...data,
      code: data.code ? data.code.trim().toUpperCase() : existing.code,
      discountValue: data.discountValue !== undefined ? Number(data.discountValue) : existing.discountValue,
      monthlyOriginalPrice: data.monthlyOriginalPrice !== undefined ? Number(data.monthlyOriginalPrice) : existing.monthlyOriginalPrice,
      yearlyOriginalPrice: data.yearlyOriginalPrice !== undefined ? Number(data.yearlyOriginalPrice) : existing.yearlyOriginalPrice,
      monthlyPrice: data.monthlyPrice !== undefined ? Number(data.monthlyPrice) : existing.monthlyPrice,
      yearlyPrice: data.yearlyPrice !== undefined ? Number(data.yearlyPrice) : existing.yearlyPrice,
      updatedAt: new Date().toISOString(),
    };

    const nextList = [...all];
    nextList[idx] = updated;

    // Enforce strict price hierarchy validation
    validatePricingHierarchy(nextList);

    await saveOffers(nextList);
    return updated;
  },

  /**
   * Admin / Super Admin Delete Dealer Offer
   */
  async deleteOffer(idOrCode) {
    const all = await loadStoredOffers();
    const clean = String(idOrCode || '').trim().toUpperCase();
    const filtered = all.filter((o) => o.id !== idOrCode && (!o.code || o.code.toUpperCase() !== clean));
    if (filtered.length === all.length) {
      throw ApiError.notFound('Dealer offer not found.');
    }
    await saveOffers(filtered);
    return true;
  },
};

export default dealerOfferService;
