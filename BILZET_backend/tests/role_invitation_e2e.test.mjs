import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import app from '../src/app.mjs';
import prisma from '../src/config/prisma.mjs';
import emailService from '../src/services/email.service.mjs';

describe('BILZET — SELF-REGISTRATION, ROLE INVITATION & NOTIFICATION SYSTEM E2E', () => {
  let server;
  let baseUrl;

  const storeId = `store-test-${Date.now().toString(36)}`;
  const ownerId = `owner-test-${Date.now().toString(36)}`;
  const ownerEmail = `owner.${Date.now()}@bilzet.test`;

  let ownerToken;

  const staffEmail = `staff.${Date.now()}@bilzet.test`;
  const managerEmail = `mgr.${Date.now()}@bilzet.test`;
  const caEmail = `ca.${Date.now()}@bilzet.test`;

  let staffToken;
  let staffUserId;

  let activeInviteToken;
  let activeInviteId;

  before(async () => {
    // Start local test server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    // 1. Seed Store and Owner
    await prisma.business.create({
      data: {
        id: storeId,
        name: 'Apex Supermarket & Retail',
        ownerId,
        email: ownerEmail,
        gstin: '33AAAAA1234A1Z5',
      },
    });

    const ownerUser = await prisma.user.create({
      data: {
        id: ownerId,
        name: 'Owner Admin',
        email: ownerEmail,
        role: 'ADMIN',
        businessId: storeId,
        isOwner: true,
      },
    });

    // Create owner BusinessMember
    await prisma.businessMember.create({
      data: {
        userId: ownerId,
        businessId: storeId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Generate JWT for Owner
    const { default: jwt } = await import('jsonwebtoken');
    const { env } = await import('../src/config/env.mjs');
    ownerToken = jwt.sign(
      {
        id: ownerId,
        email: ownerEmail,
        role: 'ADMIN',
        businessId: storeId,
        isOwner: true,
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  after(() => {
    if (server) server.close();
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 1: SELF-REGISTRATION (EVERY USER CREATES OWN ACCOUNT)
  // ══════════════════════════════════════════════════════════════
  test('Scenario 1 — Independent Self-Registration: User registers with no privileged role', async () => {
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kavitha Staff',
        email: staffEmail,
        password: 'Password@123',
      }),
    });

    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    assert.equal(regData.success, true);
    assert.ok(regData.data.accessToken);

    staffToken = regData.data.accessToken;
    staffUserId = regData.data.user.id || regData.data.user._id;

    // Verify user role is NONE and no business assigned!
    assert.equal(regData.data.user.role, 'NONE');
    assert.equal(regData.data.user.isOwner, false);
    assert.equal(regData.data.user.businessId, null);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 2: ADMIN CREATES ROLE INVITATION
  // ══════════════════════════════════════════════════════════════
  test('Scenario 2 — Admin Invites Staff: Persistent invitation and in-app notification created', async () => {
    emailService.clearOutbox();

    const invRes = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        businessId: storeId,
        email: staffEmail,
        name: 'Kavitha Staff',
        role: 'STAFF',
        department: 'Checkout & POS',
        designation: 'Senior Cashier',
        message: 'Welcome to our Apex Retail team! Please accept your role.',
      }),
    });

    assert.equal(invRes.status, 201);
    const invData = await invRes.json();
    assert.equal(invData.success, true);
    assert.ok(invData.data.invitation.id);
    assert.equal(invData.data.invitation.status, 'PENDING');
    assert.equal(invData.data.invitation.role, 'STAFF');
    assert.ok(invData.data.inviteLink);

    activeInviteId = invData.data.invitation.id;

    // Extract raw token from invite link
    const url = new URL(invData.data.inviteLink);
    activeInviteToken = url.searchParams.get('token');
    assert.ok(activeInviteToken, 'Raw token must be provided in invite link');

    // Verify token is hashed at rest in DB and NOT stored plaintext
    const dbRecord = await prisma.roleInvitation.findUnique({ where: { id: activeInviteId } });
    assert.notEqual(dbRecord.tokenHash, activeInviteToken);
    const expectedHash = crypto.createHash('sha256').update(activeInviteToken).digest('hex');
    assert.equal(dbRecord.tokenHash, expectedHash);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 3: IN-APP NOTIFICATION DELIVERED TO USER
  // ══════════════════════════════════════════════════════════════
  test('Scenario 3 — In-App Notification Center: Staff sees unread badge and invitation notification', async () => {
    // 1. Fetch unread count
    const countRes = await fetch(`${baseUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(countRes.status, 200);
    const countData = await countRes.json();
    assert.ok(countData.data.unreadCount >= 1);

    // 2. Fetch notifications list
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(notifRes.status, 200);
    const notifData = await notifRes.json();
    assert.ok(notifData.data.notifications.length >= 1);

    const inviteNotif = notifData.data.notifications.find((n) => n.invitationId === activeInviteId);
    assert.ok(inviteNotif, 'Notification for the role invitation must exist');
    assert.equal(inviteNotif.type, 'INVITATION');
    assert.equal(inviteNotif.isRead, false);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 4: USER VIEWS PENDING INVITATIONS IN ONBOARDING
  // ══════════════════════════════════════════════════════════════
  test('Scenario 4 — My Invitations: User discovers pending invitation via verified account', async () => {
    const myRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(myRes.status, 200);
    const myData = await myRes.json();
    console.log('My invitations data:', JSON.stringify(myData));
    assert.ok(myData.data.invitations.length >= 1);

    const found = myData.data.invitations.find((i) => i.id === activeInviteId);
    assert.ok(found);
    assert.equal(found.role, 'STAFF');
    assert.equal(found.business.name, 'Apex Supermarket & Retail');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 5: ACCEPT INVITATION (ROLE & MEMBERSHIP ASSIGNMENT)
  // ══════════════════════════════════════════════════════════════
  test('Scenario 5 — Acceptance: Staff accepts, BusinessMember is created, role assigned', async () => {
    const acceptRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ token: activeInviteToken }),
    });

    if (acceptRes.status !== 200) {
      console.error('Accept Invitation Error:', await acceptRes.text());
    }
    assert.equal(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.equal(acceptData.success, true);
    assert.equal(acceptData.data.role, 'STAFF');

    // Verify invitation is marked ACCEPTED
    const dbInv = await prisma.roleInvitation.findUnique({ where: { id: activeInviteId } });
    assert.equal(dbInv.status, 'ACCEPTED');
    assert.ok(dbInv.acceptedAt);

    // Verify BusinessMember record in database
    const dbMember = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: staffUserId,
          businessId: storeId,
        },
      },
    });
    assert.ok(dbMember);
    assert.equal(dbMember.role, 'STAFF');
    assert.equal(dbMember.status, 'ACTIVE');

    // Verify Admin was notified
    const adminNotifs = await prisma.notification.findMany({
      where: { userId: ownerId, type: 'INVITATION_ACCEPTED' },
    });
    assert.ok(adminNotifs.length >= 1);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 6: PREVENT DUPLICATE OR REPLAY ACCEPTANCE
  // ══════════════════════════════════════════════════════════════
  test('Scenario 6 — Token Replay: Re-submitting accepted token returns 400', async () => {
    const replayRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ token: activeInviteToken }),
    });

    assert.equal(replayRes.status, 400);
    const replayData = await replayRes.json();
    assert.match(replayData.message, /already been accepted/i);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 7: INVITE BEFORE REGISTRATION (INVITEE SIGNS UP LATER)
  // ══════════════════════════════════════════════════════════════
  test('Scenario 7 — Invite before registration: Non-existent email invited, signs up later and accepts', async () => {
    const futureStaffEmail = `future.${Date.now()}@bilzet.test`;

    // 1. Admin invites unregistered email
    const preInvRes = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        businessId: storeId,
        email: futureStaffEmail,
        role: 'MANAGER',
        department: 'Store Management',
      }),
    });
    assert.equal(preInvRes.status, 201);
    const preInvData = await preInvRes.json();
    const futureToken = new URL(preInvData.data.inviteLink).searchParams.get('token');

    // 2. User registers later with that matching email
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Future Manager',
        email: futureStaffEmail,
        password: 'Password@123',
      }),
    });
    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    const futureUserToken = regData.data.accessToken;

    // 3. User immediately discovers pending invitation in their account!
    const myRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${futureUserToken}` },
    });
    assert.equal(myRes.status, 200);
    const myData = await myRes.json();
    const found = myData.data.invitations.find((i) => i.recipientEmail === futureStaffEmail);
    assert.ok(found, 'Pre-registration invitation must be discovered by newly registered account');
    assert.equal(found.role, 'MANAGER');

    // 4. User accepts invitation
    const acceptRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${futureUserToken}`,
      },
      body: JSON.stringify({ token: futureToken }),
    });
    assert.equal(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.equal(acceptData.data.role, 'MANAGER');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 8: ADMIN ACTIVE MEMBERS MANAGEMENT
  // ══════════════════════════════════════════════════════════════
  test('Scenario 8 — Active Members Management: Admin lists, updates role, and removes member', async () => {
    // 1. Admin lists members
    const listRes = await fetch(`${baseUrl}/members?businessId=${storeId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(listData.data.members.length >= 2, 'Must list owner and accepted staff');

    const staffMember = listData.data.members.find((m) => m.userId === staffUserId);
    assert.ok(staffMember);

    // 2. Admin updates staff role
    const patchRes = await fetch(`${baseUrl}/members/${staffMember.id}?businessId=${storeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        role: 'MANAGER',
        department: 'Operations',
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.equal(patchData.data.member.role, 'MANAGER');

    // 3. Admin removes staff member
    const delRes = await fetch(`${baseUrl}/members/${staffMember.id}?businessId=${storeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(delRes.status, 200);

    // Verify member is removed from active store members
    const afterRes = await fetch(`${baseUrl}/members?businessId=${storeId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const afterData = await afterRes.json();
    assert.equal(afterData.data.members.some((m) => m.id === staffMember.id), false);

    // Verify global user account is NOT deleted
    const userCheck = await prisma.user.findUnique({ where: { id: staffUserId } });
    assert.ok(userCheck, 'Global user account must be preserved');
  });
});
