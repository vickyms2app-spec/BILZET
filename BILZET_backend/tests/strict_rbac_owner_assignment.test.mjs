import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import app from '../src/app.mjs';
import prisma from '../src/config/prisma.mjs';
import { register } from '../src/services/auth.service.mjs';
import { getEffectivePermissions } from '../src/services/permission.service.mjs';

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

describe('STRICT RBAC & BUSINESS OWNER ROLE ASSIGNMENT SUITE', () => {
  const timestamp = Date.now();
  const standaloneEmail = `standalone_${timestamp}@test.bilzet.com`;
  const ownerEmail = `owner_${timestamp}@test.bilzet.com`;
  const invitedEmail = `invited_${timestamp}@test.bilzet.com`;
  const password = 'Password@1234';

  let standaloneToken = null;
  let standaloneUserId = null;

  let ownerToken = null;
  let ownerUserId = null;
  let ownerBusinessId = null;

  let invitedToken = null;
  let invitedUserId = null;
  let rawInviteToken = null;

  after(async () => {
    // Cleanup created test records
    try {
      await prisma.businessMember.deleteMany({
        where: {
          user: {
            email: { in: [standaloneEmail, ownerEmail, invitedEmail] },
          },
        },
      });
      await prisma.roleInvitation.deleteMany({
        where: {
          recipientEmail: { in: [standaloneEmail, ownerEmail, invitedEmail] },
        },
      });
      if (ownerBusinessId) {
        await prisma.business.deleteMany({ where: { id: ownerBusinessId } });
      }
      await prisma.user.deleteMany({
        where: { email: { in: [standaloneEmail, ownerEmail, invitedEmail] } },
      });
    } catch (_) {}
  });

  test('1. Standalone user registers without invitation -> gets role NONE, isOwner false, businessId null', async () => {
    const regRes = await register({
      name: 'Unassigned User',
      email: standaloneEmail,
      phone: '+91 9123456780',
      password,
      country: 'India',
      state: 'Tamil Nadu',
    });

    assert.ok(regRes.accessToken, 'Access token generated');
    assert.ok(regRes.user, 'User object returned');
    assert.equal(regRes.user.role, 'NONE', 'Role must be NONE for unassigned standalone user');
    assert.equal(regRes.user.isOwner, false, 'isOwner must be false');
    assert.equal(regRes.user.businessId, null, 'businessId must be null');

    standaloneToken = regRes.accessToken;
    standaloneUserId = regRes.user.id;

    // Verify DB record
    const dbUser = await prisma.user.findUnique({ where: { id: standaloneUserId } });
    assert.equal(dbUser.role, 'NONE');
    assert.equal(dbUser.isOwner, false);
    assert.equal(dbUser.businessId, null);
  });

  test('2. User with role NONE receives 0 permissions in effective permissions set', async () => {
    const effectivePerms = await getEffectivePermissions(standaloneUserId);
    assert.equal(effectivePerms.size, 0, 'Unassigned user must receive exactly 0 permissions');
  });

  test('3. User with role NONE is rejected with 403 Forbidden when accessing protected store APIs', async () => {
    // Attempting to list products without store assignment / permissions
    const res = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${standaloneToken}` },
    });
    assert.equal(res.status, 403, 'Must return 403 Forbidden for user with role NONE');
    const data = await res.json();
    assert.equal(data.success, false);
  });

  test('4. Onboarding status for unassigned user returns destination /join-team and role NONE', async () => {
    const res = await fetch(`${baseUrl}/stores/onboarding-status`, {
      headers: { Authorization: `Bearer ${standaloneToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.onboardingStatus, 'UNASSIGNED');
    assert.equal(body.data.destination, '/join-team');
    assert.equal(body.data.role, 'NONE');
    assert.equal(body.data.canRegisterShop, true);
  });

  test('5. Business Owner registers a store and creates an explicit CASHIER invitation', async () => {
    // 5a. Register owner account
    const ownerReg = await register({
      name: 'Store Owner',
      email: ownerEmail,
      phone: '+91 9988776655',
      password,
    });
    ownerToken = ownerReg.accessToken;
    ownerUserId = ownerReg.user.id;

    // 5b. Owner registers a shop
    const shopRes = await fetch(`${baseUrl}/stores/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        shopName: `Owner Retail ${timestamp}`,
        businessType: 'RETAIL',
        ownerName: 'Store Owner',
        phone: '+91 9988776655',
        state: 'Tamil Nadu',
      }),
    });
    assert.equal(shopRes.status, 201, 'Shop registered successfully');
    const shopData = await shopRes.json();
    ownerBusinessId = shopData.data.store.id;
    ownerToken = shopData.data.token; // refreshed token with ADMIN role & businessId

    // 5c. Owner explicitly invites a team member as CASHIER
    rawInviteToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawInviteToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.roleInvitation.create({
      data: {
        businessId: ownerBusinessId,
        inviterId: ownerUserId,
        recipientEmail: invitedEmail,
        name: 'Jane Cashier',
        role: 'CASHIER',
        tokenHash,
        status: 'PENDING',
        deliveryStatus: 'PENDING',
        expiresAt,
      },
    });
    assert.equal(invite.role, 'CASHIER');
  });

  test('6. Recipient registers with invitation token -> assigned role is explicitly CASHIER with Cashier permissions', async () => {
    const regRes = await register({
      name: 'Jane Cashier',
      email: invitedEmail,
      phone: '+91 9876543211',
      password,
      invitationToken: rawInviteToken,
    });

    assert.ok(regRes.accessToken);
    assert.equal(regRes.user.role, 'CASHIER', 'Role must match the explicit role assigned by the Business Owner');
    assert.equal(regRes.user.businessId, ownerBusinessId, 'businessId must match the owner store');
    assert.equal(regRes.user.isOwner, false, 'Invited team member must not be owner');

    invitedToken = regRes.accessToken;
    invitedUserId = regRes.user.id;

    // Verify Cashier permissions: has billing.create, but NOT team.manage
    const cashierPerms = await getEffectivePermissions(invitedUserId);
    assert.ok(cashierPerms.has('billing.create'), 'Cashier must have billing.create');
    assert.ok(cashierPerms.has('billing.view'), 'Cashier must have billing.view');
    assert.ok(!cashierPerms.has('team.manage'), 'Cashier must NOT have team.manage');
    assert.ok(!cashierPerms.has('settings.edit'), 'Cashier must NOT have settings.edit');
  });

  test('7. Anti-Privilege Escalation: Sub-user cannot modify their own role', async () => {
    const res = await fetch(`${baseUrl}/users/${invitedUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${invitedToken}`,
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    });

    // Should be rejected with 403 Forbidden
    assert.equal(res.status, 403, 'Sub-user cannot escalate privileges or modify roles');
  });

  test('8. Standalone user explicitly registers a store -> becomes verified OWNER and ADMIN', async () => {
    const res = await fetch(`${baseUrl}/stores/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${standaloneToken}`,
      },
      body: JSON.stringify({
        shopName: `Standalone Retail ${timestamp}`,
        businessType: 'RETAIL',
        ownerName: 'Unassigned User',
        phone: '+91 9123456780',
        state: 'Tamil Nadu',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.user.role, 'ADMIN');
    assert.equal(body.data.user.isOwner, true);
    assert.ok(body.data.store.id);

    // Clean up created business
    await prisma.business.deleteMany({ where: { id: body.data.store.id } }).catch(() => {});
  });
});
