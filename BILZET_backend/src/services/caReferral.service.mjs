import crypto from 'crypto';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { env } from '../config/env.mjs';
import notificationService from './notification.service.mjs';

/**
 * Default program economics configuration
 */
export const DEFAULT_CONFIG = {
  id: 'global_ca_referral_config',
  isEnabled: true,
  coinsPerReferral: 100, // 100 coins per eligible referral
  rupeesPerCoin: 1.0,    // 100 coins = ₹100 (1 coin = ₹1)
  minRedemptionCoins: 500, // Minimum 500 coins = ₹500
};

/**
 * Helper to resolve user object from either an object or a user ID string
 */
export const resolveUser = async (userOrId) => {
  if (!userOrId) return null;
  if (typeof userOrId === 'object' && userOrId.id) return userOrId;
  if (typeof userOrId === 'string') {
    return await prisma.user.findUnique({ where: { id: userOrId } }).catch(() => null);
  }
  return userOrId;
};

/**
 * 1. Authorization: Verify caller is a verified Chartered Accountant
 */
export const verifyCaEligibility = (user) => {
  if (!user) {
    throw ApiError.unauthorized('Authentication required to access CA Refer & Earn.');
  }

  if (user.isActive === false) {
    throw ApiError.forbidden('Your account is deactivated. Contact platform administrator.');
  }

  const isMasterAdmin =
    user.role === 'SUPER_ADMIN' ||
    Boolean(user.isSuperAdmin) ||
    (user.email && user.email.toLowerCase() === 'vickyms2app@gmail.com');

  if (isMasterAdmin) {
    return user;
  }

  if (user.role !== 'CA') {
    throw ApiError.forbidden(
      'Access denied. The Refer & Earn program is exclusively available to verified Chartered Accountants (CAs).'
    );
  }

  return user;
};

/**
 * 2. Authorization: Verify caller has platform Super Admin privileges
 */
export const verifyAdminAuthorization = (user) => {
  if (!user) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const isMasterAdmin =
    user.role === 'SUPER_ADMIN' ||
    Boolean(user.isSuperAdmin) ||
    (user.email && user.email.toLowerCase() === 'vickyms2app@gmail.com');

  if (!isMasterAdmin) {
    throw ApiError.forbidden('Administrative privileges required to access this endpoint.');
  }

  return user;
};

/**
 * 3. Configuration Management: Fetch or initialize centralized program settings
 */
export const getProgramConfig = async () => {
  try {
    const config = await prisma.caReferralConfig.findUnique({
      where: { id: DEFAULT_CONFIG.id },
    });
    if (config) {
      return {
        ...DEFAULT_CONFIG,
        ...config,
        coinsPerReferral: Number(config.coinsPerReferral) || DEFAULT_CONFIG.coinsPerReferral,
        rupeesPerCoin: Number(config.rupeesPerCoin) || DEFAULT_CONFIG.rupeesPerCoin,
        minRedemptionCoins: Number(config.minRedemptionCoins) || DEFAULT_CONFIG.minRedemptionCoins,
        isEnabled: config.isEnabled !== false,
      };
    }
  } catch (_) {}
  return { ...DEFAULT_CONFIG };
};

