import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';

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

describe('PHASE 12: SUBSCRIPTION PLAN MANAGEMENT & CENTRALIZED ACCESS CONTROL', () => {
  const freeBizId = 'biz-p12-free';
  const freeOwnerId = 'user-p12-free-owner';

  const proBizId = 'biz-p12-pro';
  const proOwnerId = 'user-p12-pro-owner';

  const premBizId = 'biz-p12-prem';
  const premOwnerId = 'user-p12-prem-owner';

  const expBizId = 'biz-p12-exp';
  const expOwnerId = 'user-p12-exp-owner';

  let freeToken;
  let proToken;
  let premToken;
  let expToken;

  before(async () => {
    // 1. FREE USER & BUSINESS
    await prisma.business.create({
      data: { id: freeBizId, name: 'Free Retail Mart', ownerId: freeOwnerId },
    });
    await prisma.user.create({
      data: {
        id: freeOwnerId,
        email: 'free.p12@bilzet.test',
        role: 'ADMIN',
        businessId: freeBizId,
        isOwner: true,
        isActive: true,
      },
    });
    freeToken = generateToken({
      userId: freeOwnerId,
      id: freeOwnerId,
      email: 'free.p12@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: freeBizId,
    });

    // 2. PRO USER & BUSINESS
    await prisma.business.create({
      data: { id: proBizId, name: 'Pro Retail Mart', ownerId: proOwnerId },
    });
    await prisma.user.create({
      data: {
        id: proOwnerId,
        email: 'pro.p12@bilzet.test',
        role: 'ADMIN',
        businessId: proBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p12-pro-01',
        userId: proOwnerId,
        planTier: 'PRO',
        planName: 'Pro Business',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    proToken = generateToken({
      userId: proOwnerId,
      id: proOwnerId,
      email: 'pro.p12@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: proBizId,
    });

    // 3. PREMIUM USER & BUSINESS
    await prisma.business.create({
      data: { id: premBizId, name: 'Premium Retail Mart', ownerId: premOwnerId },
    });
    await prisma.user.create({
      data: {
        id: premOwnerId,
        email: 'prem.p12@bilzet.test',
        role: 'ADMIN',
        businessId: premBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p12-prem-01',
        userId: premOwnerId,
        planTier: 'PREMIUM',
        planName: 'Premium Enterprise',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    premToken = generateToken({
      userId: premOwnerId,
      id: premOwnerId,
      email: 'prem.p12@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: premBizId,
    });

    // 4. EXPIRED SUBSCRIPTION USER & BUSINESS
    await prisma.business.create({
      data: { id: expBizId, name: 'Expired Retail Mart', ownerId: expOwnerId },
    });
    await prisma.user.create({
      data: {
        id: expOwnerId,
        email: 'exp.p12@bilzet.test',
        role: 'ADMIN',
        businessId: expBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p12-exp-01',
        userId: expOwnerId,
        planTier: 'PREMIUM',
        planName: 'Premium Enterprise',
        status: 'ACTIVE',
        endDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), // Expired 5 days ago
      },
    });
    expToken = generateToken({
      userId: expOwnerId,
      id: expOwnerId,
      email: 'exp.p12@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: expBizId,
    });
  });

  after(async () => {
    // Teardown
    await prisma.subscription.deleteMany({
      where: {
        userId: { in: [freeOwnerId, proOwnerId, premOwnerId, expOwnerId] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [freeOwnerId, proOwnerId, premOwnerId, expOwnerId] },
      },
    });
    await prisma.business.deleteMany({
      where: {
        id: { in: [freeBizId, proBizId, premBizId, expBizId] },
      },
    });
  });

  // ──────────────────────────────────────────────────────────
  // 1. PUBLIC PLAN COMPARISON ENDPOINT
  // ──────────────────────────────────────────────────────────
  test('GET /subscription/plans returns comparison catalog of Free, Pro, and Premium', async () => {
    const res = await fetch(`${baseUrl}/subscription/plans`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.data.plans));
    assert.equal(data.data.plans.length >= 3, true);

    const planTiers = data.data.plans.map((p) => p.tier);
    assert.ok(planTiers.includes('FREE'));
    assert.ok(planTiers.includes('PRO'));
    assert.ok(planTiers.includes('PREMIUM'));
    assert.ok(data.data.features.ca_connect);
    assert.equal(data.data.features.ca_connect.minPlan, 'PREMIUM');
  });

  // ──────────────────────────────────────────────────────────
  // 2. FREE PLAN ACCESS & RESTRICTIONS
  // ──────────────────────────────────────────────────────────
  test('Free user receives FREE plan status and 0 sub-user allowance', async () => {
    const res = await fetch(`${baseUrl}/subscription/status`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.planTier, 'FREE');
    assert.equal(data.data.usage.maxSeats, 0);
  });

  test('Free user is REJECTED (403) from CA Connect with upgrade prompt', async () => {
    const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PREMIUM');
    assert.match(data.message, /Premium plan|CA Connect/i);
  });

  test('Free user is REJECTED (403) from creating custom roles', async () => {
    const res = await fetch(`${baseUrl}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        name: 'Floor Supervisor',
        description: 'Test custom role',
        permissions: ['billing.view'],
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PREMIUM');
  });

  test('Free user is REJECTED (403) from creating sub-users due to seat limit', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        name: 'New Cashier',
        email: 'cashier.free@bilzet.test',
        password: 'Password123!',
        role: 'CASHIER',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.match(data.message, /sub-user limit/i);
  });

  // ──────────────────────────────────────────────────────────
  // 3. PRO PLAN ACCESS & RESTRICTIONS
  // ──────────────────────────────────────────────────────────
  test('Pro user receives PRO status and 5 sub-user allowance', async () => {
    const res = await fetch(`${baseUrl}/subscription/status`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.planTier, 'PRO');
    assert.equal(data.data.usage.maxSeats, 5);
  });

  test('Pro user CAN access Pro settings (Thermal 80mm, watermark removal, UPI details)', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proToken}`,
      },
      body: JSON.stringify({
        paperSize: 'Thermal 80mm',
        removeWatermark: true,
        showBankDetails: true,
        bankName: 'HDFC Bank Ltd',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.paperSize, 'Thermal 80mm');
  });

  test('Pro user is REJECTED (403) from CA Connect with Upgrade to Premium message', async () => {
    const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.requiredPlan, 'PREMIUM');
    assert.match(data.message, /Upgrade to Premium to access CA Connect/i);
  });

  test('Pro user is REJECTED (403) from Thermal 58mm and Custom HEX color', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proToken}`,
      },
      body: JSON.stringify({ paperSize: 'Thermal 58mm' }),
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.requiredPlan, 'PREMIUM');
  });

  // ──────────────────────────────────────────────────────────
  // 4. PREMIUM PLAN ACCESS
  // ──────────────────────────────────────────────────────────
  test('Premium user receives PREMIUM status and 15 sub-user allowance', async () => {
    const res = await fetch(`${baseUrl}/subscription/status`, {
      headers: { Authorization: `Bearer ${premToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.planTier, 'PREMIUM');
    assert.equal(data.data.usage.maxSeats, 15);
  });

  test('Premium user CAN access CA Connect portal without restriction', async () => {
    const res = await fetch(`${baseUrl}/ca-connect/status`, {
      headers: { Authorization: `Bearer ${premToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.isUnlocked, true);
    assert.equal(data.data.currentPlan, 'PREMIUM');
  });

  test('Premium user CAN configure Thermal 58mm and Custom Brand HEX colors', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${premToken}`,
      },
      body: JSON.stringify({
        paperSize: 'Thermal 58mm',
        customColor: '#10b981',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.paperSize, 'Thermal 58mm');
    assert.equal(data.data.settings.customColor, '#10b981');
  });

  // ──────────────────────────────────────────────────────────
  // 5. EXPIRED SUBSCRIPTION ENFORCEMENT
  // ──────────────────────────────────────────────────────────
  test('Expired subscription status resolves to EXPIRED and rejects protected features', async () => {
    const res = await fetch(`${baseUrl}/subscription/status`, {
      headers: { Authorization: `Bearer ${expToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.isExpired, true);
    assert.equal(data.data.status, 'EXPIRED');
    assert.equal(data.data.planTier, 'FREE');

    // Direct call to CA Connect must fail with expired message
    const caRes = await fetch(`${baseUrl}/ca-connect/accountants`, {
      headers: { Authorization: `Bearer ${expToken}` },
    });
    const caData = await caRes.json();

    assert.equal(caRes.status, 403);
    assert.match(caData.message, /expired/i);
  });

  // ──────────────────────────────────────────────────────────
  // 6. UPGRADE FLOW & PAYMENT IDEMPOTENCY
  // ──────────────────────────────────────────────────────────
  test('POST /subscription/upgrade upgrades Free user to PRO with immediate entitlement unlock', async () => {
    const txId = 'TXN-P12-UPGRADE-PRO-01';
    const res = await fetch(`${baseUrl}/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        planTier: 'PRO',
        amount: 1499,
        billingCycle: 'ANNUAL',
        paymentReference: txId,
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.planTier, 'PRO');

    // Verify subsequent status check now reflects PRO
    const statusRes = await fetch(`${baseUrl}/subscription/status`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusData.data.planTier, 'PRO');
    assert.equal(statusData.data.usage.maxSeats, 5);

    // Idempotency: Calling again with same paymentReference returns active sub without duplication
    const dupRes = await fetch(`${baseUrl}/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        planTier: 'PRO',
        amount: 1499,
        paymentReference: txId,
      }),
    });
    const dupData = await dupRes.json();
    assert.equal(dupRes.status, 200);
    assert.equal(dupData.data.planTier, 'PRO');
  });

  test('POST /subscription/cancel cancels subscription and revokes paid access while preserving data', async () => {
    const res = await fetch(`${baseUrl}/subscription/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.data.status, 'CANCELLED');
    assert.equal(data.data.planTier, 'FREE');

    // Verify user business data remains intact
    const biz = await prisma.business.findUnique({ where: { id: freeBizId } });
    assert.equal(biz.name, 'Free Retail Mart');
  });

  // ──────────────────────────────────────────────────────────
  // 7. ROLE PERMISSION INDEPENDENCE & STORE ISOLATION
  // ──────────────────────────────────────────────────────────
  test('Subscription tier does not bypass RBAC: Cashier in Premium store cannot delete users', async () => {
    const cashierId = 'user-p12-prem-cashier';
    await prisma.user.create({
      data: {
        id: cashierId,
        email: 'cashier.p12@bilzet.test',
        role: 'CASHIER',
        businessId: premBizId,
        isOwner: false,
        isActive: true,
      },
    });

    const cashierToken = generateToken({
      userId: cashierId,
      id: cashierId,
      email: 'cashier.p12@bilzet.test',
      role: 'CASHIER',
      permissions: ['billing.create'],
      businessId: premBizId,
    });

    // Attempting to delete a user should fail with 403 Forbidden because Cashier lacks permissions
    const res = await fetch(`${baseUrl}/users/${cashierId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${cashierToken}` },
    });

    assert.equal(res.status, 403);

    // Clean up created cashier
    await prisma.user.delete({ where: { id: cashierId } });
  });
});
