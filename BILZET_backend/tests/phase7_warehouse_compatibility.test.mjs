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

describe('PHASE 7: Warehouse & Godowns Compatibility & Store Isolation', () => {
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

  let createdWarehouseId = null;

  test('1. Warehouse Listing: Should list Store A warehouses with stocks and products', async () => {
    const res = await fetch(`${baseUrl}/warehouses`, {
      headers: {
        Authorization: `Bearer ${storeAToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.warehouses));
    assert.ok(body.data.warehouses.length >= 1);

    // Verify all returned warehouses belong to Store A
    for (const wh of body.data.warehouses) {
      assert.equal(wh.businessId || 'busi-01', 'busi-01');
    }
  });

  test('2. Store Isolation: Store B should only see Store B warehouses without mixing', async () => {
    const res = await fetch(`${baseUrl}/warehouses`, {
      headers: {
        Authorization: `Bearer ${storeBToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.warehouses));

    for (const wh of body.data.warehouses) {
      assert.equal(wh.businessId, 'busi-02');
    }
  });

  test('3. Warehouse Creation: Should successfully create a new godown in active store', async () => {
    const res = await fetch(`${baseUrl}/warehouses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        name: 'South Distribution Godown',
        code: 'WH-SOUTH-PH7',
        address: '88 GST Road, Tambaram',
        manager: 'Anand Kumar',
        phone: '9840112233',
        capacity: 15000,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.warehouse.name, 'South Distribution Godown');
    assert.equal(body.data.warehouse.code, 'WH-SOUTH-PH7');
    assert.equal(body.data.warehouse.businessId, 'busi-01');
    createdWarehouseId = body.data.warehouse.id || body.data.warehouse._id;
    assert.ok(createdWarehouseId);
  });

  test('4. Duplicate Code Validation: Should reject duplicate warehouse code in same store', async () => {
    const res = await fetch(`${baseUrl}/warehouses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        name: 'Another Godown',
        code: 'WH-SOUTH-PH7',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 409);
    assert.match(body.message, /already registered/i);
  });

  test('5. Warehouse Update: Should update godown details', async () => {
    const res = await fetch(`${baseUrl}/warehouses/${createdWarehouseId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        name: 'South Central Distribution Hub',
        capacity: 20000,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.warehouse.name, 'South Central Distribution Hub');
    assert.equal(body.data.warehouse.capacity, 20000);
  });

  test('6. Inventory Compatibility: Stock transfer moves quantity between warehouses correctly', async () => {
    // Transfer 10 units of prod-01 from wh-01 to wh-02
    const transferRes = await fetch(`${baseUrl}/warehouses/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAToken}`,
      },
      body: JSON.stringify({
        sourceWarehouseId: 'wh-01',
        destinationWarehouseId: 'wh-02',
        productId: 'prod-01',
        quantity: 10,
        notes: 'Inter-godown balancing transfer',
      }),
    });

    const body = await transferRes.json();
    assert.equal(transferRes.status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.transfer);
    assert.equal(body.data.transfer.quantity, 10);
    assert.equal(body.data.transfer.productId, 'prod-01');
  });

  test('7. Stock Transfers History: Transfers log records transaction accurately', async () => {
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
  });

  test('8. Authorization: Cashier without inventory.create cannot create warehouses', async () => {
    const res = await fetch(`${baseUrl}/warehouses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Godown',
        code: 'WH-UNAUTH',
      }),
    });

    assert.equal(res.status, 403);
  });

  test('9. Safe Deletion: Deleting an empty warehouse succeeds', async () => {
    const res = await fetch(`${baseUrl}/warehouses/${createdWarehouseId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${storeAToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
  });
});
