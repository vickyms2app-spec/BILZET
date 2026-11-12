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
import razorpayService from '../services/razorpay.service.mjs';
import { PLAN_DETAILS, FEATURE_ENTITLEMENTS } from '../config/plans.config.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';
import dealerOfferService from '../services/dealerOffer.service.mjs';

const router = Router();

// Active dealer offers for plan selection & checkout
router.get(
  '/dealer-offers',
  asyncHandler(async (req, res) => {
    const billingCycle = req.query.billingCycle || 'ANNUAL';
    const offers = await dealerOfferService.listOffers({ activeOnly: true, billingCycle });
    return sendResponse(res, 200, { offers }, 'Active dealer offers retrieved successfully.');
  })
);

// Validate dealer promo code for checkout
router.post(
  '/dealer-offers/validate',
  asyncHandler(async (req, res) => {
    const { code, planTier, billingCycle } = req.body;
    const result = await dealerOfferService.validateOffer({ code, planTier, billingCycle });
    return sendResponse(res, 200, result, 'Dealer offer validated successfully.');
  })
);

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
        razorpay: razorpayService.getRazorpayConfig(),
      },
      'Subscription plans retrieved successfully.'
    );
  })
);

// Public Razorpay Configuration Endpoint
router.get(
  '/razorpay/config',
  asyncHandler(async (req, res) => {
    const config = razorpayService.getRazorpayConfig();
    return sendResponse(
      res,
      200,
      {
        ...config,
        plans: {
          PRO: {
            planId: config.proPlanId,
            amount: PLAN_DETAILS.PRO.amount,
            currency: 'INR',
            name: PLAN_DETAILS.PRO.name,
          },
          PREMIUM: {
            planId: config.premiumPlanId,
            amount: PLAN_DETAILS.PREMIUM.amount,
            currency: 'INR',
            name: PLAN_DETAILS.PREMIUM.name,
          },
        },
      },
      'Razorpay configuration retrieved successfully.'
    );
  })
);

// Public Razorpay Webhook Endpoint
router.post(
  '/razorpay/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const result = await razorpayService.handleRazorpayWebhook({
      payload: req.body,
      signature,
      rawBody: req.body,
    });
    return sendResponse(res, 200, result, 'Webhook processed successfully.');
  })
);

// All operational subscription routes require authentication
router.use(authMiddleware);

/**
 * Creates a Razorpay checkout order for the chosen plan (PRO or PREMIUM).
 * Free users can directly purchase either PRO or PREMIUM without sequential barriers.
 */
router.post(
  '/razorpay/create-order',
  asyncHandler(async (req, res) => {
    const { planTier, billingCycle, dealerOfferCode } = req.body;
    let overrideAmount = undefined;

    if (dealerOfferCode) {
      const validated = await dealerOfferService.validateOffer({
        code: dealerOfferCode,
        planTier,
        billingCycle,
      });
      overrideAmount = validated.pricing.totalWithGst || validated.pricing.finalAmount;
    }

    const order = await razorpayService.createSubscriptionCheckoutOrder({
      planTier,
      billingCycle,
      user: req.user,
      businessId: req.user.businessId,
      amount: overrideAmount,
    });

    return sendResponse(res, 201, order, `Razorpay order created for ${order.planName}.`);
  })
);

/**
 * Verifies Razorpay payment signature and activates the exact plan selected.
 */
router.post(
  '/razorpay/verify',
  asyncHandler(async (req, res) => {
    const { planTier, orderId, paymentId, signature, billingCycle } = req.body;
    const result = await razorpayService.verifyAndActivateRazorpayPayment({
      businessId: req.user.businessId,
      userId: req.user.id,
      planTier,
      orderId,
      paymentId,
      signature,
      billingCycle,
    });

    return sendResponse(res, 200, result.subscription, result.message);
  })
);

/**
 * Direct Plan Switch / Downgrade / Upgrade Endpoint.
 * Allows independent switching between FREE, PRO, and PREMIUM.
 */
router.post(
  '/switch',
  asyncHandler(async (req, res) => {
    const { targetTier, paymentReference, paymentMethod, dealerOfferCode, billingCycle = 'YEARLY' } = req.body;
    const normalizedTier = String(targetTier || 'FREE').toUpperCase();

    if (normalizedTier === 'FREE') {
      const updated = await cancelSubscription(req.user.businessId, req.user.id);
      return sendResponse(res, 200, updated, 'Successfully switched to Free Starter plan.');
    }

    let finalAmount = PLAN_DETAILS[normalizedTier]?.amount;
    let appliedOffer = null;

    if (dealerOfferCode) {
      const validated = await dealerOfferService.validateOffer({
        code: dealerOfferCode,
        planTier: normalizedTier,
        billingCycle,
      });
      finalAmount = validated.pricing.totalWithGst || validated.pricing.finalAmount;
      appliedOffer = validated.offer;
      await dealerOfferService.recordRedemption(dealerOfferCode);
    }

    const updated = await upgradeSubscription({
      businessId: req.user.businessId,
      userId: req.user.id,
      planTier: normalizedTier,
      billingCycle: String(billingCycle).toUpperCase() === 'MONTHLY' ? 'MONTHLY' : 'ANNUAL',
      amount: finalAmount,
      paymentReference: paymentReference || `SW-${Date.now()}`,
      durationDays: String(billingCycle).toUpperCase() === 'MONTHLY' ? 30 : 365,
    });

    return sendResponse(
      res,
      200,
      { ...updated, appliedOffer },
      `Successfully switched to ${updated.planTier} plan${appliedOffer ? ` with dealer offer ${appliedOffer.code}` : ''}.`
    );
  })
);

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
        razorpay: razorpayService.getRazorpayConfig(),
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

    return sendResponse(res, 200, updated, `Successfully activated ${updated.planTier} plan.`);
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

    return sendResponse(res, 200, updated, `Payment verified. Successfully activated ${updated.planTier} plan.`);
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
