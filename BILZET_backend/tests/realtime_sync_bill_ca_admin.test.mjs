import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import realtimeService from '../src/services/realtime.service.mjs';

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

describe('CRITICAL REQUIREMENT: REAL-TIME BILL INVOICE ↔ CA CONNECT ↔ ADMIN SYNCHRONIZATION (12 SCENARIOS)', () => {
  const storeAId = 'store-rt-sync-store-a';
  const storeBId = 'store-rt-sync-store-b';
  const ownerAId = 'user-rt-owner-a';
  const caUserId = 'user-rt-ca-auditor';
  const strangerId = 'user-rt-unauthorized-user';

  let ownerAToken;
  let caToken;
  let strangerToken;

  let createdInvoiceId;
  let createdInvoiceNumber;
  let productId;
  let initialStock = 100;

  before(async () => {
    // Clean up any stale records
    await prisma.salesReturnItem.deleteMany({}).catch(() => {});
    await prisma.salesReturn.deleteMany({}).catch(() => {});
    await prisma.saleItem.deleteMany({}).catch(() => {});
    await prisma.payment.deleteMany({}).catch(() => {});
    await prisma.auditDiscrepancy.deleteMany({}).catch(() => {});
    await prisma.periodClosing.deleteMany({}).catch(() => {});
    await prisma.sale.deleteMany({}).catch(() => {});
    await prisma.stockTransaction.deleteMany({}).catch(() => {});
    await prisma.product.deleteMany({ where: { id: { in: ['prod-rt-sync-item'] } } }).catch(() => {});
    await prisma.caStoreAccess.deleteMany({}).catch(() => {});
    await prisma.business.deleteMany({ where: { id: { in: [storeAId, storeBId] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [ownerAId, caUserId, strangerId] } } }).catch(() => {});

    // 1. Seed Store A & Store B
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Apex Retail Store A',
        ownerId: ownerAId,
        email: 'apex@store-a.test',
        gstin: '33AAAAA1234A1Z5',
        state: 'Tamil Nadu',
      },
    });

    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Bravo Retail Store B',
        ownerId: strangerId,
        email: 'bravo@store-b.test',
        gstin: '33BBBBB1234B1Z5',
        state: 'Tamil Nadu',
      },
    });

    // 2. Seed Users
    await prisma.user.create({
      data: {
        id: ownerAId,
        name: 'Store A Admin',
        email: 'admin.a@bilzet.test',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
      },
    });

    await prisma.user.create({
      data: {
        id: caUserId,
        name: 'Chartered Accountant Sharma',
        email: 'sharma.ca@bilzet.test',
        role: 'CA',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: strangerId,
        name: 'Unauthorized Stranger',
        email: 'stranger@bilzet.test',
        role: 'ADMIN',
        businessId: storeBId,
      },
    });

    // 3. Grant CA access to Store A
    await prisma.caStoreAccess.create({
      data: {
        caUserId,
        businessId: storeAId,
        status: 'ACTIVE',
      },
    });

    // 4. Seed Product in Store A
    const prod = await prisma.product.create({
      data: {
        id: 'prod-rt-sync-item',
        businessId: storeAId,
        name: 'Premium Basmati Rice 5kg',
        sku: 'RICE-5KG-01',
        stock: initialStock,
        sellingPrice: 500,
        costPrice: 400,
        taxPercent: 18,
      },
    });
    productId = prod.id;

    // Tokens
    ownerAToken = generateToken({ id: ownerAId, email: 'admin.a@bilzet.test', role: 'ADMIN', businessId: storeAId });
    caToken = generateToken({ id: caUserId, email: 'sharma.ca@bilzet.test', role: 'CA' });
    strangerToken = generateToken({ id: strangerId, email: 'stranger@bilzet.test', role: 'ADMIN', businessId: storeBId });
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 1 — NEW INVOICE
  // ══════════════════════════════════════════════════════════════
  test('Test 1 — New Invoice: Creation in Bill Invoice automatically reflects in CA Connect & Admin views with zero drift', async () => {
    // 1. Create Invoice in Bill Invoice module (Store A)
    const billRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerName: 'Suresh Kumar',
        customerPhone: '9876543210',
        customerState: 'Tamil Nadu',
        paymentMethod: 'CASH',
        paidAmount: 500, // Partial payment
        items: [
          {
            productId,
            name: 'Premium Basmati Rice 5kg',
            quantity: 2,
            rate: 500,
            gstRate: 18,
          },
        ],
      }),
    });

    assert.equal(billRes.status, 201, 'Bill Invoice creation must succeed with 201');
    const billData = await billRes.json();
    assert.equal(billData.success, true);
    assert.ok(billData.data.sale);

    createdInvoiceId = billData.data.sale.id;
    createdInvoiceNumber = billData.data.sale.invoiceNumber;

    // 2. Query CA Connect workspace for Store A — MUST see the invoice immediately
    const caRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caRes.status, 200);
    const caData = await caRes.json();
    assert.ok(caData.data.invoices.length >= 1);

    const caInvoice = caData.data.invoices.find((i) => i.id === createdInvoiceId);
    assert.ok(caInvoice, 'Created invoice must immediately exist in CA Connect');
    assert.equal(caInvoice.invoiceNumber, createdInvoiceNumber);
    assert.equal(Number(caInvoice.grandTotal), 1180, 'Grand total must be 1000 + 18% GST = 1180');
    assert.equal(Number(caInvoice.paidAmount), 500);
    assert.equal(Number(caInvoice.balanceDue), 680);
    assert.equal(caInvoice.paymentStatus, 'PARTIALLY_PAID');

    // 3. Verify stock was deducted authoritatively
    const productCheck = await prisma.product.findUnique({ where: { id: productId } });
    assert.equal(productCheck.stock, initialStock - 2, 'Stock must deduct 2 units');

    // 4. Verify Realtime Event Buffer has SALE_CREATED
    const missed = realtimeService.getMissedEvents(storeAId);
    const saleEvent = missed.find((e) => e.type === 'SALE_CREATED' && e.data.saleId === createdInvoiceId);
    assert.ok(saleEvent, 'SALE_CREATED event must be recorded in real-time engine');
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 2 — INVOICE PAYMENT & FINANCIAL SUMMARY
  // ══════════════════════════════════════════════════════════════
  test('Test 2 — Invoice Payment: Recording remaining balance updates both Admin and CA views', async () => {
    // Record payment of ₹680 (full clearance)
    const payRes = await fetch(`${baseUrl}/sales/${createdInvoiceId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 680,
        paymentMethod: 'UPI',
      }),
    });

    assert.equal(payRes.status, 200);
    const payData = await payRes.json();
    assert.equal(payData.data.sale.paymentStatus, 'PAID');
    assert.equal(Number(payData.data.sale.balanceDue), 0);

    // Verify CA Connect view reflects PAID status and 0 balance due
    const caInvRes = await fetch(`${baseUrl}/ca-portal/invoices/${createdInvoiceId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caInvRes.status, 200);
    const caInvData = await caInvRes.json();
    assert.equal(caInvData.data.invoice.paymentStatus, 'PAID');
    assert.equal(Number(caInvData.data.invoice.balanceDue), 0);

    // Verify PAYMENT_RECORDED event was broadcast
    const missed = realtimeService.getMissedEvents(storeAId);
    const payEvent = missed.find((e) => e.type === 'PAYMENT_RECORDED' && e.data.saleId === createdInvoiceId);
    assert.ok(payEvent, 'PAYMENT_RECORDED event must be recorded in real-time engine');
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 4 — PARTIAL RETURN & GST CREDIT NOTE ADJUSTMENT
  // ══════════════════════════════════════════════════════════════
  test('Test 4 — Partial Return: Return 1 unit creates linked credit note, adjusts proportional GST, and syncs to CA Connect', async () => {
    const returnRes = await fetch(`${baseUrl}/sales/${createdInvoiceId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        reason: 'Customer ordered excess packet',
        items: [
          {
            productId,
            quantity: 1, // 1 of 2 units returned
          },
        ],
      }),
    });

    assert.equal(returnRes.status, 200);
    const returnData = await returnRes.json();
    assert.equal(returnData.data.sale.returnStatus, 'PARTIALLY_RETURNED');

    // Check CA Connect credit notes
    const cnRes = await fetch(`${baseUrl}/ca-portal/credit-notes?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(cnRes.status, 200);
    const cnData = await cnRes.json();
    assert.ok(cnData.data.creditNotes.length >= 1);

    const linkedCN = cnData.data.creditNotes.find((cn) => cn.invoiceId === createdInvoiceId);
    assert.ok(linkedCN, 'Linked Credit Note must appear in CA Connect');
    assert.equal(Number(linkedCN.amount), 590, 'Returned amount must be 500 + 18% GST = 590');
    assert.equal(Number(linkedCN.gstAdjustment), 90, 'Proportional GST reversal must be exactly 90');

    // Verify inventory restored by 1 unit
    const prodCheck = await prisma.product.findUnique({ where: { id: productId } });
    assert.equal(prodCheck.stock, initialStock - 1, 'Stock must restore 1 unit');

    // Verify RETURN_PROCESSED & CREDIT_NOTE_CREATED events emitted
    const missed = realtimeService.getMissedEvents(storeAId);
    assert.ok(missed.some((e) => e.type === 'RETURN_PROCESSED' && e.data.saleId === createdInvoiceId));
    assert.ok(missed.some((e) => e.type === 'CREDIT_NOTE_CREATED' && e.data.saleId === createdInvoiceId));
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 3 — CANCELLATION / VOIDING
  // ══════════════════════════════════════════════════════════════
  test('Test 3 — Cancellation: Voiding a non-returned invoice marks CANCELLED, restores remaining stock, and syncs', async () => {
    // Create a new invoice to cancel
    const newBill = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerName: 'Test Cancellation Customer',
        customerPhone: '9888877777',
        paymentMethod: 'CASH',
        paidAmount: 590,
        items: [{ productId, quantity: 1, rate: 500, gstRate: 18 }],
      }),
    });
    const newBillData = await newBill.json();
    const cancelInvId = newBillData.data.sale.id;

    // Void the invoice
    const voidRes = await fetch(`${baseUrl}/sales/${cancelInvId}/void`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ reason: 'Billing entry mistake by cashier' }),
    });

    assert.equal(voidRes.status, 200);
    const voidData = await voidRes.json();
    assert.equal(voidData.data.sale.status, 'CANCELLED');

    // Verify CA Connect reflects CANCELLED status
    const caCheck = await fetch(`${baseUrl}/ca-portal/invoices/${cancelInvId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caCheck.status, 200);
    const caCheckData = await caCheck.json();
    assert.equal(caCheckData.data.invoice.status, 'CANCELLED');

    // Verify event emitted
    const missed = realtimeService.getMissedEvents(storeAId);
    assert.ok(missed.some((e) => e.type === 'INVOICE_VOIDED' && e.data.saleId === cancelInvId));
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 5 — REFUND & PAYMENT IN
  // ══════════════════════════════════════════════════════════════
  test('Test 5 — Payment In: Customer on-account collection recorded and syncs to both Admin and CA views', async () => {
    // Create customer with outstanding balance
    const cust = await prisma.customer.create({
      data: {
        businessId: storeAId,
        name: 'Deepak Traders B2B',
        phone: '9777766666',
        gstin: '33AABCT9999Z1Z1',
        balance: 15000,
      },
    });

    // Record Payment In
    const payInRes = await fetch(`${baseUrl}/sales/payments-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: cust.id,
        amount: 5000,
        method: 'BANK_TRANSFER',
        transactionId: 'NEFT-884920491',
      }),
    });

    assert.equal(payInRes.status, 201);
    const payInData = await payInRes.json();
    assert.equal(Number(payInData.data.payment.amount), 5000);

    // Verify customer balance decremented
    const custUpdated = await prisma.customer.findUnique({ where: { id: cust.id } });
    assert.equal(Number(custUpdated.balance), 10000, 'Customer balance must decrease from 15000 to 10000');

    // Verify CA Payments view contains this payment
    const caPayRes = await fetch(`${baseUrl}/ca-portal/payments?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caPayRes.status, 200);
    const caPayData = await caPayRes.json();
    const foundPay = caPayData.data.payments.find((p) => p.id === payInData.data.payment.id);
    assert.ok(foundPay, 'Payment In must appear in CA Payments & Reconciliation view');
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 6 — CA CORRECTION WORKFLOW (REQUEST, APPROVE & SYNC)
  // ══════════════════════════════════════════════════
  test('Test 6 — CA Correction: CA requests invoice correction, Admin approves, authoritative record updates and broadcasts', async () => {
    // 1. CA requests correction
    const reqRes = await fetch(`${baseUrl}/ca-portal/invoices/${createdInvoiceId}/request-correction?storeId=${storeAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        title: 'Due Date Adjustment Request',
        reason: 'Client agreed to 30-day extended credit period',
        dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      }),
    });

    assert.equal(reqRes.status, 201);
    const reqData = await reqRes.json();
    const discrepancyId = reqData.data.discrepancy.id;
    assert.equal(reqData.data.discrepancy.status, 'CORRECTION_REQUESTED');

    // 2. Admin approves correction via /api/v1/ca-connect/discrepancies/:id/approve
    const approveRes = await fetch(`${baseUrl}/ca-connect/discrepancies/${discrepancyId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        notes: 'Approved 30 days credit extension',
        dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      }),
    });

    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.data.discrepancy.status, 'VERIFIED');

    // 3. Verify real-time broadcast of INVOICE_CORRECTION_APPLIED
    const missed = realtimeService.getMissedEvents(storeAId);
    assert.ok(missed.some((e) => e.type === 'INVOICE_CORRECTION_APPLIED' && e.data.discrepancyId === discrepancyId));
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 7 — SIMULTANEOUS EDITS & CONFLICT DETECTION
  // ══════════════════════════════════════════════════
  test('Test 7 — Conflict Handling: Attempting to void an already voided invoice returns 409 Conflict', async () => {
    // Find the voided invoice from Test 3
    const cancelledSale = await prisma.sale.findFirst({
      where: { businessId: storeAId, status: 'CANCELLED' },
    });
    assert.ok(cancelledSale);

    const conflictRes = await fetch(`${baseUrl}/sales/${cancelledSale.id}/void`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ reason: 'Attempt duplicate void' }),
    });

    assert.equal(conflictRes.status, 409, 'Concurrent or duplicate void must return 409 Conflict');
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 8 — NETWORK INTERRUPTION & REPLAY VIA LAST-EVENT-ID
  // ══════════════════════════════════════════════════
  test('Test 8 — Network Interruption: Event replay via Last-Event-ID delivers missed events on reconnection', async () => {
    // 1. Get recent event from outbox
    const events = realtimeService.getMissedEvents(storeAId);
    assert.ok(events.length > 2, 'Events must exist in buffer');

    const firstEventId = events[0].eventId;
    // Replay since firstEventId
    const replayed = realtimeService.getMissedEvents(storeAId, firstEventId);
    assert.equal(replayed.length, events.length - 1, 'Must replay all events that occurred after firstEventId');

    // 2. Query state reconciliation endpoint
    const reconRes = await fetch(`${baseUrl}/realtime/reconcile?businessId=${storeAId}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(reconRes.status, 200);
    const reconData = await reconRes.json();
    assert.ok(reconData.data.salesCount >= 1);
    assert.ok(reconData.data.serverTime);
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 9 — DUPLICATE EVENT IDEMPOTENCY
  // ══════════════════════════════════════════════════
  test('Test 9 — Duplicate Event Protection: Repeated delivery of the exact same eventId is safely de-duplicated', () => {
    const fixedEventId = `evt_test_dedup_${Date.now()}`;
    const res1 = realtimeService.broadcastBusinessEvent(storeAId, 'SALE_CREATED', { test: true }, { eventId: fixedEventId });
    assert.ok(res1, 'First event broadcast must succeed');

    const res2 = realtimeService.broadcastBusinessEvent(storeAId, 'SALE_CREATED', { test: true }, { eventId: fixedEventId });
    assert.equal(res2, null, 'Second broadcast with identical eventId must be safely skipped');
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 10 — PERMISSIONS & CLIENT ISOLATION
  // ══════════════════════════════════════════════════
  test('Test 10 — Multi-Tenant Isolation: Unauthorized user cannot read or subscribe to Store A records', async () => {
    // Stranger (from Store B) attempts to read Store A CA records
    const unauthRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    // Must return 403 Forbidden
    assert.equal(unauthRes.status, 403, 'Unauthorized store access must return 403 Forbidden');

    // Stranger attempts to subscribe to Store A real-time stream
    const unauthStream = await fetch(`${baseUrl}/realtime/stream?businessId=${storeAId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    assert.equal(unauthStream.status, 403, 'Unauthorized real-time subscription must return 403');
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 11 — HISTORICAL PERIOD CLOSING PROTECTION
  // ══════════════════════════════════════════════════
  test('Test 11 — Historical Period Protection: Cannot request direct invoice correction for a closed/frozen period', async () => {
    // 1. Close period for the month of the created invoice
    const inv = await prisma.sale.findUnique({ where: { id: createdInvoiceId } });
    const invDate = new Date(inv.createdAt);
    const periodStr = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;

    await prisma.periodClosing.create({
      data: {
        businessId: storeAId,
        period: periodStr,
        status: 'CLOSED',
        signOffNotes: 'Period permanently frozen by CA',
      },
    });

    // 2. Attempt direct correction on an invoice belonging to this closed period
    const directCorrRes = await fetch(`${baseUrl}/ca-portal/invoices/${createdInvoiceId}/request-correction?storeId=${storeAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        title: 'Retroactive change test',
        reason: 'Attempting to change finalized period invoice',
      }),
    });

    assert.equal(directCorrRes.status, 400, 'Direct correction on a closed period must be rejected with 400');
    const errData = await directCorrRes.json();
    assert.match(errData.message, /closed\/signed off/i);
  });

  // ══════════════════════════════════════════════════════════════
  // TEST 12 — REPORTS & WORKPAPERS CONSISTENCY
  // ══════════════════════════════════════════════════
  test('Test 12 — Workpapers & Reports: Generated audit workpapers reflect the exact authoritative database records', async () => {
    const wpRes = await fetch(`${baseUrl}/ca-portal/workpapers?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });

    assert.equal(wpRes.status, 200);
    const wpData = await wpRes.json();
    const wp = wpData.data.workpapers;

    assert.ok(wp.salesRegister, 'Sales register must be generated');
    assert.ok(wp.creditNotesRegister, 'Credit notes register must be generated');
    assert.ok(wp.executiveSummary, 'Executive summary must be generated');
    assert.ok(wp.salesRegister.length >= 1, 'Sales register must contain at least 1 row');
  });
});
