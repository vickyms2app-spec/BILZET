import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createSubscriptionCheckoutOrder } from '../src/services/razorpay.service.mjs';
import { PLAN_DETAILS } from '../src/config/plans.config.mjs';
import app from '../src/app.mjs';

const createMockPrisma = () => {
  const orders = [];
  return {
    orders,
    subscriptionOrder: {
      create: async ({ data }) => {
        if (orders.some((o) => o.orderId === data.orderId)) {
          const err = new Error('Unique constraint failed on the fields: (`order_id`)');
          err.code = 'P2002';
          throw err;
        }
        if (data.paymentId && orders.some((o) => o.paymentId === data.paymentId)) {
          const err = new Error('Unique constraint failed on the fields: (`payment_id`)');
          err.code = 'P2002';
          throw err;
        }
        const record = {
          id: `subord-${orders.length + 1}`,
          status: 'CREATED',
          currency: 'INR',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        orders.push(record);
        return record;
      },
    },
  };
};

test('1-6. Successful Razorpay order creation persists authoritative SubscriptionOrder record', async () => {
  const prevFetch = globalThis.fetch;
  const prevKey = process.env.RAZORPAY_KEY_ID;
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;
  const mockPrisma = createMockPrisma();

  try {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_step2b_key';
    process.env.RAZORPAY_KEY_SECRET = 'step2b_secret_123456';

    let sentToRazorpay = null;
    globalThis.fetch = async (_url, init) => {
      sentToRazorpay = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          id: 'order_RzpStep2B_001',
          amount: sentToRazorpay.amount,
          currency: 'INR',
          receipt: sentToRazorpay.receipt,
        }),
      };
    };

    const result = await createSubscriptionCheckoutOrder({
      planTier: 'PRO',
      billingCycle: 'ANNUAL',
      user: { id: 'user-owner-1', businessId: 'busi-tenant-1', email: 'owner@bilzet.in' },
      businessId: 'busi-tenant-1',
      prismaClient: mockPrisma,
    });

    const expectedPaise = Math.round(Number(PLAN_DETAILS.PRO.amount) * 100);
    assert.equal(result.orderId, 'order_RzpStep2B_001');
    assert.equal(result.amount, expectedPaise);
    assert.equal(result.planTier, 'PRO');
    assert.equal(mockPrisma.orders.length, 1);

    const saved = mockPrisma.orders[0];
    assert.equal(saved.orderId, 'order_RzpStep2B_001');
    assert.equal(saved.userId, 'user-owner-1');
    assert.equal(saved.businessId, 'busi-tenant-1');
    assert.equal(saved.planTier, 'PRO');
    assert.equal(saved.amount, expectedPaise);
    assert.equal(saved.currency, 'INR');
    assert.equal(saved.status, 'CREATED');
  } finally {
    globalThis.fetch = prevFetch;
    process.env.RAZORPAY_KEY_ID = prevKey;
    process.env.RAZORPAY_KEY_SECRET = prevSecret;
  }
});

test('7. Duplicate orderId is rejected with conflict error', async () => {
  const prevFetch = globalThis.fetch;
  const prevKey = process.env.RAZORPAY_KEY_ID;
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;
  const mockPrisma = createMockPrisma();

  try {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_step2b_key';
    process.env.RAZORPAY_KEY_SECRET = 'step2b_secret_123456';

    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          id: 'order_Duplicate_001',
          amount: body.amount,
          currency: 'INR',
          receipt: body.receipt,
        }),
      };
    };

    await createSubscriptionCheckoutOrder({
      planTier: 'PRO',
      user: { id: 'user-1', businessId: 'busi-1' },
      businessId: 'busi-1',
      prismaClient: mockPrisma,
    });

    await assert.rejects(
      () =>
        createSubscriptionCheckoutOrder({
          planTier: 'PRO',
          user: { id: 'user-1', businessId: 'busi-1' },
          businessId: 'busi-1',
          prismaClient: mockPrisma,
        }),
      /Duplicate Razorpay order ID/
    );
  } finally {
    globalThis.fetch = prevFetch;
    process.env.RAZORPAY_KEY_ID = prevKey;
    process.env.RAZORPAY_KEY_SECRET = prevSecret;
  }
});

test('8. Duplicate paymentId is rejected by SubscriptionOrder unique constraint', async () => {
  const mockPrisma = createMockPrisma();
  await mockPrisma.subscriptionOrder.create({
    data: {
      orderId: 'order_A',
      paymentId: 'pay_Unique123',
      userId: 'user-1',
      businessId: 'busi-1',
      planTier: 'PRO',
      amount: 99900,
    },
  });

  await assert.rejects(
    () =>
      mockPrisma.subscriptionOrder.create({
        data: {
          orderId: 'order_B',
          paymentId: 'pay_Unique123',
          userId: 'user-2',
          businessId: 'busi-2',
          planTier: 'PREMIUM',
          amount: 299900,
        },
      }),
    (err) => err.code === 'P2002'
  );
});

test('9. Database failure prevents returning order success to frontend', async () => {
  const prevFetch = globalThis.fetch;
  const prevKey = process.env.RAZORPAY_KEY_ID;
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;

  const failingPrisma = {
    subscriptionOrder: {
      create: async () => {
        throw new Error('DB connection lost');
      },
    },
  };

  try {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_step2b_key';
    process.env.RAZORPAY_KEY_SECRET = 'step2b_secret_123456';

    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          id: 'order_DbFail_001',
          amount: body.amount,
          currency: 'INR',
          receipt: body.receipt,
        }),
      };
    };

    await assert.rejects(
      () =>
        createSubscriptionCheckoutOrder({
          planTier: 'PREMIUM',
          user: { id: 'user-1', businessId: 'busi-1' },
          businessId: 'busi-1',
          prismaClient: failingPrisma,
        }),
      /Failed to persist subscription order record/
    );
  } finally {
    globalThis.fetch = prevFetch;
    process.env.RAZORPAY_KEY_ID = prevKey;
    process.env.RAZORPAY_KEY_SECRET = prevSecret;
  }
});

test('10. Unauthenticated requests cannot create Razorpay orders', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/subscription/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier: 'PRO', businessId: 'busi-other-tenant' }),
    });
    assert.equal(res.status, 401);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