export const updateProgramConfig = async (adminUser, data = {}) => {
  verifyAdminAuthorization(adminUser);

  const current = await getProgramConfig();
  const isEnabled = data.isEnabled !== undefined ? Boolean(data.isEnabled) : current.isEnabled;
  const coinsPerReferral = data.coinsPerReferral !== undefined ? Math.max(1, parseInt(data.coinsPerReferral, 10)) : current.coinsPerReferral;
  const rupeesPerCoin = data.rupeesPerCoin !== undefined ? Math.max(0.1, parseFloat(data.rupeesPerCoin)) : current.rupeesPerCoin;
  const minRedemptionCoins = data.minRedemptionCoins !== undefined ? Math.max(100, parseInt(data.minRedemptionCoins, 10)) : current.minRedemptionCoins;

  const updated = await prisma.caReferralConfig.upsert({
    where: { id: DEFAULT_CONFIG.id },
    update: {
      isEnabled,
      coinsPerReferral,
      rupeesPerCoin,
      minRedemptionCoins,
      updatedById: adminUser.id,
      updatedAt: new Date(),
    },
    create: {
      id: DEFAULT_CONFIG.id,
      isEnabled,
      coinsPerReferral,
      rupeesPerCoin,
      minRedemptionCoins,
      updatedById: adminUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return {
    ...DEFAULT_CONFIG,
    ...updated,
    coinsPerReferral: Number(updated.coinsPerReferral),
    rupeesPerCoin: Number(updated.rupeesPerCoin),
    minRedemptionCoins: Number(updated.minRedemptionCoins),
  };
};

/**
 * Generate a cryptographically unpredictable unique referral code for a CA
 * Format: CA-XXXXXX (e.g. CA-8F2K9M)
 */
export const generateUniqueReferralCode = async () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let attempts = 0;

  while (attempts < 10) {
    attempts++;
    let randomPart = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      randomPart += chars[bytes[i] % chars.length];
    }
    const candidate = `CA-${randomPart}`;

    const existing = await prisma.caReferralProfile.findUnique({
      where: { referralCode: candidate },
    }).catch(() => null);

    if (!existing) {
      return candidate;
    }
  }

  return `CA-${Date.now().toString(36).slice(-6).toUpperCase()}`;
};

/**
 * 4. Get or lazily provision a CA's Referral Profile
 */
export const getOrCreateCaProfile = async (caUserOrId) => {
  const caUser = await resolveUser(caUserOrId);
  verifyCaEligibility(caUser);

  let profile = await prisma.caReferralProfile.findUnique({
    where: { userId: caUser.id },
  }).catch(() => null);

  if (!profile) {
    const referralCode = await generateUniqueReferralCode();
    try {
      profile = await prisma.caReferralProfile.create({
        data: {
          userId: caUser.id,
          referralCode,
          totalCoinsEarned: 0,
          availableCoins: 0,
          reservedCoins: 0,
          redeemedCoins: 0,
          totalPayoutRupees: 0,
          isEligible: true,
          isVerified: true,
        },
      });
    } catch (err) {
      profile = await prisma.caReferralProfile.findUnique({
        where: { userId: caUser.id },
      });
    }
  }

  return profile;
};

/**
 * 5. CA Refer & Earn Dashboard Overview
 */
export const getCaDashboard = async (caUserOrId) => {
  const caUser = await resolveUser(caUserOrId);
  verifyCaEligibility(caUser);

  const profile = await getOrCreateCaProfile(caUser);
  const config = await getProgramConfig();

  const baseUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const referralLink = `${baseUrl}/register-shop?ref=${profile.referralCode}`;

  // Query referral attribution stats
  const attributions = await prisma.caReferralAttribution.findMany({
    where: { caUserId: caUser.id },
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);

  const totalReferrals = attributions.length;
  const eligibleReferrals = attributions.filter((a) => a.status === 'ELIGIBLE').length;
  const pendingReferrals = attributions.filter((a) => a.status === 'REGISTERED').length;
  const ineligibleReferrals = attributions.filter((a) => a.status === 'INELIGIBLE' || a.status === 'REVERSED').length;

  // Query active redemption request (if in progress)
  const activeRedemption = await prisma.caRedemptionRequest.findFirst({
    where: {
      caUserId: caUser.id,
      status: { in: ['PENDING_REVIEW', 'APPROVED', 'PAYMENT_PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
  }).catch(() => null);

  // Recent 5 referrals (privacy sanitized)
  const recentReferrals = attributions.slice(0, 5).map((a) => ({
    id: a.id,
    businessName: a.referredBusinessName || 'Store Business',
    status: a.status,
    rewardCoins: a.rewardCoins,
    createdAt: a.createdAt,
    qualifyingPaymentDate: a.qualifyingPaymentDate,
  }));

  const rupeeEquivalent = Math.round(profile.availableCoins * config.rupeesPerCoin);
  const canRedeem = profile.availableCoins >= config.minRedemptionCoins && config.isEnabled;

  return {
    profile: {
      referralCode: profile.referralCode,
      referralLink,
      availableCoins: profile.availableCoins,
      rupeeEquivalent,
      totalCoinsEarned: profile.totalCoinsEarned,
      reservedCoins: profile.reservedCoins,
      redeemedCoins: profile.redeemedCoins,
      totalPayoutRupees: profile.totalPayoutRupees,
      isEligible: profile.isEligible,
      isVerified: profile.isVerified,
    },
    config: {
      isEnabled: config.isEnabled,
      coinsPerReferral: config.coinsPerReferral,
      rupeesPerCoin: config.rupeesPerCoin,
      minRedemptionCoins: config.minRedemptionCoins,
      conversionLabel: `${config.coinsPerReferral} Coins = ₹${Math.round(config.coinsPerReferral * config.rupeesPerCoin)}`,
      minRedemptionLabel: `${config.minRedemptionCoins} Coins (₹${Math.round(config.minRedemptionCoins * config.rupeesPerCoin)})`,
    },
    stats: {
      totalReferrals,
      eligibleReferrals,
      pendingReferrals,
      ineligibleReferrals,
      canRedeem,
      coinsUntilRedemption: Math.max(0, config.minRedemptionCoins - profile.availableCoins),
    },
    recentReferrals,
    activeRedemption: activeRedemption
      ? {
          id: activeRedemption.id,
          coinsRequested: activeRedemption.coinsRequested,
          rupeeAmount: activeRedemption.rupeeAmount,
          status: activeRedemption.status,
          createdAt: activeRedemption.createdAt,
          payoutMethod: activeRedemption.payoutMethod,
        }
      : null,
  };
};

/**
 * 6. CA Referral Attribution History (Paginated)
 */
export const getCaReferralHistory = async (caUserOrId, query = {}) => {
  const caUser = await resolveUser(caUserOrId);
  verifyCaEligibility(caUser);

  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;

  const where = { caUserId: caUser.id };
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }

  const [records, total] = await Promise.all([
    prisma.caReferralAttribution.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.caReferralAttribution.count({ where }).catch(() => 0),
  ]);

  const sanitized = records.map((r) => ({
    id: r.id,
    businessName: r.referredBusinessName || 'Store Business',
    businessIdMasked: r.referredBusinessId ? `store-${r.referredBusinessId.slice(-4)}` : null,
    status: r.status,
    rewardCoins: r.rewardCoins,
    qualifyingPaymentRef: r.qualifyingPaymentRef ? 'VERIFIED' : null,
    qualifyingPaymentDate: r.qualifyingPaymentDate,
    qualifyingPlanTier: r.qualifyingPlanTier,
    createdAt: r.createdAt,
  }));

  return {
    referrals: sanitized,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 7. CA Payout History (Paginated)
 */
export const getCaPayoutHistory = async (caUserOrId, query = {}) => {
  const caUser = await resolveUser(caUserOrId);
  verifyCaEligibility(caUser);

  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip = (page - 1) * limit;

  const where = { caUserId: caUser.id };
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }

  const [records, total] = await Promise.all([
    prisma.caRedemptionRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }).catch(() => []),
    prisma.caRedemptionRequest.count({ where }).catch(() => 0),
  ]);

  const sanitized = records.map((r) => {
    // Mask sensitive payout details
    const details = typeof r.payoutDetails === 'object' && r.payoutDetails !== null ? r.payoutDetails : {};
    const maskedDetails = {};
    if (details.upiId) {
      const parts = details.upiId.split('@');
      maskedDetails.upiId = parts.length === 2 ? `${parts[0].slice(0, 2)}***@${parts[1]}` : 'upi-id@bank';
    }
    if (details.accountNumber) {
      maskedDetails.accountNumber = `****${String(details.accountNumber).slice(-4)}`;
      maskedDetails.bankName = details.bankName || 'Bank Transfer';
    }

    return {
      id: r.id,
      coinsRequested: r.coinsRequested,
      rupeeAmount: r.rupeeAmount,
      payoutMethod: r.payoutMethod,
      payoutDetails: maskedDetails,
      status: r.status,
      rejectionReason: r.rejectionReason,
      paymentReference: r.paymentReference,
      paymentDate: r.paymentDate,
      reviewedAt: r.reviewedAt,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
    };
  });

  return {
    payouts: sanitized,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 8. Public validation for CA referral code during onboarding / checkout
 */
export const validateCaReferralCode = async (code, currentUserId = null) => {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return { valid: false, message: 'Referral code is required.' };
  }

  const clean = code.trim().toUpperCase();

  const profile = await prisma.caReferralProfile.findUnique({
    where: { referralCode: clean },
  }).catch(() => null);

  if (!profile || !profile.isEligible) {
    return { valid: false, message: 'Invalid or expired CA referral code.' };
  }

  let caUser = profile.user;
  if (!caUser && profile.userId) {
    caUser = await prisma.user.findUnique({ where: { id: profile.userId } }).catch(() => null);
  }

  if (!caUser || caUser.isActive === false) {
    return { valid: false, message: 'Invalid or expired CA referral code.' };
  }

  // Self-referral prevention
  if (currentUserId && profile.userId === currentUserId) {
    return { valid: false, message: 'You cannot use your own referral code.' };
  }

  return {
    valid: true,
    referralCode: profile.referralCode,
    caName: caUser?.name || profile?.user?.name || 'Chartered Accountant Partner',
    message: 'Valid CA partner referral code. Complete your registration and subscription to activate workspace benefits.',
  };
};

/**
 * 9. Persistent Referral Attribution Recording (Called during store registration)
 * Defined once, immutable database relationship.
 */
export const recordAttribution = async ({ referralCode, businessId, ownerId, businessName }) => {
  if (!referralCode || !businessId) return null;

  const clean = referralCode.trim().toUpperCase();

  const profile = await prisma.caReferralProfile.findUnique({
    where: { referralCode: clean },
  }).catch(() => null);

  if (!profile || !profile.isEligible) return null;

  // Anti-fraud: prevent self-referral
  if (ownerId && profile.userId === ownerId) {
    console.warn(`[CA Referral] Self-referral rejected for CA ${profile.userId}`);
    return null;
  }

  // Prevent duplicate attribution: 1 store can only have 1 referral attribution
  const existing = await prisma.caReferralAttribution.findUnique({
    where: { referredBusinessId: businessId },
  }).catch(() => null);

  if (existing) {
    return existing;
  }

  const attribution = await prisma.caReferralAttribution.create({
    data: {
      caUserId: profile.userId,
      referredBusinessId: businessId,
      referredOwnerId: ownerId || null,
      referredBusinessName: businessName || 'Store Business',
      referralCode: clean,
      status: 'REGISTERED', // Registration alone does NOT award coins
      rewardCoins: 100,
    },
  });

  return attribution;
};

/**
 * 10. Reward Qualification & Payment Integration Hook
 * Triggered AUTHORITATIVELY ONLY after the backend confirms the referred business's first successful subscription payment.
 * Idempotent: Cannot credit coins multiple times for the same referred business.
 */
export const processFirstPaymentReward = async ({ businessId, ownerId, planTier, paymentReference, paymentAmount }) => {
  if (!businessId && !ownerId) return { qualified: false };

  const normalizedTier = String(planTier || '').toUpperCase();
  if (!['PRO', 'PREMIUM', 'ENTERPRISE'].includes(normalizedTier)) {
    return { qualified: false, reason: 'Only paid subscription tiers qualify for referral rewards.' };
  }

  // Locate attribution record
  let attribution = null;
  if (businessId) {
    attribution = await prisma.caReferralAttribution.findUnique({
      where: { referredBusinessId: businessId },
    }).catch(() => null);
  }

  if (!attribution && ownerId) {
    attribution = await prisma.caReferralAttribution.findFirst({
      where: { referredOwnerId: ownerId },
    }).catch(() => null);
  }

  if (!attribution) {
    return { qualified: false, reason: 'Business has no CA referral attribution.' };
  }

  // Check if already rewarded (Ensures renewals / repeat payments NEVER trigger rewards)
  if (attribution.status === 'ELIGIBLE' || attribution.qualifyingPaymentDate) {
    return { qualified: false, reason: 'Referral reward has already been issued for this business.' };
  }

  // Anti-fraud check: Prevent self-referrals
  if (attribution.referredOwnerId && attribution.caUserId === attribution.referredOwnerId) {
    await prisma.caReferralAttribution.update({
      where: { id: attribution.id },
      data: { status: 'INELIGIBLE', notes: 'Fraud detection: CA referred their own business.' },
    }).catch(() => {});
    return { qualified: false, reason: 'Self-referral is ineligible for rewards.' };
  }

  const config = await getProgramConfig();
  if (!config.isEnabled) {
    return { qualified: false, reason: 'CA Refer & Earn program is currently paused.' };
  }

  const coinsToReward = config.coinsPerReferral || 100;
  const payRef = String(paymentReference || `PAY-${Date.now()}`).trim();
  const idempotencyKey = `REWARD-${attribution.id}-${payRef}`;

  // Check idempotency in ledger
  const existingLedger = await prisma.caRewardLedger.findUnique({
    where: { idempotencyKey },
  }).catch(() => null);

  if (existingLedger) {
    return { qualified: true, duplicate: true, coins: existingLedger.coins };
  }

  // Fetch CA Profile
  const caProfile = await prisma.caReferralProfile.findUnique({
    where: { userId: attribution.caUserId },
  });

  if (!caProfile || !caProfile.isEligible) {
    return { qualified: false, reason: 'Referring CA profile is not active or eligible.' };
  }

  const newAvailableCoins = (caProfile.availableCoins || 0) + coinsToReward;
  const newTotalCoinsEarned = (caProfile.totalCoinsEarned || 0) + coinsToReward;

  // Execute atomic transactional updates
  await prisma.$transaction([
    // 1. Mark Attribution as ELIGIBLE
    prisma.caReferralAttribution.update({
      where: { id: attribution.id },
      data: {
        status: 'ELIGIBLE',
        qualifyingPaymentRef: payRef,
        qualifyingPaymentDate: new Date(),
        qualifyingPlanTier: normalizedTier,
        rewardCoins: coinsToReward,
      },
    }),

    // 2. Increment CA Profile balances
    prisma.caReferralProfile.update({
      where: { userId: caProfile.userId },
      data: {
        availableCoins: newAvailableCoins,
        totalCoinsEarned: newTotalCoinsEarned,
      },
    }),

    // 3. Insert Authoritative Ledger Entry
    prisma.caRewardLedger.create({
      data: {
        caUserId: caProfile.userId,
        attributionId: attribution.id,
        entryType: 'REWARD_CREDIT',
        status: 'COMPLETED',
        coins: coinsToReward,
        balanceAfter: newAvailableCoins,
        idempotencyKey,
        description: `Reward of ${coinsToReward} coins for referral: ${attribution.referredBusinessName} subscription (${normalizedTier})`,
        actorId: 'SYSTEM_SUBSCRIPTION_PAYMENT',
        metadata: {
          businessId: attribution.referredBusinessId,
          planTier: normalizedTier,
          paymentReference: payRef,
          paymentAmount,
        },
      },
    }),
  ]);

  // Create in-app celebration notification for the CA
  try {
    await notificationService.createNotification({
      userId: caProfile.userId,
      type: 'REFERRAL_REWARD',
      title: '🎉 100 Referral Coins Earned!',
      message: `Your referred client ${attribution.referredBusinessName} just activated a ${normalizedTier} subscription! 100 coins have been credited to your Refer & Earn balance.`,
      data: {
        coinsEarned: coinsToReward,
        newBalance: newAvailableCoins,
        attributionId: attribution.id,
      },
    });
  } catch (_) {}

  return {
    qualified: true,
    rewarded: true,
    coins: coinsToReward,
    caUserId: caProfile.userId,
    newBalance: newAvailableCoins,
    attributionId: attribution.id,
  };
};

/**
 * 11. Redemption Request Submission (Minimum 500 coins = ₹500)
 * Backend validates available balance and atomically reserves coins.
 */
export const submitRedemptionRequest = async (caUserOrId, data = {}) => {
  const caUser = await resolveUser(caUserOrId);
  verifyCaEligibility(caUser);

  const config = await getProgramConfig();
  if (!config.isEnabled) {
    throw ApiError.forbidden('Referral redemption is currently paused by platform administrator.');
  }

  const requestedCoins = parseInt(data.coinsRequested, 10);
  if (isNaN(requestedCoins) || requestedCoins <= 0) {
    throw ApiError.badRequest('Please specify a valid positive number of coins to redeem.');
  }

  if (requestedCoins < config.minRedemptionCoins) {
    throw ApiError.badRequest(
      `Minimum redemption request is ${config.minRedemptionCoins} coins (₹${Math.round(config.minRedemptionCoins * config.rupeesPerCoin)}).`
    );
  }

  const normalizedMethod = String(data.payoutMethod || 'UPI').toUpperCase();
  if (!['UPI', 'BANK_TRANSFER'].includes(normalizedMethod)) {
    throw ApiError.badRequest('Payout method must be UPI or BANK_TRANSFER.');
  }

  // Extract payout details flexibly from top-level or nested payoutDetails
  const payoutDetails = {
    upiId: String(data.upiId || data.payoutDetails?.upiId || '').trim(),
    accountNumber: String(data.bankAccountNumber || data.payoutDetails?.bankAccountNumber || data.payoutDetails?.accountNumber || '').trim(),
    ifsc: String(data.bankIfsc || data.payoutDetails?.bankIfsc || data.payoutDetails?.ifsc || '').trim().toUpperCase(),
    accountHolder: String(data.bankAccountName || data.payoutDetails?.bankAccountName || data.payoutDetails?.accountHolder || data.payoutDetails?.accountName || '').trim(),
  };

  // Validate payout details
  if (normalizedMethod === 'UPI') {
    if (!payoutDetails.upiId || !payoutDetails.upiId.includes('@')) {
      throw ApiError.badRequest('A valid UPI ID (e.g. mobile@upi, name@okaxis) is required.');
    }
  } else {
    if (!payoutDetails.accountNumber || payoutDetails.accountNumber.length < 8) {
      throw ApiError.badRequest('A valid bank account number is required.');
    }
    if (!payoutDetails.ifsc || payoutDetails.ifsc.length < 5) {
      throw ApiError.badRequest('A valid bank IFSC code is required.');
    }
  }

  // Atomically verify balance and reserve
  const profile = await prisma.caReferralProfile.findUnique({
    where: { userId: caUser.id },
  });

  if (!profile || profile.availableCoins < requestedCoins) {
    throw ApiError.badRequest(
      `Insufficient available coin balance. Available: ${profile?.availableCoins || 0} coins, Requested: ${requestedCoins} coins.`
    );
  }

  const rupeeAmount = Math.round(requestedCoins * config.rupeesPerCoin);
  const newAvailableCoins = profile.availableCoins - requestedCoins;
  const newReservedCoins = (profile.reservedCoins || 0) + requestedCoins;

  const requestId = `red-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const idempotencyKey = `RESERVE-${requestId}`;

  const [createdRequest] = await prisma.$transaction([
    // 1. Create redemption request in PENDING_REVIEW status
    prisma.caRedemptionRequest.create({
      data: {
        id: requestId,
        caUserId: caUser.id,
        coinsRequested: requestedCoins,
        rupeeAmount,
        payoutMethod: normalizedMethod,
        payoutDetails,
        status: 'PENDING_REVIEW',
      },
    }),

    // 2. Atomically reserve coins
    prisma.caReferralProfile.update({
      where: { userId: caUser.id },
      data: {
        availableCoins: newAvailableCoins,
        reservedCoins: newReservedCoins,
      },
    }),

    // 3. Authoritative ledger entry
    prisma.caRewardLedger.create({
      data: {
        caUserId: caUser.id,
        redemptionId: requestId,
        entryType: 'REDEMPTION_RESERVE',
        coins: -requestedCoins,
        balanceAfter: newAvailableCoins,
        idempotencyKey,
        description: `Reserved ${requestedCoins} coins for payout redemption request #${requestId.slice(-6)} (₹${rupeeAmount})`,
        actorId: caUser.id,
      },
    }),
  ]);

  return {
    ...createdRequest,
    success: true,
    redemption: createdRequest,
    coinsReserved: requestedCoins,
    rupeeAmount,
    newAvailableCoins,
    message: 'Redemption request submitted successfully and is queued for manual admin review.',
  };
};

