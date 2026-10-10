import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';

/**
 * Computes deterministic referral code for any user.
 */
export const getReferralCodeForUser = (user) => {
  if (!user) return 'BZPROMO8';
  if (user.referralCode) return user.referralCode;
  if (user.id) {
    const clean = String(user.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
    return `BZ${clean}`;
  }
  if (user.email) {
    const prefix = String(user.email).split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    return `BZ${prefix}7`;
  }
  return 'BZPROMO8';
};

/**
 * Mask email for privacy (e.g. k***@gmail.com)
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return 'merchant@store.com';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name[0]}***${name.slice(-1)}@${domain}`;
};

/**
 * Resolves referral overview, link, stats, and history for the requesting merchant.
 */
export const getReferralInfo = async (user) => {
  if (!user) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const referralCode = getReferralCodeForUser(user);
  const referralLink = `https://bilzet.app/sign-up?ref=${referralCode}`;

  // Fetch referrals where this user is the referrer
  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  const totalReferrals = referrals.length;
  const pendingReferrals = referrals.filter((r) => r.status === 'PENDING').length;
  const completedReferrals = referrals.filter((r) => r.status === 'REWARDED' || r.status === 'COMPLETED').length;
  const bonusMonthsEarned = completedReferrals;
  const bonusDaysEarned = completedReferrals * 30;

  // Mask referee emails for privacy compliance
  const sanitizedHistory = referrals.map((r) => ({
    id: r.id,
    refereeName: r.refereeName || 'Referred Merchant',
    refereeEmail: maskEmail(r.refereeEmail),
    status: r.status,
    rewardClaimed: r.status === 'REWARDED' || r.status === 'COMPLETED',
    discountApplied: r.discountPercent || 10,
    createdAt: r.createdAt,
    rewardedAt: r.rewardedAt || null,
  }));

  return {
    referralCode,
    referralLink,
    rewardTerms: {
      refereeDiscountPercent: 10,
      referrerBonusMonths: 1,
      referrerBonusDays: 30,
      condition: 'Activates immediately upon referee first paid subscription upgrade.',
    },
    stats: {
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      bonusMonthsEarned,
      bonusDaysEarned,
    },
    referrals: sanitizedHistory,
  };
};

/**
 * Validates a referral code.
 */
export const validateReferralCode = async (code, currentUserId = null) => {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      valid: false,
      message: 'Referral code is required.',
    };
  }

  const cleanCode = code.trim().toUpperCase();

  // Find user by custom referralCode or deterministic match
  let referrer = await prisma.user.findFirst({
    where: { referralCode: cleanCode },
  });

  if (!referrer) {
    const allUsers = await prisma.user.findMany({ take: 200 });
    referrer = allUsers.find((u) => getReferralCodeForUser(u) === cleanCode) || null;
  }

  // Fallback promo code
  if (!referrer && cleanCode === 'BZPROMO8') {
    return {
      valid: true,
      code: cleanCode,
      discountPercent: 10,
      message: 'Promotional code valid. 10% discount applied.',
    };
  }

  if (!referrer) {
    return {
      valid: false,
      message: 'Invalid or unrecognized referral code.',
    };
  }

  // Prevent self-referral
  if (currentUserId && referrer.id === currentUserId) {
    return {
      valid: false,
      message: 'You cannot use your own referral code.',
    };
  }

  return {
    valid: true,
    code: cleanCode,
    referrerId: referrer.id,
    discountPercent: 10,
    message: 'Valid referral code. 10% discount applied.',
  };
};

/**
 * Attaches a referral attribution to a new referee.
 */
export const recordReferralAttribution = async ({ referrerCode, refereeId, refereeName, refereeEmail }) => {
  if (!referrerCode || !refereeId) return null;

  const validation = await validateReferralCode(referrerCode, refereeId);
  if (!validation.valid || !validation.referrerId) return null;

  const referrerId = validation.referrerId;
  if (referrerId === refereeId) return null; // No self referral

  // Prevent duplicate referral: referee can only be attributed once
  const existing = await prisma.referral.findFirst({
    where: { refereeId },
  });
  if (existing) {
    return existing;
  }

  const created = await prisma.referral.create({
    data: {
      referrerId,
      refereeId,
      referralCode: referrerCode.toUpperCase(),
      refereeName: refereeName || 'New Merchant',
      refereeEmail: refereeEmail || null,
      status: 'PENDING',
      discountPercent: 10,
      rewardBonusDays: 30,
    },
  });

  return created;
};

/**
 * Triggers reward fulfillment when a referred merchant activates/upgrades to a paid subscription.
 * Idempotent: Cannot trigger duplicate rewards for the same referee.
 */
export const processReferralRewardOnUpgrade = async ({ refereeId, planTier }) => {
  if (!refereeId) return { rewarded: false };
  const normalizedTier = String(planTier || '').toUpperCase();
  if (!['PRO', 'PREMIUM', 'ENTERPRISE'].includes(normalizedTier)) {
    return { rewarded: false, reason: 'Plan is not a paid subscription tier' };
  }

  // Find pending referral
  const referral = await prisma.referral.findFirst({
    where: {
      refereeId,
      status: 'PENDING',
    },
  });

  if (!referral) {
    return { rewarded: false, reason: 'No pending referral found or already rewarded' };
  }

  const referrerId = referral.referrerId;
  if (!referrerId || referrerId === refereeId) {
    return { rewarded: false, reason: 'Invalid referrer' };
  }

  // Mark referral as REWARDED
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: 'REWARDED',
      rewardedAt: new Date(),
    },
  });

  // Credit 1 bonus month (30 days) to referrer's subscription
  const referrerSub = await prisma.subscription.findFirst({
    where: { userId: referrerId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  if (referrerSub) {
    const currentEnd = referrerSub.endDate ? new Date(referrerSub.endDate) : new Date();
    const newEnd = new Date(Math.max(Date.now(), currentEnd.getTime()) + 30 * 24 * 3600 * 1000);
    await prisma.subscription.update({
      where: { id: referrerSub.id },
      data: {
        endDate: newEnd,
        expiresAt: newEnd,
      },
    });
  } else {
    // Referrer is on Free: create a bonus 30-day Pro pass
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    await prisma.subscription.create({
      data: {
        userId: referrerId,
        planTier: 'PRO',
        planName: 'Pro Referral Bonus (1 Month)',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        amount: 0,
        startDate: now,
        endDate,
        expiresAt: endDate,
        paymentReference: `REF-BONUS-${referral.id}`,
      },
    });
  }

  return {
    rewarded: true,
    referrerId,
    bonusDays: 30,
    referralId: referral.id,
  };
};

export default {
  getReferralCodeForUser,
  getReferralInfo,
  validateReferralCode,
  recordReferralAttribution,
  processReferralRewardOnUpgrade,
};
