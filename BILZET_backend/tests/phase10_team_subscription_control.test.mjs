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

describe('PHASE 10: TEAM & SUBUSERS SUBSCRIPTION CONTROL', () => {
  const freeBizId = 'biz-p10-free';
  const freeOwnerId = 'user-p10-free-owner';

  const proBizId = 'biz-p10-pro';
  const proOwnerId = 'user-p10-pro-owner';

  const premBizId = 'biz-p10-prem';
  const premOwnerId = 'user-p10-prem-owner';

  const expBizId = 'biz-p10-exp';
  const expOwnerId = 'user-p10-exp-owner';

  let freeToken;
  let proToken;
  let premToken;
  let expToken;

  let proSubUserId;
  let premSubUserId;
  let customRoleId;

  before(async () => {
    // 1. FREE BUSINESS & OWNER
    await prisma.business.create({
      data: { id: freeBizId, name: 'Free Tier Mart', ownerId: freeOwnerId },
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
    freeToken = generateToken({
      userId: freeOwnerId,
      id: freeOwnerId,
      email: 'free.owner@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: freeBizId,
    });

    // 2. PRO BUSINESS & OWNER (PRO SUBSCRIPTION, 5 SEATS)
    await prisma.business.create({
      data: { id: proBizId, name: 'Pro Tier Mart', ownerId: proOwnerId },
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
        id: 'sub-p10-pro-01',
        userId: proOwnerId,
        planTier: 'PRO',
        planName: 'Pro Annual',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    proToken = generateToken({
      userId: proOwnerId,
      id: proOwnerId,
      email: 'pro.owner@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: proBizId,
    });

    // 3. PREMIUM BUSINESS & OWNER (PREMIUM SUBSCRIPTION, 15 SEATS)
    await prisma.business.create({
      data: { id: premBizId, name: 'Premium Tier Mart', ownerId: premOwnerId },
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
    await prisma.subscription.create({
      data: {
        id: 'sub-p10-prem-01',
        userId: premOwnerId,
        planTier: 'PREMIUM',
        planName: 'Premium Annual',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });
    premToken = generateToken({
      userId: premOwnerId,
      id: premOwnerId,
      email: 'prem.owner@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: premBizId,
    });

    // 4. EXPIRED BUSINESS & OWNER (EXPIRED SUBSCRIPTION)
    await prisma.business.create({
      data: { id: expBizId, name: 'Expired Tier Mart', ownerId: expOwnerId },
    });
    await prisma.user.create({
      data: {
        id: expOwnerId,
        email: 'exp.owner@bilzet.test',
        role: 'ADMIN',
        businessId: expBizId,
        isOwner: true,
        isActive: true,
      },
    });
    // Create pre-existing team member before expiration
    await prisma.user.create({
      data: {
        id: 'user-p10-exp-member1',
        email: 'exp.cashier@bilzet.test',
        name: 'Historical Cashier',
        role: 'CASHIER',
        businessId: expBizId,
        isOwner: false,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p10-exp-01',
        userId: expOwnerId,
        planTier: 'PREMIUM',
        planName: 'Premium Expired',
        status: 'EXPIRED',
        endDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), // Expired 5 days ago
      },
    });
    expToken = generateToken({
      userId: expOwnerId,
      id: expOwnerId,
      email: 'exp.owner@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: expBizId,
    });
  });

  describe('1. Free User Entitlements and Restrictions', () => {
    test('Free user can view team members list and see Free tier usage (0 max seats)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${freeToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.usage.planTier, 'FREE');
      assert.equal(json.data.usage.maxSeats, 0);
      assert.equal(json.data.usage.canAddUser, false);
      assert.equal(json.data.users.length, 1); // Only the owner
    });

    test('Free user cannot add sub-users (rejected with 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freeToken}`,
        },
        body: JSON.stringify({
          name: 'Free Staff Attempt',
          email: 'free.attempt@bilzet.test',
          role: 'STAFF',
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.message, /sub-user limit|Upgrade your plan/i);
    });

    test('Free user cannot create custom roles (rejected with 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freeToken}`,
        },
        body: JSON.stringify({
          name: 'Custom Auditor',
          description: 'Auditor role',
          permissionKeys: ['reports.view'],
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.error, /subscription required/i);
    });
  });

  describe('2. Pro User Entitlements and Restrictions', () => {
    test('Pro user can view team usage with 5 max seats', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${proToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.usage.planTier, 'PRO');
      assert.equal(json.data.usage.maxSeats, 5);
      assert.equal(json.data.usage.canAddUser, true);
    });

    test('Pro user can add standard sub-user (Manager / Cashier / Staff)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`,
        },
        body: JSON.stringify({
          name: 'Pro Cashier One',
          email: 'pro.cashier1@bilzet.test',
          role: 'CASHIER',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.email, 'pro.cashier1@bilzet.test');
      assert.equal(json.data.user.role, 'CASHIER');
      proSubUserId = json.data.user.id;
    });

    test('Pro user cannot create custom roles (requires Premium)', async () => {
      const res = await fetch(`${baseUrl}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`,
        },
        body: JSON.stringify({
          name: 'Pro Custom Role',
          permissionKeys: ['pos.view'],
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.requiredPlan, 'PREMIUM');
      assert.match(json.message, /upgrade to PREMIUM|Premium subscription required/i);
    });

    test('Pro user cannot update granular permission overrides (requires Premium)', async () => {
      const res = await fetch(`${baseUrl}/users/${proSubUserId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`,
        },
        body: JSON.stringify({
          overrides: [{ permissionId: 'perm-01', key: 'pos.view', allowed: false }],
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.requiredPlan, 'PREMIUM');
      assert.match(json.message, /upgrade to PREMIUM|Premium subscription required/i);
    });

    test('Pro user cannot bypass restrictions by sending customRoleId or overrides in user creation', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`,
        },
        body: JSON.stringify({
          name: 'Pro Bypass Attempt',
          email: 'pro.bypass@bilzet.test',
          role: 'CASHIER',
          customRoleId: 'fake-custom-role',
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.message, /Custom roles and granular permission overrides require an active Premium subscription/i);
    });

    test('Pro seat limit enforcement: fill remaining seats to 5, then 6th is rejected with 403', async () => {
      // Add 4 more sub-users to reach 5 used seats
      for (let i = 2; i <= 5; i++) {
        const createRes = await fetch(`${baseUrl}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${proToken}`,
          },
          body: JSON.stringify({
            name: `Pro Staff ${i}`,
            email: `pro.staff${i}@bilzet.test`,
            role: 'STAFF',
          }),
        });
        assert.equal(createRes.status, 201, `Staff ${i} should be created successfully`);
      }

      // Verify usage is 5/5
      const usageRes = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${proToken}` },
      });
      const usageJson = await usageRes.json();
      assert.equal(usageJson.data.usage.usedSeats, 5);
      assert.equal(usageJson.data.usage.remainingSeats, 0);
      assert.equal(usageJson.data.usage.canAddUser, false);

      // Attempt 6th sub-user
      const sixthRes = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`,
        },
        body: JSON.stringify({
          name: 'Pro Staff 6 Overflow',
          email: 'pro.staff6@bilzet.test',
          role: 'STAFF',
        }),
      });
      assert.equal(sixthRes.status, 403, '6th user must be blocked by seat limit');
      const sixthJson = await sixthRes.json();
      assert.match(sixthJson.message, /sub-user limit \(5\/5 seats used\)/i);
    });
  });

  describe('3. Premium User Entitlements', () => {
    test('Premium user can view team usage with 15 max seats', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${premToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.usage.planTier, 'PREMIUM');
      assert.equal(json.data.usage.maxSeats, 15);
      assert.equal(json.data.usage.canAddUser, true);
    });

    test('Premium user can create a custom role', async () => {
      const res = await fetch(`${baseUrl}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${premToken}`,
        },
        body: JSON.stringify({
          name: 'Floor Supervisor',
          description: 'Special floor management role',
          permissionKeys: ['pos.view', 'pos.create'],
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.role.name, 'Floor Supervisor');
      customRoleId = json.data.role.id;
    });

    test('Premium user can add sub-user with custom role assigned', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${premToken}`,
        },
        body: JSON.stringify({
          name: 'Prem Supervisor User',
          email: 'prem.supervisor@bilzet.test',
          role: 'STAFF',
          customRoleId: customRoleId,
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      premSubUserId = json.data.user.id;
    });

    test('Premium user can update granular permission overrides', async () => {
      const res = await fetch(`${baseUrl}/users/${premSubUserId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${premToken}`,
        },
        body: JSON.stringify({
          overrides: [
            { key: 'reports.view', allowed: true },
          ],
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
    });
  });

  describe('4. Subscription Expiration and Data Preservation', () => {
    test('Expired subscription safely downgrades active entitlements to Free (0 max seats)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${expToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.usage.planTier, 'FREE', 'Effective tier must fall back to FREE');
      assert.equal(json.data.usage.status, 'EXPIRED');
      assert.equal(json.data.usage.isExpired, true);
      assert.equal(json.data.usage.canAddUser, false);
      // Existing team members must remain intact!
      assert.equal(json.data.users.length, 2, 'Historical owner and member must remain intact');
    });

    test('Expired user cannot add new sub-users (rejected with 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expToken}`,
        },
        body: JSON.stringify({
          name: 'Expired Add Attempt',
          email: 'exp.attempt@bilzet.test',
          role: 'STAFF',
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.message, /sub-user limit|Upgrade your plan/i);
    });

    test('Expired user cannot create custom roles (rejected with 403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expToken}`,
        },
        body: JSON.stringify({
          name: 'Expired Custom Role Attempt',
          permissionKeys: ['pos.view'],
        }),
      });
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.match(json.message, /subscription has expired|subscription required/i);
    });

    test('Expired user historical data and permissions remain queryable without corruption', async () => {
      const res = await fetch(`${baseUrl}/users/user-p10-exp-member1`, {
        headers: { Authorization: `Bearer ${expToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.user.name, 'Historical Cashier');
      assert.equal(json.data.user.role, 'CASHIER');
    });
  });
});