/**
 * 12. Super Admin: Retrieve All Referral Attributions with Filters & Search
 */
export const getAdminReferrals = async (adminUser, query = {}) => {
  verifyAdminAuthorization(adminUser);

  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '15', 10)));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }
  if (query.caUserId) {
    where.caUserId = query.caUserId;
  }
  if (query.search) {
    const q = query.search.trim();
    where.OR = [
      { referralCode: { contains: q, mode: 'insensitive' } },
      { referredBusinessName: { contains: q, mode: 'insensitive' } },
      { qualifyingPaymentRef: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.caReferralAttribution.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        caProfile: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    }).catch(() => []),
    prisma.caReferralAttribution.count({ where }).catch(() => 0),
  ]);

  return {
    referrals: records.map((r) => ({
      id: r.id,
      caName: r.caProfile?.user?.name || 'CA Partner',
      caEmail: r.caProfile?.user?.email || 'ca@bilzet.com',
      referralCode: r.referralCode,
      businessName: r.referredBusinessName || 'Client Store',
      businessId: r.referredBusinessId,
      status: r.status,
      rewardCoins: r.rewardCoins,
      qualifyingPaymentRef: r.qualifyingPaymentRef,
      qualifyingPaymentDate: r.qualifyingPaymentDate,
      qualifyingPlanTier: r.qualifyingPlanTier,
      createdAt: r.createdAt,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 13. Super Admin: Retrieve All Redemption Requests with Filters & Search
 */
export const getAdminRedemptions = async (adminUser, query = {}) => {
  verifyAdminAuthorization(adminUser);

  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '15', 10)));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }
  if (query.caUserId) {
    where.caUserId = query.caUserId;
  }

  const [records, total] = await Promise.all([
    prisma.caRedemptionRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        caProfile: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    }).catch(() => []),
    prisma.caRedemptionRequest.count({ where }).catch(() => 0),
  ]);

  return {
    redemptions: records.map((r) => ({
      id: r.id,
      caUserId: r.caUserId,
      caName: r.caProfile?.user?.name || 'Chartered Accountant',
      caEmail: r.caProfile?.user?.email || '',
      caPhone: r.caProfile?.user?.phone || '',
      coinsRequested: r.coinsRequested,
      rupeeAmount: r.rupeeAmount,
      payoutMethod: r.payoutMethod,
      payoutDetails: r.payoutDetails,
      status: r.status,
      rejectionReason: r.rejectionReason,
      paymentReference: r.paymentReference,
      paymentDate: r.paymentDate,
      reviewedAt: r.reviewedAt,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 14. Super Admin: Approve Redemption Request (Authorizes manual payout)
 */
export const approveRedemption = async (adminUser, requestId) => {
  verifyAdminAuthorization(adminUser);

  const request = await prisma.caRedemptionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw ApiError.notFound('Redemption request not found.');
  }

  if (request.status !== 'PENDING_REVIEW') {
    throw ApiError.badRequest(`Cannot approve request in status '${request.status}'.`);
  }

  const updated = await prisma.caRedemptionRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      reviewedById: adminUser.id,
      reviewedAt: new Date(),
    },
  });

  return {
    ...updated,
    success: true,
    status: 'APPROVED',
    redemption: updated,
    message: 'Redemption request approved. Authorized admin may now execute manual bank/UPI transfer.',
  };
};

