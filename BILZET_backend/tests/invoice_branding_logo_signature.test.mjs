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

// Minimal 1x1 valid PNG (68 bytes)
const valid1x1Png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal 1x1 valid JPEG (125 bytes)
const valid1x1Jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

// Minimal 1x1 valid WebP
const valid1x1WebP = Buffer.from(
  'UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vsGAAA=',
  'base64'
);

describe('INVOICE BRANDING: COMPANY LOGO & OWNER SIGNATURE SUITE', () => {
  const storeAId = 'biz-brand-store-a';
  const storeBId = 'biz-brand-store-b';
  const ownerAId = 'user-brand-owner-a';
  const staffAId = 'user-brand-staff-a';

  let ownerAToken;
  let staffAToken;

  before(async () => {
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Alpha Retail Store',
        ownerId: ownerAId,
        phone: '+91 9999900001',
        email: 'alpha@store.test',
        address: '100 Alpha Road',
        gstin: '33AAAAA1111A1Z1',
      },
    });

    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Beta Wholesale Mart',
        ownerId: 'user-brand-owner-b',
        phone: '+91 9999900002',
        email: 'beta@store.test',
        address: '200 Beta Lane',
        gstin: '33BBBBB2222B2Z2',
      },
    });

    await prisma.user.create({
      data: {
        id: ownerAId,
        name: 'Alice Owner',
        email: 'alice@store.test',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
      },
    });

    await prisma.user.create({
      data: {
        id: staffAId,
        name: 'Sam Cashier',
        email: 'sam@store.test',
        role: 'CASHIER',
        businessId: storeAId,
        isOwner: false,
      },
    });

    ownerAToken = generateToken({
      id: ownerAId,
      email: 'alice@store.test',
      role: 'ADMIN',
      businessId: storeAId,
      isOwner: true,
    });

    staffAToken = generateToken({
      id: staffAId,
      email: 'sam@store.test',
      role: 'CASHIER',
      businessId: storeAId,
      isOwner: false,
    });
  });

  test('1. Unauthorized staff/cashier cannot upload branding (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffAToken}`,
      },
      body: JSON.stringify({
        type: 'logo',
        fileData: `data:image/png;base64,${valid1x1Png.toString('base64')}`,
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('2. Uploading corrupted/non-image content is rejected by magic bytes inspection', async () => {
    const fakeBuffer = Buffer.from('NOT_AN_IMAGE_FILE_JUST_PLAIN_TEXT_CONTENT');
    const res = await fetch(`${baseUrl}/settings/branding/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        type: 'logo',
        fileData: `data:image/png;base64,${fakeBuffer.toString('base64')}`,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Invalid or unsupported image file/);
  });

  test('3. Uploading oversized image (>2MB) is rejected', async () => {
    // 2.5MB fake buffer
    const largeBuffer = Buffer.alloc(2.5 * 1024 * 1024, 0x89);
    const res = await fetch(`${baseUrl}/settings/branding/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        type: 'logo',
        fileData: largeBuffer.toString('base64'),
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /limit/i);
  });

  test('4. WebP is rejected for Owner Signature (only PNG or JPG allowed)', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        type: 'signature',
        fileData: `data:image/webp;base64,${valid1x1WebP.toString('base64')}`,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /signature must be a PNG image.*JPG/i);
  });

  let uploadedLogoUrl = '';
  test('5. Authorized owner can upload genuine PNG company logo', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        type: 'logo',
        fileData: `data:image/png;base64,${valid1x1Png.toString('base64')}`,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.type, 'logo');
    assert.ok(body.data.url.includes('/branding/file/'));
    uploadedLogoUrl = body.data.url;
  });

  let uploadedSignatureUrl = '';
  test('6. Authorized owner can upload genuine PNG owner signature', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        type: 'signature',
        fileData: `data:image/png;base64,${valid1x1Png.toString('base64')}`,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.type, 'signature');
    assert.ok(body.data.url.includes('/branding/file/'));
    uploadedSignatureUrl = body.data.url;
  });

  test('7. Public asset serving endpoint serves image with correct Content-Type and CORS headers', async () => {
    const fullAssetUrl = `${baseUrl.replace('/api/v1', '')}${uploadedLogoUrl}`;
    const res = await fetch(fullAssetUrl);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });

  test('8. Path traversal attempt in image serving is blocked', async () => {
    const maliciousUrl = `${baseUrl}/settings/branding/file/${storeAId}/..%2f..%2fpackage.json`;
    const res = await fetch(maliciousUrl);
    assert.ok(res.status === 400 || res.status === 403 || res.status === 404);
  });

  test('9. Independent visibility preferences: Logo enabled, signature disabled', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        showLogoOnInvoices: true,
        showSignatureOnInvoices: false,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.branding.showLogoOnInvoices, true);
    assert.equal(body.data.branding.showSignatureOnInvoices, false);

    // Verify GET settings reflects this state
    const getRes = await fetch(`${baseUrl}/settings/shop`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    const getBody = await getRes.json();
    assert.equal(getBody.data.settings.showLogoOnInvoices, true);
    assert.equal(getBody.data.settings.showSignatureOnInvoices, false);
    assert.ok(getBody.data.settings.logoUrl);
    assert.ok(getBody.data.settings.signatureUrl);
  });

  test('10. Independent visibility preferences: Both disabled', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        showLogoOnInvoices: false,
        showSignatureOnInvoices: false,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.branding.showLogoOnInvoices, false);
    assert.equal(body.data.branding.showSignatureOnInvoices, false);
  });

  test('11. Tenant isolation: Store B has no access to Store A branding', async () => {
    const ownerBToken = generateToken({
      id: 'user-brand-owner-b',
      email: 'beta@store.test',
      role: 'ADMIN',
      businessId: storeBId,
      isOwner: true,
    });

    const getRes = await fetch(`${baseUrl}/settings/shop`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const getBody = await getRes.json();

    // Store B's logoUrl and signatureUrl must be empty / not Store A's
    assert.equal(getBody.data.settings.logoUrl, null);
    assert.equal(getBody.data.settings.signatureUrl, null);
    assert.equal(getBody.data.settings.showLogoOnInvoices, false);
    assert.equal(getBody.data.settings.showSignatureOnInvoices, false);
  });

  test('12. Remove company logo clears asset reference and resets toggle', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/logo`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.branding.logoUrl, null);
    assert.equal(body.data.branding.showLogoOnInvoices, false);
  });

  test('13. Remove owner signature clears asset reference and resets toggle', async () => {
    const res = await fetch(`${baseUrl}/settings/branding/signature`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.branding.signatureUrl, null);
    assert.equal(body.data.branding.showSignatureOnInvoices, false);
  });
});
