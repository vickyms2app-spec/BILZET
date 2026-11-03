import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import { PLAN_DETAILS } from '../src/config/plans.config.mjs';
import { razorpayService } from '../src/services/razorpay.service.mjs';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET || 'secret', { expiresIn: '1d' });
};

describe('INDEPENDENT SUBSCRIPTION PLANS & RAZORPAY INTEGRATION E2E TEST SUITE', () => {
  const freeBizId = 'biz-test-free-direct';
  const freeOwnerId = 'user-test-free-direct';

  const directPremBizId = 'biz-test-direct-premium';
  const directPremOwnerId = 'user-test-direct-premium';

  let freeToken;
  let directPremToken;

  before(async () => {
    // Cleanup any pre-existing test data
    await prisma.subscription.deleteMany({
      where: { userId: { in: [freeOwnerId, directPremOwnerId] } },
    }).catch(() => {});

    await prisma.business.deleteMany({
      where: { id: { in: [freeBizId, directPremBizId] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [freeOwnerId, directPremOwnerId] } },
    }).catch(() => {});

    // Create test businesses & users
    await prisma.user.create({
      data: {
        id: freeOwnerId,
        email: 'freeowner@bilzet-test.com',
        fullName: 'Free Owner User',
        role: 'OWNER',
      },
    });

    await prisma.business.create({
      data: {
        id: freeBizId,
        name: 'Free Owner Business',
        ownerId: freeOwnerId,
      },
    });

    await prisma.user.create({
      data: {
        id: directPremOwnerId,
        email: 'directprem@bilzet-test.com',
        fullName: 'Direct Premium User',
        role: 'OWNER',
      },
    });

    await prisma.business.create({
      data: {
        id: directPremBizId,
        name: 'Direct Premium Business',
        ownerId: directPremOwnerId,
      },
    });

    // Default FREE subscriptions
    await prisma.subscription.create({
      data: {
        userId: freeOwnerId,
        planName: 'Free Starter Plan',
        planTier: 'FREE',
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        amount: 0,
        startDate: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    await prisma.subscription.create({
      data: {
        userId: directPremOwnerId,
        planName: 'Free Starter Plan',
        planTier: 'FREE',
        status: 'ACTIVE',
        billingCycle: 'ANNUAL',
        amount: 0,
        startDate: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    freeToken = generateToken({
      userId: freeOwnerId,
      id: freeOwnerId,
      email: 'freeowner@bilzet-test.com',
      businessId: freeBizId,
      role: 'OWNER',
    });

    directPremToken = generateToken({
      userId: directPremOwnerId,
      id: directPremOwnerId,
      email: 'directprem@bilzet-test.com',
      businessId: directPremBizId,
      role: 'OWNER',
    });
  });

  after(async () => {
    await prisma.subscription.deleteMany({
      where: { userId: { in: [freeOwnerId, directPremOwnerId] } },
    }).catch(() => {});

    await prisma.business.deleteMany({
      where: { id: { in: [freeBizId, directPremBizId] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [freeOwnerId, directPremOwnerId] } },
    }).catch(() => {});
  });

  // Helper to parse ApiResponse body
  const parseJson = async (res) => {
    const raw = await res.json();
    return raw?.data !== undefined ? raw.data : raw;
  };

  // ── TEST 1: Public Razorpay Config API ──
  test('1. GET /api/v1/subscriptions/razorpay/config returns correct public config and independent plan IDs', async () => {
    const res = await fetch(`${baseUrl}/subscriptions/razorpay/config`);
    assert.strictEqual(res.status, 200);
    const data = await parseJson(res);

    assert.ok(data.keyId, 'Razorpay keyId must be present');
    assert.strictEqual(data.proPlanId, 'plan_bilzet_pro_annual', 'Pro plan ID matches');
    assert.strictEqual(data.premiumPlanId, 'plan_bilzet_premium_annual', 'Premium plan ID matches');
    assert.ok(data.plans, 'Plans dictionary should exist');
    assert.strictEqual(data.plans.PRO.amount, 1499, 'PRO plan amount is 1499');
    assert.strictEqual(data.plans.PREMIUM.amount, 2999, 'PREMIUM plan amount is 2999');
  });

  // ── TEST 2: Free user directly purchases PRO ──
  test('2. FREE user can directly create Razorpay order and purchase PRO plan', async () => {
    // A. Create Razorpay Order for PRO
    const orderRes = await fetch(`${baseUrl}/subscriptions/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        planTier: 'PRO',
        billingCycle: 'ANNUAL',
      }),
    });

    assert.ok([200, 201].includes(orderRes.status), 'Order creation should succeed');
    const orderData = await parseJson(orderRes);
    assert.ok(orderData.orderId, 'Razorpay order ID generated');
    assert.strictEqual(orderData.amount, 149900, 'Amount must be 149900 paise (₹1,499.00)');
    assert.strictEqual(orderData.planTier, 'PRO');
    assert.strictEqual(orderData.razorpayPlanId, 'plan_bilzet_pro_annual');

    // B. Generate valid Razorpay signature for the order
    const fakePaymentId = `pay_test_${Date.now()}`;
    const secret = env.RAZORPAY_KEY_SECRET || 'rzp_mock_secret_bilzet';
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderData.orderId}|${fakePaymentId}`)
      .digest('hex');

    // C. Verify payment and activate PRO
    const verifyRes = await fetch(`${baseUrl}/subscriptions/razorpay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        orderId: orderData.orderId,
        paymentId: fakePaymentId,
        signature: expectedSig,
        planTier: 'PRO',
        billingCycle: 'ANNUAL',
      }),
    });

    assert.ok([200, 201].includes(verifyRes.status), 'Payment verification should succeed');
    const verifyData = await parseJson(verifyRes);
    assert.strictEqual(verifyData.planTier, 'PRO');
    assert.strictEqual(verifyData.status, 'ACTIVE');

    // D. Verify Database status: only ONE active subscription exists for freeOwnerId
    const activeSubs = await prisma.subscription.findMany({
      where: { userId: freeOwnerId, status: 'ACTIVE' },
    });
    assert.strictEqual(activeSubs.length, 1, 'Exactly one active subscription must exist');
    assert.strictEqual(activeSubs[0].planTier, 'PRO', 'Active subscription is PRO');
  });

  // ── TEST 3: Free user directly purchases PREMIUM WITHOUT buying PRO first ──
  test('3. FREE user can DIRECTLY purchase PREMIUM without prior PRO subscription', async () => {
    // Verify user is currently on FREE
    const currentStatusRes = await fetch(`${baseUrl}/subscriptions/status`, {
      headers: { Authorization: `Bearer ${directPremToken}` },
    });
    const currentStatus = await parseJson(currentStatusRes);
    assert.strictEqual(currentStatus.planTier, 'FREE', 'User starts on FREE plan');

    // A. Directly create Razorpay Order for PREMIUM
    const orderRes = await fetch(`${baseUrl}/subscriptions/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directPremToken}`,
      },
      body: JSON.stringify({
        planTier: 'PREMIUM',
        billingCycle: 'ANNUAL',
      }),
    });

    assert.ok([200, 201].includes(orderRes.status), 'Direct PREMIUM order creation should succeed');
    const orderData = await parseJson(orderRes);
    assert.ok(orderData.orderId, 'Razorpay order ID generated');
    assert.strictEqual(orderData.amount, 299900, 'Amount must be 299900 paise (₹2,999.00)');
    assert.strictEqual(orderData.planTier, 'PREMIUM');
    assert.strictEqual(orderData.razorpayPlanId, 'plan_bilzet_premium_annual');

    // B. Generate valid Razorpay signature
    const fakePaymentId = `pay_test_prem_${Date.now()}`;
    const secret = env.RAZORPAY_KEY_SECRET || 'rzp_mock_secret_bilzet';
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderData.orderId}|${fakePaymentId}`)
      .digest('hex');

    // C. Verify payment and directly activate PREMIUM
    const verifyRes = await fetch(`${baseUrl}/subscriptions/razorpay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directPremToken}`,
      },
      body: JSON.stringify({
        orderId: orderData.orderId,
        paymentId: fakePaymentId,
        signature: expectedSig,
        planTier: 'PREMIUM',
        billingCycle: 'ANNUAL',
      }),
    });

    assert.ok([200, 201].includes(verifyRes.status), 'Payment verification should succeed');
    const verifyData = await parseJson(verifyRes);
    assert.strictEqual(verifyData.planTier, 'PREMIUM');
    assert.strictEqual(verifyData.status, 'ACTIVE');

    // D. Verify Database status: user went straight from FREE to PREMIUM
    const activeSubs = await prisma.subscription.findMany({
      where: { userId: directPremOwnerId, status: 'ACTIVE' },
    });
    assert.strictEqual(activeSubs.length, 1, 'Exactly one active subscription exists');
    assert.strictEqual(activeSubs[0].planTier, 'PREMIUM', 'User is directly on PREMIUM');
  });

  // ── TEST 4: Existing PRO customer upgrades to PREMIUM ──
  test('4. Existing PRO customer can upgrade directly to PREMIUM', async () => {
    // freeOwner is currently on PRO from Test 2
    const orderRes = await fetch(`${baseUrl}/subscriptions/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        planTier: 'PREMIUM',
        billingCycle: 'ANNUAL',
      }),
    });

    assert.ok([200, 201].includes(orderRes.status));
    const orderData = await parseJson(orderRes);
    assert.strictEqual(orderData.planTier, 'PREMIUM');
    assert.strictEqual(orderData.razorpayPlanId, 'plan_bilzet_premium_annual');

    const fakePaymentId = `pay_test_upgrade_${Date.now()}`;
    const secret = env.RAZORPAY_KEY_SECRET || 'rzp_mock_secret_bilzet';
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderData.orderId}|${fakePaymentId}`)
      .digest('hex');

    const verifyRes = await fetch(`${baseUrl}/subscriptions/razorpay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        orderId: orderData.orderId,
        paymentId: fakePaymentId,
        signature: expectedSig,
        planTier: 'PREMIUM',
        billingCycle: 'ANNUAL',
      }),
    });

    assert.ok([200, 201].includes(verifyRes.status));
    const verifyData = await parseJson(verifyRes);
    assert.strictEqual(verifyData.planTier, 'PREMIUM');

    // Check single active subscription in database
    const activeSubs = await prisma.subscription.findMany({
      where: { userId: freeOwnerId, status: 'ACTIVE' },
    });
    assert.strictEqual(activeSubs.length, 1, 'Only one active subscription exists after upgrade');
    assert.strictEqual(activeSubs[0].planTier, 'PREMIUM', 'Upgraded to PREMIUM');
  });

  // ── TEST 5: Existing PREMIUM customer downgrades / switches to PRO ──
  test('5. Existing PREMIUM customer can switch / downgrade to PRO', async () => {
    // directPremOwner is currently on PREMIUM from Test 3
    const switchRes = await fetch(`${baseUrl}/subscriptions/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${directPremToken}`,
      },
      body: JSON.stringify({
        targetTier: 'PRO',
      }),
    });

    assert.ok([200, 201].includes(switchRes.status), 'Switching plan should succeed');
    const switchData = await parseJson(switchRes);
    assert.strictEqual(switchData.planTier, 'PRO');

    // Check single active subscription in database
    const activeSubs = await prisma.subscription.findMany({
      where: { userId: directPremOwnerId, status: 'ACTIVE' },
    });
    assert.strictEqual(activeSubs.length, 1, 'Only one active subscription exists after switch');
    assert.strictEqual(activeSubs[0].planTier, 'PRO', 'Switched to PRO');
  });

  // ── TEST 6: Webhook signature verification and event handling ──
  test('6. Razorpay Webhook processes payment.captured and verifies signature', async () => {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || 'rzp_mock_webhook_secret_bilzet';
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_test_123',
            amount: 149900,
            currency: 'INR',
            status: 'captured',
            notes: {
              businessId: freeBizId,
              planTier: 'PRO',
              billingCycle: 'ANNUAL',
            },
          },
        },
      },
    });

    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const webhookRes = await fetch(`${baseUrl}/subscriptions/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: payload,
    });

    assert.strictEqual(webhookRes.status, 200);
    const webhookData = await parseJson(webhookRes);
    assert.strictEqual(webhookData.received, true);
  });
});