/**
 * 15. Super Admin: Reject Redemption Request (Mandatory reason, releases reserved coins)
 */
export const rejectRedemption = async (adminUser, requestId, reasonOrData = {}) => {
  verifyAdminAuthorization(adminUser);

  const reason = typeof reasonOrData === 'object' && reasonOrData !== null
    ? (reasonOrData.reason || '')
    : String(reasonOrData || '');

  if (!reason || !reason.trim()) {
    throw ApiError.badRequest('A mandatory rejection reason must be documented.');
  }

  const request = await prisma.caRedemptionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw ApiError.notFound('Redemption request not found.');
  }

  if (request.status === 'PAID') {
    throw ApiError.forbidden('Cannot reject a completed payout that has already been marked as PAID.');
  }

  if (request.status === 'REJECTED') {
    return { success: true, message: 'Request was already rejected.' };
  }

  const profile = await prisma.caReferralProfile.findUnique({
    where: { userId: request.caUserId },
  });

  const coinsToRelease = request.coinsRequested;
  const newAvailableCoins = (profile?.availableCoins || 0) + coinsToRelease;
  const newReservedCoins = Math.max(0, (profile?.reservedCoins || 0) - coinsToRelease);
  const idempotencyKey = `RELEASE-${requestId}`;

  const [updatedRequest] = await prisma.$transaction([
    // 1. Update request status to REJECTED
    prisma.caRedemptionRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedById: adminUser.id,
        reviewedAt: new Date(),
      },
    }),

    // 2. Release reserved coins back to available balance
    prisma.caReferralProfile.update({
      where: { userId: request.caUserId },
      data: {
        availableCoins: newAvailableCoins,
        reservedCoins: newReservedCoins,
      },
    }),

    // 3. Document compensating ledger entry
    prisma.caRewardLedger.create({
      data: {
        caUserId: request.caUserId,
        redemptionId: requestId,
        entryType: 'REDEMPTION_RELEASE',
        coins: coinsToRelease,
        balanceAfter: newAvailableCoins,
        idempotencyKey,
        description: `Released ${coinsToRelease} reserved coins back to balance (Rejection reason: ${reason.trim()})`,
        actorId: adminUser.id,
      },
    }),
  ]);

  // Notify CA
  try {
    await notificationService.createNotification({
      userId: request.caUserId,
      type: 'REDEMPTION_REJECTED',
      title: 'Redemption Request Update',
      message: `Your redemption request for ${coinsToRelease} coins was rejected: ${reason.trim()}. Your coins have been safely returned to your available balance.`,
      data: { requestId, reason: reason.trim(), coinsReturned: coinsToRelease },
    });
  } catch (_) {}

  return {
    ...updatedRequest,
    status: 'REJECTED',
    rejectionReason: reason.trim(),
    success: true,
    message: 'Redemption request rejected and reserved coins returned to CA available balance.',
    coinsReturned: coinsToRelease,
  };
};

