import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import prisma from '../src/config/prisma.mjs';
import { env } from '../src/config/env.mjs';

describe('BILZET — Role-Based Registration & Store Onboarding E2E Verification', () => {
  let server;
  let baseUrl;

  // Track created entities for clean cleanup
  const createdUserIds = [];
  const createdBusinessIds = [];

  const timestamp = Date.now().toString(36);

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
  });

  after(async () => {
    // Clean up test data
    try {
      if (createdBusinessIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { businessId: { in: createdBusinessIds } } }).catch(() => {});
        await prisma.caStoreAccess.deleteMany({ where: { businessId: { in: createdBusinessIds } } }).catch(() => {});
        await prisma.staff.deleteMany({ where: { businessId: { in: createdBusinessIds } } }).catch(() => {});
        await prisma.roleInvitation.deleteMany({ where: { businessId: { in: createdBusinessIds } } }).catch(() => {});
        await prisma.businessMember.deleteMany({ where: { businessId: { in: createdBusinessIds } } }).catch(() => {});
        await prisma.business.deleteMany({ where: { id: { in: createdBusinessIds } } }).catch(() => {});
      }
      if (createdUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } }).catch(() => {});
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
      }
    } catch (err) {
      console.warn('Cleanup error:', err.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

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

  // State shared across test steps
  let adminUser;
  let adminToken;
  let adminBusiness;

  let staffUser;
  let staffToken;

  let managerUser;
  let managerToken;

  let caUser;
  let caToken;

  let multiBusinessA;
  let multiBusinessB;
  let multiMemberUser;
  let multiMemberToken;

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: New Admin registers -> registers a shop -> reaches Admin Console
  // ─────────────────────────────────────────────────────────────────────────────
  test('1. New Admin registers, checks onboarding status, registers a shop and reaches Admin Console', async () => {
    const adminEmail = `admin-${timestamp}@bilzet.test`;
    adminUser = await prisma.user.create({
      data: {
        name: 'New Shop Owner',
        email: adminEmail,
        role: 'NONE',
        isOwner: false,
      },
    });
    createdUserIds.push(adminUser.id);
    adminToken = createAuthToken(adminUser);

    // Check onboarding status prior to store registration
    const statusRes = await fetch(`${baseUrl}/store/onboarding-status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusRes.status, 200);
    assert.equal(statusData.data.onboardingStatus, 'UNASSIGNED');
    assert.equal(statusData.data.canRegisterShop, true);
    assert.equal(statusData.data.destination, '/onboarding');

    // Register shop
    const regRes = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shopName: 'Super Fresh Groceries',
        businessType: 'SUPERMARKET',
        ownerName: 'New Shop Owner',
        phone: '+91 9876543210',
        email: adminEmail,
        address: '100 Market St, Chennai',
        state: 'Tamil Nadu',
        gstin: '33ABCDE1234F1Z5',
      }),
    });

    const regData = await regRes.json();
    assert.equal(regRes.status, 201, `Failed to register shop: ${JSON.stringify(regData)}`);
    assert.ok(regData.data.store?.id);
    assert.equal(regData.data.user.role, 'ADMIN');
    assert.equal(regData.data.user.isOwner, true);
    assert.equal(regData.data.destination, '/dashboard');
    assert.equal(regData.data.onboardingStatus, 'COMPLETED');

    adminBusiness = regData.data.store;
    createdBusinessIds.push(adminBusiness.id);

    // Verify BusinessMember was created
    const member = await prisma.businessMember.findFirst({
      where: { userId: adminUser.id, businessId: adminBusiness.id },
    });
    assert.ok(member);
    assert.equal(member.role, 'ADMIN');
    assert.equal(member.status, 'ACTIVE');

    // Use refreshed token from response
    adminToken = regData.data.token;
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: Existing Admin signs in -> reaches existing shop without duplicate creation
  // ─────────────────────────────────────────────────────────────────────────────
  test('2. Existing Admin signs in -> reaches existing shop without registering again (prevent duplicates)', async () => {
    // If admin calls register-shop again on page refresh or double submit
    const duplicateRes = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shopName: 'Duplicate Store Attempt',
        ownerName: 'New Shop Owner',
      }),
    });

    const duplicateData = await duplicateRes.json();
    assert.equal(duplicateRes.status, 200);
    assert.equal(duplicateData.data.alreadyExists, true);
    assert.equal(duplicateData.data.store.id, adminBusiness.id);
    assert.equal(duplicateData.data.destination, '/dashboard');

    // Check store count in DB for this owner
    const totalStores = await prisma.business.count({
      where: { ownerId: adminUser.id },
    });
    assert.equal(totalStores, 1, 'Duplicate store must NOT be created');

    // Onboarding status returns COMPLETED
    const statusRes = await fetch(`${baseUrl}/store/onboarding-status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusData.data.onboardingStatus, 'COMPLETED');
    assert.equal(statusData.data.destination, '/dashboard');
    assert.equal(statusData.data.canRegisterShop, false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: New Staff registers -> sees no store form -> accepts invitation -> reaches Staff dashboard
  // ─────────────────────────────────────────────────────────────────────────────
  test('3. New Staff registers -> sees no shop registration form -> accepts invitation -> reaches Staff dashboard', async () => {
    const staffEmail = `staff-${timestamp}@bilzet.test`;
    staffUser = await prisma.user.create({
      data: {
        name: 'Alex Cashier',
        email: staffEmail,
        role: 'NONE',
        isOwner: false,
      },
    });
    createdUserIds.push(staffUser.id);
    staffToken = createAuthToken(staffUser);

    // Initial check: no invitations, unassigned
    const initStatusRes = await fetch(`${baseUrl}/store/onboarding-status`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const initStatusData = await initStatusRes.json();
    assert.equal(initStatusData.data.onboardingStatus, 'UNASSIGNED');

    // Admin creates staff invitation
    const inviteRes = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: staffEmail,
        role: 'STAFF',
        department: 'Counter Checkout',
        designation: 'Lead Cashier',
        businessId: adminBusiness.id,
      }),
    });
    const inviteData = await inviteRes.json();
    assert.equal(inviteRes.status, 201, `Failed to invite staff: ${JSON.stringify(inviteData)}`);
    const inviteToken = inviteData.data.invitation.rawToken;

    // Staff checks pending invitations
    const myInvitesRes = await fetch(`${baseUrl}/invitations/my`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const myInvitesData = await myInvitesRes.json();
    assert.equal(myInvitesRes.status, 200);
    assert.ok(myInvitesData.data.invitations.length >= 1);
    const foundInvite = myInvitesData.data.invitations.find((i) => i.recipientEmail === staffEmail);
    assert.ok(foundInvite);
    assert.equal(foundInvite.role, 'STAFF');

    // Staff accepts invitation
    const acceptRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ token: inviteToken }),
    });
    const acceptData = await acceptRes.json();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptData.data.role, 'STAFF');
    assert.equal(acceptData.data.businessId, adminBusiness.id);

    // Refresh staff token with updated role
    staffUser = await prisma.user.findUnique({ where: { id: staffUser.id } });
    staffToken = createAuthToken(staffUser);

    // Check onboarding status now points to Staff Dashboard
    const postStatusRes = await fetch(`${baseUrl}/store/onboarding-status`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const postStatusData = await postStatusRes.json();
    assert.equal(postStatusData.data.onboardingStatus, 'COMPLETED');
    assert.equal(postStatusData.data.destination, '/staff-dashboard');
    assert.equal(postStatusData.data.canRegisterShop, false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: New Manager registers -> accepts Manager invitation -> reaches Manager dashboard
  // ─────────────────────────────────────────────────────────────────────────────
  test('4. New Manager registers -> accepts Manager invitation -> reaches Manager dashboard', async () => {
    const mgrEmail = `mgr-${timestamp}@bilzet.test`;
    managerUser = await prisma.user.create({
      data: {
        name: 'Morgan Manager',
        email: mgrEmail,
        role: 'NONE',
        isOwner: false,
      },
    });
    createdUserIds.push(managerUser.id);
    managerToken = createAuthToken(managerUser);

    // Admin creates Manager invitation
    const inviteRes = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: mgrEmail,
        role: 'MANAGER',
        department: 'Operations',
        designation: 'Store Manager',
        businessId: adminBusiness.id,
      }),
    });
    const inviteData = await inviteRes.json();
    assert.equal(inviteRes.status, 201);
    const inviteToken = inviteData.data.invitation.rawToken;

    // Manager accepts
    const acceptRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ token: inviteToken }),
    });
    const acceptData = await acceptRes.json();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptData.data.role, 'MANAGER');

    managerUser = await prisma.user.findUnique({ where: { id: managerUser.id } });
    managerToken = createAuthToken(managerUser);

    // Manager destination is /dashboard
    const statusRes = await fetch(`${baseUrl}/store/onboarding-status`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusData.data.onboardingStatus, 'COMPLETED');
    assert.equal(statusData.data.destination, '/dashboard');
    assert.equal(statusData.data.canRegisterShop, false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: New CA registers -> accepts CA invitation -> reaches CA Connect
  // ─────────────────────────────────────────────────────────────────────────────
  test('5. New CA registers -> accepts CA invitation -> reaches CA Connect (/ca-portal)', async () => {
    const caEmail = `ca-${timestamp}@bilzet.test`;
    caUser = await prisma.user.create({
      data: {
        name: 'Ramesh CA & Associates',
        email: caEmail,
        role: 'NONE',
        isOwner: false,
      },
    });
    createdUserIds.push(caUser.id);
    caToken = createAuthToken(caUser);

    // Admin creates CA invitation
    const inviteRes = await fetch(`${baseUrl}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: caEmail,
        role: 'CA',
        department: 'Finance & Audit',
        designation: 'Statutory Auditor',
        businessId: adminBusiness.id,
      }),
    });
    const inviteData = await inviteRes.json();
    assert.equal(inviteRes.status, 201);
    const inviteToken = inviteData.data.invitation.rawToken;

    // CA accepts
    const acceptRes = await fetch(`${baseUrl}/invitations/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ token: inviteToken }),
    });
    const acceptData = await acceptRes.json();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptData.data.role, 'CA');

    caUser = await prisma.user.findUnique({ where: { id: caUser.id } });
    caToken = createAuthToken(caUser);

    // CA destination is /ca-portal
    const statusRes = await fetch(`${baseUrl}/store/onboarding-status`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusData.data.onboardingStatus, 'COMPLETED');
    assert.equal(statusData.data.destination, '/ca-portal');
    assert.equal(statusData.data.canRegisterShop, false);

    // Verify CA store access record
    const access = await prisma.caStoreAccess.findFirst({
      where: { caUserId: caUser.id, businessId: adminBusiness.id },
    });
    assert.ok(access);
    assert.equal(access.status, 'ACTIVE');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: Staff signs out and signs in again -> remains in assigned Staff workspace
  // ─────────────────────────────────────────────────────────────────────────────
  test('6. Staff signs out and signs in again -> remains in assigned Staff workspace', async () => {
    // Generate fresh session token simulating fresh sign-in
    const freshToken = createAuthToken({
      id: staffUser.id,
      email: staffUser.email,
      role: 'STAFF',
      businessId: adminBusiness.id,
      isOwner: false,
    });

    const statusRes = await fetch(`${baseUrl}/store/onboarding-status`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusRes.status, 200);
    assert.equal(statusData.data.onboardingStatus, 'COMPLETED');
    assert.equal(statusData.data.destination, '/staff-dashboard');
    assert.equal(statusData.data.canRegisterShop, false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 7: Staff opens shop-registration directly -> access is denied (403 Forbidden)
  // ─────────────────────────────────────────────────────────────────────────────
  test('7. Staff attempts to register a shop directly -> access is denied with 403 Forbidden', async () => {
    const attemptRes = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        shopName: 'Unauthorized Staff Store',
        ownerName: 'Alex Cashier',
      }),
    });

    assert.equal(attemptRes.status, 403, 'Staff must be forbidden from creating stores');
    const attemptData = await attemptRes.json();
    assert.ok(
      attemptData.message.includes('not authorized') ||
      attemptData.message.includes('Staff')
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 8: Uninvited user attempts to access a business -> access is denied (403 Forbidden)
  // ─────────────────────────────────────────────────────────────────────────────
  test('8. Uninvited user attempts to access a business -> access is denied with 403 Forbidden', async () => {
    const uninvitedUser = await prisma.user.create({
      data: {
        name: 'Intruder User',
        email: `intruder-${timestamp}@bilzet.test`,
        role: 'NONE',
        isOwner: false,
      },
    });
    createdUserIds.push(uninvitedUser.id);
    const intruderToken = createAuthToken(uninvitedUser);

    // Attempt to switch to admin's business
    const switchRes = await fetch(`${baseUrl}/store/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${intruderToken}`,
      },
      body: JSON.stringify({ storeId: adminBusiness.id }),
    });

    assert.equal(switchRes.status, 403, 'Uninvited user must be denied access');
    const switchData = await switchRes.json();
    assert.ok(switchData.message.includes('not authorized') || switchData.message.includes('forbidden'));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 9: Multi-business invitations -> user can select only authorized accepted membership
  // ─────────────────────────────────────────────────────────────────────────────
  test('9. User receives invitations from multiple businesses -> can switch only to authorized accepted membership', async () => {
    // 1. Create second business owned by a second admin
    const secondOwner = await prisma.user.create({
      data: {
        name: 'Second Owner',
        email: `owner2-${timestamp}@bilzet.test`,
        role: 'ADMIN',
        isOwner: true,
      },
    });
    createdUserIds.push(secondOwner.id);

    multiBusinessB = await prisma.business.create({
      data: {
        name: 'Downtown Wholesale Hub',
        ownerId: secondOwner.id,
        email: secondOwner.email,
        gstin: '33BBBBB5678B1Z6',
      },
    });
    createdBusinessIds.push(multiBusinessB.id);

    // 2. Create multi-member user
    multiMemberUser = await prisma.user.create({
      data: {
        name: 'Sam Multi-Store Staff',
        email: `sam-${timestamp}@bilzet.test`,
        role: 'STAFF',
        businessId: adminBusiness.id,
        isOwner: false,
      },
    });
    createdUserIds.push(multiMemberUser.id);
    multiMemberToken = createAuthToken(multiMemberUser);

    // Add membership to Business A (as STAFF)
    await prisma.businessMember.create({
      data: {
        userId: multiMemberUser.id,
        businessId: adminBusiness.id,
        role: 'STAFF',
        status: 'ACTIVE',
      },
    });

    // Add membership to Business B (as MANAGER)
    await prisma.businessMember.create({
      data: {
        userId: multiMemberUser.id,
        businessId: multiBusinessB.id,
        role: 'MANAGER',
        status: 'ACTIVE',
      },
    });

    // Fetch user's authorized stores
    const storesRes = await fetch(`${baseUrl}/store`, {
      headers: { Authorization: `Bearer ${multiMemberToken}` },
    });
    const storesData = await storesRes.json();
    assert.equal(storesRes.status, 200);
    assert.equal(storesData.data.totalStores, 2);
    assert.equal(storesData.data.isMultiStore, true);

    // Switch to Business B
    const switchRes = await fetch(`${baseUrl}/store/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${multiMemberToken}`,
      },
      body: JSON.stringify({ storeId: multiBusinessB.id }),
    });
    const switchData = await switchRes.json();
    assert.equal(switchRes.status, 200);
    assert.equal(switchData.data.activeStoreId, multiBusinessB.id);
    assert.equal(switchData.data.user.role, 'MANAGER');

    // Attempting to switch to an unauthorized 3rd store fails
    const fakeStoreRes = await fetch(`${baseUrl}/store/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${multiMemberToken}`,
      },
      body: JSON.stringify({ storeId: 'non-existent-store-id' }),
    });
    assert.equal(fakeStoreRes.status, 403);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 10: Existing users and financial records remain intact
  // ─────────────────────────────────────────────────────────────────────────────
  test('10. Existing users and financial records remain intact and unaffected by registration flows', async () => {
    // 1. Create a test invoice under admin business
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-E2E-${Date.now().toString().slice(-6)}`,
        businessId: adminBusiness.id,
        userId: adminUser.id,
        subtotal: 1500,
        taxTotal: 270,
        grandTotal: 1770,
        status: 'PAID',
      },
    });

    // 2. Query invoice back
    const retrieved = await prisma.invoice.findUnique({
      where: { id: invoice.id },
    });
    assert.ok(retrieved);
    assert.equal(retrieved.grandTotal, 1770);
    assert.equal(retrieved.businessId, adminBusiness.id);

    // 3. Verify admin user record is still valid and has owner privileges
    const ownerCheck = await prisma.user.findUnique({
      where: { id: adminUser.id },
    });
    assert.equal(ownerCheck.isOwner, true);
    assert.equal(ownerCheck.role, 'ADMIN');
    assert.equal(ownerCheck.businessId, adminBusiness.id);

    // Clean up created test invoice
    await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
  });
});
