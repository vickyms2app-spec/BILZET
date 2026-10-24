import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import {
  getActiveSubscription,
  getSubscriptionUsage,
  upgradeSubscription,
  verifyAndActivatePayment,
  cancelSubscription,
} from '../services/subscription.service.mjs';
import {
  getBillCreditBalance,
  purchaseBillPack,
  getBillCreditLedger,
} from '../services/billCredit.service.mjs';
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
    const usage = await getSubscriptionUsage(req.user.businessId, req.user.id);
    const billCredits = await getBillCreditBalance(req.user.businessId, req.user.id);

    return sendResponse(
      res,
      200,
      {
        ...subInfo,
        usage,
        billCredits,
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
    const usage = await getSubscriptionUsage(req.user.businessId, req.user.id);
    const billCredits = await getBillCreditBalance(req.user.businessId, req.user.id);
    return sendResponse(res, 200, { ...usage, billCredits }, 'Subscription usage retrieved successfully.');
  })
);

/**
 * Returns bill credit balance and consumption details for the tenant.
 */
router.get(
  '/bill-credits',
  asyncHandler(async (req, res) => {
    const credits = await getBillCreditBalance(req.user.businessId, req.user.id);
    return sendResponse(res, 200, credits, 'Bill credit balance retrieved successfully.');
  })
);

/**
 * Returns audit ledger history for bill credit grants and consumption.
 */
router.get(
  '/bill-credits/ledger',
  asyncHandler(async (req, res) => {
    const ledger = await getBillCreditLedger(req.user.businessId, req.user.id);
    return sendResponse(res, 200, { ledger }, 'Bill credit ledger retrieved successfully.');
  })
);

/**
 * Purchases and credits an additional 500-bill pack after payment verification.
 */
router.post(
  '/buy-bill-pack',
  asyncHandler(async (req, res) => {
    const { paymentReference, amount, packSize, paymentMethod } = req.body;
    const updated = await purchaseBillPack({
      businessId: req.user.businessId,
      userId: req.user.id,
      paymentReference,
      amount,
      packSize: packSize ? Number(packSize) : 500,
      paymentMethod: paymentMethod || 'UPI',
    });

    return sendResponse(res, 200, updated, '500-bill pack successfully credited to your account.');
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
 * Verifies payment reference and securely activates paid subscription.
 */
router.post(
  '/verify-payment',
  asyncHandler(async (req, res) => {
    const { planTier, billingCycle, amount, paymentReference, paymentMethod } = req.body;
    const updated = await verifyAndActivatePayment({
      businessId: req.user.businessId,
      userId: req.user.id,
      planTier,
      billingCycle,
      amount,
      paymentReference,
      paymentMethod,
    });

    return sendResponse(res, 200, updated, `Payment verified. Successfully upgraded to ${updated.planTier} plan.`);
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
