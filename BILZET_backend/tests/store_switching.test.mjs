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

describe('PHASE 4: ADMIN STORE SWITCHING & DATA ISOLATION', () => {
  const singleAdminId = 'user-single-admin';
  const singleStoreId = 'busi-single-store';

  const multiAdminId = 'user-multi-admin';
  const storeAId = 'busi-multi-store-a';
  const storeBId = 'busi-multi-store-b';
  const storeCId = 'busi-multi-store-c';

  const otherAdminId = 'user-other-admin';
  const unauthorizedStoreId = 'busi-unauthorized-store-d';

  before(async () => {
    // 1. Single-Store Admin Setup
    await prisma.business.create({
      data: { id: singleStoreId, name: 'Single Branch Store', ownerId: singleAdminId },
    });
    await prisma.user.create({
      data: {
        id: singleAdminId,
        email: 'single@bilzet.com',
        role: 'ADMIN',
        businessId: singleStoreId,
        isOwner: true,
        isActive: true,
      },
    });

    // 2. Multi-Store Admin Setup (Owns Store A, Store B, Store C)
    await prisma.business.create({
      data: { id: storeAId, name: 'ABC Furniture', address: '12 Main Rd', ownerId: multiAdminId },
    });
    await prisma.business.create({
      data: { id: storeBId, name: 'XYZ Furniture', address: '45 Cross St', ownerId: multiAdminId },
    });
    await prisma.business.create({
      data: { id: storeCId, name: 'Karthik Electronics', address: '88 Tech Park', ownerId: multiAdminId },
    });

    await prisma.user.create({
      data: {
        id: multiAdminId,
        email: 'multistore@bilzet.com',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
        isActive: true,
      },
    });

    // 3. Other Admin Setup (Owns Store D)
    await prisma.business.create({
      data: { id: unauthorizedStoreId, name: 'Unauthorized Store D', ownerId: otherAdminId },
    });
    await prisma.user.create({
      data: {
        id: otherAdminId,
        email: 'other@bilzet.com',
        role: 'ADMIN',
        businessId: unauthorizedStoreId,
        isOwner: true,
        isActive: true,
      },
    });

    // 4. Seed Data in Store A and Store B for isolation test
    await prisma.sale.create({
      data: {
        id: 'sale-store-a-01',
        invoiceNumber: 'INV-A-001',
        businessId: storeAId,
        grandTotal: 1500,
        paidAmount: 1500,
        subtotal: 1500,
        status: 'COMPLETED',
      },
    });

    await prisma.sale.create({
      data: {
        id: 'sale-store-b-01',
        invoiceNumber: 'INV-B-001',
        businessId: storeBId,
        grandTotal: 8400,
        paidAmount: 8400,
        subtotal: 8400,
        status: 'COMPLETED',
      },
    });
  });

  test('Test 1 — Single Store Admin retrieves exactly one authorized store', async () => {
    const token = generateToken({
      userId: singleAdminId,
      email: 'single@bilzet.com',
      role: 'ADMIN',
      businessId: singleStoreId,
    });

    const res = await fetch(`${baseUrl}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.stores.length, 1);
    assert.strictEqual(data.data.stores[0].id, singleStoreId);
    assert.strictEqual(data.data.stores[0].name, 'Single Branch Store');
    assert.strictEqual(data.data.currentStoreId, singleStoreId);
  });

  test('Test 2 — Multi-Store Admin retrieves all authorized stores (ABC Furniture, XYZ Furniture, Karthik Electronics)', async () => {
    const token = generateToken({
      userId: multiAdminId,
      email: 'multistore@bilzet.com',
      role: 'ADMIN',
      businessId: storeAId,
    });

    const res = await fetch(`${baseUrl}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.stores.length, 3);

    const storeIds = data.data.stores.map((s) => s.id);
    assert.ok(storeIds.includes(storeAId));
    assert.ok(storeIds.includes(storeBId));
    assert.ok(storeIds.includes(storeCId));

    // Must NOT contain Store D
    assert.ok(!storeIds.includes(unauthorizedStoreId));

    // Current store should be Store A
    assert.strictEqual(data.data.currentStoreId, storeAId);
  });

  test('Test 3 — Store Switching & Complete Data Isolation (Store A -> Store B)', async () => {
    // Start with Store A
    const tokenStoreA = generateToken({
      userId: multiAdminId,
      email: 'multistore@bilzet.com',
      role: 'ADMIN',
      businessId: storeAId,
    });

    // Verify Store A sales
    const salesResA = await fetch(`${baseUrl}/sales`, {
      headers: { Authorization: `Bearer ${tokenStoreA}` },
    });
    assert.strictEqual(salesResA.status, 200);
    const salesDataA = await salesResA.json();
    const invoicesA = (salesDataA.data?.sales || salesDataA.sales || []).map((s) => s.invoiceNumber);
    assert.ok(invoicesA.includes('INV-A-001'));
    assert.ok(!invoicesA.includes('INV-B-001'), 'Store A must not see Store B invoice');

    // Perform Store Switch to Store B via /api/v1/stores/switch
    const switchRes = await fetch(`${baseUrl}/stores/switch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenStoreA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storeId: storeBId }),
    });
    assert.strictEqual(switchRes.status, 200);
    const switchData = await switchRes.json();
    assert.strictEqual(switchData.success, true);
    assert.strictEqual(switchData.data.activeStore.id, storeBId);
    assert.ok(switchData.data.token, 'Must return new JWT token scoped to Store B');

    // Use new token to query sales in Store B
    const tokenStoreB = switchData.data.token;
    const salesResB = await fetch(`${baseUrl}/sales`, {
      headers: { Authorization: `Bearer ${tokenStoreB}` },
    });
    assert.strictEqual(salesResB.status, 200);
    const salesDataB = await salesResB.json();
    const invoicesB = (salesDataB.data?.sales || salesDataB.sales || []).map((s) => s.invoiceNumber);
    assert.ok(invoicesB.includes('INV-B-001'), 'Store B must see Store B invoice');
    assert.ok(!invoicesB.includes('INV-A-001'), 'Store B must not see Store A invoice');
  });

  test('Test 4 — Unauthorized Store switch attempt returns 403 Forbidden', async () => {
    const token = generateToken({
      userId: multiAdminId,
      email: 'multistore@bilzet.com',
      role: 'ADMIN',
      businessId: storeAId,
    });

    // Attempt to switch to unauthorized Store D
    const switchRes = await fetch(`${baseUrl}/stores/switch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storeId: unauthorizedStoreId }),
    });

    assert.strictEqual(switchRes.status, 403);
    const data = await switchRes.json();
    assert.strictEqual(data.success, false);
  });

  test('Test 5 — Header Tampering (Anti-IDOR) with x-business-id blocked by middleware', async () => {
    const token = generateToken({
      userId: multiAdminId,
      email: 'multistore@bilzet.com',
      role: 'ADMIN',
      businessId: storeAId,
    });

    // Multi-Admin attempts passing unauthorized store ID in x-business-id header
    const tamperRes = await fetch(`${baseUrl}/sales`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-business-id': unauthorizedStoreId,
      },
    });

    // Auth middleware must detect that unauthorizedStoreId does not belong to multiAdmin and reject
    assert.strictEqual(tamperRes.status, 403);
    const tamperData = await tamperRes.json();
    assert.strictEqual(tamperData.success, false);
  });

  test('Test 6 — Admin creates a new branch store without requiring credentials or store ID', async () => {
    const token = generateToken({
      userId: multiAdminId,
      email: 'multistore@bilzet.com',
      role: 'ADMIN',
      businessId: storeAId,
    });

    const createRes = await fetch(`${baseUrl}/stores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'South Branch Outlet',
        address: '100 South Lake Rd',
      }),
    });

    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    assert.strictEqual(createData.data.store.name, 'South Branch Outlet');

    // List stores to confirm new branch is authorized
    const listRes = await fetch(`${baseUrl}/stores`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    const branchNames = listData.data.stores.map((s) => s.name);
    assert.ok(branchNames.includes('South Branch Outlet'));
  });
});
