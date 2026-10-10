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

describe('PHASE 2: COMPLETE INVOICE HISTORY AND STATUS MANAGEMENT', () => {
  const storeId = 'store-p2-history';
  const ownerId = 'user-p2-owner';
  const caId = 'user-p2-ca';

  let ownerToken;
  let caToken;

  let prodAId = 'prod-p2-itemA';
  let prodBId = 'prod-p2-itemB';

  let invoicePaidId;
  let invoiceUnpaidId;
  let invoicePendingId;
  let invoicePartialId;

  before(async () => {
    // 1. Setup Store
    await prisma.business.create({
      data: {
        id: storeId,
        name: 'Bilzet Phase 2 Retail Hub',
        ownerId,
        email: 'hub@bilzet.test',
        phone: '+91 98888 12345',
        gstin: '33AAAAA9999A1Z9',
        address: '42 Commercial Express Road, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 2. Setup Owner
    await prisma.user.create({
      data: {
        id: ownerId,
        email: 'owner-p2@bilzet.test',
        name: 'Phase 2 Store Owner',
        role: 'ADMIN',
        businessId: storeId,
        isOwner: true,
      },
    });

    // 3. Setup CA
    await prisma.user.create({
      data: {
        id: caId,
        email: 'ca-p2@bilzet.test',
        name: 'Auditor Shankaran CA',
        role: 'CA',
        businessId: null,
      },
    });

    // 4. Assign CA store access
    await prisma.caStoreAccess.create({
      data: {
        id: 'acc-p2-ca',
        caUserId: caId,
        businessId: storeId,
        status: 'ACTIVE',
      },
    });

    // 5. Setup Products
    await prisma.product.create({
      data: {
        id: prodAId,
        businessId: storeId,
        name: 'Heavy Duty Power Drill',
        sku: 'HDPD-500',
        sellingPrice: 1000,
        purchasePrice: 600,
        gstRate: 18,
        stock: 100,
        stockQuantity: 100,
        unit: 'PIECE',
      },
    });

    await prisma.product.create({
      data: {
        id: prodBId,
        businessId: storeId,
        name: 'Industrial Tool Set (24pc)',
        sku: 'ITS-24PC',
        sellingPrice: 500,
        purchasePrice: 300,
        gstRate: 18,
        stock: 100,
        stockQuantity: 100,
        unit: 'SET',
      },
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'owner-p2@bilzet.test',
      role: 'ADMIN',
      businessId: storeId,
    });

    caToken = generateToken({
      id: caId,
      email: 'ca-p2@bilzet.test',
      role: 'CA',
      businessId: null,
    });
  });

  // ── TEST 1: Finalized Invoice is Automatically Saved (Req 1) ──
  test('1. Save every finalized invoice automatically with stock deduction', async () => {
    const payload = {
      customerName: 'Karthik Enterprises',
      customerPhone: '9888877771',
      customerGstin: '33CCCC1111C1Z1',
      customerState: 'Tamil Nadu',
      paidAmount: 2360,
      paymentMethod: 'UPI',
      items: [
        {
          productId: prodAId,
          name: 'Heavy Duty Power Drill',
          rate: 1000,
          quantity: 2,
          discount: 0,
          gstRate: 18,
        },
      ],
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.sale);
    assert.ok(body.data.sale.invoiceNumber);
    assert.equal(body.data.sale.subtotal, 2000);
    assert.equal(body.data.sale.taxTotal, 360);
    assert.equal(body.data.sale.grandTotal, 2360);
    assert.equal(body.data.sale.paidAmount, 2360);
    assert.equal(body.data.sale.paymentStatus, 'PAID');
    assert.equal(body.data.sale.returnStatus, 'NONE');

    invoicePaidId = body.data.sale.id;

    // Check stock was deducted automatically
    const prod = await prisma.product.findUnique({ where: { id: prodAId } });
    assert.equal(prod.stock, 98);
  });

  // ── TEST 2: Status Definitions (PAID, UNPAID, PENDING, PARTIALLY PAID) ──
  test('2. Status Definitions: UNPAID, PENDING, and PARTIALLY PAID are distinct and PENDING is not UNPAID', async () => {
    // 2.1 Create UNPAID invoice
    const unpaidPayload = {
      customerName: 'Credit Customer Suresh',
      customerPhone: '9888877772',
      paidAmount: 0,
      items: [
        {
          productId: prodBId,
          name: 'Industrial Tool Set (24pc)',
          rate: 500,
          quantity: 2,
          gstRate: 18,
        },
      ],
    };

    const resUnpaid = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(unpaidPayload),
    });
    const bodyUnpaid = await resUnpaid.json();
    assert.equal(bodyUnpaid.data.sale.paymentStatus, 'UNPAID');
    assert.equal(bodyUnpaid.data.sale.balanceDue, 1180);
    invoiceUnpaidId = bodyUnpaid.data.sale.id;

    // 2.2 Create PENDING invoice (payment or settlement awaiting completion)
    const pendingPayload = {
      customerName: 'Cheque Clearance Buyer',
      customerPhone: '9888877773',
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'PENDING',
      paidAmount: 0,
      items: [
        {
          productId: prodAId,
          name: 'Heavy Duty Power Drill',
          rate: 1000,
          quantity: 1,
          gstRate: 18,
        },
      ],
    };

    const resPending = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(pendingPayload),
    });
    const bodyPending = await resPending.json();
    assert.equal(bodyPending.data.sale.paymentStatus, 'PENDING');
    assert.notEqual(
      bodyPending.data.sale.paymentStatus,
      'UNPAID',
      'PENDING and UNPAID must never be treated as identical states'
    );
    invoicePendingId = bodyPending.data.sale.id;

    // 2.3 Create PARTIALLY PAID invoice
    const partialPayload = {
      customerName: 'Anil Hardware Traders',
      customerPhone: '9888877774',
      paidAmount: 500,
      items: [
        {
          productId: prodBId,
          name: 'Industrial Tool Set (24pc)',
          rate: 500,
          quantity: 2,
          gstRate: 18,
        },
      ],
    };

    const resPartial = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(partialPayload),
    });
    const bodyPartial = await resPartial.json();
    assert.equal(bodyPartial.data.sale.paymentStatus, 'PARTIALLY_PAID');
    assert.equal(bodyPartial.data.sale.paidAmount, 500);
    assert.equal(bodyPartial.data.sale.balanceDue, 680);
    invoicePartialId = bodyPartial.data.sale.id;
  });

  // ── TEST 3: Partial Return & Full Return Status Tracking ──
  test('3. Return status tracking: PARTIALLY RETURNED and RETURNED', async () => {
    // Partial return on invoicePaidId (returned 1 drill out of 2)
    const returnPayload = {
      reason: 'Defective packaging',
      items: [
        {
          productId: prodAId,
          quantity: 1,
        },
      ],
    };

    const resReturn = await fetch(`${baseUrl}/sales/${invoicePaidId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(returnPayload),
    });

    assert.equal(resReturn.status, 200);
    const bodyReturn = await resReturn.json();
    const updatedSale = bodyReturn.data.sale;

    assert.equal(updatedSale.returnStatus, 'PARTIALLY_RETURNED');
    assert.equal(updatedSale.returnedAmount, 1180);
    assert.equal(updatedSale.netPayable, 1180);
    assert.equal(updatedSale.gstAdjustment, 180);

    // Check item breakdown has returnedQuantity
    const returnedItem = updatedSale.items.find((i) => i.productId === prodAId);
    assert.equal(returnedItem.originalQuantity, 2);
    assert.equal(returnedItem.returnedQuantity, 1);
    assert.equal(returnedItem.remainingQuantity, 1);
    assert.equal(returnedItem.gstAdjustment, 180);

    // Stock for Drill should have been restored by 1
    const prod = await prisma.product.findUnique({ where: { id: prodAId } });
    assert.equal(prod.stock, 98); // 97 (after pending) + 1 restored = 98

    // Now return the remaining 1 drill to achieve full RETURNED status
    const fullReturnPayload = {
      reason: 'Customer cancelled project',
      items: [
        {
          productId: prodAId,
          quantity: 1,
        },
      ],
    };

    const resFull = await fetch(`${baseUrl}/sales/${invoicePaidId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(fullReturnPayload),
    });

    assert.equal(resFull.status, 200);
    const bodyFull = await resFull.json();
    assert.equal(bodyFull.data.sale.returnStatus, 'RETURNED');
    assert.equal(bodyFull.data.sale.netPayable, 0);
    assert.equal(bodyFull.data.sale.gstAdjustment, 360);
  });

  // ── TEST 4: Product-Level Breakdown & Values Display (Req 3 & Req 4) ──
  test('4. Complete product-level breakdown with original values, GST adjustments, and net payable', async () => {
    const res = await fetch(`${baseUrl}/sales/${invoicePaidId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const sale = body.data.sale;

    assert.equal(sale.originalGrandTotal, 2360);
    assert.equal(sale.returnedAmount, 2360);
    assert.equal(sale.gstAdjustment, 360);
    assert.equal(sale.netPayable, 0);
    assert.equal(sale.returnStatus, 'RETURNED');

    assert.ok(Array.isArray(sale.items));
    assert.ok(sale.items.length > 0);
    const item = sale.items[0];
    assert.equal(item.originalQuantity, 2);
    assert.equal(item.returnedQuantity, 2);
    assert.equal(item.remainingQuantity, 0);
    assert.equal(item.originalTaxAmount, 360);
    assert.equal(item.gstAdjustment, 360);
  });

  // ── TEST 5: CA Portal Access & Data Availability (Req 5) ──
  test('5. CA Portal retrieves authorized store invoice history with full breakdown', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.invoices);
    assert.ok(body.data.invoices.length >= 4);

    const paidInv = body.data.invoices.find((i) => i.id === invoicePaidId);
    assert.ok(paidInv);
    assert.equal(paidInv.returnStatus, 'RETURNED');
    assert.equal(paidInv.originalGrandTotal, 2360);
    assert.equal(paidInv.netPayable, 0);
    assert.equal(paidInv.gstAdjustment, 360);
  });

  // ── TEST 6: Date-Wise, Month-Wise, and Year-Wise Filtering (Req 6) ──
  test('6. Date-wise, month-wise, and year-wise filters return correct filtered history', async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 6.1 Year filter
    const resYear = await fetch(`${baseUrl}/sales?year=${currentYear}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const bodyYear = await resYear.json();
    assert.ok(bodyYear.data.sales.length >= 4);

    // 6.2 Month + Year filter
    const resMonth = await fetch(`${baseUrl}/sales?year=${currentYear}&month=${currentMonth}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const bodyMonth = await resMonth.json();
    assert.ok(bodyMonth.data.sales.length >= 4);

    // 6.3 Future Year should return 0 sales
    const resFuture = await fetch(`${baseUrl}/sales?year=2035`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const bodyFuture = await resFuture.json();
    assert.equal(bodyFuture.data.sales.length, 0);

    // 6.4 CA Portal Month & Year filter
    const resCaFilter = await fetch(
      `${baseUrl}/ca-portal/invoices?storeId=${storeId}&year=${currentYear}&month=${currentMonth}`,
      { headers: { Authorization: `Bearer ${caToken}` } }
    );
    const bodyCaFilter = await resCaFilter.json();
    assert.ok(bodyCaFilter.data.invoices.length >= 4);
  });

  // ── TEST 7: Payment Updates and Audit Trail (Req 7) ──
  test('7. Payment recording updates status to PAID and logs audit trail for creation, payments, and returns', async () => {
    // Record payment of ₹680 on partial invoice to make it fully paid
    const payRes = await fetch(`${baseUrl}/sales/${invoicePartialId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        amount: 680,
        paymentMethod: 'UPI',
        note: 'Settled remaining balance',
      }),
    });

    assert.equal(payRes.status, 200);
    const payBody = await payRes.json();
    assert.equal(payBody.data.sale.paymentStatus, 'PAID');
    assert.equal(payBody.data.sale.balanceDue, 0);

    // Check Audit Trail endpoint
    const auditRes = await fetch(`${baseUrl}/sales/${invoicePartialId}/audit-trail`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.ok(auditBody.data.auditTrail);
    assert.ok(auditBody.data.auditTrail.length >= 2);

    const actions = auditBody.data.auditTrail.map((a) => a.action);
    assert.ok(actions.includes('INVOICE_CREATED'));
    assert.ok(actions.includes('PAYMENT_RECORDED'));

    // Check CA Audit Trail
    const caAuditRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoicePartialId}/audit-trail`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caAuditRes.status, 200);
    const caAuditBody = await caAuditRes.json();
    assert.ok(caAuditBody.data.auditTrail.length >= 2);
  });

  // ── TEST 8: Data Preservation — Finalized Invoices Are Never Deleted (Req 8) ──
  test('8. Finalized invoice records are never deleted upon returns or payments', async () => {
    const saleInDb = await prisma.sale.findUnique({
      where: { id: invoicePaidId },
    });
    assert.ok(saleInDb, 'Invoice record must exist in database after complete return');
    assert.ok(saleInDb.invoiceNumber);

    const salesList = await prisma.sale.findMany({
      where: { businessId: storeId },
    });
    assert.equal(salesList.length, 4, 'All 4 invoices must remain preserved in database');
  });

  // ── TEST 9: Prevent Unauthorized Edits to Finalized Invoices (Req 9) ──
  test('9. Prevent direct arbitrary edits or deletions on finalized invoices', async () => {
    // Attempting PUT /sales/:id
    const putRes = await fetch(`${baseUrl}/sales/${invoicePaidId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ grandTotal: 500 }),
    });
    assert.equal(putRes.status, 403);

    // Attempting DELETE /sales/:id
    const deleteRes = await fetch(`${baseUrl}/sales/${invoicePaidId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(deleteRes.status, 403);
  });

  // ── TEST 10: Shop Owner and CA View Consistency (Req 10) ──
  test('10. Shop owner and CA see consistent, database-backed records', async () => {
    const ownerRes = await fetch(`${baseUrl}/sales/${invoicePartialId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const ownerBody = await ownerRes.json();
    const ownerInv = ownerBody.data.sale;

    const caRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoicePartialId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    const caBody = await caRes.json();
    const caInv = caBody.data.invoice;

    assert.equal(ownerInv.invoiceNumber, caInv.invoiceNumber);
    assert.equal(ownerInv.grandTotal, caInv.grandTotal);
    assert.equal(ownerInv.paidAmount, caInv.paidAmount);
    assert.equal(ownerInv.balanceDue, caInv.balanceDue);
    assert.equal(ownerInv.paymentStatus, caInv.paymentStatus);
    assert.equal(ownerInv.returnStatus, caInv.returnStatus);
    assert.equal(ownerInv.taxTotal, caInv.taxTotal);
  });
});
