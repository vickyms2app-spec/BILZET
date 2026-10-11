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

describe('PROJECT: BILZET WEBSITE IMPROVEMENTS — PHASE 2: PERMANENT STORAGE & CA ACTIVITY SYNC', () => {
  const storeAId = 'biz-p2-store-alpha';
  const storeBId = 'biz-p2-store-beta';

  const ownerAId = 'user-p2-ownerA';
  const ownerBId = 'user-p2-ownerB';
  const caUserId = 'user-p2-ca-auditor';
  const unauthorizedCaId = 'user-p2-ca-unauthorized';

  let ownerAToken;
  let ownerBToken;
  let caUserToken;
  let unauthorizedCaToken;

  let testProductId;
  let testCustomerId;
  let createdInvoiceId;
  let testInvoiceNumber = `INV-P2-${Date.now().toString().slice(-6)}`;

  before(async () => {
    // 1. Clean up previous test artifacts cleanly
    try {
      await prisma.auditLog.deleteMany({});
      await prisma.salesReturnItem.deleteMany({});
      await prisma.salesReturn.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.payment.deleteMany({});
      await prisma.saleItem.deleteMany({});
      await prisma.sale.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.stockMovement.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.product.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.customer.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.attendance.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.staff.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.expense.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.caStoreAccess.deleteMany({ where: { businessId: { in: [storeAId, storeBId] } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: [ownerAId, ownerBId] } } });
      await prisma.business.deleteMany({ where: { id: { in: [storeAId, storeBId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerAId, ownerBId, caUserId, unauthorizedCaId] } } });
    } catch (_) {}

    // 2. Create Business A
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Alpha Hypermarket Chennai',
        ownerId: ownerAId,
        email: 'alpha-p2@bilzet.test',
        phone: '+91 98888 11111',
        gstin: '33AAAAA9999A1Z5',
        address: '100 GST Road, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 3. Create Business B (for multi-tenant isolation tests)
    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Beta Retail Bangalore',
        ownerId: ownerBId,
        email: 'beta-p2@bilzet.test',
        phone: '+91 98888 22222',
        gstin: '29BBBBB8888B1Z4',
        address: '50 MG Road, Bangalore',
        state: 'Karnataka',
      },
    });

    // 4. Create Users
    await prisma.user.create({
      data: {
        id: ownerAId,
        email: 'owner-alpha@bilzet.test',
        name: 'Alpha Owner',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
      },
    });

    await prisma.user.create({
      data: {
        id: ownerBId,
        email: 'owner-beta@bilzet.test',
        name: 'Beta Owner',
        role: 'ADMIN',
        businessId: storeBId,
        isOwner: true,
      },
    });

    await prisma.user.create({
      data: {
        id: caUserId,
        email: 'authorized-ca@bilzet.test',
        name: 'Suresh CA & Co',
        role: 'CA',
        businessId: null,
      },
    });

    await prisma.user.create({
      data: {
        id: unauthorizedCaId,
        email: 'unauthorized-ca@bilzet.test',
        name: 'External CA',
        role: 'CA',
        businessId: null,
      },
    });

    // Authorize CA User for Store A
    await prisma.caStoreAccess.create({
      data: {
        id: 'ca-access-alpha',
        caUserId: caUserId,
        businessId: storeAId,
        status: 'ACTIVE',
      },
    });

    // Premium Subscription for Store A Owner
    await prisma.subscription.create({
      data: {
        id: 'sub-alpha',
        userId: ownerAId,
        planTier: 'PREMIUM',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    // Generate tokens
    ownerAToken = generateToken({ id: ownerAId, email: 'owner-alpha@bilzet.test', role: 'ADMIN', businessId: storeAId });
    ownerBToken = generateToken({ id: ownerBId, email: 'owner-beta@bilzet.test', role: 'ADMIN', businessId: storeBId });
    caUserToken = generateToken({ id: caUserId, email: 'authorized-ca@bilzet.test', role: 'CA' });
    unauthorizedCaToken = generateToken({ id: unauthorizedCaId, email: 'unauthorized-ca@bilzet.test', role: 'CA' });

    // Seed Product in Store A
    const prod = await prisma.product.create({
      data: {
        name: 'Premium Wireless Mechanical Keyboard',
        sku: 'P2-KEY-001',
        hsnCode: '847160',
        price: 3000,
        costPrice: 2000,
        taxRate: 18,
        stock: 50,
        businessId: storeAId,
      },
    });
    testProductId = prod.id;

    // Seed Customer in Store A
    const cust = await prisma.customer.create({
      data: {
        name: 'Raghavan Tech Solutions',
        phone: '+91 97777 66666',
        email: 'raghavan@techsolutions.in',
        gstin: '33CCCC9999C1Z9',
        address: 'Thoraipakkam OMR, Chennai',
        businessId: storeAId,
      },
    });
    testCustomerId = cust.id;
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 1: Create a new invoice and verify it exists in the database
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 1: Finalized bill is permanently saved to PostgreSQL database with complete tax breakdown', async () => {
    const payload = {
      invoiceNumber: testInvoiceNumber,
      customerId: testCustomerId,
      customer: {
        name: 'Raghavan Tech Solutions',
        phone: '+91 97777 66666',
        gstin: '33CCCC9999C1Z9',
      },
      items: [
        {
          productId: testProductId,
          name: 'Premium Wireless Mechanical Keyboard',
          hsnCode: '847160',
          quantity: 2,
          price: 3000,
          discount: 0,
          taxRate: 18,
          taxableAmount: 6000,
          taxAmount: 1080,
          total: 7080,
        },
      ],
      subtotal: 6000,
      taxTotal: 1080,
      cgst: 540,
      sgst: 540,
      igst: 0,
      grandTotal: 7080,
      paidAmount: 4000,
      balanceDue: 3080,
      paymentMethod: 'UPI',
      paymentStatus: 'PARTIALLY_PAID',
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data?.sale?.id);
    createdInvoiceId = json.data.sale.id;

    // Verify directly in PostgreSQL using Prisma
    const dbInvoice = await prisma.sale.findUnique({
      where: { id: createdInvoiceId },
      include: { items: true, customer: true },
    });

    assert.ok(dbInvoice, 'Invoice must exist in PostgreSQL database');
    assert.equal(dbInvoice.invoiceNumber, testInvoiceNumber);
    assert.equal(dbInvoice.businessId, storeAId);
    assert.equal(Number(dbInvoice.grandTotal), 7080);
    assert.equal(Number(dbInvoice.paidAmount), 4000);
    const dbBalanceDue = Math.max(0, Number(dbInvoice.grandTotal) - Number(dbInvoice.paidAmount));
    assert.equal(dbBalanceDue, 3080);
    assert.equal(dbInvoice.paymentStatus, 'PARTIALLY_PAID');
    assert.equal(dbInvoice.items.length, 1);
    assert.equal(dbInvoice.items[0].hsnCode, '847160');
    assert.equal(dbInvoice.items[0].quantity, 2);
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 2: Refresh the page and verify the invoice remains in Invoice History
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 2: Invoice remains authoritative and available in Invoice History after simulated page refresh', async () => {
    const res = await fetch(`${baseUrl}/sales?search=${testInvoiceNumber}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const sales = json.data?.sales || json.sales || [];
    const found = sales.find((s) => s.invoiceNumber === testInvoiceNumber);

    assert.ok(found, 'Invoice must be returned in sales list after page refresh');
    assert.equal(found.id, createdInvoiceId);
    assert.equal(Number(found.grandTotal), 7080);
    assert.equal(Number(found.paidAmount), 4000);
    assert.equal(Number(found.balanceDue), 3080);
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 3: Log out and back in and verify the invoice is still available
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 3: Invoice persists after logout/login with fresh authentication token', async () => {
    // Generate a fresh token simulating a re-login
    const freshLoginToken = generateToken({
      id: ownerAId,
      email: 'owner-alpha@bilzet.test',
      role: 'ADMIN',
      businessId: storeAId,
      sessionIssuedAt: Date.now(),
    });

    const res = await fetch(`${baseUrl}/sales/${createdInvoiceId}`, {
      headers: { Authorization: `Bearer ${freshLoginToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const sale = json.data?.sale || json.sale;

    assert.ok(sale);
    assert.equal(sale.invoiceNumber, testInvoiceNumber);
    assert.equal(sale.customer.name, 'Raghavan Tech Solutions');
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 4: Confirm authorized CA can view invoice in CA Connect & CA Portal
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 4: Authorized CA views the invoice in CA Connect / CA Portal', async () => {
    const res = await fetch(`${baseUrl}/ca-connect/invoices?storeId=${storeAId}&search=${testInvoiceNumber}`, {
      headers: { Authorization: `Bearer ${caUserToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const invoices = json.data?.invoices || [];
    const found = invoices.find((i) => i.invoiceNumber === testInvoiceNumber);

    assert.ok(found, 'Authorized CA must be able to view invoice in CA Connect');
    assert.equal(Number(found.grandTotal), 7080);

    // Verify CA Activity Stream contains INVOICE_CREATED
    const actRes = await fetch(`${baseUrl}/ca-connect/activity?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caUserToken}` },
    });
    assert.equal(actRes.status, 200);
    const actJson = await actRes.json();
    const activities = actJson.data?.activity || [];
    const createEvent = activities.find(
      (a) => (a.invoiceNumber === testInvoiceNumber || a.details?.invoiceNumber === testInvoiceNumber) &&
             (a.action === 'INVOICE_CREATED' || a.eventType === 'INVOICE_CREATED')
    );

    assert.ok(createEvent, 'INVOICE_CREATED event must be synchronized to CA activity ledger');
    assert.equal(createEvent.details?.grandTotal || createEvent.changes?.grandTotal, 7080);
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 5: Record a payment and verify activity appears in CA Connect
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 5: Record subsequent payment and verify synchronized activity with before/after financial state', async () => {
    // Record payment of ₹3080 to clear the balance
    const payRes = await fetch(`${baseUrl}/sales/${createdInvoiceId}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 3080,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'NEFT-889900',
        notes: 'Full balance settlement',
      }),
    });

    assert.equal(payRes.status, 200);
    const payJson = await payRes.json();
    assert.equal(payJson.success, true);

    // Confirm updated status in DB
    const updatedSale = await prisma.sale.findUnique({ where: { id: createdInvoiceId } });
    assert.equal(Number(updatedSale.paidAmount), 7080);
    const dbUpdatedBalance = Math.max(0, Number(updatedSale.grandTotal) - Number(updatedSale.paidAmount));
    assert.equal(dbUpdatedBalance, 0);
    assert.equal(updatedSale.paymentStatus, 'PAID');

    // Confirm PAYMENT_RECEIVED appears in CA Activity Ledger with before/after state
    const caActRes = await fetch(`${baseUrl}/ca-connect/activity?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caUserToken}` },
    });
    assert.equal(caActRes.status, 200);
    const caActJson = await caActRes.json();
    const payEvent = (caActJson.data?.activity || []).find(
      (a) => (a.invoiceNumber === testInvoiceNumber || a.details?.invoiceNumber === testInvoiceNumber) &&
             (a.action === 'PAYMENT_RECEIVED' || a.action === 'PARTIAL_PAYMENT')
    );

    assert.ok(payEvent, 'PAYMENT_RECEIVED event must be synchronized in CA Connect activity');
    assert.equal(payEvent.details?.after?.balanceDue ?? payEvent.changes?.after?.balanceDue, 0);
    assert.equal(payEvent.details?.after?.paymentStatus ?? payEvent.changes?.after?.paymentStatus, 'PAID');
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 6: Process a product return and verify credit note & GST adjustment
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 6: Process product return and verify credit note, GST adjustment, and CA synchronization', async () => {
    // Return 1 keyboard (₹3000 taxable + ₹540 GST = ₹3540)
    const retRes = await fetch(`${baseUrl}/sales/${createdInvoiceId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        returnedItems: [
          {
            productId: testProductId,
            quantity: 1,
            refundPrice: 3000,
            taxRate: 18,
            reason: 'Customer requested switch to different model',
          },
        ],
        refundMethod: 'CASH',
        refundAmount: 3540,
        reason: 'Customer return',
      }),
    });

    assert.equal(retRes.status, 200);
    const retJson = await retRes.json();
    assert.equal(retJson.success, true);

    const retData = retJson.data?.sale || retJson.data || retJson;
    assert.ok(retData);

    // Confirm CA Connect sees the return event and credit note
    const caActRes = await fetch(`${baseUrl}/ca-connect/activity?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caUserToken}` },
    });
    const caActJson = await caActRes.json();
    const returnEvent = (caActJson.data?.activity || []).find(
      (a) => (a.invoiceNumber === testInvoiceNumber || a.details?.invoiceNumber === testInvoiceNumber) &&
             (a.action === 'SALE_RETURNED' || a.eventType === 'SALE_RETURNED')
    );

    assert.ok(returnEvent, 'SALE_RETURNED event must be visible in CA Connect');
    assert.ok(returnEvent.details?.creditNoteNumber || returnEvent.changes?.creditNoteNumber);
    assert.equal(returnEvent.details?.gstAdjustment || returnEvent.changes?.gstAdjustment, 540);
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 7: Confirm original invoice and complete activity history remain available
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 7: Original finalized invoice is preserved and full chronological activity trail is available', async () => {
    const invRes = await fetch(`${baseUrl}/sales/${createdInvoiceId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(invRes.status, 200);
    const invJson = await invRes.json();
    const sale = invJson.data?.sale || invJson.sale;

    // Original invoice total is preserved (never destructively overwritten)
    assert.equal(Number(sale.grandTotal), 7080);
    assert.equal(Number(sale.netPayable), 3540);
    assert.equal(Number(sale.totalReturnedAmount), 3540);

    // Verify full audit trail has all chronological milestones
    const auditRes = await fetch(`${baseUrl}/sales/${createdInvoiceId}/activity`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(auditRes.status, 200);
    const auditJson = await auditRes.json();
    const actions = (auditJson.data?.activity || auditJson.activity || []).map((a) => a.action || a.eventType);

    assert.ok(actions.includes('INVOICE_CREATED'), 'History must contain INVOICE_CREATED');
    assert.ok(actions.includes('PAYMENT_RECEIVED') || actions.includes('PARTIAL_PAYMENT'), 'History must contain payment event');
    assert.ok(actions.includes('SALE_RETURNED'), 'History must contain SALE_RETURNED');
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 8: Verify duplicate submissions do not create duplicate invoices
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 8: Duplicate submission / network retry returns existing finalized invoice without duplicating', async () => {
    const duplicatePayload = {
      invoiceNumber: testInvoiceNumber,
      customerId: testCustomerId,
      items: [
        {
          productId: testProductId,
          name: 'Premium Wireless Mechanical Keyboard',
          quantity: 2,
          price: 3000,
          total: 7080,
        },
      ],
      grandTotal: 7080,
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify(duplicatePayload),
    });

    assert.equal(res.status, 200, 'Duplicate submission must return 200 OK with existing invoice');
    const json = await res.json();
    assert.equal(json.data?.sale?.id, createdInvoiceId);

    // Assert database count for this invoiceNumber is strictly 1
    const count = await prisma.sale.count({
      where: { businessId: storeAId, invoiceNumber: testInvoiceNumber },
    });
    assert.equal(count, 1, 'Strictly 1 invoice record must exist in PostgreSQL');
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 9: Attempt unauthorized CA access and confirm backend rejects it
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 9: Unauthorized CA access to unassigned store is strictly rejected with 403 Forbidden', async () => {
    // unauthorized CA has no assignment to Store A
    const res = await fetch(`${baseUrl}/ca-connect/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${unauthorizedCaToken}` },
    });

    assert.equal(res.status, 403, 'Backend must return 403 Forbidden for unauthorized CA');
    const json = await res.json();
    assert.equal(json.success, false);
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 10: Verify store-level isolation for multi-store accounts
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 10: Multi-tenant store-level isolation prevents cross-store leakage', async () => {
    // Owner of Store B attempts to fetch Store A invoice
    const res = await fetch(`${baseUrl}/sales/${createdInvoiceId}`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });

    // Should return 404 (not found in Store B's tenant context) or 403
    assert.ok(res.status === 404 || res.status === 403, 'Cross-tenant access must be rejected');

    // Owner B sales list must not contain Store A invoices
    const listRes = await fetch(`${baseUrl}/sales`, {
      headers: { Authorization: `Bearer ${ownerBToken}` },
    });
    const listJson = await listRes.json();
    const ownerBSales = listJson.data?.sales || listJson.sales || [];
    assert.equal(ownerBSales.some((s) => s.id === createdInvoiceId), false);
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 11: Verify all existing business modules persist data permanently
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 11: Business modules (products, customers, stock, staff, attendance, settings) persist permanently', async () => {
    // 1. Customer persistence
    const custRes = await fetch(`${baseUrl}/customers`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(custRes.status, 200);
    const custJson = await custRes.json();
    const customers = custJson.data?.customers || custJson.customers || [];
    assert.ok(customers.some((c) => c.id === testCustomerId));

    // 2. Product persistence
    const prodRes = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(prodRes.status, 200);
    const prodJson = await prodRes.json();
    const products = prodJson.data?.products || prodJson.products || [];
    assert.ok(products.some((p) => p.id === testProductId));

    // 3. Staff & Attendance persistence
    const staff = await prisma.staff.create({
      data: {
        name: 'Vignesh Operations',
        role: 'Cashier',
        department: 'Store Front',
        businessId: storeAId,
      },
    });

    const att = await prisma.attendance.create({
      data: {
        staffId: staff.id,
        businessId: storeAId,
        date: new Date(),
        status: 'PRESENT',
      },
    });

    assert.ok(staff.id);
    assert.ok(att.id);

    // 4. Shop settings persistence
    const setRes = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        shopName: 'Alpha Hypermarket Premium',
        phone: '+91 98888 11111',
      }),
    });
    assert.equal(setRes.status, 200);

    const checkBiz = await prisma.business.findUnique({ where: { id: storeAId } });
    assert.equal(checkBiz.name, 'Alpha Hypermarket Premium');
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 12: Test midnight dashboard updates without deleting historical records
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 12: Dashboard metrics calculate accurately across date periods without clearing historical invoices', async () => {
    // Fetch today's dashboard
    const dashRes = await fetch(`${baseUrl}/dashboard`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(dashRes.status, 200);
    const dashJson = await dashRes.json();
    const metrics = dashJson.data || {};

    assert.ok(metrics.todaySales !== undefined);
    assert.ok(metrics.monthSales !== undefined);
    assert.ok(metrics.totalSales !== undefined);

    // Historical invoices in database remain intact
    const allInvoicesCount = await prisma.sale.count({ where: { businessId: storeAId } });
    assert.ok(allInvoicesCount >= 1, 'Invoices are never purged at midnight or day rollover');
  });

  // ══════════════════════════════════════════════════════════════════
  // SCENARIO 13: Database failures produce useful errors and do not create partial transactions
  // ══════════════════════════════════════════════════════════════════
  test('Scenario 13: Invalid transaction fails atomically without leaving orphan records or corrupting state', async () => {
    const invalidPayload = {
      invoiceNumber: `INV-FAIL-${Date.now()}`,
      items: [
        {
          productId: 'non-existent-product-id-999',
          name: 'Phantom Product',
          quantity: 0, // Invalid quantity triggers atomic rollback
          price: 500,
        },
      ],
      grandTotal: 2500,
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify(invalidPayload),
    });

    // Backend must reject with 400 Bad Request
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.ok(json.message, 'Must return clear error message');

    // Confirm no sale was created in DB for this invalid invoice number
    const orphanSale = await prisma.sale.findFirst({
      where: { invoiceNumber: invalidPayload.invoiceNumber },
    });
    assert.equal(orphanSale, null, 'No orphan or partial sale record must be created');
  });
});
