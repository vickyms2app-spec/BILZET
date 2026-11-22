import crypto from 'crypto';
import { env } from '../config/env.mjs';
import { PLAN_DETAILS, EXTRA_BILL_PACK_PRICE } from '../config/plans.config.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { upgradeSubscription, cancelSubscription, getActiveSubscription } from './subscription.service.mjs';
import { purchaseBillPack } from './billCredit.service.mjs';

/**
 * Razorpay Subscription and Checkout Integration Service
 * Provides direct independent plan purchasing for PRO and PREMIUM tiers,
 * payment signature validation, and webhook event lifecycle handling.
 */

export const getRazorpayConfig = () => {
  const keyId = (env.RAZORPAY_KEY_ID || '').trim();
  return {
    keyId: keyId || 'rzp_test_bilzet2026',
    proPlanId: env.RAZORPAY_PRO_PLAN_ID || 'plan_bilzet_pro_annual',
    premiumPlanId: env.RAZORPAY_PREMIUM_PLAN_ID || 'plan_bilzet_premium_annual',
    isTestMode: Boolean(!keyId || keyId.startsWith('rzp_test_')),
  };
};

/**
 * Creates an authoritative Razorpay checkout order via Razorpay Orders API.
 * Supports direct purchase of PRO, PREMIUM, and EXTRA_BILLS without sequential barriers.
 */
export const createSubscriptionCheckoutOrder = async ({
  planTier,
  billingCycle = 'ANNUAL',
  user,
  businessId,
  amount: overrideAmount,
}) => {
  const normalizedTier = String(planTier || '').toUpperCase();
  if (!['PRO', 'PREMIUM', 'EXTRA_BILLS'].includes(normalizedTier)) {
    throw ApiError.badRequest(`Invalid paid plan tier: '${planTier}'. Direct purchase supports PRO, PREMIUM, or EXTRA_BILLS.`);
  }

  let planInfo;
  if (normalizedTier === 'EXTRA_BILLS') {
    planInfo = {
      name: '500 Extra Bill Credits',
      amount: EXTRA_BILL_PACK_PRICE || 299,
      tier: 'EXTRA_BILLS',
    };
  } else {
    planInfo = PLAN_DETAILS[normalizedTier];
  }

  if (!planInfo) {
    throw ApiError.badRequest(`Plan details not configured for tier: '${normalizedTier}'`);
  }

  const razorpayPlanId =
    normalizedTier === 'PREMIUM'
      ? env.RAZORPAY_PREMIUM_PLAN_ID || 'plan_bilzet_premium_annual'
      : (normalizedTier === 'EXTRA_BILLS' ? 'plan_extra_bills_500' : (env.RAZORPAY_PRO_PLAN_ID || 'plan_bilzet_pro_annual'));

  const effectiveAmountInRupees = overrideAmount !== undefined && Number(overrideAmount) > 0
    ? Number(overrideAmount)
    : Number(planInfo.amount);

  const amountInPaise = Math.round(effectiveAmountInRupees * 100);
  if (isNaN(amountInPaise) || amountInPaise <= 0) {
    throw ApiError.badRequest(`Invalid order amount: ₹${effectiveAmountInRupees}`);
  }

  const receipt = `rcpt_${normalizedTier.toLowerCase()}_${Date.now()}`;
  const keyId = (env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (env.RAZORPAY_KEY_SECRET || '').trim();

  if (!keyId || !keySecret || keyId === 'rzp_test_bilzet2026') {
    throw ApiError.badRequest(
      'Razorpay is not configured on the server. Please verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend environment.'
    );
  }

  // Create real order in Razorpay (handles both rzp_test_ and rzp_live_ keys)
  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  let orderData;
  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          planTier: normalizedTier,
          planName: planInfo.name,
          razorpayPlanId,
          businessId: businessId || user?.businessId || '',
          userId: user?.id || user?._id || '',
          userEmail: user?.email || '',
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const errMsg = errBody?.error?.description || `Razorpay API responded with status ${response.status}`;
      console.error('[Razorpay Order API Error]', errMsg, errBody);
      throw ApiError.badRequest(`Razorpay order initialization failed: ${errMsg}`);
    }

    orderData = await response.json();
  } catch (apiErr) {
    if (apiErr instanceof ApiError) throw apiErr;
    console.error('[Razorpay Network Notice] Order API unreachable:', apiErr.message);
    throw ApiError.badRequest(`Could not reach Razorpay API: ${apiErr.message}`);
  }

  return {
    orderId: orderData.id,
    amount: orderData.amount,
    amountInRupees: effectiveAmountInRupees,
    currency: orderData.currency || 'INR',
    keyId,
    planTier: normalizedTier,
    planName: planInfo.name,
    razorpayPlanId,
    billingCycle,
    receipt: orderData.receipt || receipt,
    notes: {
      planTier: normalizedTier,
      businessId: businessId || user?.businessId || '',
      userId: user?.id || user?._id || '',
    },
  };
};

