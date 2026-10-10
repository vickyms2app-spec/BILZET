import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import {
  getActiveSubscription,
  getSubscriptionUsage,
  upgradeSubscription,
  cancelSubscription,
} from '../services/subscription.service.mjs';
import { PLAN_DETAILS, FEATURE_ENTITLEMENTS } from '../config/plans.config.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

const router = Router();

// Public plan comparison directory (optional auth, useful for pre-login and billing display)
router.get(
  '/plans',
  asyncHandler(async (req, res) => {
    return sendResponse(
      res,
      200,
      {
        plans: Object.values(PLAN_DETAILS),
        features: FEATURE_ENTITLEMENTS,
      },
      'Subscription plans retrieved successfully.'
    );
  })
);

// All operational subscription routes require authentication
router.use(authMiddleware);

/**
 * Returns full verified subscription status and active plan parameters.
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const subInfo = await getActiveSubscription(req.user.businessId, req.user.id);
    const usage = await getSubscriptionUsage(req.user.businessId);

    return sendResponse(
      res,
      200,
      {
        ...subInfo,
        usage,
        currentPlan: subInfo.planTier,
      },
      'Subscription status retrieved successfully.'
    );
  })
);

/**
 * Returns current team seat utilization and active subscription plan parameters.
 */
router.get(
  '/usage',
  asyncHandler(async (req, res) => {
    const usage = await getSubscriptionUsage(req.user.businessId);
    return sendResponse(res, 200, usage, 'Subscription usage retrieved successfully.');
  })
);

/**
 * Upgrades or activates subscription plan for the user/tenant upon payment confirmation.
 */
router.post(
  '/upgrade',
  asyncHandler(async (req, res) => {
    const { planTier, billingCycle, amount, paymentReference, durationDays } = req.body;
    const updated = await upgradeSubscription({
      businessId: req.user.businessId,
      userId: req.user.id,
      planTier,
      billingCycle,
      amount,
      paymentReference,
      durationDays,
    });

    return sendResponse(res, 200, updated, `Successfully upgraded to ${updated.planTier} plan.`);
  })
);

/**
 * Cancels active subscription for the tenant.
 */
router.post(
  '/cancel',
  asyncHandler(async (req, res) => {
    const updated = await cancelSubscription(req.user.businessId, req.user.id);
    return sendResponse(res, 200, updated, 'Subscription cancelled successfully.');
  })
);

export default router;
