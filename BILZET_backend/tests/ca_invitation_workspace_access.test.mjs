import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import emailService from '../src/services/email.service.mjs';
import realtimeService from '../src/services/realtime.service.mjs';

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

describe('EMAIL-BASED CA INVITATION AND SECURE WORKSPACE ACCESS (E2E TEST SUITE)', () => {
  const storeAId = 'store-ca-inv-store-a';
  const storeBId = 'store-ca-inv-store-b';
  const ownerAId = 'user-owner-store-a';
  const ownerBId = 'user-owner-store-b';

  const caEmailA = 'auditor.raman@ca-associates.com';
  const caUserIdA = 'user-ca-raman-auditor';

  const wrongCaEmail = 'other.ca@differentfirm.com';
  const wrongCaUserId = 'user-ca-wrong-account';

  let ownerAToken;
  let ownerBToken;
  let caUserAToken;
  let wrongCaToken;

  let activeInviteToken;
  let activeInviteId;

  before(async () => {
    emailService.clearOutbox();

    // Setup Store A and Store B
    await prisma.business.create({
      data: {
        id: storeAId,
        ownerId: ownerAId,
        name: 'Apex Supermarket & Retail',
        gstin: '33AAACA1111A1Z1',
        email: 'admin@apexretail.com',
      },
    });

    await prisma.business.create({
      data: {
        id: storeBId,
        ownerId: ownerBId,
        name: 'Zenith Logistics & Trading',
        gstin: '33AAACZ2222Z2Z2',
        email: 'admin@zenithlogistics.com',
      },
    });

    // Setup Owner A user
    await prisma.user.create({
      data: {
        id: ownerAId,
        email: 'admin@apexretail.com',
        name: 'Apex Admin Owner',
        role: 'ADMIN',
        isOwner: true,
        businessId: storeAId,
      },
    });

    // Setup Owner B user
    await prisma.user.create({
      data: {
        id: ownerBId,
        email: 'admin@zenithlogistics.com',
        name: 'Zenith Admin Owner',
        role: 'ADMIN',
        isOwner: true,
        businessId: storeBId,
      },
    });

    // Setup Invited CA User account
    await prisma.user.create({
      data: {
        id: caUserIdA,
        email: caEmailA,
        name: 'Ramanathan FCA',
        role: 'STAFF', // starts as staff, elevated to CA upon acceptance
        businessId: null,
      },
    });

    // Setup Wrong CA User account
    await prisma.user.create({
      data: {
        id: wrongCaUserId,
        email: wrongCaEmail,
        name: 'Different Firm Auditor',
        role: 'CA',
        businessId: null,
      },
    });

    ownerAToken = generateToken({ id: ownerAId, email: 'admin@apexretail.com', role: 'ADMIN', businessId: storeAId });
    ownerBToken = generateToken({ id: ownerBId, email: 'admin@zenithlogistics.com', role: 'ADMIN', businessId: storeBId });
    caUserAToken = generateToken({ id: caUserIdA, email: caEmailA, role: 'STAFF' });
    wrongCaToken = generateToken({ id: wrongCaUserId, email: wrongCaEmail, role: 'CA' });
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 1: ADMIN INVITES A CA VIA EMAIL
  // ══════════════════════════════════════════════════════════════
  test('Scenario 1 — Admin invites CA: token is generated, hashed at rest, and email is dispatched', async () => {
    emailService.clearOutbox();

    const res = await fetch(`${baseUrl}/ca-invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        businessId: storeAId,
        email: caEmailA,
        name: 'Ramanathan FCA',
        message: 'Please review our Q3 GST reconciliation and invoice audit',
        permissions: ['sales_audit', 'purchase_audit', 'tax_audit', 'reconciliation', 'reports'],
        expiresInDays: 7,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.invitation.id);
    assert.equal(body.data.invitation.status, 'PENDING');
    assert.equal(body.data.invitation.deliveryStatus, 'DELIVERED');
    assert.ok(body.data.inviteLink.includes('token='));

    activeInviteId = body.data.invitation.id;

    // Extract raw token from invite link
    const url = new URL(body.data.inviteLink);
    activeInviteToken = url.searchParams.get('token');
    assert.ok(activeInviteToken, 'Raw token must be provided in invite link');

    // Verify token is hashed at rest in DB and raw token is NOT stored
    const dbRecord = await prisma.caInvitation.findUnique({ where: { id: activeInviteId } });
    assert.notEqual(dbRecord.tokenHash, activeInviteToken, 'Raw token must NEVER be stored plaintext in database');
    const expectedHash = crypto.createHash('sha256').update(activeInviteToken).digest('hex');
    assert.equal(dbRecord.tokenHash, expectedHash, 'Database must store SHA-256 hash of token');

    // Verify email was actually dispatched via email service outbox
    const latestEmail = emailService.getLatestEmail();
    assert.ok(latestEmail, 'Invitation email must be sent');
    assert.equal(latestEmail.to, caEmailA);
    assert.match(latestEmail.subject, /Apex Supermarket & Retail/i);
    assert.ok(latestEmail.html.includes(body.data.inviteLink), 'Email body must contain working invite link');
    assert.ok(latestEmail.html.includes('Q3 GST reconciliation'), 'Email body must include optional message');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 2: CA CANNOT ACCESS STORE BEFORE ACCEPTANCE
  // ══════════════════════════════════════════════════════════════
  test('Scenario 2 — Access Control: CA cannot access store records before accepting invitation (403)', async () => {
    const checkRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caUserAToken}` },
    });
    assert.equal(checkRes.status, 403, 'Access must be denied prior to invitation acceptance');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 3: PUBLIC TOKEN VERIFICATION (SAFE INSPECTION)
  // ══════════════════════════════════════════════════════════════
  test('Scenario 3 — Token Verification: CA opens link and inspects invite details without consuming token', async () => {
    const verifyRes = await fetch(`${baseUrl}/ca-invitations/verify?token=${activeInviteToken}`);
    assert.equal(verifyRes.status, 200);
    const data = await verifyRes.json();

    assert.equal(data.data.valid, true);
    assert.equal(data.data.invitation.email, caEmailA);
    assert.equal(data.data.invitation.business.id, storeAId);
    assert.equal(data.data.invitation.business.name, 'Apex Supermarket & Retail');
    assert.ok(data.data.invitation.permissions.includes('sales_audit'));

    // Verify token is still PENDING (not consumed by opening link)
    const dbRecord = await prisma.caInvitation.findUnique({ where: { id: activeInviteId } });
    assert.equal(dbRecord.status, 'PENDING');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 4: UNAUTHENTICATED ACCEPTANCE REJECTED
  // ══════════════════════════════════════════════════════════════
  test('Scenario 4 — Authentication Required: Acceptance without token returns 401', async () => {
    const res = await fetch(`${baseUrl}/ca-invitations/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: activeInviteToken }),
    });
    assert.equal(res.status, 401, 'Acceptance requires authentication');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 5: EMAIL MISMATCH REJECTED (403 FORBIDDEN)
  // ══════════════════════════════════════════════════════════════
  test('Scenario 5 — Identity Check: User signed in with different email cannot accept (403)', async () => {
    const res = await fetch(`${baseUrl}/ca-invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${wrongCaToken}`,
      },
      body: JSON.stringify({ token: activeInviteToken }),
    });

    assert.equal(res.status, 403, 'Email mismatch must be rejected with 403');
    const data = await res.json();
    assert.match(data.message, /intended for/i);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 6: SUCCESSFUL ACCEPTANCE & CONNECTION ESTABLISHED
  // ══════════════════════════════════════════════════════════════
  test('Scenario 6 — Acceptance: CA accepts, connection created, token consumed, and admin notified', async () => {
    emailService.clearOutbox();

    const acceptRes = await fetch(`${baseUrl}/ca-invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caUserAToken}`,
      },
      body: JSON.stringify({ token: activeInviteToken }),
    });

    assert.equal(acceptRes.status, 200);
    const data = await acceptRes.json();
    assert.equal(data.data.success, true);
    assert.equal(data.data.storeId, storeAId);

    // 1. Verify invitation is now ACCEPTED and consumed in DB
    const dbInvite = await prisma.caInvitation.findUnique({ where: { id: activeInviteId } });
    assert.equal(dbInvite.status, 'ACCEPTED');
    assert.ok(dbInvite.acceptedAt);
    assert.equal(dbInvite.caUserId, caUserIdA);

    // 2. Verify CaStoreAccess active record created
    const dbAccess = await prisma.caStoreAccess.findFirst({
      where: { caUserId: caUserIdA, businessId: storeAId },
    });
    assert.ok(dbAccess, 'CaStoreAccess connection must be persisted');
    assert.equal(dbAccess.status, 'ACTIVE');

    // 3. Verify CA role elevation
    const userCheck = await prisma.user.findUnique({ where: { id: caUserIdA } });
    assert.equal(userCheck.role, 'CA', 'User role must be upgraded to CA');

    // 4. Verify Real-time event emitted
    const missed = realtimeService.getMissedEvents(storeAId);
    assert.ok(missed.some((e) => e.type === 'CA_INVITATION_ACCEPTED' && e.data.caUserId === caUserIdA));

    // 5. Verify CA can now access store records
    const caCheck = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caUserAToken}` },
    });
    assert.equal(caCheck.status, 200, 'CA must now have authorized access to store records');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 7: TOKEN REUSE PROTECTION (SINGLE-USE ENFORCEMENT)
  // ══════════════════════════════════════════════════════════════
  test('Scenario 7 — Token Reuse: Re-submitting an already accepted token returns 400', async () => {
    const reuseRes = await fetch(`${baseUrl}/ca-invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caUserAToken}`,
      },
      body: JSON.stringify({ token: activeInviteToken }),
    });

    assert.equal(reuseRes.status, 400, 'Re-using accepted token must be rejected');
    const data = await reuseRes.json();
    assert.match(data.message, /already been accepted/i);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 8: ADMIN CA CONNECT STATUS UPDATES TO CONNECTED
  // ══════════════════════════════════════════════════════════════
  test('Scenario 8 — Admin View: Admin sees active CA connection and historical invitation status', async () => {
    const connectedRes = await fetch(`${baseUrl}/ca-invitations/connected?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    assert.equal(connectedRes.status, 200);
    const data = await connectedRes.json();
    assert.ok(data.data.accountants.length >= 1);
    const conn = data.data.accountants.find((a) => a.caUserId === caUserIdA);
    assert.ok(conn, 'Connected CA must appear in Admin connected accountants list');
    assert.equal(conn.status, 'ACTIVE');

    // Verify historical invitations list
    const invListRes = await fetch(`${baseUrl}/ca-invitations?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(invListRes.status, 200);
    const invListData = await invListRes.json();
    const historicInvite = invListData.data.invitations.find((i) => i.id === activeInviteId);
    assert.ok(historicInvite);
    assert.equal(historicInvite.status, 'ACCEPTED');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 9: EXPIRED INVITATION REJECTED
  // ══════════════════════════════════════════════════════════════
  test('Scenario 9 — Expiration: Acceptance of expired invitation is rejected (400)', async () => {
    const expiredRawToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRawToken).digest('hex');

    await prisma.caInvitation.create({
      data: {
        businessId: storeAId,
        inviterId: ownerAId,
        email: caEmailA,
        tokenHash: expiredHash,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      },
    });

    const expRes = await fetch(`${baseUrl}/ca-invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caUserAToken}`,
      },
      body: JSON.stringify({ token: expiredRawToken }),
    });

    assert.equal(expRes.status, 400);
    const expData = await expRes.json();
    assert.match(expData.message, /expired/i);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 10: REVOKED INVITATION REJECTED
  // ══════════════════════════════════════════════════════════════
  test('Scenario 10 — Revocation: Admin revokes pending invitation; CA acceptance is blocked (400)', async () => {
    const inviteRes = await fetch(`${baseUrl}/ca-invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        businessId: storeAId,
        email: 'secondary.ca@firm.com',
        expiresInDays: 3,
      }),
    });
    const inviteData = await inviteRes.json();
    const secInviteId = inviteData.data.invitation.id;
    const secUrl = new URL(inviteData.data.inviteLink);
    const secRawToken = secUrl.searchParams.get('token');

    // Admin revokes it
    const revokeRes = await fetch(`${baseUrl}/ca-invitations/${secInviteId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(revokeRes.status, 200);

    // Create user and attempt to accept revoked token
    const secUser = await prisma.user.create({
      data: { email: 'secondary.ca@firm.com', name: 'Secondary CA', role: 'STAFF' },
    });
    const secToken = generateToken({ id: secUser.id, email: 'secondary.ca@firm.com', role: 'STAFF' });

    const tryAccept = await fetch(`${baseUrl}/ca-invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secToken}`,
      },
      body: JSON.stringify({ token: secRawToken }),
    });

    assert.equal(tryAccept.status, 400);
    const tryData = await tryAccept.json();
    assert.match(tryData.message, /revoked/i);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 11: RESENDING INVITATION REPLACES PREVIOUS TOKEN SAFELY
  // ══════════════════════════════════════════════════════════════
  test('Scenario 11 — Resend Invitation: Generates fresh token, resets expiry, without duplicate active records', async () => {
    // Create new invite
    const invRes = await fetch(`${baseUrl}/ca-invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        businessId: storeAId,
        email: 'partner.auditor@firm.com',
      }),
    });
    const invData = await invRes.json();
    const invId = invData.data.invitation.id;
    const oldUrl = new URL(invData.data.inviteLink);
    const oldRawToken = oldUrl.searchParams.get('token');

    // Admin resends it
    const resendRes = await fetch(`${baseUrl}/ca-invitations/${invId}/resend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(resendRes.status, 200);
    const resendData = await resendRes.json();
    const newUrl = new URL(resendData.data.inviteLink);
    const newRawToken = newUrl.searchParams.get('token');

    assert.notEqual(oldRawToken, newRawToken, 'Resend must generate a fresh cryptographic token');

    // Old token should now be invalid
    const checkOld = await fetch(`${baseUrl}/ca-invitations/verify?token=${oldRawToken}`);
    const checkOldData = await checkOld.json();
    assert.equal(checkOldData.data.valid, false, 'Old token must be invalidated');

    // New token must be valid
    const checkNew = await fetch(`${baseUrl}/ca-invitations/verify?token=${newRawToken}`);
    const checkNewData = await checkNew.json();
    assert.equal(checkNewData.data.valid, true, 'New token must be valid');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 12: DISCONNECT / REVOKE CONNECTED CA ACCESS
  // ══════════════════════════════════════════════════════════════
  test('Scenario 12 — Revoke Connected CA: Admin disconnects CA; further workspace access is immediately blocked', async () => {
    // 1. CA can currently access Store A
    const preCheck = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caUserAToken}` },
    });
    assert.equal(preCheck.status, 200);

    // 2. Admin disconnects CA
    const disconnRes = await fetch(`${baseUrl}/ca-invitations/connected/${caUserIdA}?storeId=${storeAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(disconnRes.status, 200);

    // 3. CA workspace access is now immediately blocked with 403 Forbidden
    const postCheck = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caUserAToken}` },
    });
    assert.equal(postCheck.status, 403, 'Disconnected CA must be immediately denied access (403)');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 13: MULTI-TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════
  test('Scenario 13 — Multi-tenant Isolation: Owner B cannot manage or view Store A invitations (403)', async () => {
    const listRes = await fetch(`${baseUrl}/ca-invitations?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    assert.equal(listRes.status, 403, 'Unauthorized store admin must receive 403 Forbidden');
  });
});
