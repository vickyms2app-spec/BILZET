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

describe('PHASE 1: INVOICE MANAGEMENT & CA PORTAL INTEGRATION', () => {
  // Test Tenants
  const storeAId = 'store-p1-alpha';
  const storeBId = 'store-p1-beta';

  const ownerAId = 'user-p1-ownerA';
  const cashierAId = 'user-p1-cashierA';
  const ca1Id = 'user-p1-ca1';
  const ca2Id = 'user-p1-ca2';

  let ownerAToken;
  let cashierAToken;
  let ca1Token;
  let ca2Token;

  let testProductId;
  let testInvoiceNumber = `INV-P1-${Date.now().toString().slice(-5)}`;

  before(async () => {
    // 1. Create Store A
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Alpha Retail Store TN',
        ownerId: ownerAId,
        email: 'alpha@bilzet.test',
        phone: '+91 94441 12345',
        gstin: '33AAAAA1234A1Z1',
        address: '10 Mount Road, Chennai',
      },
    });

    // 2. Create Store B
    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Beta Electronics Mart',
        ownerId: 'user-p1-ownerB',
        email: 'beta@bilzet.test',
        phone: '+91 94442 54321',
        gstin: '33BBBBB5678B1Z2',
        address: '25 GST Road, Chennai',
      },
    });

    // 3. Create Users
    // Owner A (Admin role)
    await prisma.user.create({
      data: {
        id: ownerAId,
        email: 'ownera@bilzet.test',
        name: 'Store A Owner',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
      },
    });

    // Cashier A (Cashier role)
    await prisma.user.create({
      data: {
        id: cashierAId,
        email: 'cashiera@bilzet.test',
        name: 'Counter Cashier',
        role: 'CASHIER',
        businessId: storeAId,
        isActive: true,
      },
    });

    // CA 1 (Chartered Accountant for Store A)
    await prisma.user.create({
      data: {
        id: ca1Id,
        email: 'auditor1@taxfirm.test',
        name: 'CA Ramesh Auditor',
        role: 'CA',
        businessId: null, // CA is an external consultant
        isActive: true,
      },
    });

    // CA 2 (Chartered Accountant for Store B only)
    await prisma.user.create({
      data: {
        id: ca2Id,
        email: 'auditor2@taxfirm.test',
        name: 'CA Priya Auditor',
        role: 'CA',
        businessId: null,
        isActive: true,
      },
    });

    // Authorize CA 1 for Store A via staff invitation
    await prisma.staff.create({
      data: {
        id: 'staff-ca1',
        name: 'CA Ramesh Auditor',
        email: 'auditor1@taxfirm.test',
        role: 'Accountant',
        department: 'Finance & Taxation',
        businessId: storeAId,
        status: 'ACTIVE',
      },
    });

    // Authorize CA 2 for Store B via staff invitation
    await prisma.staff.create({
      data: {
        id: 'staff-ca2',
        name: 'CA Priya Auditor',
        email: 'auditor2@taxfirm.test',
        role: 'Accountant',
        department: 'Finance & Taxation',
        businessId: storeBId,
        status: 'ACTIVE',
      },
    });

    // Create a Product in Store A with stock 100
    const prod = await prisma.product.create({
      data: {
        businessId: storeAId,
        name: 'Ergonomic Desk Organizer',
        sku: 'SKU-EDO-P1',
        sellingPrice: 500,
        purchasePrice: 300,
        gstRate: 18,
        stock: 100,
      },
    });
    testProductId = prod.id;

    // Tokens
    ownerAToken = generateToken({ id: ownerAId, role: 'ADMIN', businessId: storeAId, email: 'ownera@bilzet.test' });
    cashierAToken = generateToken({ id: cashierAId, role: 'CASHIER', businessId: storeAId, email: 'cashiera@bilzet.test' });
    ca1Token = generateToken({ id: ca1Id, role: 'CA', email: 'auditor1@taxfirm.test' });
    ca2Token = generateToken({ id: ca2Id, role: 'CA', email: 'auditor2@taxfirm.test' });
  });

  // ══════════════════════════════════════════════════════════════
  // 1. BILL INVOICE CREATION & DATABASE PERSISTENCE
  // ══════════════════════════════════════════════════════════════
  test('1. Bill Invoice Creation: Saves permanently in database and decrements product stock', async () => {
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierAToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: testInvoiceNumber,
        invoiceDate: '2026-10-09',
        customerName: 'Karthi Corporate Client',
        customerPhone: '9840199999',
        customerGstin: '33AAACK1234A1Z9',
        customerAddress: '42 Commercial Complex, Chennai',
        items: [
          {
            productId: testProductId,
            quantity: 4,
            rate: 500,
            gstRate: 18,
          },
        ],
        subtotal: 2000,
        taxTotal: 360,
        grandTotal: 2360,
        paidAmount: 2000, // Partial payment: 2000 paid, 360 balance due
        paymentMethod: 'UPI',
        paymentStatus: 'PARTIAL',
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 201, 'Invoice must be created with 201 Created');
    const sale = json.data?.sale || json.data;

    assert.ok(sale.id, 'Sale must have a database ID');
    assert.equal(sale.invoiceNumber, testInvoiceNumber);
    assert.equal(sale.subtotal, 2000);
    assert.equal(sale.taxTotal, 360);
    assert.equal(sale.grandTotal, 2360);
    assert.equal(sale.paidAmount, 2000);
    assert.equal(sale.paymentStatus, 'PARTIAL');
    assert.equal(sale.balanceDue, 360, 'Balance due must be accurately computed as 360');

    // Verify stock decremented from 100 to 96
    const updatedProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    assert.equal(updatedProduct.stock, 96, 'Stock must be automatically deducted by 4');
  });

  // ══════════════════════════════════════════════════════════════
  // 2. INVOICE HISTORY SYNCHRONIZATION
  // ══════════════════════════════════════════════════════════════
  test('2. Invoice History Sync: Created invoice appears in shop sales list with full details', async () => {
    const res = await fetch(`${baseUrl}/sales?search=${testInvoiceNumber}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const sales = json.data?.sales || json.sales || [];
    assert.ok(sales.length >= 1, 'Invoice must appear in Invoice History');

    const inv = sales.find((s) => s.invoiceNumber === testInvoiceNumber);
    assert.ok(inv, 'Created invoice must be in the list');
    assert.equal(inv.customer?.name, 'Karthi Corporate Client');
    assert.equal(inv.customer?.gstin, '33AAACK1234A1Z9');
    assert.equal(inv.taxableAmount, 2000);
    assert.equal(inv.cgst, 180);
    assert.equal(inv.sgst, 180);
    assert.equal(inv.balanceDue, 360);
  });

  // ══════════════════════════════════════════════════════════════
  // 3. SERVER-SIDE ROLE-BASED ACCESS CONTROL (CA PORTAL PROTECTION)
  // ══════════════════════════════════════════════════════════════
  test('3. Security: Unauthorized user (Cashier) cannot access CA Portal endpoints', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/stores`, {
      headers: { Authorization: `Bearer ${cashierAToken}` },
    });
    assert.equal(res.status, 403, 'Cashier must be blocked from CA Portal with 403 Forbidden');
  });

  test('4. Security: Unauthorized user (Admin who is not CA) cannot access CA Portal endpoints', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/stores`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(res.status, 403, 'Normal store Admin must be blocked from CA Portal with 403 Forbidden');
  });

  test('5. Security: Unauthenticated request to CA Portal is rejected', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/stores`);
    assert.equal(res.status, 401, 'Unauthenticated request must be rejected with 401 Unauthorized');
  });

  // ══════════════════════════════════════════════════════════════
  // 4. CA MULTI-STORE TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════
  test('6. CA Stores: CA 1 retrieves ONLY authorized Store A, not Store B', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/stores`, {
      headers: { Authorization: `Bearer ${ca1Token}` },
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    const stores = json.data?.stores || [];

    assert.equal(stores.length, 1);
    assert.equal(stores[0].id, storeAId);
    assert.equal(stores[0].name, 'Alpha Retail Store TN');
  });

  test('7. Anti-IDOR: CA 1 is blocked from querying Store B invoices (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeBId}`, {
      headers: { Authorization: `Bearer ${ca1Token}` },
    });

    assert.equal(res.status, 403, 'CA 1 must receive 403 Forbidden when requesting Store B records');
  });

  test('8. Anti-IDOR: CA 2 is blocked from querying Store A invoices (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${ca2Token}` },
    });

    assert.equal(res.status, 403, 'CA 2 must receive 403 Forbidden when requesting Store A records');
  });

  // ══════════════════════════════════════════════════════════════
  // 5. CA INVOICES SYNCHRONIZATION & GST BREAKDOWN
  // ══════════════════════════════════════════════════════════════
  test('9. CA Invoices View: CA 1 views Store A invoices with full GST & balance due synchronization', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}&search=${testInvoiceNumber}`, {
      headers: { Authorization: `Bearer ${ca1Token}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const invoices = json.data?.invoices || [];
    assert.ok(invoices.length >= 1);

    const inv = invoices.find((i) => i.invoiceNumber === testInvoiceNumber);
    assert.ok(inv, 'Synchronized invoice must appear in CA portal');

    assert.equal(inv.invoiceNumber, testInvoiceNumber);
    assert.equal(inv.taxableAmount, 2000);
    assert.equal(inv.cgst, 180);
    assert.equal(inv.sgst, 180);
    assert.equal(inv.igst, 0);
    assert.equal(inv.taxTotal, 360);
    assert.equal(inv.grandTotal, 2360);
    assert.equal(inv.paidAmount, 2000);
    assert.equal(inv.balanceDue, 360);
    assert.equal(inv.paymentStatus, 'PARTIAL');
    assert.equal(inv.customer.name, 'Karthi Corporate Client');
    assert.equal(inv.customer.gstin, '33AAACK1234A1Z9');
    assert.equal(inv.customer.isB2B, true);
  });

  // ══════════════════════════════════════════════════════════════
  // 6. CA FINANCIAL SUMMARY & TAX FILING REPORT
  // ══════════════════════════════════════════════════════════════
  test('10. CA Financial Summary: Aggregates total turnover, tax collected, and slab classification', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${ca1Token}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const summary = json.data?.summary;

    assert.ok(summary);
    assert.ok(summary.metrics.totalInvoices >= 1);
    assert.ok(summary.metrics.totalTaxable >= 2000);
    assert.ok(summary.metrics.totalGst >= 360);
    assert.ok(summary.metrics.totalCgst >= 180);
    assert.ok(summary.metrics.totalSgst >= 180);
    assert.ok(summary.metrics.totalPaid >= 2000);
    assert.ok(summary.metrics.totalBalanceDue >= 360);

    // B2B vs B2C Breakdown
    assert.ok(summary.gstFiling.b2b.count >= 1);
    assert.ok(summary.gstFiling.b2b.taxable >= 2000);

    // Slab breakdown for 18%
    assert.ok(summary.gstFiling.slabs['18'].taxable >= 2000);
    assert.ok(summary.gstFiling.slabs['18'].tax >= 360);
  });

  // ══════════════════════════════════════════════════════════════
  // 7. SINGLE INVOICE AUDIT DETAILS FOR CA
  // ══════════════════════════════════════════════════════════════
  test('11. Single Invoice Audit: CA 1 can fetch single invoice details for authorized store', async () => {
    const listRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}&search=${testInvoiceNumber}`, {
      headers: { Authorization: `Bearer ${ca1Token}` },
    });
    const listJson = await listRes.json();
    const invoiceId = listJson.data?.invoices?.[0]?.id;
    assert.ok(invoiceId);

    const detailRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${ca1Token}` },
    });

    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();
    const invoice = detailJson.data?.invoice;

    assert.ok(invoice);
    assert.equal(invoice.invoiceNumber, testInvoiceNumber);
    assert.equal(invoice.customer.name, 'Karthi Corporate Client');
    assert.equal(invoice.items.length, 1);
    assert.equal(invoice.items[0].name, 'Ergonomic Desk Organizer');
    assert.equal(invoice.items[0].quantity, 4);
  });
});
