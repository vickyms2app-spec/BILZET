import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { PLAN_DETAILS } from '../config/plans.config.mjs';

// Default initial dealer offers seed
const DEFAULT_DEALER_OFFERS = [
  {
    id: 'offer-dealer-basic-20',
    code: 'DEALERBASIC20',
    title: 'Dealer Basic Starter Offer',
    dealerPlan: 'Dealer Basic',
    badge: 'Limited Offer',
    description: '20% discount on Dealer Basic starter package with stock overview & godown transfers.',
    discountType: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
    discountValue: 20,
    applicablePlans: ['BASIC', 'DEALER_BASIC', 'FREE', 'PRO'],
    billingCycles: ['MONTHLY', 'YEARLY', 'ANNUAL'],
    validFrom: new Date('2026-01-01T00:00:00Z').toISOString(),
    validUntil: new Date('2026-12-31T23:59:59Z').toISOString(),
    isActive: true,
    dealerBenefits: [
      '500 included bills & instant renewal',
      'Unified product inventory & stock overview',
      'A4/A5 invoices with QR codes',
      'Daily/monthly sales & stock valuation reports',
    ],
    maxRedemptions: 500,
    timesRedeemed: 28,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-dealer-30',
    code: 'DEALER30',
    title: 'Dealer Pro 30% Wholesale Rebate',
    dealerPlan: 'Dealer Pro',
    badge: 'Dealer Special',
    description: 'Exclusive 30% promotional discount for certified store dealers & franchise operators.',
    discountType: 'PERCENTAGE', // 'PERCENTAGE' | 'FIXED'
    discountValue: 30,
    applicablePlans: ['PRO', 'DEALER_PRO', 'PREMIUM'],
    billingCycles: ['MONTHLY', 'YEARLY', 'ANNUAL'],
    validFrom: new Date('2026-01-01T00:00:00Z').toISOString(),
    validUntil: new Date('2026-12-31T23:59:59Z').toISOString(),
    isActive: true,
    dealerBenefits: [
      'Up to 30% wholesale renewal savings',
      'Priority multi-godown stock transfer sync',
      'Dedicated partner channel manager',
      'Free bulk inventory import & GST reconciliation',
    ],
    maxRedemptions: 500,
    timesRedeemed: 42,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-dealer-flat500',
    code: 'DEALER500',
    title: 'Partner Welcome Flat ₹500 Credit',
    dealerPlan: 'Dealer Pro',
    badge: 'Dealer Special',
    description: 'Flat ₹500 instant discount on all Pro Business annual subscription plans.',
    discountType: 'FIXED',
    discountValue: 500,
    applicablePlans: ['PRO', 'DEALER_PRO'],
    billingCycles: ['YEARLY', 'ANNUAL'],
    validFrom: new Date('2026-01-01T00:00:00Z').toISOString(),
    validUntil: new Date('2026-12-31T23:59:59Z').toISOString(),
    isActive: true,
    dealerBenefits: [
      'Instant ₹500 discount on checkout',
      'Includes 5 team sub-user accounts',
      'WhatsApp invoice PDF dispatch enabled',
    ],
    maxRedemptions: 1000,
    timesRedeemed: 118,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-dealer-vip40',
    code: 'DEALERVIP40',
    title: 'Dealer Premium Platinum 40% Off',
    dealerPlan: 'Dealer Premium',
    badge: 'Best Value',
    description: 'Super-saver 40% promotional rate for Premium Enterprise annual tier.',
    discountType: 'PERCENTAGE',
    discountValue: 40,
    applicablePlans: ['PREMIUM', 'DEALER_PREMIUM', 'ENTERPRISE'],
    billingCycles: ['YEARLY', 'ANNUAL'],
    validFrom: new Date('2026-01-01T00:00:00Z').toISOString(),
    validUntil: new Date('2026-12-31T23:59:59Z').toISOString(),
    isActive: true,
    dealerBenefits: [
      'Unlimited sub-users & full CA portal access',
      '40% annual subscription margin discount',
      'Priority enterprise phone & remote assistance',
      'Custom branding & thermal printer layouts',
    ],
    maxRedemptions: 250,
    timesRedeemed: 19,
    createdAt: new Date().toISOString(),
  },
];

