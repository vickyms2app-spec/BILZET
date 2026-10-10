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

describe('PHASE 5: DEDICATED CHARTERED ACCOUNTANT PORTAL', () => {
  const storeAId = 'store-p5-alpha';
  const storeBId = 'store-p5-beta'; // Unauthorized store for tenant isolation test

  const ownerAId = 'user-p5-owner-a';
  const ownerBId = 'user-p5-owner-b';
  const staffId = 'user-p5-staff';
  const caId = 'user-p5-ca';

  let ownerAToken;
  let staffToken;
  let caToken;

  let invoice1Id;
  let invoice2Id;
  let invoiceBId;
  let creditNoteNumber;

  before(async () => {
    // 1. Setup Authorized Store A (Tamil Nadu)
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Alpha Retailers Private Ltd',
        ownerId: ownerAId,
        email: 'alpha@bilzet.test',
        phone: '+91 94444 11111',
        gstin: '33AAAAA1111A1Z1',
        address: '100 Mount Road, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 2. Setup Unauthorized Store B (Karnataka)
    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Beta Enterprises Ltd',
        ownerId: ownerBId,
        email: 'beta@bilzet.test',
        phone: '+91 95555 22222',
        gstin: '29BBBBB2222B2Z2',
        address: '50 MG Road, Bengaluru',
        state: 'Karnataka',
      },
    });

    // 3. Setup Store Owner A
    await prisma.user.create({
      data: {
        id: ownerAId,
        email: 'owner-a@bilzet.test',
        name: 'Alpha Owner',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
      },
    });

    // 4. Setup Non-CA Staff User
    await prisma.user.create({
      data: {
        id: staffId,
        email: 'staff-p5@bilzet.test',
        name: 'Cashier Staff',
        role: 'STAFF',
        businessId: storeAId,
      },
    });

    // 5. Setup CA User
    await prisma.user.create({
      data: {
        id: caId,
        email: 'auditor-p5@bilzet.test',
        name: 'Chartered Accountant Sharma',
        role: 'CA',
        businessId: null,
      },
    });

    // 6. Explicitly Authorize CA for Store A ONLY (Store B is NOT authorized!)
    await prisma.caStoreAccess.create({
      data: {
        id: 'access-p5-ca-a',
        caUserId: caId,
        businessId: storeAId,
        status: 'ACTIVE',
      },
    });

    ownerAToken = generateToken({
      id: ownerAId,
      email: 'owner-a@bilzet.test',
      role: 'ADMIN',
      businessId: storeAId,
    });

    staffToken = generateToken({
      id: staffId,
      email: 'staff-p5@bilzet.test',
      role: 'STAFF',
      businessId: storeAId,
    });

    caToken = generateToken({
      id: caId,
      email: 'auditor-p5@bilzet.test',
      role: 'CA',
      businessId: null,
    });

    // 7. Seed Real Database Records for Store A
    // Create Products in Store A
    const prod1 = await prisma.product.create({
      data: {
        id: 'prod-p5-1',
        name: 'Electronics Item 18%',
        sku: 'ELEC-18',
        hsn: '8504',
        hsnCode: '8504',
        costPrice: 50,
        sellingPrice: 100,
        gstRate: 18,
        taxPercent: 18,
        stock: 500,
        businessId: storeAId,
      },
    });

    const prod2 = await prisma.product.create({
      data: {
        id: 'prod-p5-2',
        name: 'Apparel Item 12%',
        sku: 'APP-12',
        hsn: '6109',
        hsnCode: '6109',
        costPrice: 100,
        sellingPrice: 200,
        gstRate: 12,
        taxPercent: 12,
        stock: 200,
        businessId: storeAId,
      },
    });

    // Customer in Store A (Tamil Nadu, Intra-state)
    const custA = await prisma.customer.create({
      data: {
        id: 'cust-p5-a',
        name: 'Tamil Nadu Traders',
        phone: '9888877777',
        gstin: '33CCCCC3333C1Z3',
        state: 'Tamil Nadu',
        businessId: storeAId,
      },
    });

    // Create Invoice 1: 50 units @ ₹100, 18% GST -> Taxable ₹5000, GST ₹900, Grand Total ₹5900. Paid in full.
    const inv1Res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: custA.id,
        items: [
          {
            productId: prod1.id,
            name: prod1.name,
            quantity: 50,
            rate: 100,
            gstRate: 18,
            hsn: '8504',
          },
        ],
        paymentMethod: 'UPI',
        paidAmount: 5900,
        paymentStatus: 'PAID',
      }),
    });
    const inv1Data = await inv1Res.json();
    assert.equal(inv1Res.status, 201);
    invoice1Id = inv1Data.data.sale.id;

    // Create Invoice 2: 20 units @ ₹200, 12% GST -> Taxable ₹4000, GST ₹480, Grand Total ₹4480. Unpaid.
    const inv2Res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: custA.id,
        items: [
          {
            productId: prod2.id,
            name: prod2.name,
            quantity: 20,
            rate: 200,
            gstRate: 12,
            hsn: '6109',
          },
        ],
        paymentMethod: 'CASH',
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      }),
    });
    const inv2Data = await inv2Res.json();
    assert.equal(inv2Res.status, 201);
    invoice2Id = inv2Data.data.sale.id;

    // Create Invoice in Store B (Unauthorized store)
    const invB = await prisma.sale.create({
      data: {
        id: 'sale-store-b-secret',
        invoiceNumber: 'INV-B-SECRET-001',
        businessId: storeBId,
        subtotal: 50000,
        taxTotal: 9000,
        grandTotal: 59000,
        paidAmount: 59000,
        paymentStatus: 'PAID',
      },
    });
    invoiceBId = invB.id;
  });

  // ══════════════════════════════════════════════════════════════
  // 1. ACCESS CONTROL & ROLE GUARD (Req 5)
  // ══════════════════════════════════════════════════════════════
  test('1. Access Control: CA Portal is strictly restricted to authenticated CA or SUPER_ADMIN users', async () => {
    // Non-CA user (STAFF) should be rejected with 403 Forbidden
    const staffRes = await fetch(`${baseUrl}/ca-portal/stores`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert.equal(staffRes.status, 403, 'Non-CA user must be forbidden from accessing CA portal');

    // Authenticated CA user should be granted access
    const caRes = await fetch(`${baseUrl}/ca-portal/stores`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caRes.status, 200, 'Authenticated CA user must be permitted');
    const caData = await caRes.json();
    assert.ok(Array.isArray(caData.data.stores));
    assert.equal(caData.data.stores.length, 1);
    assert.equal(caData.data.stores[0].id, storeAId);
  });

  // ══════════════════════════════════════════════════════════════
  // 2. TENANT ISOLATION & ANTI-IDOR PREVENTION (Req 5)
  // ══════════════════════════════════════════════════════════════
  test('2. Multi-tenant Isolation: CA cannot access unauthorized store data by tampering with storeId or URL', async () => {
    // Attempt to access unauthorized Store B invoices via query tampering
    const tamperInvoicesRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(tamperInvoicesRes.status, 403, 'Must reject access to unauthorized store invoices');

    // Attempt to access unauthorized Store B financial summary
    const tamperSummaryRes = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(tamperSummaryRes.status, 403, 'Must reject access to unauthorized store financial summary');

    // Attempt to access unauthorized Store B credit notes
    const tamperCnRes = await fetch(`${baseUrl}/ca-portal/credit-notes?storeId=${storeBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(tamperCnRes.status, 403, 'Must reject access to unauthorized store credit notes');

    // Attempt to directly access an invoice belonging to Store B by ID
    const tamperDirectInvRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoiceBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(tamperDirectInvRes.status, 403, 'Must reject direct IDOR access to invoice of unauthorized store');
  });

  // ══════════════════════════════════════════════════════════════
  // 3. CA DASHBOARD: 7 CORE FINANCIAL METRICS BEFORE RETURNS (Req 1)
  // ══════════════════════════════════════════════════════════════
  test('3. Dashboard: Accurate financial metrics before returns (Invoices, Sales, GST, Payments, Dues)', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const metrics = body.data.summary.metrics;

    // Total Invoices = 2
    assert.equal(metrics.totalInvoices, 2, 'Total invoices must equal 2');

    // Total Sales Before Returns = ₹5900 + ₹4480 = ₹10380
    assert.equal(metrics.totalSalesBeforeReturns, 10380);

    // Returns = 0 before any returns are filed
    assert.equal(metrics.totalReturnsAmount, 0);
    assert.equal(metrics.netSalesAfterReturns, 10380);

    // GST Collected on Sales = ₹900 (Invoice 1) + ₹480 (Invoice 2) = ₹1380
    assert.equal(metrics.gstCollectedOnSales, 1380);
    assert.equal(metrics.gstAdjustmentsFromReturns, 0);
    assert.equal(metrics.netGst, 1380);

    // Payments Received = ₹5900 (Invoice 1 paid, Invoice 2 unpaid)
    assert.equal(metrics.paymentsReceived, 5900);

    // Outstanding Balances = ₹4480 (Invoice 2 balance due)
    assert.equal(metrics.outstandingBalances, 4480);
  });

  // ══════════════════════════════════════════════════════════════
  // 4. PRODUCT RETURN & LIVE RECONCILIATION IN CA PORTAL (Req 1, 3)
  // ══════════════════════════════════════════════════════════════
  test('4. Returns & Credit Notes: Product return reverses taxable value, reverses GST, and updates CA Dashboard', async () => {
    // Initiate partial return on Invoice 1: return 10 out of 50 units (taxable: ₹1000, 18% GST: ₹180, Total return: ₹1180)
    const returnRes = await fetch(`${baseUrl}/sales/${invoice1Id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            productId: 'prod-p5-1',
            quantity: 10,
            rate: 100,
          },
        ],
        reason: 'Customer requested return of 10 surplus units',
        refundMethod: 'CASH',
      }),
    });
    assert.equal(returnRes.status, 200);
    const returnData = await returnRes.json();
    const updatedSale = returnData.data.sale;
    const cn = returnData.data.creditNote || (updatedSale.returns && updatedSale.returns[0]);
    assert.ok(cn, 'Credit note record must exist');
    creditNoteNumber = cn.creditNoteNumber;
    assert.ok(creditNoteNumber, 'Credit note number must be generated');

    // Check CA Dashboard Reconciled Summary
    const sumRes = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(sumRes.status, 200);
    const sumBody = await sumRes.json();
    const metrics = sumBody.data.summary.metrics;

    // 1. Total Invoices remains 2
    assert.equal(metrics.totalInvoices, 2);

    // 2. Total Sales Before Returns remains gross ₹10380
    assert.equal(metrics.totalSalesBeforeReturns, 10380);

    // 3. Total Returns and Credit Notes reflects ₹1180
    assert.equal(metrics.totalReturnsAmount, 1180);
    assert.equal(metrics.totalReturnsCount, 1);

    // 4. Net Sales After Returns = ₹10380 - ₹1180 = ₹9200
    assert.equal(metrics.netSalesAfterReturns, 9200);

    // 5. GST Collected on Sales = ₹1380
    assert.equal(metrics.gstCollectedOnSales, 1380);

    // 6. GST Adjustments from Returns = ₹180
    assert.equal(metrics.gstAdjustmentsFromReturns, 180);

    // Reconciled Net GST = ₹1380 - ₹180 = ₹1200
    assert.equal(metrics.netGst, 1200);

    // 7. Payments Received and Outstanding Balances
    assert.equal(metrics.paymentsReceived, 5900);
    assert.equal(metrics.outstandingBalances, 4480);
  });

  // ══════════════════════════════════════════════════════════════
  // 5. INVOICE MANAGEMENT & FILTERING (Req 2)
  // ══════════════════════════════════════════════════════════════
  test('5. Invoice Management: Paid/Unpaid filters, Return filters, and product-level tax breakdown', async () => {
    // 5.1 Filter by Payment Status: PAID
    const paidRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}&paymentStatus=PAID`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(paidRes.status, 200);
    const paidData = await paidRes.json();
    assert.equal(paidData.data.invoices.length, 1);
    assert.equal(paidData.data.invoices[0].id, invoice1Id);

    // 5.2 Filter by Payment Status: UNPAID
    const unpaidRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}&paymentStatus=UNPAID`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(unpaidRes.status, 200);
    const unpaidData = await unpaidRes.json();
    assert.equal(unpaidData.data.invoices.length, 1);
    assert.equal(unpaidData.data.invoices[0].id, invoice2Id);

    // 5.3 Filter by Return Status: PARTIALLY_RETURNED
    const retRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}&returnStatus=PARTIALLY_RETURNED`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(retRes.status, 200);
    const retData = await retRes.json();
    assert.equal(retData.data.invoices.length, 1);
    assert.equal(retData.data.invoices[0].id, invoice1Id);

    // 5.4 Filter by Return Status: NONE
    const noRetRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}&returnStatus=NONE`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(noRetRes.status, 200);
    const noRetData = await noRetRes.json();
    assert.equal(noRetData.data.invoices.length, 1);
    assert.equal(noRetData.data.invoices[0].id, invoice2Id);

    // 5.5 Invoice Detail View: Product-level tax breakdown
    const detailRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoice1Id}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(detailRes.status, 200);
    const detailData = await detailRes.json();
    const inv = detailData.data.invoice;

    assert.equal(inv.items.length, 1);
    const item = inv.items[0];
    assert.equal(item.originalQuantity, 50);
    assert.equal(item.returnedQuantity, 10);
    assert.equal(item.remainingQuantity, 40);
    assert.equal(item.gstRate, 18);
    assert.equal(item.gstAdjustment, 180);
    assert.equal(item.cgst, 360); // 40 units net CGST = (4000 * 9%) = 360
    assert.equal(item.sgst, 360); // 40 units net SGST = (4000 * 9%) = 360
  });

  // ══════════════════════════════════════════════════════════════
  // 6. CREDIT NOTES INSPECTION & AUDIT (Req 3, 6)
  // ══════════════════════════════════════════════════════════════
  test('6. Credit Notes Register: Reference to original invoice, line-item quantities, reversals, and settlement info', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/credit-notes?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.creditNotes.length, 1);

    const cn = body.data.creditNotes[0];
    assert.ok(cn.creditNoteNumber.startsWith('CN-'));
    assert.ok(cn.invoiceNumber);
    assert.equal(cn.taxableAmount, 1000, 'Taxable value reversal must equal ₹1000');
    assert.equal(cn.cgstAdjustment, 90, 'CGST reversal must equal ₹90');
    assert.equal(cn.sgstAdjustment, 90, 'SGST reversal must equal ₹90');
    assert.equal(cn.gstAdjustment, 180, 'Total GST adjustment must equal ₹180');
    assert.equal(cn.totalAmount, 1180, 'Total credit note value must equal ₹1180');
    assert.equal(cn.refundStatus, 'COMPLETED');
    assert.equal(cn.settlementDetails?.method, 'UPI');

    // Returned items snapshot
    assert.equal(cn.items.length, 1);
    assert.equal(cn.items[0].quantity, 10);
    assert.equal(cn.items[0].rate, 100);
  });

  // ══════════════════════════════════════════════════════════════
  // 7. AUDIT TRAIL & GST SLAB REPORTS (Req 4, 6)
  // ══════════════════════════════════════════════════════════════
  test('7. GST Reports & Audit Logs: Rate slab classification, period filtering, and audit log inspection', async () => {
    // 7.1 GST Slabs breakdown
    const sumRes = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(sumRes.status, 200);
    const sumBody = await sumRes.json();
    const slabs = sumBody.data.summary.gstFiling.slabs;

    // Slab 18% contains Invoice 1 item (taxable: 5000, tax: 900)
    assert.equal(slabs['18'].taxable, 5000);
    assert.equal(slabs['18'].tax, 900);

    // Slab 12% contains Invoice 2 item (taxable: 4000, tax: 480)
    assert.equal(slabs['12'].taxable, 4000);
    assert.equal(slabs['12'].tax, 480);

    // 7.2 Audit Trail Inspection
    const auditRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoice1Id}/audit-trail`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.ok(Array.isArray(auditData.data.auditTrail));
    assert.ok(auditData.data.auditTrail.length >= 1, 'Audit trail must record events for this invoice');
    assert.ok(auditData.data.auditTrail.some((log) => log.action === 'RETURN_PROCESSED' || log.action === 'CREATE'));
  });
});
