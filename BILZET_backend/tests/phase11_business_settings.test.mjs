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

describe('PHASE 11: BUSINESS SETTINGS IMPROVEMENTS & SUBSCRIPTION CONTROLS', () => {
  const freeBizId = 'biz-p11-free';
  const freeOwnerId = 'user-p11-free-owner';

  const proBizId = 'biz-p11-pro';
  const proOwnerId = 'user-p11-pro-owner';

  const premBizId = 'biz-p11-prem';
  const premOwnerId = 'user-p11-prem-owner';

  let freeToken;
  let proToken;
  let premToken;

  before(async () => {
    // 1. FREE BUSINESS & USER
    await prisma.business.create({
      data: {
        id: freeBizId,
        name: 'Free Starter Enterprise',
        ownerId: freeOwnerId,
        phone: '+91 9111111111',
        email: 'free.biz@bilzet.test',
        address: '100 Free Street, Coimbatore',
        gstin: '33FREEB0000A1Z1',
      },
    });
    await prisma.user.create({
      data: {
        id: freeOwnerId,
        email: 'free.owner@bilzet.test',
        name: 'Free Owner',
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

    // 2. PRO BUSINESS & USER
    await prisma.business.create({
      data: {
        id: proBizId,
        name: 'Pro Retail Mart',
        ownerId: proOwnerId,
        phone: '+91 9222222222',
        email: 'pro.biz@bilzet.test',
        address: '200 Pro Boulevard, Chennai',
        gstin: '33PROBB0000A1Z2',
      },
    });
    await prisma.user.create({
      data: {
        id: proOwnerId,
        email: 'pro.owner@bilzet.test',
        name: 'Pro Owner',
        role: 'ADMIN',
        businessId: proBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p11-pro-01',
        userId: proOwnerId,
        planTier: 'PRO',
        planName: 'Pro Business Plan',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 180 * 24 * 3600 * 1000),
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

    // 3. PREMIUM BUSINESS & USER
    await prisma.business.create({
      data: {
        id: premBizId,
        name: 'Premium Corporation',
        ownerId: premOwnerId,
        phone: '+91 9333333333',
        email: 'prem.biz@bilzet.test',
        address: '300 Premium Towers, Bengaluru',
        gstin: '33PREMB0000A1Z3',
      },
    });
    await prisma.user.create({
      data: {
        id: premOwnerId,
        email: 'prem.owner@bilzet.test',
        name: 'Premium Owner',
        role: 'ADMIN',
        businessId: premBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p11-prem-01',
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
      email: 'prem.owner@bilzet.test',
      role: 'ADMIN',
      permissions: ['*'],
      businessId: premBizId,
    });
  });

  after(async () => {
    // Teardown
    await prisma.subscription.deleteMany({
      where: { id: { in: ['sub-p11-pro-01', 'sub-p11-prem-01'] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [freeOwnerId, proOwnerId, premOwnerId] } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [freeBizId, proBizId, premBizId] } },
    });
  });

  // ──────────────────────────────────────────────────────────
  // 1. FREE USER SCENARIOS
  // ──────────────────────────────────────────────────────────
  test('Free user receives FREE subscriptionTier in GET /settings/shop', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      headers: { Authorization: `Bearer ${freeToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.subscriptionTier, 'FREE');
    assert.ok(data.data.settings.shopName);
  });

  test('Free user can update standard Business Information (A4 paper size, invoice title)', async () => {
    const payload = {
      shopName: 'Updated Free Mart',
      ownerName: 'Free Owner Modified',
      phone: '+91 9999888877',
      email: 'updated.free@bilzet.test',
      address: '777 Freedom Road, Tirupur',
      gstin: '33ABCDE1234F1Z5',
      paperSize: 'A4',
      invoiceTitle: 'RETAIL TAX INVOICE',
      invoicePrefix: 'BIL-2026-',
    };

    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.shopName, 'Updated Free Mart');
    assert.equal(data.data.settings.paperSize, 'A4');
    assert.equal(data.data.settings.invoicePrefix, 'BIL-2026-');

    // Also assert the Business tenant record was updated synchronously
    const updatedBiz = await prisma.business.findUnique({ where: { id: freeBizId } });
    assert.equal(updatedBiz.name, 'Updated Free Mart');
    assert.equal(updatedBiz.phone, '+91 9999888877');
  });

  test('Free user is REJECTED (403) when attempting to configure Pro-only Thermal 80mm roll', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({ paperSize: 'Thermal 80mm' }),
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PRO');
    assert.match(data.message, /Thermal 80mm/i);
  });

  test('Free user is REJECTED (403) when attempting to remove BILZET watermark', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({ showWatermark: false }),
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PRO');
  });

  test('Free user is REJECTED (403) when attempting to configure direct UPI QR on invoice', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        showQrCode: true,
        upiId: 'freepay@okhdfcbank',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PRO');
  });

  test('Free user is REJECTED (403) when attempting to configure Premium-only Thermal 58mm roll', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({ paperSize: 'Thermal 58mm' }),
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PREMIUM');
    assert.match(data.message, /Thermal 58mm/i);
  });

  // ──────────────────────────────────────────────────────────
  // 2. PRO USER SCENARIOS
  // ──────────────────────────────────────────────────────────
  test('Pro user receives PRO subscriptionTier in GET /settings/shop', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.subscriptionTier, 'PRO');
  });

  test('Pro user CAN configure Thermal 80mm roll, watermark removal, and bank/UPI details', async () => {
    const payload = {
      paperSize: 'Thermal 80mm',
      showWatermark: false,
      removeWatermark: true,
      showBankDetails: true,
      showQrCode: true,
      bankName: 'Axis Bank Ltd',
      accountHolder: 'Pro Retail Mart',
      accountNumber: '919020012345678',
      ifsc: 'UTIB0001234',
      upiId: 'proretail@axisbank',
    };

    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.paperSize, 'Thermal 80mm');
    assert.equal(data.data.settings.bankName, 'Axis Bank Ltd');
    assert.equal(data.data.settings.upiId, 'proretail@axisbank');
  });

  test('Pro user is REJECTED (403) when attempting to use Premium-only Thermal 58mm roll', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proToken}`,
      },
      body: JSON.stringify({ paperSize: 'Thermal 58mm' }),
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PREMIUM');
    assert.match(data.message, /Thermal 58mm/i);
  });

  test('Pro user is REJECTED (403) when attempting to use Premium custom HEX brand color', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proToken}`,
      },
      body: JSON.stringify({ customColor: '#ff0055' }),
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.equal(data.requiredPlan, 'PREMIUM');
    assert.match(data.message, /brand color/i);
  });

  // ──────────────────────────────────────────────────────────
  // 3. PREMIUM USER SCENARIOS
  // ──────────────────────────────────────────────────────────
  test('Premium user receives PREMIUM subscriptionTier in GET /settings/shop', async () => {
    const res = await fetch(`${baseUrl}/settings/shop`, {
      headers: { Authorization: `Bearer ${premToken}` },
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.subscriptionTier, 'PREMIUM');
  });

  test('Premium user CAN configure Thermal 58mm, custom brand HEX color, and multi-document terms', async () => {
    const payload = {
      paperSize: 'Thermal 58mm',
      customColor: '#8a2be2',
      multiDocumentTerms: {
        invoice: 'Standard billing terms',
        estimate: 'Quotation valid for 30 days',
        deliveryChallan: 'Goods received in good condition',
      },
      shopName: 'Premium Global Enterprise',
    };

    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${premToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.data.settings.paperSize, 'Thermal 58mm');
    assert.equal(data.data.settings.customColor, '#8a2be2');
    assert.equal(data.data.settings.shopName, 'Premium Global Enterprise');
  });

  // ──────────────────────────────────────────────────────────
  // 4. DATA PRESERVATION & TENANT SYNC
  // ──────────────────────────────────────────────────────────
  test('Business details and previous configurations remain intact after subsequent partial updates', async () => {
    // 1. Partial update modifying only email and phone
    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${premToken}`,
      },
      body: JSON.stringify({
        email: 'ceo@premiumglobal.com',
        phone: '+91 9999900000',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    // 2. Fetch fresh from GET /settings/shop
    const getRes = await fetch(`${baseUrl}/settings/shop`, {
      headers: { Authorization: `Bearer ${premToken}` },
    });
    const freshData = await getRes.json();
    const s = freshData.data.settings;

    assert.equal(s.email, 'ceo@premiumglobal.com');
    assert.equal(s.phone, '+91 9999900000');
    // Verify previous fields were not wiped or overwritten
    assert.equal(s.paperSize, 'Thermal 58mm');
    assert.equal(s.customColor, '#8a2be2');
    assert.equal(s.shopName, 'Premium Global Enterprise');
  });
});
