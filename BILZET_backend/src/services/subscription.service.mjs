import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPlanSeatLimit, PLAN_DETAILS } from '../config/plans.config.mjs';

/**
 * Resolves active subscription for a business/user and verifies validity, status, and expiration.
 * @param {string} businessId
 * @param {string} [userId]
 */
export const getActiveSubscription = async (businessId, userId = null) => {
  let activeSub = null;

  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (business?.ownerId) {
      activeSub = await prisma.subscription.findFirst({
        where: {
          userId: business.ownerId,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  if (!activeSub && userId) {
    activeSub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!activeSub) {
    return {
      planTier: 'FREE',
      actualPlanTier: 'FREE',
      planName: 'Free Starter',
      status: 'INACTIVE',
      isActive: false,
      isExpired: false,
      expiresAt: null,
      subscription: null,
    };
  }

  const now = new Date();
  const expiryDate = activeSub.expiresAt || activeSub.endDate;
  const isExpired = expiryDate ? new Date(expiryDate) <= now : false;
  const isStatusActive = String(activeSub.status || '').toUpperCase() === 'ACTIVE';

  const isValidActive = isStatusActive && !isExpired;

  return {
    planTier: isValidActive ? String(activeSub.planTier || 'FREE').toUpperCase() : 'FREE',
    actualPlanTier: String(activeSub.planTier || 'FREE').toUpperCase(),
    planName: activeSub.planName || 'Free Starter',
    status: isExpired ? 'EXPIRED' : activeSub.status,
    isActive: isValidActive,
    isExpired,
    expiresAt: expiryDate,
    subscription: activeSub,
  };
};

/**
 * Calculates current team seat usage and plan allowance for a given business.
 * @param {string} businessId
 */
export const getSubscriptionUsage = async (businessId) => {
  if (!businessId) {
    return {
      planTier: 'FREE',
      usedSeats: 0,
      maxSeats: 0,
      remainingSeats: 0,
      canAddUser: false,
    };
  }

  // 1. Resolve business owner and their active subscription
  const subInfo = await getActiveSubscription(businessId);
  const activeSub = subInfo.subscription;
  const planTier = subInfo.planTier;

  // Use custom configured maxSubUsers on subscription record if set, else fall back to plan tier default
  const maxSeats =
    activeSub?.maxSubUsers !== undefined && activeSub?.maxSubUsers > 0
      ? activeSub.maxSubUsers
      : getPlanSeatLimit(planTier);

  // 2. Count active sub-users belonging to this business (excluding the owner)
  const usedSeats = await prisma.user.count({
    where: {
      businessId,
      isOwner: false,
    },
  });

  const remainingSeats = Math.max(0, maxSeats - usedSeats);
  const canAddUser = usedSeats < maxSeats;

  return {
    businessId,
    planTier,
    planName: subInfo.planName,
    usedSeats,
    maxSeats,
    remainingSeats,
    canAddUser,
    status: subInfo.status,
    isExpired: subInfo.isExpired,
    expiresAt: subInfo.expiresAt,
  };
};

/**
 * Asserts that the business has available seats to create a new sub-user.
 * Throws 403 ApiError if seat limit has been reached.
 * @param {string} businessId
 */
export const assertCanAddSubUser = async (businessId) => {
  const usage = await getSubscriptionUsage(businessId);

  if (!usage.canAddUser) {
    const error = ApiError.forbidden(
      `You have reached your plan's sub-user limit (${usage.usedSeats}/${usage.maxSeats} seats used). Upgrade your plan to add more team members.`
    );
    error.code = 'SUB_USER_LIMIT_REACHED';
    error.data = usage;
    throw error;
  }

  return usage;
};

/**
 * Upgrades or activates a subscription tier for a business owner.
 * Ensures idempotent execution if paymentReference is provided.
 */
export const upgradeSubscription = async ({
  businessId,
  userId,
  planTier,
  billingCycle = 'ANNUAL',
  amount,
  paymentReference,
  durationDays = 365,
}) => {
  const normalizedTier = String(planTier || 'PRO').toUpperCase();
  if (!['FREE', 'PRO', 'PREMIUM'].includes(normalizedTier)) {
    throw ApiError.badRequest(`Invalid plan tier: ${planTier}. Must be FREE, PRO, or PREMIUM.`);
  }

  // 1. Resolve target user (owner)
  let targetUserId = userId;
  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (business?.ownerId) {
      targetUserId = business.ownerId;
    }
  }

  if (!targetUserId) {
    throw ApiError.badRequest('User context missing for subscription activation.');
  }

  // 2. Check idempotency if paymentReference exists
  if (paymentReference) {
    const existingPayment = await prisma.subscription.findFirst({
      where: {
        userId: targetUserId,
        paymentReference,
        status: 'ACTIVE',
      },
    });
    if (existingPayment) {
      return getActiveSubscription(businessId, targetUserId);
    }
  }

  const planInfo = PLAN_DETAILS[normalizedTier] || PLAN_DETAILS.PRO;
  const seatLimit = getPlanSeatLimit(normalizedTier);
  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 3600 * 1000);

  // If downgrading to FREE
  if (normalizedTier === 'FREE') {
    await prisma.subscription.updateMany({
      where: { userId: targetUserId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    return getActiveSubscription(businessId, targetUserId);
  }

  // Create active subscription record
  await prisma.subscription.create({
    data: {
      userId: targetUserId,
      planTier: normalizedTier,
      planName: planInfo.name,
      status: 'ACTIVE',
      billingCycle,
      amount: amount !== undefined ? Number(amount) : planInfo.amount,
      maxSubUsers: seatLimit,
      startDate: now,
      endDate,
      expiresAt: endDate,
      paymentReference: paymentReference || `PAY-${Date.now()}`,
    },
  });

  // Trigger referral reward fulfillment if referee is upgrading to a paid tier
  try {
    const { processReferralRewardOnUpgrade } = await import('./referral.service.mjs');
    await processReferralRewardOnUpgrade({ refereeId: targetUserId, planTier: normalizedTier });
  } catch (refErr) {
    console.warn('[upgradeSubscription] Referral reward process error:', refErr.message);
  }

  return getActiveSubscription(businessId, targetUserId);
};

/**
 * Cancels active subscription for a business/user.
 * Preserves all business data and historical records.
 */
export const cancelSubscription = async (businessId, userId) => {
  let targetUserId = userId;
  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (business?.ownerId) {
      targetUserId = business.ownerId;
    }
  }

  if (!targetUserId) {
    throw ApiError.badRequest('User context missing for subscription cancellation.');
  }

  await prisma.subscription.updateMany({
    where: {
      userId: targetUserId,
      status: 'ACTIVE',
    },
    data: {
      status: 'CANCELLED',
    },
  });

  return getActiveSubscription(businessId, targetUserId);
};

export default {
  getActiveSubscription,
  getSubscriptionUsage,
  assertCanAddSubUser,
  upgradeSubscription,
  cancelSubscription,
};
