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

describe('PHASE 14: CA CONNECT PREMIUM ACCESS VERIFICATION', () => {
  const freeBizId = 'biz-p14-free';
  const freeOwnerId = 'user-p14-free-owner';

  const proBizId = 'biz-p14-pro';
  const proOwnerId = 'user-p14-pro-owner';

  const premBizId = 'biz-p14-prem';
  const premOwnerId = 'user-p14-prem-owner';
  const premCashierId = 'user-p14-prem-cashier';

  const storeBPremiumBizId = 'biz-p14-prem-storeB';
  const storeBPremiumOwnerId = 'user-p14-prem-ownerB';

  let freeToken;
  let proToken;
  let premToken;
  let premCashierToken;
  let storeBToken;

  before(async () => {
    // 1. FREE BUSINESS & USER
    await prisma.business.create({
      data: { id: freeBizId, name: 'Free Retail Mart', ownerId: freeOwnerId },
    });
    await prisma.user.create({
      data: {
        id: freeOwnerId,
        email: 'free.owner@bilzet.test',
        role: 'ADMIN',
        businessId: freeBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p14-free',
        userId: freeOwnerId,
        businessId: freeBizId,
        planTier: 'FREE',
        planName: 'Free Starter',
        status: 'ACTIVE',
      },
    });

    // 2. PRO BUSINESS & USER
    await prisma.business.create({
      data: { id: proBizId, name: 'Pro Enterprise', ownerId: proOwnerId },
    });
    await prisma.user.create({
      data: {
        id: proOwnerId,
        email: 'pro.owner@bilzet.test',
        role: 'ADMIN',
        businessId: proBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p14-pro',
        userId: proOwnerId,
        businessId: proBizId,
        planTier: 'PRO',
        planName: 'Pro Tier',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    // 3. PREMIUM BUSINESS, ADMIN, & CASHIER
    await prisma.business.create({
      data: { id: premBizId, name: 'Premium Superstore Store A', ownerId: premOwnerId },
    });
    await prisma.user.create({
      data: {
        id: premOwnerId,
        email: 'prem.owner@bilzet.test',
        role: 'ADMIN',
        businessId: premBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.user.create({
      data: {
        id: premCashierId,
        email: 'prem.cashier@bilzet.test',
        role: 'CASHIER',
        businessId: premBizId,
        isOwner: false,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p14-prem',
        userId: premOwnerId,
        businessId: premBizId,
        planTier: 'PREMIUM',
        planName: 'Premium Enterprise',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    // 4. SECOND PREMIUM BUSINESS FOR STORE ISOLATION
    await prisma.business.create({
      data: { id: storeBPremiumBizId, name: 'Premium Store B', ownerId: storeBPremiumOwnerId },
    });
    await prisma.user.create({
      data: {
        id: storeBPremiumOwnerId,
        email: 'prem.ownerB@bilzet.test',
        role: 'ADMIN',
        businessId: storeBPremiumBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p14-prem-b',
        userId: storeBPremiumOwnerId,
        businessId: storeBPremiumBizId,
        planTier: 'PREMIUM',
        planName: 'Premium Enterprise',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    freeToken = generateToken({
      id: freeOwnerId,
      email: 'free.owner@bilzet.test',
      role: 'ADMIN',
      businessId: freeBizId,
      isOwner: true,
      isActive: true,
    });

    proToken = generateToken({
      id: proOwnerId,
      email: 'pro.owner@bilzet.test',
      role: 'ADMIN',
      businessId: proBizId,
      isOwner: true,
      isActive: true,
    });

    premToken = generateToken({
      id: premOwnerId,
      email: 'prem.owner@bilzet.test',
      role: 'ADMIN',
      businessId: premBizId,
      isOwner: true,
      isActive: true,
    });

    premCashierToken = generateToken({
      id: premCashierId,
      email: 'prem.cashier@bilzet.test',
      role: 'CASHIER',
      businessId: premBizId,
      isOwner: false,
      isActive: true,
    });

    storeBToken = generateToken({
      id: storeBPremiumOwnerId,
      email: 'prem.ownerB@bilzet.test',
      role: 'ADMIN',
      businessId: storeBPremiumBizId,
      isOwner: true,
      isActive: true,
    });
  });

  // ──────────────────────────────────────────────────────────
  // 1. FREE USER VERIFICATION
  // ──────────────────────────────────────────────────────────
  describe('1. Free User Access Restrictions', () => {
    test('Status endpoint reports CA Connect is locked with upgrade prompt', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/status`, {
        headers: { Authorization: `Bearer ${freeToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.isUnlocked, false);
      assert.equal(json.data.currentPlan, 'FREE');
      assert.equal(json.data.requiredPlan, 'PREMIUM');
      assert.match(json.data.message, /exclusively with the Premium plan/i);
    });

    test('Direct API access to list accountants returns 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${freeToken}` },
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
      assert.equal(json.requiredPlan, 'PREMIUM');
    });

    test('Direct API access to invite accountant returns 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freeToken}`,
        },
        body: JSON.stringify({
          name: 'CA Sharma',
          email: 'sharma@ca.in',
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. PRO USER VERIFICATION
  // ──────────────────────────────────────────────────────────
  describe('2. Pro User Access Restrictions (Strict Premium Gate)', () => {
    test('Status endpoint reports CA Connect is locked for Pro with upgrade prompt', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/status`, {
        headers: { Authorization: `Bearer ${proToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.isUnlocked, false);
      assert.equal(json.data.currentPlan, 'PRO');
      assert.equal(json.data.requiredPlan, 'PREMIUM');
      assert.match(json.data.message, /Upgrade to Premium to access CA Connect/i);
    });

    test('Pro user cannot bypass gate to access accountants endpoint (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${proToken}` },
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
      assert.equal(json.currentPlan, 'PRO');
      assert.equal(json.requiredPlan, 'PREMIUM');
    });

    test('Pro user cannot invite accountant directly via API (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`,
        },
        body: JSON.stringify({
          name: 'CA Verma & Co',
          email: 'verma@auditca.test',
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. PREMIUM USER FULL OPERATIONAL ACCESS
  // ──────────────────────────────────────────────────────────
  describe('3. Active Premium User Full Operational Access', () => {
    let createdAccountantId;

    test('Status endpoint confirms Premium user is unlocked', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/status`, {
        headers: { Authorization: `Bearer ${premToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.isUnlocked, true);
      assert.equal(json.data.currentPlan, 'PREMIUM');
    });

    test('Premium user can invite a Chartered Accountant', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${premToken}`,
        },
        body: JSON.stringify({
          name: 'CA Karthikeyan & Associates',
          email: 'karthi.ca@audit.test',
          phone: '+91 9840112233',
          notes: 'Quarterly tax auditor',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.accountant.name, 'CA Karthikeyan & Associates');
      assert.equal(json.data.accountant.email, 'karthi.ca@audit.test');
      createdAccountantId = json.data.accountant.id;
    });

    test('Premium user can list connected accountants', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${premToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.accountants));
      const found = json.data.accountants.find((a) => a.id === createdAccountantId);
      assert.ok(found, 'Created accountant must appear in connected list');
    });

    test('Premium user can revoke access for an accountant', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/${createdAccountantId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${premToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      // Verify removed from list
      const listRes = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${premToken}` },
      });
      const listJson = await listRes.json();
      assert.ok(!listJson.data.accountants.some((a) => a.id === createdAccountantId));
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. SUBSCRIPTION LIFECYCLE & STATE TRANSITIONS
  // ──────────────────────────────────────────────────────────
  describe('4. Subscription State Transitions & Non-Destructive Downgrades', () => {
    const lifecycleBizId = 'biz-p14-lifecycle';
    const lifecycleOwnerId = 'user-p14-lifecycle-owner';
    let lifecycleToken;
    let savedAccountantId;

    before(async () => {
      await prisma.business.create({
        data: { id: lifecycleBizId, name: 'Lifecycle Tech Mart', ownerId: lifecycleOwnerId },
      });
      await prisma.user.create({
        data: {
          id: lifecycleOwnerId,
          email: 'lifecycle@bilzet.test',
          role: 'ADMIN',
          businessId: lifecycleBizId,
          isOwner: true,
          isActive: true,
        },
      });
      // Start with active Premium subscription
      await prisma.subscription.create({
        data: {
          id: 'sub-p14-lifecycle',
          userId: lifecycleOwnerId,
          businessId: lifecycleBizId,
          planTier: 'PREMIUM',
          planName: 'Premium Enterprise',
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
      });

      lifecycleToken = generateToken({
        id: lifecycleOwnerId,
        email: 'lifecycle@bilzet.test',
        role: 'ADMIN',
        businessId: lifecycleBizId,
        isOwner: true,
        isActive: true,
      });

      // Create an accountant under Premium
      const inviteRes = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lifecycleToken}`,
        },
        body: JSON.stringify({
          name: 'CA Auditor LifeCycle',
          email: 'auditor.lifecycle@test.com',
        }),
      });
      const inviteJson = await inviteRes.json();
      savedAccountantId = inviteJson.data.accountant.id;
    });

    test('Expired Premium subscription is locked out (403 Forbidden)', async () => {
      // Simulate expiration
      await prisma.subscription.update({
        where: { id: 'sub-p14-lifecycle' },
        data: {
          endDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
          expiresAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        },
      });

      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${lifecycleToken}` },
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.message, /expired/i);
    });

    test('Cancelled Premium subscription is locked out (403 Forbidden)', async () => {
      // Set status to CANCELLED
      await prisma.subscription.update({
        where: { id: 'sub-p14-lifecycle' },
        data: {
          status: 'CANCELLED',
          endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
      });

      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${lifecycleToken}` },
      });
      assert.equal(res.status, 403);
    });

    test('Pending or Failed payment subscription is locked out (403 Forbidden)', async () => {
      await prisma.subscription.update({
        where: { id: 'sub-p14-lifecycle' },
        data: { status: 'PENDING' },
      });

      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${lifecycleToken}` },
      });
      assert.equal(res.status, 403);
    });

    test('Downgrade to Pro restricts CA Connect without deleting existing CA records', async () => {
      // Downgrade to PRO
      await prisma.subscription.update({
        where: { id: 'sub-p14-lifecycle' },
        data: {
          planTier: 'PRO',
          planName: 'Pro Tier',
          status: 'ACTIVE',
        },
      });

      // API access should now be blocked
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${lifecycleToken}` },
      });
      assert.equal(res.status, 403);

      // Verify historical CA records remain completely intact in database
      const caRecord = await prisma.staff.findUnique({
        where: { id: savedAccountantId },
      });
      assert.ok(caRecord, 'Existing CA records must NOT be deleted upon downgrade');
      assert.equal(caRecord.email, 'auditor.lifecycle@test.com');
    });

    test('Re-upgrade to Premium restores full access immediately', async () => {
      // Upgrade back to PREMIUM
      await prisma.subscription.update({
        where: { id: 'sub-p14-lifecycle' },
        data: {
          planTier: 'PREMIUM',
          planName: 'Premium Enterprise',
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        },
      });

      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${lifecycleToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.accountants.some((a) => a.id === savedAccountantId));
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. SECURITY, RBAC & MULTI-STORE DATA ISOLATION
  // ──────────────────────────────────────────────────────────
  describe('5. RBAC Permissions & Store Isolation within Premium Tiers', () => {
    let storeBAcctId;

    before(async () => {
      // Store B invites an accountant
      const bRes = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeBToken}`,
        },
        body: JSON.stringify({
          name: 'CA Bengaluru Advisor',
          email: 'bengaluru.ca@audit.test',
        }),
      });
      const bJson = await bRes.json();
      storeBAcctId = bJson.data.accountant.id;
    });

    test('Unauthorized role (Cashier) under Premium business cannot access CA Connect (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${premCashierToken}` },
      });
      assert.equal(res.status, 403, 'Cashier must be blocked by role permissions');
    });

    test('Cashier under Premium cannot invite accountant (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${premCashierToken}`,
        },
        body: JSON.stringify({
          name: 'Hacked CA',
          email: 'hacked@ca.test',
        }),
      });
      assert.equal(res.status, 403, 'Cashier must be blocked from inviting CAs');
    });

    test('Store A cannot view Store B connected accountants (Store Isolation)', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${premToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      const hasStoreB = json.data.accountants.some((a) => a.id === storeBAcctId);
      assert.equal(hasStoreB, false, 'Store A must never see Store B accountants');
    });

    test('Store A cannot revoke Store B accountant (IDOR Protection)', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/${storeBAcctId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${premToken}` },
      });
      // Should return 404 Not Found because accountant belongs to Store B
      assert.equal(res.status, 404);
    });
  });
});
