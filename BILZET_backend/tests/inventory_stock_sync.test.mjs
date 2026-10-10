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

describe('PHASE 5: INVENTORY & STOCK OVERVIEW IMPROVEMENTS', () => {
  const adminId = 'user-admin-inv-01';
  const businessId = 'busi-inv-01';
  let token;
  let testProductId;

  before(async () => {
    token = generateToken({
      userId: adminId,
      email: 'admin-inv@bilzet.com',
      role: 'ADMIN',
      businessId,
    });

    await prisma.business.create({
      data: { id: businessId, name: 'Inventory Test Mart', ownerId: adminId },
    });

    await prisma.user.create({
      data: {
        id: adminId,
        email: 'admin-inv@bilzet.com',
        role: 'ADMIN',
        businessId,
        isOwner: true,
        isActive: true,
      },
    });
  });

  test('1. Product created in catalog automatically reflects in Stock Overview', async () => {
    // Create new product "Ergonomic Office Chair"
    const prodRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Ergonomic Office Chair',
        sku: 'EOC-500',
        barcode: '8901234567999',
        sellingPrice: 4500,
        purchasePrice: 3200,
        stock: 50,
        minimumStock: 10,
        unit: 'piece',
      }),
    });

    assert.strictEqual(prodRes.status, 201);
    const prodData = await prodRes.json();
    assert.strictEqual(prodData.success, true);
    testProductId = prodData.data.product.id || prodData.data.product._id;
    assert.ok(testProductId);

    // Fetch Stock Overview and verify the product is automatically present
    const invRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(invRes.status, 200);
    const invData = await invRes.json();
    assert.strictEqual(invData.success, true);

    const found = (invData.data.inventory || []).find(
      (p) => (p.id || p._id) === testProductId || p.sku === 'EOC-500'
    );
    assert.ok(found, 'Product must appear in Stock Overview');
    assert.strictEqual(found.name, 'Ergonomic Office Chair');
    assert.strictEqual(Number(found.stock), 50);
    assert.strictEqual(Number(found.currentStock), 50);
    assert.strictEqual(Number(found.sellingPrice), 4500);
  });

  test('2. Product details updated in catalog automatically synchronize with Stock Overview', async () => {
    // Update product price and name
    const updateRes = await fetch(`${baseUrl}/products/${testProductId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Executive Ergonomic Chair Pro',
        sellingPrice: 5200,
      }),
    });
    assert.strictEqual(updateRes.status, 200);

    // Query Stock Overview
    const invRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const invData = await invRes.json();
    const updated = (invData.data.inventory || []).find((p) => (p.id || p._id) === testProductId);

    assert.ok(updated);
    assert.strictEqual(updated.name, 'Executive Ergonomic Chair Pro');
    assert.strictEqual(Number(updated.sellingPrice), 5200);
    assert.strictEqual(Number(updated.stock), 50);
  });

  test('3. Stock Adjustment (Add Stock: 50 -> 65)', async () => {
    const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: testProductId,
        type: 'ADD',
        quantity: 15,
        reason: 'New Purchase Batch',
      }),
    });

    assert.strictEqual(adjustRes.status, 200);
    const adjustData = await adjustRes.json();
    assert.strictEqual(adjustData.success, true);
    assert.strictEqual(Number(adjustData.data.newStock), 65);

    // Verify Stock Overview reflects new stock: 65
    const invRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const invData = await invRes.json();
    const item = (invData.data.inventory || []).find((p) => (p.id || p._id) === testProductId);
    assert.strictEqual(Number(item.stock), 65);
    assert.strictEqual(Number(item.currentStock), 65);
  });

  test('4. Stock Adjustment (Remove Stock: 65 -> 40)', async () => {
    const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: testProductId,
        type: 'REMOVE',
        quantity: 25,
        reason: 'Damaged Goods / Scrap',
      }),
    });

    assert.strictEqual(adjustRes.status, 200);
    const adjustData = await adjustRes.json();
    assert.strictEqual(adjustData.success, true);
    assert.strictEqual(Number(adjustData.data.newStock), 40);

    // Verify Stock Overview reflects new stock: 40
    const invRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const invData = await invRes.json();
    const item = (invData.data.inventory || []).find((p) => (p.id || p._id) === testProductId);
    assert.strictEqual(Number(item.stock), 40);
  });

  test('5. Stock Adjustment Validation (Prevent Negative Stock: current 40, remove 50 fails)', async () => {
    const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: testProductId,
        type: 'REMOVE',
        quantity: 50,
        reason: 'Accidental Over-deduction',
      }),
    });

    assert.strictEqual(adjustRes.status, 400);
    const errorData = await adjustRes.json();
    assert.strictEqual(errorData.success, false);

    // Verify stock remains untouched at 40
    const invRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const invData = await invRes.json();
    const item = (invData.data.inventory || []).find((p) => (p.id || p._id) === testProductId);
    assert.strictEqual(Number(item.stock), 40);
  });

  test('6. Stock History log accurately records adjustment transactions', async () => {
    const histRes = await fetch(`${baseUrl}/inventory/${testProductId}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(histRes.status, 200);
    const histData = await histRes.json();
    assert.strictEqual(histData.success, true);

    const txs = histData.data.transactions || [];
    assert.ok(txs.length >= 2, 'Should contain at least 2 adjustment transactions');

    const addTx = txs.find((t) => Number(t.quantity) === 15);
    const removeTx = txs.find((t) => Number(t.quantity) === -25);
    assert.ok(addTx, 'Add stock transaction recorded');
    assert.ok(removeTx, 'Remove stock transaction recorded');
  });

  test('7. Deleted / deactivated product is automatically removed from Stock Overview', async () => {
    const delRes = await fetch(`${baseUrl}/products/${testProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(delRes.status, 200);

    const invRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const invData = await invRes.json();
    const item = (invData.data.inventory || []).find((p) => (p.id || p._id) === testProductId);
    assert.strictEqual(item, undefined, 'Deleted product must not be in active Stock Overview');
  });
});