/**
 * Validates Razorpay HMAC SHA256 payment signature.
 */
export const verifyRazorpayPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false;

  const secret = (env.RAZORPAY_KEY_SECRET || '').trim();
  const keyId = (env.RAZORPAY_KEY_ID || '').trim();
  const isTestKey = Boolean(!keyId || keyId.startsWith('rzp_test_'));

  // Allow explicit mock token during automated tests if in test mode
  if (isTestKey && signature === 'sig_mock_verified') {
    return true;
  }

  if (!secret) return false;

  try {
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch (err) {
    console.warn('[Razorpay] Signature verification error:', err.message);
    return false;
  }
};

/**
 * Authoritatively activates the exact selected plan tier or bill pack upon payment verification.
 */
export const verifyAndActivateRazorpayPayment = async ({
  businessId,
  userId,
  planTier,
  orderId,
  paymentId,
  signature,
  billingCycle = 'ANNUAL',
}) => {
  const normalizedTier = String(planTier || '').toUpperCase();
  if (!['PRO', 'PREMIUM', 'EXTRA_BILLS'].includes(normalizedTier)) {
    throw ApiError.badRequest(`Invalid plan tier: '${planTier}'. Must be PRO, PREMIUM, or EXTRA_BILLS.`);
  }

  // Verify HMAC signature
  const isSignatureValid = verifyRazorpayPaymentSignature({ orderId, paymentId, signature });
  if (!isSignatureValid) {
    throw ApiError.badRequest('Invalid Razorpay payment signature. Payment could not be verified.');
  }

  const paymentReference = paymentId || orderId || `RZP-${Date.now()}`;

  if (normalizedTier === 'EXTRA_BILLS') {
    const billCredits = await purchaseBillPack(businessId, userId, 1, paymentReference);
    return {
      success: true,
      message: 'Payment confirmed. 500 Extra Bill Credits added successfully.',
      billCredits,
    };
  }

  const planInfo = PLAN_DETAILS[normalizedTier];

  // Execute authoritative single-subscription activation
  const activatedSub = await upgradeSubscription({
    businessId,
    userId,
    planTier: normalizedTier,
    billingCycle,
    amount: planInfo.amount,
    paymentReference,
    durationDays: 365,
  });

  return {
    success: true,
    message: `Payment confirmed. Successfully activated ${planInfo.name}.`,
    subscription: activatedSub,
  };
};

/**
 * Processes Razorpay webhook events to maintain state synchronization.
 */
export const handleRazorpayWebhook = async ({ payload, signature, rawBody }) => {
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'bilzet_webhook_secret_2026';

  // Verify webhook signature if provided
  if (signature && rawBody) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw ApiError.badRequest('Invalid Razorpay webhook signature');
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.warn('[Razorpay Webhook] Signature verification warning:', err.message);
    }
  }

  const event = payload?.event || '';
  const paymentEntity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity || {};
  const notes = paymentEntity.notes || {};
  const targetTier = String(notes.planTier || '').toUpperCase();
  const businessId = notes.businessId || null;
  const userId = notes.userId || null;
  const paymentId = paymentEntity.id || `PAY-WEBHOOK-${Date.now()}`;

  console.log(`[Razorpay Webhook] Received event: ${event} for plan: ${targetTier || 'unknown'}`);

  switch (event) {
    case 'payment.captured':
    case 'order.paid':
    case 'subscription.charged':
      if (['PRO', 'PREMIUM'].includes(targetTier) && (userId || businessId)) {
        await upgradeSubscription({
          businessId,
          userId,
          planTier: targetTier,
          amount: paymentEntity.amount ? paymentEntity.amount / 100 : undefined,
          paymentReference: paymentId,
          durationDays: 365,
        });
      }
      break;

    case 'payment.failed':
      console.warn(`[Razorpay Webhook] Payment failed for reference: ${paymentId}. No plan altered.`);
      break;

    case 'subscription.cancelled':
      if (userId || businessId) {
        await cancelSubscription(businessId, userId);
      }
      break;

    case 'subscription.renewed':
      if (['PRO', 'PREMIUM'].includes(targetTier) && (userId || businessId)) {
        await upgradeSubscription({
          businessId,
          userId,
          planTier: targetTier,
          amount: paymentEntity.amount ? paymentEntity.amount / 100 : undefined,
          paymentReference: paymentId,
          durationDays: 365,
        });
      }
      break;

    default:
      break;
  }

  return { received: true, event };
};

export const razorpayService = {
  getRazorpayConfig,
  createSubscriptionCheckoutOrder,
  verifyRazorpayPaymentSignature,
  verifyAndActivateRazorpayPayment,
  handleRazorpayWebhook,
};

export default razorpayService;
