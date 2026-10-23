import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import prisma from '../src/config/prisma.mjs';
import { env } from '../src/config/env.mjs';

describe('BILZET — 3-Step Store Registration Flow & Backend Verification', () => {
  let server;
  let baseUrl;

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
    try {
      if (createdBusinessIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { businessId: { in: createdBusinessIds } } }).catch(() => {});
        await prisma.businessMember.deleteMany({ where: { businessId: { in: createdBusinessIds } } }).catch(() => {});
        await prisma.business.deleteMany({ where: { id: { in: createdBusinessIds } } }).catch(() => {});
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
      }
    } catch (err) {
      console.warn('Cleanup warning:', err.message);
    }

    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
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

  test('1. Validates required store registration fields and rejects empty payload', async () => {
    const owner = await prisma.user.create({
      data: {
        email: `owner_val_${timestamp}@bilzet.app`,
        password: 'hashed_password',
        name: 'Validation Tester',
        role: 'ADMIN',
      },
    });
    createdUserIds.push(owner.id);
    const token = createAuthToken(owner);

    const res = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /name is required/i);
  });

  test('2. Complete Step 3 submission creates store, links Admin/Owner, and sets active session', async () => {
    const owner = await prisma.user.create({
      data: {
        email: `owner_full_${timestamp}@bilzet.app`,
        password: 'hashed_password',
        name: 'Master Merchant',
        phone: '9876543210',
        role: 'ADMIN',
      },
    });
    createdUserIds.push(owner.id);
    const token = createAuthToken(owner);

    const registrationPayload = {
      name: 'Apex Hypermarket',
      shopName: 'Apex Hypermarket',
      businessType: 'SUPERMARKET',
      ownerName: 'Master Merchant',
      phone: '9876543210',
      email: `apex_${timestamp}@bilzet.app`,
      address: '100 Crosscut Road, Gandhipuram, Coimbatore, PIN: 641012',
      city: 'Coimbatore',
      district: 'Coimbatore',
      pinCode: '641012',
      state: 'Tamil Nadu',
      stateCode: '33',
      gstin: '33ABCDE1234F1Z5',
    };

    const res = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(registrationPayload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.store.name, 'Apex Hypermarket');
    assert.equal(data.data.store.gstin, '33ABCDE1234F1Z5');
    assert.equal(data.data.store.state, 'Tamil Nadu');
    assert.equal(data.data.destination, '/dashboard');
    assert.ok(data.data.token, 'Must return refreshed JWT token with businessId');

    createdBusinessIds.push(data.data.store.id);

    // Verify DB record
    const savedStore = await prisma.business.findUnique({
      where: { id: data.data.store.id },
    });
    assert.ok(savedStore);
    assert.equal(savedStore.ownerId, owner.id);
    assert.equal(savedStore.businessType, 'SUPERMARKET');

    // Verify BusinessMember
    const member = await prisma.businessMember.findFirst({
      where: { userId: owner.id, businessId: savedStore.id },
    });
    assert.ok(member);
    assert.equal(member.role, 'ADMIN');
    assert.equal(member.status, 'ACTIVE');
  });

  test('3. Repeated click / re-submission prevents duplicate store creation and updates existing record', async () => {
    const owner = await prisma.user.create({
      data: {
        email: `owner_dup_${timestamp}@bilzet.app`,
        password: 'hashed_password',
        name: 'Retry Owner',
        role: 'ADMIN',
      },
    });
    createdUserIds.push(owner.id);
    const token = createAuthToken(owner);

    // Initial Registration
    const res1 = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shopName: 'Original Store Name',
        businessType: 'RETAIL',
        ownerName: 'Retry Owner',
        state: 'Tamil Nadu',
      }),
    });
    const data1 = await res1.json();
    assert.equal(res1.status, 201);
    createdBusinessIds.push(data1.data.store.id);

    // Duplicate Submission / Retry
    const res2 = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shopName: 'Updated Store Name',
        businessType: 'RETAIL',
        ownerName: 'Retry Owner',
        state: 'Tamil Nadu',
      }),
    });
    const data2 = await res2.json();
    assert.equal(res2.status, 200);
    assert.equal(data2.data.alreadyExists, true, 'Must flag alreadyExists: true');
    assert.equal(data2.data.store.id, data1.data.store.id, 'Must reuse the exact same store ID');

    // Count in DB must be exactly 1
    const count = await prisma.business.count({
      where: { ownerId: owner.id },
    });
    assert.equal(count, 1, 'Owner must only have 1 store created, no duplicates');
  });

  test('4. Staff / Cashier role cannot call register-shop (403 Forbidden)', async () => {
    const staff = await prisma.user.create({
      data: {
        email: `staff_block_${timestamp}@bilzet.app`,
        password: 'hashed_password',
        name: 'Cashier Employee',
        role: 'STAFF',
      },
    });
    createdUserIds.push(staff.id);
    const token = createAuthToken(staff);

    const res = await fetch(`${baseUrl}/store/register-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shopName: 'Unauthorized Staff Store',
      }),
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /not authorized/i);
  });
});
