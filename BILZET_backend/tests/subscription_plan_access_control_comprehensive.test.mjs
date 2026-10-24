import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import { isFeatureAllowedByTier, FEATURE_ENTITLEMENTS } from '../src/config/plans.config.mjs';

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

describe('COMPREHENSIVE SUBSCRIPTION PLAN ACCESS CONTROL & FEATURE ENTITLEMENTS', () => {
  const freeBizId = 'biz-ac-free';
  const freeOwnerId = 'user-ac-free-owner';

  const proBizId = 'biz-ac-pro';
  const proOwnerId = 'user-ac-pro-owner';

  const premBizId = 'biz-ac-prem';
  const premOwnerId = 'user-ac-prem-owner';

  const expBizId = 'biz-ac-exp';
  const expOwnerId = 'user-ac-exp-owner';

  let freeToken;
  let proToken;
  let premToken;
  let expToken;

  before(async () => {
    // Clean test data
    await prisma.subscription.deleteMany({
      where: { userId: { in: [freeOwnerId, proOwnerId, premOwnerId, expOwnerId] } },
    }).catch(() => {});

    await prisma.roleInvitation.deleteMany({
      where: { businessId: { in: [freeBizId, proBizId, premBizId, expBizId] } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { id: { in: [freeOwnerId, proOwnerId, premOwnerId, expOwnerId] } },
    }).catch(() => {});

    await prisma.business.deleteMany({
      where: { id: { in: [freeBizId, proBizId, premBizId, expBizId] } },
    }).catch(() => {});

    // 1. FREE USER & BUSINESS (No subscription record, pure Free tier)
    await prisma.business.create({
      data: { id: freeBizId, name: 'Free Mart', ownerId: freeOwnerId },
    });
    await prisma.user.create({
      data: {
        id: freeOwnerId,
        email: 'free.ac@bilzet.test',
        role: 'ADMIN',
        businessId: freeBizId,
        isOwner: true,
        isActive: true,
      },
    });
    freeToken = generateToken({
      userId: freeOwnerId,
      id: freeOwnerId,
      email: 'free.ac@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: freeBizId,
    });

    // 2. PRO USER & BUSINESS
    await prisma.business.create({
      data: { id: proBizId, name: 'Pro Mart', ownerId: proOwnerId },
    });
    await prisma.user.create({
      data: {
        id: proOwnerId,
        email: 'pro.ac@bilzet.test',
        role: 'ADMIN',
        businessId: proBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-ac-pro-01',
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
      email: 'pro.ac@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: proBizId,
    });

    // 3. PREMIUM USER & BUSINESS
    await prisma.business.create({
      data: { id: premBizId, name: 'Premium Mart', ownerId: premOwnerId },
    });
    await prisma.user.create({
      data: {
        id: premOwnerId,
        email: 'prem.ac@bilzet.test',
        role: 'ADMIN',
        businessId: premBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-ac-prem-01',
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
      email: 'prem.ac@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: premBizId,
    });

    // 4. EXPIRED SUBSCRIPTION USER & BUSINESS
    await prisma.business.create({
      data: { id: expBizId, name: 'Expired Mart', ownerId: expOwnerId },
    });
    await prisma.user.create({
      data: {
        id: expOwnerId,
        email: 'exp.ac@bilzet.test',
        role: 'ADMIN',
        businessId: expBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-ac-exp-01',
        userId: expOwnerId,
        planTier: 'PREMIUM',
        planName: 'Premium Enterprise',
        status: 'ACTIVE',
        endDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), // 5 days ago
      },
    });
    expToken = generateToken({
      userId: expOwnerId,
      id: expOwnerId,
      email: 'exp.ac@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: expBizId,
    });
  });

  after(async () => {
    await prisma.subscription.deleteMany({
      where: { userId: { in: [freeOwnerId, proOwnerId, premOwnerId, expOwnerId] } },
    }).catch(() => {});
    await prisma.roleInvitation.deleteMany({
      where: { businessId: { in: [freeBizId, proBizId, premBizId, expBizId] } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [freeOwnerId, proOwnerId, premOwnerId, expOwnerId] } },
    }).catch(() => {});
    await prisma.business.deleteMany({
      where: { id: { in: [freeBizId, proBizId, premBizId, expBizId] } },
    }).catch(() => {});
  });

  // Scenario 1 & 2: Plan Entitlement Matrix Validation
  test('Scenario 1 & 2: Entitlement matrix disallows premium/pro features for Free and allows appropriately for Pro & Premium', () => {
    // Free checks
    assert.equal(isFeatureAllowedByTier('ca_connect', 'FREE', true), false);
    assert.equal(isFeatureAllowedByTier('custom_roles', 'FREE', true), false);
    assert.equal(isFeatureAllowedByTier('online_orders', 'FREE', true), false);
    assert.equal(isFeatureAllowedByTier('sms_campaigns', 'FREE', true), false);
    assert.equal(isFeatureAllowedByTier('gst_filing', 'FREE', true), false);

    // Pro checks
    assert.equal(isFeatureAllowedByTier('online_orders', 'PRO', true), true);
    assert.equal(isFeatureAllowedByTier('sms_campaigns', 'PRO', true), true);
    assert.equal(isFeatureAllowedByTier('gst_filing', 'PRO', true), true);
    assert.equal(isFeatureAllowedByTier('ca_connect', 'PRO', true), false);
    assert.equal(isFeatureAllowedByTier('custom_roles', 'PRO', true), false);

    // Premium checks
    assert.equal(isFeatureAllowedByTier('ca_connect', 'PREMIUM', true), true);
    assert.equal(isFeatureAllowedByTier('custom_roles', 'PREMIUM', true), true);
    assert.equal(isFeatureAllowedByTier('online_orders', 'PREMIUM', true), true);
  });

  // Scenario 3: Free users cannot access premium backend APIs directly
  test('Scenario 3: Free user receives HTTP 403 when calling premium and pro backend APIs', async () => {
    // CA Connect
    const caRes = await fetch(`${baseUrl}/ca-connect/accountants`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(caRes.status, 403);
    const caData = await caRes.json();
    assert.equal(caData.statusCode, 403);

    // Online Orders
    const orderRes = await fetch(`${baseUrl}/online-orders`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(orderRes.status, 403);

    // SMS Campaigns
    const smsRes = await fetch(`${baseUrl}/sms-campaigns`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(smsRes.status, 403);

    // Profit Report
    const profitRes = await fetch(`${baseUrl}/reports/profit`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(profitRes.status, 403);

    // Sub-user seat limit check (Free has 0 seats)
    const inviteRes = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        email: 'staff1@bilzet.test',
        role: 'STAFF',
      }),
    });
    assert.equal(inviteRes.status, 403);
    const inviteData = await inviteRes.json();
    assert.match(inviteData.message || inviteData.error, /sub-user limit/i);
  });

  // Scenario 4: Paid users (PRO) can access features included in their active plan
  test('Scenario 4: Paid PRO user can access online-orders, sms-campaigns, and profit reports', async () => {
    const orderRes = await fetch(`${baseUrl}/online-orders`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    assert.equal(orderRes.status, 200);

    const smsRes = await fetch(`${baseUrl}/sms-campaigns`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    assert.equal(smsRes.status, 200);

    const profitRes = await fetch(`${baseUrl}/reports/profit`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    assert.equal(profitRes.status, 200);

    const usageRes = await fetch(`${baseUrl}/subscription/usage`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    const usageData = await usageRes.json();
    assert.equal(usageData.data.maxSeats, 5);
    assert.equal(usageData.data.canAddUser, true);
  });

  // Scenario 5: Paid PRO user cannot access features exclusive to Premium tier
  test('Scenario 5: Paid PRO user receives HTTP 403 for CA Connect and Custom Roles', async () => {
    const caRes = await fetch(`${baseUrl}/ca-connect/accountants`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    assert.equal(caRes.status, 403);
    const caData = await caRes.json();
    assert.match(caData.message, /Upgrade to Premium/);

    const roleRes = await fetch(`${baseUrl}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proToken}`,
      },
      body: JSON.stringify({
        name: 'Supervisor',
        permissionKeys: ['billing.create'],
      }),
    });
    assert.equal(roleRes.status, 403);
  });

  // Scenario 6: Expired subscriptions lose premium access
  test('Scenario 6: Expired subscription resolves to EXPIRED and rejects protected features with 403', async () => {
    const statusRes = await fetch(`${baseUrl}/subscription/status`, {
      headers: { Authorization: `Bearer ${expToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusData.data.isExpired, true);
    assert.equal(statusData.data.status, 'EXPIRED');

    const caRes = await fetch(`${baseUrl}/ca-connect/accountants`, {
      headers: { Authorization: `Bearer ${expToken}` },
    });
    assert.equal(caRes.status, 403);
    const caData = await caRes.json();
    assert.match(caData.message, /expired/i);
  });

  // Scenario 7: Valid upgrades grant the newly purchased entitlements immediately
  test('Scenario 7: Upgrading Free user unlocks PRO entitlements immediately', async () => {
    const upRes = await fetch(`${baseUrl}/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        planTier: 'PRO',
        amount: 1499,
        paymentReference: `PAY-UP-${Date.now()}`,
      }),
    });
    assert.equal(upRes.status, 200);
    const upData = await upRes.json();
    assert.equal(upData.data.planTier, 'PRO');
    assert.equal(upData.data.isActive, true);

    // Online orders should now be accessible immediately
    const orderRes = await fetch(`${baseUrl}/online-orders`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(orderRes.status, 200);
  });

  // Scenario 8: Downgrades / cancellations remove features
  test('Scenario 8: Cancelling subscription revokes paid tier to FREE and restores 403 locks', async () => {
    const cancelRes = await fetch(`${baseUrl}/subscription/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(cancelRes.status, 200);
    const cancelData = await cancelRes.json();
    assert.equal(cancelData.data.status, 'CANCELLED');
    assert.equal(cancelData.data.planTier, 'FREE');

    // Online orders must now be rejected with 403
    const orderRes = await fetch(`${baseUrl}/online-orders`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(orderRes.status, 403);
  });

  // Scenario 9: Subscription status is reflected dynamically
  test('Scenario 9: GET /subscription/status accurately reflects current state without relogin', async () => {
    const statusRes = await fetch(`${baseUrl}/subscription/status`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.data.planTier, 'FREE');
    assert.equal(statusData.data.status, 'CANCELLED');
  });

  // Scenario 10: Existing authentication, billing, invoices, products, and inventory work uninterrupted on Free plan
  test('Scenario 10: Standard Free plan features (POS billing, Invoices, Products, Inventory, Sales reports) function smoothly', async () => {
    // Products
    const prodRes = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(prodRes.status, 200);

    // Sales reports (sales/daily is included in Free)
    const salesRes = await fetch(`${baseUrl}/reports/sales/daily`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(salesRes.status, 200);

    // Invoices list
    const invRes = await fetch(`${baseUrl}/sales`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    assert.equal(invRes.status, 200);
  });
});
