import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/prisma.mjs';
import { env } from '../src/config/env.mjs';

const baseUrl = 'http://127.0.0.1:5000/api/v1';

test('BILZET — Onboarding Staff & CA Invitation Notification & Auto-Accept Flow', async (t) => {
  const ts = Date.now();
  const ownerEmail = `owner-${ts}@bilzet.test`;
  const staffEmail = `staff-${ts}@bilzet.test`;
  const caEmail = `ca-${ts}@bilzet.test`;

  const createAuthToken = (user) => {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        businessId: user.businessId || null,
        isOwner: Boolean(user.isOwner),
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  let ownerUser, ownerToken, storeId;
  let staffUser, staffToken;
  let caUser, caToken;

  // 1. Owner registers account and creates shop
  await t.test('1. Owner registers account and creates shop', async () => {
    ownerUser = await prisma.user.create({
      data: {
        name: 'Store Owner',
        email: ownerEmail,
        role: 'NONE',
        isOwner: false,
      },
    });
    ownerToken = createAuthToken(ownerUser);

    const shopRes = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        shopName: `Super Store ${ts}`,
        businessType: 'RETAIL',
        ownerName: 'Store Owner',
        email: ownerEmail,
        gstin: '33AAAAA0000A1Z5',
      }),
    });
    const shopData = await shopRes.json();
    assert.equal(shopRes.status, 201, `Failed to register store: ${JSON.stringify(shopData)}`);
    storeId = shopData.data?.store?.id || shopData.data?.business?.id;
    assert.ok(storeId, 'Store must be created');

    // Refresh owner token with new store
    const refreshedOwner = await prisma.user.findUnique({ where: { id: ownerUser.id } });
    ownerToken = createAuthToken(refreshedOwner);
  });

  // 2. Staff and CA register their accounts and check initial onboarding state
  await t.test('2. Staff and CA register accounts and verify onboarding waiting state', async () => {
    staffUser = await prisma.user.create({
      data: {
        name: 'Ravi Staff',
        email: staffEmail,
        role: 'NONE',
        isOwner: false,
      },
    });
    staffToken = createAuthToken(staffUser);

    // Check Staff initial invitations
    const sInvRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const sInvData = await sInvRes.json();
    assert.equal(sInvRes.status, 200);
    assert.equal(sInvData.data?.invitations?.length || 0, 0, 'No invitations yet');

    // Register CA
    caUser = await prisma.user.create({
      data: {
        name: 'Anand CA',
        email: caEmail,
        role: 'NONE',
        isOwner: false,
      },
    });
    caToken = createAuthToken(caUser);

    // Check CA initial invitations
    const cInvRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const cInvData = await cInvRes.json();
    assert.equal(cInvRes.status, 200);
    assert.equal(cInvData.data?.invitations?.length || 0, 0, 'No invitations yet');
  });

  // 3. Owner invites Staff (via Team/Role Invitation) and CA (via CA Connect)
  await t.test('3. Store owner sends invitation to Staff and CA', async () => {
    // Invite Staff
    const staffInviteRes = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: staffEmail,
        role: 'STAFF',
        department: 'Store Floor',
        message: 'Join as Store Staff',
      }),
    });
    const staffInviteData = await staffInviteRes.json();
    assert.equal(staffInviteRes.status, 201, `Invite staff failed: ${JSON.stringify(staffInviteData)}`);
    assert.equal(staffInviteData.data?.inAppNotificationCreated, true, 'Staff notification must be created');

    // Invite CA
    const caInviteRes = await fetch(`${baseUrl}/ca-invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        email: caEmail,
        name: 'Anand CA',
        message: 'Please audit our store books',
      }),
    });
    const caInviteData = await caInviteRes.json();
    assert.equal(caInviteRes.status, 201, `Invite CA failed: ${JSON.stringify(caInviteData)}`);
  });

  // 4. Staff receives in-app notification and pending invitation
  await t.test('4. Staff discovers invitation in Notification Center & My Invitations', async () => {
    // Check notifications
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const notifData = await notifRes.json();
    assert.equal(notifRes.status, 200);
    const notifications = notifData.data?.notifications || [];
    assert.ok(notifications.length > 0, 'Staff must have in-app notification');
    assert.equal(notifications[0].type, 'INVITATION');

    // Check /invitations/my
    const myInvRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const myInvData = await myInvRes.json();
    assert.equal(myInvRes.status, 200);
    const myInvites = myInvData.data?.invitations || [];
    assert.equal(myInvites.length, 1, 'Staff must see 1 pending invitation');
    assert.equal(myInvites[0].role, 'STAFF');
  });

  // 5. CA receives in-app notification and pending invitation
  await t.test('5. CA discovers CA invitation in Notification Center & My Invitations', async () => {
    // Check notifications
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const notifData = await notifRes.json();
    assert.equal(notifRes.status, 200);
    const notifications = notifData.data?.notifications || [];
    assert.ok(notifications.length > 0, 'CA must have in-app notification');
    assert.equal(notifications[0].type, 'INVITATION');

    // Check /invitations/my returns CA invitation seamlessly
    const myInvRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const myInvData = await myInvRes.json();
    assert.equal(myInvRes.status, 200);
    const myInvites = myInvData.data?.invitations || [];
    assert.equal(myInvites.length, 1, 'CA must see 1 pending CA invitation');
    assert.equal(myInvites[0].role, 'CA');
    assert.equal(myInvites[0].isCa, true);
  });

  // 6. Staff accepts invitation and lands on Staff Workspace
  await t.test('6. Staff accepts invitation and transitions to Staff Workspace', async () => {
    const myInvRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const myInvData = await myInvRes.json();
    const invite = myInvData.data?.invitations[0];

    const acceptRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ token: invite.id }),
    });
    const acceptData = await acceptRes.json();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptData.data?.role, 'STAFF');

    // Verify auth/me profile
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const meData = await meRes.json();
    const currentUser = meData.data?.user || meData.data || meData.user;
    assert.equal(currentUser?.role, 'STAFF');
    assert.equal(currentUser?.onboarding?.destination, '/staff-dashboard');
    assert.equal(currentUser?.onboarding?.status, 'COMPLETED');
  });

  // 7. CA accepts invitation directly and lands on CA Portal
  await t.test('7. CA accepts invitation and transitions to CA Portal', async () => {
    const myInvRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const myInvData = await myInvRes.json();
    const invite = myInvData.data?.invitations[0];

    const acceptRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ token: invite.id }),
    });
    const acceptData = await acceptRes.json();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptData.data?.role, 'CA');

    // Verify auth/me profile
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const meData = await meRes.json();
    const currentUser = meData.data?.user || meData.data;
    assert.equal(currentUser?.role, 'CA');
    assert.equal(currentUser?.onboarding?.destination, '/ca-portal');
    assert.equal(currentUser?.onboarding?.status, 'COMPLETED');
  });

  // Cleanup
  await prisma.notification.deleteMany({
    where: { userId: { in: [ownerUser.id, staffUser.id, caUser.id] } },
  }).catch(() => {});
  await prisma.roleInvitation.deleteMany({
    where: { businessId: storeId },
  }).catch(() => {});
  await prisma.caInvitation.deleteMany({
    where: { businessId: storeId },
  }).catch(() => {});
  await prisma.caStoreAccess.deleteMany({
    where: { businessId: storeId },
  }).catch(() => {});
  await prisma.businessMember.deleteMany({
    where: { businessId: storeId },
  }).catch(() => {});
  await prisma.business.deleteMany({
    where: { id: storeId },
  }).catch(() => {});
  await prisma.user.deleteMany({
    where: { id: { in: [ownerUser.id, staffUser.id, caUser.id] } },
  }).catch(() => {});
});
