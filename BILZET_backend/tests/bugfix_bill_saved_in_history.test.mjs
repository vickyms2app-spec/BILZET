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

describe('BUG FIX: BILL SAVED IN DATABASE AND VISIBLE IN INVOICE HISTORY', () => {
  const storeAId = `store-fix-a-${Date.now()}`;
  const storeBId = `store-fix-b-${Date.now()}`;
  const userAId = `user-fix-a-${Date.now()}`;
  const userBId = `user-fix-b-${Date.now()}`;

  let tokenA;
  let tokenB;
  let testProductId;

  before(async () => {
    // 1. Create Business A
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Store A Supermarket',
        ownerId: userAId,
        email: 'store-a@test.com',
        phone: '+91 98888 11111',
        gstin: '33AAAAA0000A1Z5',
        state: 'Tamil Nadu',
      },
    });

    // 2. Create User A (Admin of Store A)
    await prisma.user.create({
      data: {
        id: userAId,
        name: 'Admin A',
        email: `admin-a-${Date.now()}@test.com`,
        password: 'hashedpassword',
        role: 'ADMIN',
        businessId: storeAId,
        isActive: true,
      },
    });

    // 3. Create Business B
    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Store B Electronics',
        ownerId: userBId,
        email: 'store-b@test.com',
        phone: '+91 98888 22222',
        gstin: '33BBBBB0000B1Z5',
        state: 'Tamil Nadu',
      },
    });

    // 4. Create User B (Admin of Store B)
    await prisma.user.create({
      data: {
        id: userBId,
        name: 'Admin B',
        email: `admin-b-${Date.now()}@test.com`,
        password: 'hashedpassword',
        role: 'ADMIN',
        businessId: storeBId,
        isActive: true,
      },
    });

    // 5. Create a catalog product in Store A
    const product = await prisma.product.create({
      data: {
        name: 'Organic Basmati Rice 5kg',
        sku: `SKU-RICE-${Date.now()}`,
        hsnCode: '1006',
        sellingPrice: 450,
        costPrice: 380,
        gstRate: 5,
        stock: 100,
        businessId: storeAId,
      },
    });
    testProductId = product.id;

    tokenA = generateToken({ id: userAId, email: `admin-a@test.com`, role: 'ADMIN', businessId: storeAId });
    tokenB = generateToken({ id: userBId, email: `admin-b@test.com`, role: 'ADMIN', businessId: storeBId });
  });

  after(async () => {
    // Cleanup created test records
    await prisma.saleItem.deleteMany({ where: { sale: { businessId: { in: [storeAId, storeBId] } } } }).catch(() => {});
    await prisma.sale.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } }).catch(() => {});
    await prisma.product.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } }).catch(() => {});
    await prisma.business.deleteMany({ where: { id: { in: [storeAId, storeBId] } } }).catch(() => {});
  });

  test('Scenario 1: Save Bill persists to DB and immediately appears in Invoice History', async () => {
    const invoiceNum = `INV-TEST-${Date.now().toString().slice(-6)}`;
    const uniquePhone = `987${Date.now().toString().slice(-7)}`;
    const billPayload = {
      invoiceNumber: invoiceNum,
      invoiceDate: new Date().toISOString().split('T')[0],
      customerName: 'Karthik Retail Customer',
      customerPhone: uniquePhone,
      saleType: 'B2C — Customer',
      taxInclusive: false,
      items: [
        {
          productId: testProductId,
          name: 'Organic Basmati Rice 5kg',
          quantity: 2,
          rate: 450,
          discount: 0,
          gstRate: 5,
          isTaxInclusive: false,
        },
      ],
      paidAmount: 945,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
    };

    // 1. Post to create bill (equivalent to clicking "Save Bill")
    const createRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify(billPayload),
    });

    assert.equal(createRes.status, 201, 'Bill creation must return 201 Created');
    const createData = await createRes.json();
    assert.equal(createData.success, true);
    assert.ok(createData.data?.sale?.id, 'Saved sale must have DB ID');
    assert.equal(createData.data.sale.invoiceNumber, invoiceNum);
    assert.equal(createData.data.sale.paymentStatus, 'PAID');
    assert.equal(createData.data.sale.grandTotal, 945);

    // 2. Fetch Invoice History (GET /sales) as User A
    const listRes = await fetch(`${baseUrl}/sales?limit=50`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    assert.equal(listRes.status, 200, 'Fetching invoice history must return 200 OK');
    const listData = await listRes.json();
    assert.equal(listData.success, true);
    const salesList = listData.data?.sales || [];
    assert.ok(salesList.length > 0, 'Sales list must contain invoices');

    const foundInvoice = salesList.find((s) => s.invoiceNumber === invoiceNum);
    assert.ok(foundInvoice, `Newly created invoice ${invoiceNum} must be present in Invoice History`);
    assert.equal(foundInvoice.customer?.name, 'Karthik Retail Customer');
    assert.equal(foundInvoice.grandTotal, 945);
    assert.equal(foundInvoice.items.length, 1);
  });

  test('Scenario 2: Bill with custom item (no DB product ID or ad-hoc productId) saves without FK error', async () => {
    const customInvoiceNum = `INV-CUSTOM-${Date.now().toString().slice(-6)}`;
    const billPayload = {
      invoiceNumber: customInvoiceNum,
      customerName: 'Ad-hoc Customer',
      items: [
        {
          productId: 'custom-temp-9999', // client-generated temp ID that does not exist in Product table
          name: 'Custom Service / Packing Fee',
          quantity: 1,
          rate: 150,
          discount: 0,
          gstRate: 18,
          isTaxInclusive: false,
        },
      ],
      paidAmount: 177,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify(billPayload),
    });

    assert.equal(res.status, 201, 'Should succeed with 201 without throwing foreign key violation');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.sale.items[0].name, 'Custom Service / Packing Fee');
    assert.equal(data.data.sale.items[0].productId, null, 'Foreign key must be null for custom non-catalog items');
  });

  test('Scenario 3: Store isolation ensures User B cannot see Store A invoices', async () => {
    // User B calls Invoice History
    const listResB = await fetch(`${baseUrl}/sales?limit=50`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    assert.equal(listResB.status, 200);
    const listDataB = await listResB.json();
    const salesB = listDataB.data?.sales || [];

    // Confirm none of Store A's invoices are present in Store B's list
    const leaked = salesB.filter((s) => s.businessId === storeAId);
    assert.equal(leaked.length, 0, 'Store B must NOT see any invoices belonging to Store A');
  });

  test('Scenario 4: Duplicate invoice number submission is handled gracefully', async () => {
    const fixedInvNumber = `INV-DUPE-${Date.now().toString().slice(-5)}`;
    const payload = {
      invoiceNumber: fixedInvNumber,
      customerName: 'Repeated Customer',
      items: [
        {
          name: 'Item 1',
          quantity: 1,
          rate: 100,
          gstRate: 18,
        },
      ],
      paidAmount: 118,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
    };

    // First save
    const res1 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(payload),
    });
    assert.equal(res1.status, 201);
    const data1 = await res1.json();
    assert.equal(data1.data.sale.invoiceNumber, fixedInvNumber);

    // Second save with identical invoice number (e.g. repeated click)
    const res2 = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(payload),
    });
    assert.equal(res2.status, 201);
    const data2 = await res2.json();
    assert.ok(
      data2.data.sale.invoiceNumber.startsWith(fixedInvNumber),
      'Second save must generate a unique invoice number suffix to avoid conflict'
    );
    assert.notEqual(data2.data.sale.id, data1.data.sale.id, 'Must be distinct saved sale records');
  });

  test('Scenario 5: Search query in Invoice History successfully finds saved invoice', async () => {
    const uniqueSearchCustomer = `SearchableCust-${Date.now().toString().slice(-4)}`;
    const billPayload = {
      customerName: uniqueSearchCustomer,
      customerPhone: '9988776655',
      items: [
        {
          name: 'Search Test Item',
          quantity: 1,
          rate: 200,
          gstRate: 18,
        },
      ],
      paidAmount: 236,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
    };

    const createRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(billPayload),
    });
    assert.equal(createRes.status, 201);

    // Search by customer name
    const searchRes = await fetch(`${baseUrl}/sales?search=${encodeURIComponent(uniqueSearchCustomer)}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    const found = (searchData.data?.sales || []).find((s) => s.customer?.name === uniqueSearchCustomer);
    assert.ok(found, 'Search in invoice history must locate the newly saved bill');
  });
});
