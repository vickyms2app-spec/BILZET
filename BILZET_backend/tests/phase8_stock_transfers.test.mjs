import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';

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

describe('PHASE 8: Stock Transfers Verification & Inventory Synchronization', () => {
  const storeAToken = generateToken({
    userId: 'admin-01',
    id: 'admin-01',
    email: 'admin@bilzet.com',
    role: 'ADMIN',
    appRole: 'ADMIN',
    permissions: ['*'],
    businessId: 'busi-01',
  });

  const storeBToken = generateToken({
    userId: 'admin-02',
    id: 'admin-02',
    email: 'electronics@bilzet.com',
    role: 'ADMIN',
    appRole: 'ADMIN',
    permissions: ['*'],
    businessId: 'busi-02',
  });

  const cashierToken = generateToken({
    userId: 'cashier-01',
    id: 'cashier-01',
    email: 'cashier@bilzet.com',
    role: 'CASHIER',
    appRoleId: 'role-cashier',
    businessId: 'busi-01',
  });

  let initialWh1Qty = 0;
  let initialWh2Qty = 0;
  const transferQty = 10;

  test('1. Inventory State Pre-check: Fetch initial stock levels in Source and Destination Godowns', async () => {
    const res = await fetch(`${baseUrl}/warehouses`, {
      headers: {
        Authorization: `Bearer ${storeAToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);

    const wh1 = body.data.warehouses.find((w) => w.id === 'wh-01');
    const wh2 = body.data.warehouses.find((w) => w.id === 'wh-02');
    assert.ok(wh1, 'wh-01 should exist');
    assert.ok(wh2, 'wh-02 should exist');

    const p1InWh1 = wh1.stocks?.find((s) => s.productId === 'prod-01');
    const p1InWh2 = wh2.stocks?.find((s) => s.productId === 'prod-01');

    initialWh1Qty = p1InWh1 ? p1InWh1.quantity : 0;
    initialWh2Qty = p1InWh2 ? p1InWh2.quantity : 0;

    assert.ok(initialWh1Qty >= transferQty, `wh-01 must have at least ${transferQty} units of prod-01`);
  });

  test('2. Atomic Stock Transfer & Conservation: Deduct source, add destination, conserve total stock', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-02',
        productId: 'prod-01',
        quantity: transferQty,
        notes: 'Verification transfer between primary godowns',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.transfer);
    assert.equal(body.data.transfer.fromWarehouseId, 'wh-01');
    assert.equal(body.data.transfer.toWarehouseId, 'wh-02');
    assert.equal(body.data.transfer.productId, 'prod-01');
    assert.equal(body.data.transfer.quantity, transferQty);
    assert.match(body.data.transfer.transferNumber, /^TRF-/);

    // Verify inventory synchronization
    const whRes = await fetch(`${baseUrl}/warehouses`, {
      headers: {
        Authorization: `Bearer ${storeAToken}`,
      },
    });
    const whBody = await whRes.json();
    const wh1 = whBody.data.warehouses.find((w) => w.id === 'wh-01');
    const wh2 = whBody.data.warehouses.find((w) => w.id === 'wh-02');

    const newWh1Qty = wh1.stocks.find((s) => s.productId === 'prod-01')?.quantity || 0;
    const newWh2Qty = wh2.stocks.find((s) => s.productId === 'prod-01')?.quantity || 0;

    assert.equal(newWh1Qty, initialWh1Qty - transferQty, 'Source warehouse stock must be decremented');
    assert.equal(newWh2Qty, initialWh2Qty + transferQty, 'Destination warehouse stock must be incremented');
    assert.equal(newWh1Qty + newWh2Qty, initialWh1Qty + initialWh2Qty, 'Total stock must be conserved perfectly');
  });

  test('3. Insufficient Stock Validation: Reject transfer when quantity exceeds available source stock', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-02',
        productId: 'prod-01',
        quantity: 999999, // Exceeds available stock
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.message, /insufficient stock/i);
  });

  test('4. Invalid Quantity Validation: Reject non-positive quantities (<= 0)', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-02',
        productId: 'prod-01',
        quantity: -5,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.message, /greater than 0/i);
  });

  test('5. Same Warehouse Validation: Reject transfer if source and destination are identical', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-01',
        productId: 'prod-01',
        quantity: 5,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.message, /cannot be the same/i);
  });

  test('6. Non-Existent Warehouse Validation: Return 404 if source or destination does not exist', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'non-existent-godown',
        destinationWarehouseId: 'wh-02',
        productId: 'prod-01',
        quantity: 5,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 404);
    assert.match(body.message, /not found/i);
  });

  test('7. Cross-Store Isolation: Reject transfer between warehouses belonging to different stores', async () => {
    // wh-01 belongs to busi-01, wh-03 belongs to busi-02
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-03',
        productId: 'prod-01',
        quantity: 2,
      }),
    });

    const body = await res.json();
    assert.ok(res.status === 400 || res.status === 403);
    assert.match(body.message, /(different stores|another store)/i);
  });

  test('8. Store Authorization: Reject transfer initiated by unauthorized store user', async () => {
    // Store B user attempts to move stock out of Store A's warehouse (wh-01)
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeBToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-02',
        productId: 'prod-01',
        quantity: 2,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 403);
    assert.match(body.message, /unauthorized/i);
  });

  test('9. Role-Based Access Control (RBAC): Cashier without inventory.transfer permission is rejected', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-02',
        productId: 'prod-01',
        quantity: 1,
      }),
    });

    assert.equal(res.status, 403);
  });

  test('10. Transfer History & Relations: Return log with populated product and godown information', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfers`, {
      headers: {
        Authorization: `Bearer ${storeAToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.transfers));
    assert.ok(body.data.transfers.length >= 1);

    const latestTransfer = body.data.transfers[0];
    assert.ok(latestTransfer.transferNumber);
    assert.ok(latestTransfer.product);
    assert.ok(latestTransfer.product.name);
    assert.ok(latestTransfer.fromWarehouse);
    assert.ok(latestTransfer.fromWarehouse.name);
    assert.ok(latestTransfer.toWarehouse);
    assert.ok(latestTransfer.toWarehouse.name);
  });

  test('11. Transfer History Store Isolation: Store B should not see Store A transfers', async () => {
    const res = await fetch(`${baseUrl}/warehouses/transfers`, {
      headers: {
        Authorization: `Bearer ${storeBToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.transfers));

    // None of the Store A transfers should appear in Store B
    for (const tr of body.data.transfers) {
      assert.notEqual(tr.fromWarehouseId, 'wh-01');
      assert.notEqual(tr.toWarehouseId, 'wh-02');
    }
  });
});
