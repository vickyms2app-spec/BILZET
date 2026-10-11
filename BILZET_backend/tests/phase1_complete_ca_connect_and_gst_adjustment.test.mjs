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

describe('MASTER VERIFICATION: COMPLETE CA CONNECT (14 SECTIONS) + AUTOMATIC GST ADJUSTMENTS', () => {
  const storeAId = 'store-master-alpha';
  const storeBId = 'store-master-beta'; // Unauthorized store for tenant isolation test

  const ownerAId = 'user-master-owner-a';
  const caId = 'user-master-ca';
  const unauthorizedUserId = 'user-master-other';

  let ownerAToken;
  let caToken;
  let unauthorizedToken;

  let invoiceMasterId;
  let creditNoteNumber;
  let flaggedDiscrepancyId;
  let periodClosingId;

  before(async () => {
    // 1. Create Authorized Store A (Tamil Nadu)
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Master Retail Supermart',
        ownerId: ownerAId,
        email: 'alpha@bilzet.test',
        phone: '+91 98888 11111',
        gstin: '33AAAAA1111A1Z1',
        address: '100 GST Road, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 2. Create Unauthorized Store B (Karnataka)
    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Beta Global Tech Store',
        ownerId: 'owner-beta-id',
        email: 'beta@bilzet.test',
        phone: '+91 97777 22222',
        gstin: '29BBBBB2222B2Z2',
        address: '50 MG Road, Bengaluru',
        state: 'Karnataka',
      },
    });

    // 3. Create Store Owner A
    await prisma.user.create({
      data: {
        id: ownerAId,
        email: 'owner-master@bilzet.test',
        name: 'Retail Owner',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
      },
    });

    // 4. Create Authorized CA User
    await prisma.user.create({
      data: {
        id: caId,
        email: 'auditor-master@bilzet.test',
        name: 'Suresh Kumar, CA',
        role: 'CA',
        businessId: null,
      },
    });

    // 5. Create Unauthorized Non-CA User
    await prisma.user.create({
      data: {
        id: unauthorizedUserId,
        email: 'outsider@bilzet.test',
        name: 'Outsider User',
        role: 'STAFF',
        businessId: storeBId,
      },
    });

    // 6. Explicitly Authorize CA with Store A (Store B is NOT authorized)
    await prisma.caStoreAccess.create({
      data: {
        id: 'cas-master-alpha',
        caUserId: caId,
        businessId: storeAId,
        status: 'ACTIVE',
      },
    });

    // 7. Seed product for Master test
    await prisma.product.create({
      data: {
        id: 'prod-master-widget',
        name: 'Master Tech Widget',
        hsnCode: '8471',
        costPrice: 150,
        sellingPrice: 200,
        taxPercent: 18,
        stock: 100,
        unit: 'PCS',
        businessId: storeAId,
      },
    });

    // 8. Generate Tokens
    ownerAToken = generateToken({
      id: ownerAId,
      email: 'owner-master@bilzet.test',
      role: 'ADMIN',
      businessId: storeAId,
    });

    caToken = generateToken({
      id: caId,
      email: 'auditor-master@bilzet.test',
      role: 'CA',
      businessId: null,
    });

    unauthorizedToken = generateToken({
      id: unauthorizedUserId,
      email: 'outsider@bilzet.test',
      role: 'STAFF',
      businessId: storeBId,
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 1: PHASE 5 EXACT GST CALCULATION & RETURN ADJUSTMENT VERIFICATION
  // Example requirement:
  // 50 units sold for ₹10,000 + ₹1,800 GST (18%) = ₹11,800.
  // 10 units returned:
  // - Returned taxable: ₹2,000
  // - GST adjustment: ₹360
  // - Revised net taxable: ₹8,000
  // - Revised net GST: ₹1,440
  // - Revised net invoice total: ₹9,440
  // - Original invoice remains intact (₹10,000 taxable, ₹1,800 GST, ₹11,800 total).
  // ══════════════════════════════════════════════════════════════════════
  test('Requirement 1 & Phase 5: Exact 50 sold @ 18% GST -> 10 returned calculation verification', async () => {
    // 1. Create Sale of 50 units @ ₹200 taxable each = ₹10,000 taxable + ₹1,800 GST = ₹11,800 total
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerName: 'Enterprise Client Ltd',
        customerPhone: '+91 99999 88888',
        items: [
          {
            productId: 'prod-master-widget',
            productName: 'Master Tech Widget',
            hsnCode: '8471',
            quantity: 50,
            rate: 200, // ₹200 per unit
            gstRate: 18,
          },
        ],
        subtotal: 10000,
        taxTotal: 1800,
        grandTotal: 11800,
        paymentMethod: 'UPI',
        paidAmount: 11800,
      }),
    });

    assert.equal(saleRes.status, 201, 'Sale creation should return 201 Created');
    const saleJson = await saleRes.json();
    const origSale = saleJson.data?.sale || saleJson.data;
    invoiceMasterId = origSale.id;
    assert.ok(invoiceMasterId, 'Invoice ID must be generated');

    // Verify initial invoice financials
    assert.equal(Number(origSale.subtotal), 10000, 'Original taxable must be 10,000');
    assert.equal(Number(origSale.taxTotal), 1800, 'Original GST must be 1,800');
    assert.equal(Number(origSale.grandTotal), 11800, 'Original grand total must be 11,800');

    // 2. Perform Customer Return of 10 units
    const returnRes = await fetch(`${baseUrl}/sales/${invoiceMasterId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            saleItemId: origSale.items[0].id,
            productId: 'prod-master-widget',
            quantity: 10,
          },
        ],
        reason: 'Specification mismatch',
        refundMethod: 'CASH',
      }),
    });

    assert.equal(returnRes.status, 200, 'Return creation should return 200 OK');
    const returnJson = await returnRes.json();
    const returnedSale = returnJson.data?.sale || returnJson.data;

    // 3. Verify Return Adjustments in returnedSale
    assert.equal(Number(returnedSale.returnedTaxableAmount), 2000, 'Returned taxable amount must be exactly ₹2,000');
    assert.equal(Number(returnedSale.gstAdjustment), 360, 'GST adjustment must be exactly ₹360 (18% of ₹2,000)');
    assert.equal(Number(returnedSale.totalReturnedAmount), 2360, 'Total return amount must be exactly ₹2,360');
    assert.equal(Number(returnedSale.netTaxableAmount), 8000, 'Revised net taxable must be exactly ₹8,000');
    assert.equal(Number(returnedSale.netTaxTotal), 1440, 'Revised net GST must be exactly ₹1,440');
    assert.equal(Number(returnedSale.netPayable), 9440, 'Revised net total must be exactly ₹9,440');

    // Original fields remain permanently preserved
    assert.equal(Number(returnedSale.originalTaxableAmount), 10000, 'Original taxable preserved at ₹10,000');
    assert.equal(Number(returnedSale.originalTaxTotal), 1800, 'Original GST preserved at ₹1,800');
    assert.equal(Number(returnedSale.originalGrandTotal), 11800, 'Original grand total preserved at ₹11,800');

    // Linked Credit Note
    assert.ok(returnedSale.returns && returnedSale.returns.length === 1);
    const cn = returnedSale.returns[0];
    creditNoteNumber = cn.creditNoteNumber || cn.returnNumber;
    assert.ok(creditNoteNumber, 'Credit note number must be generated');
    assert.equal(Number(cn.taxableAmount), 2000);
    assert.equal(Number(cn.gstAdjustment), 360);
    assert.equal(Number(cn.totalAmount), 2360);

    // 4. Verify CA Portal invoice inspection
    const invRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoiceMasterId}?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(invRes.status, 200, 'CA should retrieve invoice details');
    const invJson = await invRes.json();
    const inv = invJson.data?.invoice || invJson.data;

    assert.equal(Number(inv.originalTaxableAmount), 10000, 'Original taxable on invoice remains intact at ₹10,000');
    assert.equal(Number(inv.originalTaxTotal), 1800, 'Original GST on invoice remains intact at ₹1,800');
    assert.equal(Number(inv.originalGrandTotal), 11800, 'Original total on invoice remains intact at ₹11,800');
    assert.equal(Number(inv.netTaxableAmount), 8000, 'Revised net taxable must be ₹8,000');
    assert.equal(Number(inv.netTaxTotal), 1440, 'Revised net GST must be ₹1,440');
    assert.equal(Number(inv.netPayable), 9440, 'Revised net total must be ₹9,440');
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 2: CA DASHBOARD METRICS & TAX SLAB BREAKDOWN (SECTIONS 1 & 7)
  // ══════════════════════════════════════════════════════════════════════
  test('Sections 1 & 7: CA Dashboard metrics and multi-slab GST reconciliation', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200, 'Financial summary should return 200');
    const resJson = await res.json();
    const summary = resJson.data?.summary || resJson.data;

    assert.equal(summary.metrics.totalInvoices, 1, 'Should have 1 invoice recorded');
    assert.equal(Number(summary.metrics.totalSalesBeforeReturns), 11800, 'Gross sales must be ₹11,800');
    assert.equal(Number(summary.metrics.totalTaxable), 10000, 'Gross taxable must be ₹10,000');
    assert.equal(Number(summary.metrics.gstCollectedOnSales), 1800, 'Gross GST must be ₹1,800');
    assert.equal(Number(summary.metrics.gstAdjustmentsFromReturns), 360, 'Adjusted GST must be ₹360');
    assert.equal(Number(summary.metrics.netGst), 1440, 'Net GST payable must be ₹1,440');
    assert.equal(Number(summary.metrics.netSalesAfterReturns), 9440, 'Net sales must be ₹9,440');

    // Verify 18% slab in gstFiling
    const slab18 = summary.gstFiling?.slabs?.['18'];
    assert.ok(slab18, '18% GST slab must exist in breakdown');
    assert.equal(Number(slab18.taxable), 10000, '18% slab taxable must be ₹10,000');
    assert.equal(Number(slab18.tax), 1800, '18% slab tax must be ₹1,800');
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 3: AUDIT WORKFLOW & TASK PIPELINE (SECTION 2)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 2: Audit Workflow & Tasks Pipeline (Create, List, Update Status, Delete)', async () => {
    // 1. Create audit task
    const createRes = await fetch(`${baseUrl}/ca-portal/tasks?storeId=${storeAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        title: 'Verify HSN 8471 GSTR-1 classification for Tech Widget',
        description: 'Ensure correct 18% slab is reported on GST portal',
        category: 'GST',
        priority: 'HIGH',
      }),
    });
    assert.equal(createRes.status, 201, 'Create audit task should return 201');
    const createJson = await createRes.json();
    const createData = createJson.data;
    const taskId = createData.task?.id;
    assert.ok(taskId, 'Task ID must be created');

    // 2. List tasks
    const listRes = await fetch(`${baseUrl}/ca-portal/tasks?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    const listData = listJson.data;
    assert.ok(listData.tasks.length >= 1, 'Should return at least 1 task');

    // 3. Update task status to IN_REVIEW
    const updateRes = await fetch(`${baseUrl}/ca-portal/tasks/${taskId}?storeId=${storeAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ status: 'IN_REVIEW' }),
    });
    assert.equal(updateRes.status, 200);
    const updateJson = await updateRes.json();
    const updateData = updateJson.data;
    assert.equal(updateData.task?.status, 'IN_REVIEW', 'Status should update to IN_REVIEW');

    // 4. Delete task
    const delRes = await fetch(`${baseUrl}/ca-portal/tasks/${taskId}?storeId=${storeAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(delRes.status, 200, 'Delete task should succeed');
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 4: PURCHASES & SUPPLIER AUDIT (SECTION 4)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 4: Purchases Register & Supplier Audit', async () => {
    // 1. Seed purchase bill
    await prisma.purchase.create({
      data: {
        id: 'pur-master-001',
        invoiceNumber: 'PUR-2026-001',
        supplierName: 'National Electronics Distributors',
        supplierGstin: '33ABCDE1234F1Z5',
        subtotal: 50000,
        taxTotal: 9000,
        grandTotal: 59000,
        paidAmount: 50000,
        balanceDue: 9000,
        paymentStatus: 'PARTIAL',
        businessId: storeAId,
      },
    });

    const res = await fetch(`${baseUrl}/ca-portal/purchases?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const resJson = await res.json();
    const data = resJson.data;
    assert.ok(data.purchases.length >= 1, 'Should list purchases');
    assert.equal(data.purchases[0].invoiceNumber, 'PUR-2026-001');

    const supRes = await fetch(`${baseUrl}/ca-portal/suppliers?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(supRes.status, 200);
    const supJson = await supRes.json();
    const supData = supJson.data;
    assert.ok(supData.suppliers.length >= 1, 'Should aggregate suppliers');
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 5: PAYMENTS & BANK RECONCILIATION (SECTION 5)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 5: Bank & Payment Reconciliation receipts review', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/payments?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const resJson = await res.json();
    const data = resJson.data;
    assert.ok(data.payments.length >= 1, 'Should list payments');
    assert.equal(data.payments[0].method, 'UPI');
    assert.ok(
      data.payments[0].reconciliationStatus === 'RECORDED' ||
      data.payments[0].reconciliationStatus === 'MATCHED',
      'Payment should have valid reconciliation status'
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 6: EXPENSES & FINANCIAL REVIEW (SECTION 6)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 6: Expenses & Financial Outflow Review', async () => {
    // Seed expense
    await prisma.expense.create({
      data: {
        id: 'exp-master-001',
        title: 'Showroom Electricity Bill September 2026',
        category: 'Utilities',
        amount: 4500,
        paymentMethod: 'NET_BANKING',
        businessId: storeAId,
      },
    });

    const res = await fetch(`${baseUrl}/ca-portal/expenses?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const resJson = await res.json();
    const data = resJson.data;
    assert.ok(data.expenses.length >= 1, 'Should list expenses');
    assert.equal(Number(data.totalAmount), 4500);
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 7: INVENTORY AUDIT & STOCK MOVEMENTS (SECTION 8)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 8: Inventory Valuation & Stock Movement Ledger', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/inventory?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const resJson = await res.json();
    const data = resJson.data;
    assert.ok(data.products.length >= 1, 'Should list inventory products');
    assert.ok(data.summary.totalProducts >= 1);
    assert.ok(Array.isArray(data.recentMovements));
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 8: DISCREPANCIES & MERCHANT CORRECTIONS FLOW (SECTION 10)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 10: Discrepancy Lifecycle (CA Flag -> Merchant Resolution -> CA Verify)', async () => {
    // 1. CA Flags Discrepancy
    const flagRes = await fetch(`${baseUrl}/ca-portal/discrepancies?storeId=${storeAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        title: 'Missing E-Way Bill for Purchase PUR-2026-001',
        description: 'Please upload e-way bill document or provide transporter copy.',
        discrepancyType: 'MISSING_EVIDENCE',
        referenceNumber: 'PUR-2026-001',
      }),
    });
    assert.equal(flagRes.status, 201, 'Flag discrepancy should return 201');
    const flagJson = await flagRes.json();
    const flagData = flagJson.data;
    flaggedDiscrepancyId = flagData.discrepancy?.id;
    assert.ok(flaggedDiscrepancyId);
    assert.equal(flagData.discrepancy?.status, 'CORRECTION_REQUESTED');

    // 2. Merchant Views & Resolves with Clarification Notes
    const resolveRes = await fetch(`${baseUrl}/ca-connect/discrepancies/${flaggedDiscrepancyId}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        correctionResponse: 'E-Way Bill #EWB-998877 attached in document evidence repository.',
      }),
    });
    assert.equal(resolveRes.status, 200, 'Merchant resolution should return 200');
    const resolveJson = await resolveRes.json();
    const resolveData = resolveJson.data;
    assert.equal(resolveData.discrepancy?.status, 'RESOLVED');

    // 3. CA Verifies Resolution
    const verifyRes = await fetch(`${baseUrl}/ca-portal/discrepancies/${flaggedDiscrepancyId}/verify?storeId=${storeAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ verificationNotes: 'Verified E-Way Bill details against NIC portal.' }),
    });
    assert.equal(verifyRes.status, 200, 'CA verification should return 200');
    const verifyJson = await verifyRes.json();
    const verifyData = verifyJson.data;
    assert.equal(verifyData.discrepancy?.status, 'VERIFIED');
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 9: DOCUMENTS & EVIDENCE REPOSITORY (SECTION 9)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 9: Supporting Documents & Tax Evidence Repository', async () => {
    // 1. Attach document
    const attachRes = await fetch(`${baseUrl}/ca-portal/documents?storeId=${storeAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        title: 'SBI Current Account Statement Sept 2026',
        fileUrl: 'https://bilzet-storage.test/docs/bank-sept-2026.pdf',
        fileType: 'PDF',
        category: 'BANK_STATEMENT',
      }),
    });
    assert.equal(attachRes.status, 201);
    const attachJson = await attachRes.json();
    const attachData = attachJson.data;
    assert.ok(attachData.document?.id);

    // 2. List documents
    const listRes = await fetch(`${baseUrl}/ca-portal/documents?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    const listData = listJson.data;
    assert.ok(listData.documents.length >= 1);
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 10: PERIOD CLOSING & CA SIGN-OFF (SECTION 13)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 13: Period Closing Reconciliation and CA Sign-off', async () => {
    // 1. Close tax period
    const closeRes = await fetch(`${baseUrl}/ca-portal/period-closings?storeId=${storeAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        period: '2026-09',
        signOffNotes: 'All sales, returns, and GST credit notes reconciled for September 2026.',
      }),
    });
    assert.equal(closeRes.status, 200, 'Close period should return 200');
    const closeJson = await closeRes.json();
    const closeData = closeJson.data;
    periodClosingId = closeData.period?.id;
    assert.ok(periodClosingId);
    assert.equal(closeData.period?.status, 'CLOSED');
    assert.equal(Number(closeData.period?.netGstPayable), 1440, 'Reconciled net GST must be ₹1,440');

    // 2. CA Sign-off
    const signRes = await fetch(`${baseUrl}/ca-portal/period-closings/${periodClosingId}/sign-off?storeId=${storeAId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ signOffNotes: 'CA Suresh Kumar audit certificate issued.' }),
    });
    assert.equal(signRes.status, 200, 'Sign-off should return 200');
    const signJson = await signRes.json();
    const signData = signJson.data;
    assert.equal(signData.period?.status, 'SIGNED_OFF');
  });

  // ══════════════════════════════════════════════════════════════════════
  // TEST 11: STORE ISOLATION & 403 FORBIDDEN UNAUTHORIZED CHECK (SECTION 14)
  // ══════════════════════════════════════════════════════════════════════
  test('Section 14: Store Switcher isolation and 403 Forbidden for unauthorized access', async () => {
    // 1. CA querying assigned Store A -> 200 OK
    const okRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(okRes.status, 200, 'CA should access assigned Store A');

    // 2. CA attempting to query unassigned Store B -> 403 Forbidden
    const deniedRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(deniedRes.status, 403, 'CA accessing unassigned Store B must be 403 Forbidden');

    // 3. Non-CA user attempting to access CA Portal -> 403 Forbidden
    const nonCaRes = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert.equal(nonCaRes.status, 403, 'Non-CA user accessing CA Portal must be 403 Forbidden');
  });
});
