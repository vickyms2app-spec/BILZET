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

describe('PHASE 4: PRODUCT RETURNS, AUTOMATIC GST REVERSAL, AND CA SYNCHRONIZATION', () => {
  const storeId = 'store-p4-returns';
  const ownerId = 'user-p4-owner';
  const caId = 'user-p4-ca';

  let ownerToken;
  let caToken;

  const testProductIds = [];

  before(async () => {
    // 1. Setup Store in Tamil Nadu
    await prisma.business.create({
      data: {
        id: storeId,
        name: 'Bilzet Returns & Reversals Mart',
        ownerId,
        email: 'returns-store@bilzet.test',
        phone: '+91 98888 12345',
        gstin: '33AABCB1234F1Z8',
        address: '200 GST Highway, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 2. Setup Store Owner (Admin)
    await prisma.user.create({
      data: {
        id: ownerId,
        email: 'owner-p4@bilzet.test',
        name: 'Phase 4 Store Owner',
        role: 'ADMIN',
        businessId: storeId,
        isOwner: true,
      },
    });

    // 3. Setup CA User
    await prisma.user.create({
      data: {
        id: caId,
        email: 'ca-p4@bilzet.test',
        name: 'CA Return Auditor',
        role: 'CA',
        businessId: null,
      },
    });

    // 4. Assign CA access to Store
    await prisma.caStoreAccess.create({
      data: {
        id: 'acc-p4-ca',
        caUserId: caId,
        businessId: storeId,
        status: 'ACTIVE',
      },
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'owner-p4@bilzet.test',
      role: 'ADMIN',
      businessId: storeId,
    });

    caToken = generateToken({
      id: caId,
      email: 'ca-p4@bilzet.test',
      role: 'CA',
      businessId: null,
    });

    // 5. Create Test Products with Opening Stock
    const p1 = await prisma.product.create({
      data: {
        id: 'prod-p4-001',
        name: 'Industrial Valve Component',
        sku: 'VALVE-P4-01',
        sellingPrice: 200,
        gstRate: 18,
        hsnCode: '8481',
        stock: 100,
      },
    });
    testProductIds.push(p1.id);

    const p2 = await prisma.product.create({
      data: {
        id: 'prod-p4-002',
        name: 'Organic Herbal Tea (5% GST)',
        sku: 'TEA-P4-02',
        sellingPrice: 100,
        gstRate: 5,
        hsnCode: '0902',
        stock: 100,
      },
    });
    testProductIds.push(p2.id);

    const p3 = await prisma.product.create({
      data: {
        id: 'prod-p4-003',
        name: 'Digital Caliper (12% GST)',
        sku: 'CALIP-P4-03',
        sellingPrice: 500,
        gstRate: 12,
        hsnCode: '9017',
        stock: 100,
      },
    });
    testProductIds.push(p3.id);
  });

  after(async () => {
    try {
      await prisma.salesReturnItem.deleteMany({});
      await prisma.salesReturn.deleteMany({});
      await prisma.stockTransaction.deleteMany({});
      await prisma.payment.deleteMany({});
      await prisma.auditLog.deleteMany({});
      await prisma.saleItem.deleteMany({});
      await prisma.sale.deleteMany({});
      await prisma.customer.deleteMany({});
      for (const pid of testProductIds) {
        await prisma.product.delete({ where: { id: pid } }).catch(() => {});
      }
      await prisma.caStoreAccess.deleteMany({ where: { businessId: storeId } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerId, caId] } } });
      await prisma.business.delete({ where: { id: storeId } }).catch(() => {});
    } catch (_) {}
  });

  // ── TEST 1: Acceptance Criteria & Prompt Example Scenario ──
  test('1. Acceptance Scenario: 50 products sold, 10 returned with exact GST reversal and Credit Note generation', async () => {
    // 1.1 Create Original Sale:
    // 50 products @ ₹200 = ₹10,000 taxable value
    // GST 18% = ₹1,800
    // Total Invoice = ₹11,800
    const salePayload = {
      customerName: 'AeroTech Systems Pvt Ltd',
      customerPhone: '9888800001',
      customerState: 'Tamil Nadu',
      items: [
        {
          productId: 'prod-p4-001',
          name: 'Industrial Valve Component',
          quantity: 50,
          rate: 200,
          discount: 0,
          gstRate: 18,
          hsn: '8481',
        },
      ],
      paidAmount: 11800,
    };

    const resSale = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify(salePayload),
    });
    assert.equal(resSale.status, 201);
    const saleBody = await resSale.json();
    const origSale = saleBody.data.sale;

    // Verify original invoice totals match prompt example
    assert.equal(origSale.subtotal, 10000);
    assert.equal(origSale.taxTotal, 1800);
    assert.equal(origSale.grandTotal, 11800);
    assert.equal(origSale.returnStatus, 'NONE');

    // 1.2 Partial Return: 10 products returned
    const returnPayload = {
      items: [
        {
          saleItemId: origSale.items[0].id,
          productId: 'prod-p4-001',
          quantity: 10,
        },
      ],
      reason: 'Specification mismatch',
      refundMethod: 'CASH',
    };

    const resRet = await fetch(`${baseUrl}/sales/${origSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify(returnPayload),
    });
    assert.equal(resRet.status, 200);
    const retBody = await resRet.json();
    const returnedSale = retBody.data.sale;

    // 1.3 Verify Prompt Mathematical Assertions:
    // Returned taxable value = ₹2,000
    // GST adjustment = ₹360
    // Net taxable value after return = ₹8,000
    // Net GST after return = ₹1,440
    // Net invoice value after return = ₹9,440
    assert.equal(returnedSale.returnedTaxableAmount, 2000, 'Returned taxable value must be exactly ₹2,000');
    assert.equal(returnedSale.gstAdjustment, 360, 'GST adjustment must be exactly ₹360');
    assert.equal(returnedSale.totalReturnedAmount, 2360, 'Total return refund must be ₹2,360');
    assert.equal(returnedSale.netTaxableAmount, 8000, 'Net taxable value after return must be ₹8,000');
    assert.equal(returnedSale.netTaxTotal, 1440, 'Net GST after return must be ₹1,440');
    assert.equal(returnedSale.netPayable, 9440, 'Net invoice value after return must be ₹9,440');
    assert.equal(returnedSale.returnStatus, 'PARTIALLY_RETURNED');

    // 1.4 Verify Immutability of Original Invoice Records (Req 6 & 8)
    assert.equal(returnedSale.originalGrandTotal, 11800, 'Original grand total must be permanently preserved');
    assert.equal(returnedSale.originalTaxTotal, 1800, 'Original tax total must be permanently preserved');
    assert.equal(returnedSale.originalTaxableAmount, 10000, 'Original taxable amount must be permanently preserved');

    // 1.5 Verify Linked Credit Note Generated (Req 7)
    assert.ok(returnedSale.returns && returnedSale.returns.length === 1);
    const cn = returnedSale.returns[0];
    assert.ok(cn.creditNoteNumber, 'Linked Credit Note number must be generated');
    assert.equal(cn.invoiceNumber, origSale.invoiceNumber, 'Credit Note must reference original invoice number');
    assert.equal(cn.taxableAmount, 2000, 'Credit Note taxable amount must be ₹2,000');
    assert.equal(cn.gstAdjustment, 360, 'Credit Note GST adjustment must be ₹360');
    assert.equal(cn.totalAmount, 2360, 'Credit Note total amount must be ₹2,360');
    assert.equal(cn.items[0].quantity, 10);
    assert.equal(cn.items[0].name, 'Industrial Valve Component');
  });

  // ── TEST 2: Intra-State vs Inter-State GST Reversals ──
  test('2. Intra-State returns reverse CGST/SGST; Inter-State returns reverse IGST', async () => {
    // 2.1 Intra-State Return: Store in TN, Customer in TN
    // Sale: 20 units @ ₹200 = ₹4,000 + 18% GST (₹720: ₹360 CGST + ₹360 SGST) = ₹4,720
    const intraSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Chennai Machining Corp',
        customerState: 'Tamil Nadu',
        items: [{ productId: 'prod-p4-001', quantity: 20, rate: 200, gstRate: 18, hsn: '8481' }],
        paidAmount: 4720,
      }),
    });
    assert.equal(intraSaleRes.status, 201);
    const intraSale = (await intraSaleRes.json()).data.sale;

    // Return 5 units (Intra-state): Taxable 1000, GST 180 (CGST 90, SGST 90)
    const retIntraRes = await fetch(`${baseUrl}/sales/${intraSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 5 }] }),
    });
    assert.equal(retIntraRes.status, 200);
    const intraRetSale = (await retIntraRes.json()).data.sale;

    assert.equal(intraRetSale.gstAdjustment, 180);
    assert.equal(intraRetSale.cgstAdjustment, 90, 'Intra-state return must reverse CGST proportionally');
    assert.equal(intraRetSale.sgstAdjustment, 90, 'Intra-state return must reverse SGST proportionally');
    assert.equal(intraRetSale.igstAdjustment, 0, 'Intra-state return must have 0 IGST reversal');

    // 2.2 Inter-State Return: Store in TN, Customer in Kerala
    // Sale: 20 units @ ₹200 = ₹4,000 + 18% IGST (₹720) = ₹4,720
    const interSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Cochin Marine Engineering',
        customerState: 'Kerala',
        items: [{ productId: 'prod-p4-001', quantity: 20, rate: 200, gstRate: 18, hsn: '8481' }],
        paidAmount: 4720,
      }),
    });
    assert.equal(interSaleRes.status, 201);
    const interSale = (await interSaleRes.json()).data.sale;

    // Return 5 units (Inter-state): Taxable 1000, IGST reversal = 180
    const retInterRes = await fetch(`${baseUrl}/sales/${interSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 5 }] }),
    });
    assert.equal(retInterRes.status, 200);
    const interRetSale = (await retInterRes.json()).data.sale;

    assert.equal(interRetSale.gstAdjustment, 180);
    assert.equal(interRetSale.cgstAdjustment, 0, 'Inter-state return must have 0 CGST reversal');
    assert.equal(interRetSale.sgstAdjustment, 0, 'Inter-state return must have 0 SGST reversal');
    assert.equal(interRetSale.igstAdjustment, 180, 'Inter-state return must reverse full IGST');
  });

  // ── TEST 3: Multi-Product Invoice with Different GST Rates ──
  test('3. Line-item accuracy for multi-product invoice with varied tax rates (5%, 12%, 18%)', async () => {
    // Product 1: 10 units @ 100, GST 5% = Taxable 1000, Tax 50, Total 1050
    // Product 2: 4 units @ 500, GST 12% = Taxable 2000, Tax 240, Total 2240
    // Product 3: 5 units @ 200, GST 18% = Taxable 1000, Tax 180, Total 1180
    // Invoice Subtotal: 4000, TaxTotal: 470, GrandTotal: 4470
    const multiSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Multi Tax Rate Shopper',
        customerState: 'Tamil Nadu',
        items: [
          { productId: 'prod-p4-002', name: 'Organic Herbal Tea (5% GST)', quantity: 10, rate: 100, gstRate: 5 },
          { productId: 'prod-p4-003', name: 'Digital Caliper (12% GST)', quantity: 4, rate: 500, gstRate: 12 },
          { productId: 'prod-p4-001', name: 'Industrial Valve Component', quantity: 5, rate: 200, gstRate: 18 },
        ],
        paidAmount: 4470,
      }),
    });
    assert.equal(multiSaleRes.status, 201);
    const multiSale = (await multiSaleRes.json()).data.sale;
    assert.equal(multiSale.subtotal, 4000);
    assert.equal(multiSale.taxTotal, 470);
    assert.equal(multiSale.grandTotal, 4470);

    // Return 2 units of Tea (5% GST) and 1 unit of Caliper (12% GST)
    // Tea return: 2 * 100 = 200 taxable, 10 GST, 210 total
    // Caliper return: 1 * 500 = 500 taxable, 60 GST, 560 total
    // Total return taxable: 700, Total return GST: 70, Total refund: 770
    const retMultiRes = await fetch(`${baseUrl}/sales/${multiSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        items: [
          { productId: 'prod-p4-002', quantity: 2 },
          { productId: 'prod-p4-003', quantity: 1 },
        ],
      }),
    });
    assert.equal(retMultiRes.status, 200);
    const retMultiSale = (await retMultiRes.json()).data.sale;

    assert.equal(retMultiSale.returnedTaxableAmount, 700);
    assert.equal(retMultiSale.gstAdjustment, 70);
    assert.equal(retMultiSale.totalReturnedAmount, 770);
    assert.equal(retMultiSale.netTaxableAmount, 3300);
    assert.equal(retMultiSale.netTaxTotal, 400);
    assert.equal(retMultiSale.netPayable, 3700);
  });

  // ── TEST 4: Validations & Over-Return / Duplicate Prevention (Req 3 & 11) ──
  test('4. Prevent duplicate returns, excessive quantities, negative numbers, and overdrafts', async () => {
    // 4.1 Create Sale with 5 units
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Validation Test Buyer',
        customerState: 'Tamil Nadu',
        items: [{ productId: 'prod-p4-001', quantity: 5, rate: 200, gstRate: 18 }],
        paidAmount: 1180,
      }),
    });
    const testSale = (await saleRes.json()).data.sale;

    // 4.2 Negative quantity rejection
    const resNeg = await fetch(`${baseUrl}/sales/${testSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: -3 }] }),
    });
    assert.equal(resNeg.status, 400);

    // 4.3 Zero quantity rejection
    const resZero = await fetch(`${baseUrl}/sales/${testSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 0 }] }),
    });
    assert.equal(resZero.status, 400);

    // 4.4 Excess quantity rejection (> 5)
    const resExcess = await fetch(`${baseUrl}/sales/${testSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 6 }] }),
    });
    assert.equal(resExcess.status, 400);

    // 4.5 Return 3 units (valid)
    const resValid1 = await fetch(`${baseUrl}/sales/${testSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 3 }] }),
    });
    assert.equal(resValid1.status, 200);

    // 4.6 Attempt to return 3 more units (only 2 remaining) -> must be rejected
    const resOverdraft = await fetch(`${baseUrl}/sales/${testSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 3 }] }),
    });
    assert.equal(resOverdraft.status, 400);

    // 4.7 Return remaining 2 units (valid full return)
    const resValid2 = await fetch(`${baseUrl}/sales/${testSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 2 }] }),
    });
    assert.equal(resValid2.status, 200);
    const fullyReturnedSale = (await resValid2.json()).data.sale;
    assert.equal(fullyReturnedSale.returnStatus, 'RETURNED');

    // 4.8 Attempt to return anything on already fully returned invoice -> conflict 409
    const resAfterFull = await fetch(`${baseUrl}/sales/${testSale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 1 }] }),
    });
    assert.equal(resAfterFull.status, 409);
  });

  // ── TEST 5: Stock Restoration & Inventory Transaction Sync ──
  test('5. Product return restores inventory stock and logs return stock transactions', async () => {
    // Check initial stock
    const pBefore = await prisma.product.findUnique({ where: { id: 'prod-p4-001' } });
    const initialStock = pBefore.stock;

    // Create sale with 10 units
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Inventory Stock Return Buyer',
        customerState: 'Tamil Nadu',
        items: [{ productId: 'prod-p4-001', quantity: 10, rate: 200, gstRate: 18 }],
        paidAmount: 2360,
      }),
    });
    const sale = (await saleRes.json()).data.sale;

    // Stock should be decremented by 10
    const pAfterSale = await prisma.product.findUnique({ where: { id: 'prod-p4-001' } });
    assert.equal(pAfterSale.stock, initialStock - 10);

    // Return 4 units
    const retRes = await fetch(`${baseUrl}/sales/${sale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ items: [{ productId: 'prod-p4-001', quantity: 4 }] }),
    });
    assert.equal(retRes.status, 200);

    // Stock should be restored by 4
    const pAfterReturn = await prisma.product.findUnique({ where: { id: 'prod-p4-001' } });
    assert.equal(pAfterReturn.stock, initialStock - 6);

    // Verify Stock Transaction created with type 'RETURN'
    const stockTx = await prisma.stockTransaction.findFirst({
      where: { productId: 'prod-p4-001', type: 'RETURN' },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(stockTx);
    assert.equal(stockTx.quantity, 4);
    assert.ok(stockTx.reason.includes(sale.invoiceNumber));
  });

  // ── TEST 6: Customer Settlement & Store Credit Workflows (Req 13) ──
  test('6. Handle refunds, store credit, and outstanding balances according to payment workflow', async () => {
    // Create customer with 0 balance
    const cust = await prisma.customer.create({
      data: {
        businessId: storeId,
        name: 'Credit Workflow Client',
        phone: '9777700002',
        state: 'Tamil Nadu',
        balance: 1000, // existing debit
      },
    });

    // Create unpaid sale: 10 units @ 200 = 2360, paid 0
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerId: cust.id,
        items: [{ productId: 'prod-p4-001', quantity: 10, rate: 200, gstRate: 18 }],
        paidAmount: 0,
      }),
    });
    const sale = (await saleRes.json()).data.sale;

    // Return 2 units with Store Credit
    // Refund amount = 2 * 236 = 472
    const retRes = await fetch(`${baseUrl}/sales/${sale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        items: [{ productId: 'prod-p4-001', quantity: 2 }],
        refundMethod: 'CREDIT',
      }),
    });
    assert.equal(retRes.status, 200);

    // Customer had initial balance 1000. Unpaid invoice added 2360 (balance = 3360).
    // Store credit return of 2 units refunded 472 (3360 - 472 = 2888).
    const updatedCust = await prisma.customer.findUnique({ where: { id: cust.id } });
    assert.equal(Number(updatedCust.balance), 2888);
  });

  // ── TEST 7: Instant Synchronization with CA Portal & Credit Notes Inspection (Req 9 & 10) ──
  test('7. Instant synchronization with CA Portal and separate credit notes inspection', async () => {
    // 7.1 Create Sale
    const saleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'CA Sync Audit Test Client',
        customerState: 'Tamil Nadu',
        items: [{ productId: 'prod-p4-001', quantity: 10, rate: 200, gstRate: 18 }],
        paidAmount: 2360,
      }),
    });
    const sale = (await saleRes.json()).data.sale;

    // 7.2 Return 3 units
    const retRes = await fetch(`${baseUrl}/sales/${sale.id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        items: [{ productId: 'prod-p4-001', quantity: 3 }],
        reason: 'Surplus material',
      }),
    });
    assert.equal(retRes.status, 200);
    const updatedSale = (await retRes.json()).data.sale;

    // 7.3 Fetch from CA Portal Invoice List
    const caListRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeId}&search=${sale.invoiceNumber}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caListRes.status, 200);
    const caListBody = await caListRes.json();
    assert.ok(caListBody.data.invoices.length > 0);
    const caInvoice = caListBody.data.invoices[0];

    // Totals match 100%
    assert.equal(caInvoice.totalReturnedAmount, updatedSale.totalReturnedAmount);
    assert.equal(caInvoice.gstAdjustment, updatedSale.gstAdjustment);
    assert.equal(caInvoice.netPayable, updatedSale.netPayable);
    assert.equal(caInvoice.returnStatus, 'PARTIALLY_RETURNED');
    assert.equal(caInvoice.hasReturns, true);

    // 7.4 CA Inspects Specific Invoice Credit Notes endpoint
    const caCNRes = await fetch(`${baseUrl}/ca-portal/invoices/${sale.id}/credit-notes`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caCNRes.status, 200);
    const caCNBody = await caCNRes.json();
    assert.equal(caCNBody.data.invoiceNumber, sale.invoiceNumber);
    assert.ok(caCNBody.data.creditNotes.length > 0);
    assert.equal(caCNBody.data.creditNotes[0].gstAdjustment, 108); // 3 * 36
    assert.equal(caCNBody.data.creditNotes[0].totalAmount, 708); // 3 * 236

    // 7.5 CA Inspects Store All Credit Notes endpoint
    const caAllCNRes = await fetch(`${baseUrl}/ca-portal/credit-notes?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caAllCNRes.status, 200);
    const caAllCNBody = await caAllCNRes.json();
    assert.ok(caAllCNBody.data.creditNotes.length > 0);
  });

  // ── TEST 8: Immutable Audit Trail & Finalized Invoices Protection (Req 12 & 14) ──
  test('8. Preserves immutable audit trail and rejects direct PUT/PATCH/DELETE on invoices', async () => {
    // 8.1 Fetch Audit Trail for Sale
    const auditRes = await fetch(`${baseUrl}/sales`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const sales = (await auditRes.json()).data.sales;
    const testSale = sales[0];

    const auditTrailRes = await fetch(`${baseUrl}/sales/${testSale.id}/audit-trail`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(auditTrailRes.status, 200);
    const auditBody = await auditTrailRes.json();
    assert.ok(auditBody.data.auditLogs.length > 0);

    const hasReturnAudit = auditBody.data.auditLogs.some(
      (log) => log.action === 'RETURN_PROCESSED' || log.action === 'GST_ADJUSTED'
    );
    assert.ok(hasReturnAudit, 'Audit log must record return and GST reversal events');

    // 8.2 Reject direct edit or delete attempts to preserve audit integrity
    const putRes = await fetch(`${baseUrl}/sales/${testSale.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ grandTotal: 500 }),
    });
    assert.equal(putRes.status, 403, 'PUT to finalized invoice must be rejected');

    const deleteRes = await fetch(`${baseUrl}/sales/${testSale.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(deleteRes.status, 403, 'DELETE to finalized invoice must be rejected');
  });
});