// In-memory runtime cache for high resilience
let inMemoryOffers = [...DEFAULT_DEALER_OFFERS];

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
   * Also computes price breakdown per offer for the requested billingCycle ('ANNUAL' | 'MONTHLY').
   */
  async listOffers({ activeOnly = false, billingCycle = 'ANNUAL' } = {}) {
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

    const isMonthly = String(billingCycle).toUpperCase() === 'MONTHLY';

    return filtered.map((offer) => {
      const applicable = (offer.applicablePlans || []).map((p) => String(p).toUpperCase());
      const targetTier = applicable.includes('PREMIUM') || applicable.includes('DEALER_PREMIUM')
        ? 'PREMIUM'
        : applicable.includes('PRO') || applicable.includes('DEALER_PRO')
        ? 'PRO'
        : 'BASIC';

      let baseAmount = isMonthly
        ? (targetTier === 'PREMIUM' ? 349 : targetTier === 'PRO' ? 199 : 69)
        : (targetTier === 'PREMIUM' ? 2999 : targetTier === 'PRO' ? 1499 : 499);

      let discountAmount = 0;
      if (offer.discountType === 'PERCENTAGE') {
        discountAmount = Math.round((baseAmount * Number(offer.discountValue)) / 100);
      } else {
        discountAmount = Math.min(baseAmount, Number(offer.discountValue));
      }

      const finalAmount = Math.max(0, baseAmount - discountAmount);
      const savingsPercentage = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 100) : 0;

      return {
        ...offer,
        billingCycle: isMonthly ? 'MONTHLY' : 'ANNUAL',
        billingDuration: isMonthly ? 'Monthly' : 'Annual (365 Days)',
        originalPrice: baseAmount,
        discountedPrice: finalAmount,
        savingsAmount: discountAmount,
        discountPercentage: savingsPercentage,
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
    const normalizedCycle = String(billingCycle).toUpperCase();

    const all = await loadStoredOffers();
    const offer = all.find((o) => o.code.toUpperCase() === cleanCode);

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

    const planEligible = offer.applicablePlans.some(
      (p) => String(p).toUpperCase() === normalizedPlan
    );
    if (!planEligible) {
      throw ApiError.badRequest(
        `Offer code '${cleanCode}' is not applicable to the ${normalizedPlan} plan (applies to: ${offer.applicablePlans.join(', ')}).`
      );
    }

    // Determine base amount from PLAN_DETAILS
    const basePlan = PLAN_DETAILS[normalizedPlan];
    let baseAmount = basePlan ? basePlan.amount : 0;
    if (!basePlan) {
      if (['BASIC', 'DEALER_BASIC'].includes(normalizedPlan)) baseAmount = 499;
      else if (['DEALER_PRO'].includes(normalizedPlan)) baseAmount = 1499;
      else if (['DEALER_PREMIUM'].includes(normalizedPlan)) baseAmount = 2999;
    }

    // Monthly pricing if requested
    if (normalizedCycle === 'MONTHLY') {
      baseAmount = (normalizedPlan === 'PREMIUM' || normalizedPlan === 'DEALER_PREMIUM')
        ? 349
        : (normalizedPlan === 'PRO' || normalizedPlan === 'DEALER_PRO')
        ? 199
        : (normalizedPlan === 'BASIC' || normalizedPlan === 'DEALER_BASIC')
        ? 69
        : 0;
    }

    // Calculate discount
    let discountAmount = 0;
    if (offer.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((baseAmount * Number(offer.discountValue)) / 100);
    } else {
      discountAmount = Math.min(baseAmount, Number(offer.discountValue));
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount);
    const savingsPercentage = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 100) : 0;

    return {
      valid: true,
      code: offer.code,
      title: offer.title,
      dealerPlan: offer.dealerPlan || (normalizedPlan === 'PREMIUM' ? 'Dealer Premium' : normalizedPlan === 'PRO' ? 'Dealer Pro' : 'Dealer Basic'),
      badge: offer.badge || 'Dealer Special',
      discountAmount,
      discountedPrice: finalAmount,
      originalPrice: baseAmount,
      savingsPercentage,
      billingCycle: normalizedCycle,
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
        billingCycle: normalizedCycle,
        originalAmount: baseAmount,
        discountAmount,
        finalAmount,
        savingsPercentage,
        currency: 'INR',
        formattedOriginal: `₹${baseAmount.toLocaleString('en-IN')}`,
        formattedDiscount: `₹${discountAmount.toLocaleString('en-IN')}`,
        formattedFinal: `₹${finalAmount.toLocaleString('en-IN')}`,
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
      if (o.code.toUpperCase() === cleanCode) {
        return { ...o, timesRedeemed: (o.timesRedeemed || 0) + 1 };
      }
      return o;
    });
    await saveOffers(updated);
  },

  /**
   * Admin / Super Admin Create Dealer Offer
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
    } = data;

    if (!code || !title || discountValue === undefined) {
      throw ApiError.badRequest('Code, title, and discountValue are required.');
    }

    const cleanCode = code.trim().toUpperCase();
    const all = await loadStoredOffers();

    if (all.some((o) => o.code.toUpperCase() === cleanCode)) {
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
      applicablePlans: Array.isArray(applicablePlans) ? applicablePlans : ['PRO', 'PREMIUM'],
      billingCycles: Array.isArray(billingCycles) ? billingCycles : ['MONTHLY', 'YEARLY', 'ANNUAL'],
      validFrom: validFrom ? new Date(validFrom).toISOString() : new Date().toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      isActive: true,
      eligibleDealers: Array.isArray(data.eligibleDealers) ? data.eligibleDealers : [],
      dealerBenefits: Array.isArray(dealerBenefits) ? dealerBenefits : [],
      maxRedemptions: Number(maxRedemptions) || null,
      timesRedeemed: 0,
      createdById: adminUser?.id || 'admin',
      createdAt: new Date().toISOString(),
    };

    all.unshift(newOffer);
    await saveOffers(all);
    return newOffer;
  },

  /**
   * Admin / Super Admin Update Dealer Offer
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
      updatedAt: new Date().toISOString(),
    };

    all[idx] = updated;
    await saveOffers(all);
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