/**
 * 16. Super Admin: Record Manual Payment Execution
 * Only called after the admin has physically executed the UPI or Bank transfer.
 */
export const recordPayoutPayment = async (adminUser, requestId, data = {}) => {
  verifyAdminAuthorization(adminUser);

  const ref = (data.paymentReference || data.transactionReference || '').trim();
  if (!ref) {
    throw ApiError.badRequest('Payment reference / transaction UTR is strictly required to record payment.');
  }

  const payDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

  const request = await prisma.caRedemptionRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw ApiError.notFound('Redemption request not found.');
  }

  if (request.status === 'PAID') {
    return { success: true, message: 'Payment for this request has already been recorded.' };
  }

  if (request.status === 'REJECTED' || request.status === 'CANCELLED') {
    throw ApiError.badRequest(`Cannot record payment for request with status '${request.status}'.`);
  }

  const profile = await prisma.caReferralProfile.findUnique({
    where: { userId: request.caUserId },
  });

  const coinsDeducted = request.coinsRequested;
  const rupeeAmount = request.rupeeAmount;
  const newReservedCoins = Math.max(0, (profile?.reservedCoins || 0) - coinsDeducted);
  const newRedeemedCoins = (profile?.redeemedCoins || 0) + coinsDeducted;
  const newTotalPayoutRupees = (profile?.totalPayoutRupees || 0) + rupeeAmount;

  const idempotencyKey = `PAID-${requestId}`;

  const notes = data.notes ? String(data.notes).trim() : null;

  const [updatedRequest] = await prisma.$transaction([
    // 1. Mark request as PAID
    prisma.caRedemptionRequest.update({
      where: { id: requestId },
      data: {
        status: 'PAID',
        paymentReference: ref,
        paymentDate: payDate,
        paidById: adminUser.id,
        paidAt: new Date(),
        notes,
      },
    }),

    // 2. Finalize profile balances
    prisma.caReferralProfile.update({
      where: { userId: request.caUserId },
      data: {
        reservedCoins: newReservedCoins,
        redeemedCoins: newRedeemedCoins,
        totalPayoutRupees: newTotalPayoutRupees,
      },
    }),

    // 3. Finalize ledger record
    prisma.caRewardLedger.create({
      data: {
        caUserId: request.caUserId,
        redemptionId: requestId,
        entryType: 'PAYOUT_COMPLETED',
        status: 'COMPLETED',
        coins: -coinsDeducted,
        balanceAfter: profile?.availableCoins || 0,
        idempotencyKey,
        description: `Recorded payout payment of ₹${rupeeAmount} for ${coinsDeducted} coins (UTR: ${ref})`,
        actorId: adminUser.id,
        metadata: {
          paymentReference: ref,
          rupeeAmount,
          coinsDeducted,
        },
      },
    }),
  ]);

  // Notify CA
  try {
    await notificationService.createNotification({
      userId: request.caUserId,
      type: 'PAYOUT_COMPLETED',
      title: '💵 Payout Dispatched!',
      message: `Your payout of ₹${rupeeAmount} (${coinsDeducted} coins) has been successfully transferred via ${request.payoutMethod}. UTR / Ref: ${ref}`,
      data: { requestId, rupeeAmount, paymentReference: ref },
    });
  } catch (_) {}

  return {
    ...updatedRequest,
    success: true,
    status: 'PAID',
    paymentReference: ref,
    redemption: updatedRequest,
    message: `Payment of ₹${rupeeAmount} successfully recorded. Request finalized.`,
    payout: {
      requestId,
      rupeeAmount,
      coinsDeducted,
      paymentReference: ref,
    },
  };
};

export default {
  verifyCaEligibility,
  verifyAdminAuthorization,
  getProgramConfig,
  updateProgramConfig,
  generateUniqueReferralCode,
  getOrCreateCaProfile,
  getCaDashboard,
  getCaReferralHistory,
  getCaPayoutHistory,
  validateCaReferralCode,
  recordAttribution,
  processFirstPaymentReward,
  submitRedemptionRequest,
  getAdminReferrals,
  getAdminRedemptions,
  approveRedemption,
  rejectRedemption,
  recordPayoutPayment,
};
