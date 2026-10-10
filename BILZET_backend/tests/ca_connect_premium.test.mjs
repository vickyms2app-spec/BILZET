import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import { requirePremiumPlan } from '../src/middleware/plan.middleware.mjs';

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

describe('PHASE 2: CA CONNECT PREMIUM ACCESS VALIDATION', () => {
  // Setup mock businesses and subscriptions in prisma / memory store
  const freeUserId = 'user-free-01';
  const freeBusinessId = 'biz-free-01';

  const proUserId = 'user-pro-01';
  const proBusinessId = 'biz-pro-01';

  const expiredPremiumUserId = 'user-premium-exp-01';
  const expiredPremiumBizId = 'biz-premium-exp-01';

  const activePremiumUserId = 'user-premium-01';
  const activePremiumBizId = 'biz-premium-01';

  before(async () => {
    // 1. Create Free business and user (no subscription or FREE subscription)
    await prisma.business.create({
      data: { id: freeBusinessId, name: 'Free Mart', ownerId: freeUserId },
    });
    await prisma.user.create({
      data: {
        id: freeUserId,
        email: 'free@bilzet.com',
        role: 'ADMIN',
        businessId: freeBusinessId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-free-01',
        userId: freeUserId,
        planTier: 'FREE',
        planName: 'Free Starter',
        status: 'ACTIVE',
      },
    });

    // 2. Create Pro business, user, and subscription
    await prisma.business.create({
      data: { id: proBusinessId, name: 'Pro Mart', ownerId: proUserId },
    });
    await prisma.user.create({
      data: {
        id: proUserId,
        email: 'pro@bilzet.com',
        role: 'ADMIN',
        businessId: proBusinessId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-pro-test-01',
        userId: proUserId,
        planTier: 'PRO',
        planName: 'Pro Annual',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    // 3. Create Expired Premium business, user, and subscription
    await prisma.business.create({
      data: { id: expiredPremiumBizId, name: 'Expired Mart', ownerId: expiredPremiumUserId },
    });
    await prisma.user.create({
      data: {
        id: expiredPremiumUserId,
        email: 'expired@bilzet.com',
        role: 'ADMIN',
        businessId: expiredPremiumBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-prem-exp-01',
        userId: expiredPremiumUserId,
        planTier: 'PREMIUM',
        planName: 'Premium Annual',
        status: 'ACTIVE',
        endDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), // 5 days in past
        expiresAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      },
    });

    // 4. Create Active Premium business, user, and subscription
    await prisma.business.create({
      data: { id: activePremiumBizId, name: 'Premium Mart', ownerId: activePremiumUserId },
    });
    await prisma.user.create({
      data: {
        id: activePremiumUserId,
        email: 'premium@bilzet.com',
        role: 'ADMIN',
        businessId: activePremiumBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-prem-act-01',
        userId: activePremiumUserId,
        planTier: 'PREMIUM',
        planName: 'Premium Annual',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
  });

  describe('1. Free User Access Verification', () => {
    test('Status endpoint confirms Free user is locked', async () => {
      const token = generateToken({ id: freeUserId, email: 'free@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.isUnlocked, false, 'Free user must be locked');
      assert.equal(json.data.currentPlan, 'FREE');
      assert.match(json.data.message, /exclusively with the Premium plan/i);
    });

    test('Free user cannot access CA Connect list (403 Forbidden)', async () => {
      const token = generateToken({ id: freeUserId, email: 'free@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 403, 'Free user must receive 403');
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
      assert.match(json.message, /exclusively with the Premium plan/i);
    });

    test('Free user cannot invite accountant directly (403 Forbidden)', async () => {
      const token = generateToken({ id: freeUserId, email: 'free@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'CA Ramesh', email: 'ramesh@ca.in' }),
      });
      assert.equal(res.status, 403, 'Free user invite must be blocked with 403');
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
    });
  });

  describe('2. Pro User Access Verification', () => {
    test('Status endpoint confirms Pro user is locked', async () => {
      const token = generateToken({ id: proUserId, email: 'pro@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.isUnlocked, false, 'Pro user must be locked');
      assert.equal(json.data.currentPlan, 'PRO');
      assert.match(json.data.message, /Upgrade to Premium to access CA Connect/i);
    });

    test('Pro user cannot access CA Connect list (403 Forbidden)', async () => {
      const token = generateToken({ id: proUserId, email: 'pro@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 403, 'Pro user must receive 403');
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
      assert.match(json.message, /Upgrade to Premium to access CA Connect/i);
    });

    test('Pro user cannot invite accountant directly (403 Forbidden)', async () => {
      const token = generateToken({ id: proUserId, email: 'pro@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'CA Suresh', email: 'suresh@ca.in' }),
      });
      assert.equal(res.status, 403, 'Pro user invite must be rejected with 403');
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
    });
  });

  describe('3. Expired Premium Subscription Verification', () => {
    test('Expired Premium user is locked out and rejected with 403', async () => {
      const token = generateToken({ id: expiredPremiumUserId, email: 'expired@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 403, 'Expired subscription must return 403');
      const json = await res.json();
      assert.equal(json.error, 'Premium subscription required');
      assert.match(json.message, /expired/i);
    });
  });

  describe('4. Active Premium User Full Access Verification', () => {
    test('Status endpoint confirms Active Premium user is unlocked', async () => {
      const token = generateToken({ id: activePremiumUserId, email: 'premium@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.isUnlocked, true, 'Active Premium user must be unlocked');
      assert.equal(json.data.currentPlan, 'PREMIUM');
    });

    test('Active Premium user can list connected accountants', async () => {
      const token = generateToken({ id: activePremiumUserId, email: 'premium@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 200, 'Premium user can list accountants');
      const json = await res.json();
      assert.ok(Array.isArray(json.data.accountants));
    });

    test('Active Premium user can invite a Chartered Accountant', async () => {
      const token = generateToken({ id: activePremiumUserId, email: 'premium@bilzet.com' });
      const res = await fetch(`${baseUrl}/ca-connect/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'CA Rajesh & Associates',
          email: 'rajesh@ca-audit.in',
          phone: '9840012345',
        }),
      });
      assert.equal(res.status, 201, 'Premium user can invite CA');
      const json = await res.json();
      assert.equal(json.data.accountant.name, 'CA Rajesh & Associates');
      assert.equal(json.data.accountant.email, 'rajesh@ca-audit.in');
    });
  });
});
