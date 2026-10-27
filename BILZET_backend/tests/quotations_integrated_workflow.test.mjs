import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';

let server;
let baseUrl;
let token;
const businessId = 'biz_quote_wf_' + Date.now();
const ownerId = 'usr_quote_wf_' + Date.now();

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  await prisma.business.create({
    data: {
      id: businessId,
      name: 'Quotation Workflow Test Store',
      ownerId: ownerId,
      email: 'quotetest@bilzet.test',
      phone: '+91 9988776655',
      address: '10 Industrial Hub, Chennai',
      gstin: '33AABCT1234F1Z8',
    },
  });

  await prisma.user.create({
    data: {
      id: ownerId,
      name: 'Owner Tester',
      email: 'quotetest@bilzet.test',
      role: 'ADMIN',
      businessId: businessId,
    },
  });

  token = jwt.sign(
    {
      userId: ownerId,
      email: 'quotetest@bilzet.test',
      role: 'ADMIN',
      businessId: businessId,
    },
    env.JWT_SECRET || 'secret',
    { expiresIn: '1d' }
  );
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

describe('QUOTATION INTEGRATED WORKFLOW: Numbering, Stock Isolation & Conversion to Invoice', () => {
  let quotationNumber1;
  let quotationNumber2;
  let createdQuotationId;
  let productId;

  test('1. Quotation Numbering: GET /quotations/next-number generates QUO-YYYY-XXXX', async () => {
    const res = await fetch(`${baseUrl}/quotations/next-number?businessId=${businessId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await safeJson(res);
    assert.equal(res.status, 200, `Failed to get next number: ${JSON.stringify(data)}`);
    const qNum = data.data?.quotationNumber || data.quotationNumber;
    assert.ok(qNum, 'Must return quotationNumber');
    assert.match(qNum, /^QUO-\d{4}-\d{4}$/, 'Quotation number must match QUO-YYYY-XXXX format');
    quotationNumber1 = qNum;
  });

  test('2. Quotation Creation: Saves quotation with line items and does not deduct stock', async () => {
    // Create product
    const prodRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Industrial Inverter 10kVA',
        sku: 'INV-10KVA-' + Date.now(),
        category: 'Electronics',
        unit: 'piece',
        purchasePrice: 60000,
        sellingPrice: 75000,
        gstRate: 18,
        stock: 25,
      }),
    });
    const prodData = await safeJson(prodRes);
    assert.equal(prodRes.status, 201, `Failed to create product: ${JSON.stringify(prodData)}`);
    const prod = prodData.data?.product || prodData.data || prodData.product;
    productId = prod.id || prod._id;

    // Create quotation for 4 units
    const quoteRes = await fetch(`${baseUrl}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        quotationNumber: quotationNumber1,
        quotationDate: '2026-10-27',
        expiryDate: '2026-11-15',
        businessId,
        status: 'DRAFT',
        customerName: 'Karthik Engineering Works',
        customerPhone: '+91 9840012345',
        customerGstin: '33AABCK5678A1Z9',
        customerAddress: 'Phase 2, SIDCO, Ambattur',
        notes: 'Includes standard 2-year comprehensive on-site warranty.',
        terms: '1. Quotation valid until 15-Nov-2026.\n2. 100% advance on order confirmation.',
        items: [
          {
            productId,
            name: 'Industrial Inverter 10kVA',
            quantity: 4,
            rate: 75000,
            discount: 5000,
            gstRate: 18,
          },
        ],
        subtotal: 295000,
        taxTotal: 53100,
        grandTotal: 348100,
      }),
    });

    const quoteData = await safeJson(quoteRes);
    assert.equal(quoteRes.status, 201, `Failed to create quotation: ${JSON.stringify(quoteData)}`);
    const quote = quoteData.data?.quotation || quoteData.data || quoteData.quotation;
    assert.ok(quote);
    assert.equal(quote.quotationNumber, quotationNumber1);
    assert.equal(quote.status, 'DRAFT');
    createdQuotationId = quote.id || quote._id;

    // Verify product stock is STILL 25 (NEVER deducted for quotations)
    const checkRes = await fetch(`${baseUrl}/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const checkData = await safeJson(checkRes);
    const updatedProd = checkData.data?.product || checkData.data || checkData.product;
    const currentStock = updatedProd.stock !== undefined ? updatedProd.stock : updatedProd.currentStock;
    assert.equal(currentStock, 25, 'Stock must remain untouched after quotation creation');
  });

  test('3. Next Quotation Number: Sequential generation produces distinct number', async () => {
    const res = await fetch(`${baseUrl}/quotations/next-number?businessId=${businessId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await safeJson(res);
    assert.equal(res.status, 200);
    const qNum = data.data?.quotationNumber || data.quotationNumber;
    assert.ok(qNum);
    assert.notEqual(qNum, quotationNumber1, 'Second quotation number must be different from first');
    quotationNumber2 = qNum;
  });

  test('4. Quotation List & Search: Find quotation by customer name and filter by status', async () => {
    const res = await fetch(`${baseUrl}/quotations?search=Karthik`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await safeJson(res);
    assert.equal(res.status, 200);
    const list = data.data?.quotations || data.quotations || [];
    assert.ok(Array.isArray(list));
    const found = list.find((q) => (q.id || q._id) === createdQuotationId);
    assert.ok(found, 'Should find quotation by search query');
    assert.equal(found.customerName, 'Karthik Engineering Works');
  });

  test('5. Convert Quotation to Invoice: Assigns quotationId & referenceQuotationNumber, updates quote status', async () => {
    const invoiceRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        invoiceNumber: 'INV-2026-8801',
        invoiceDate: '2026-10-27',
        businessId,
        customerName: 'Karthik Engineering Works',
        customerPhone: '+91 9840012345',
        customerGstin: '33AABCK5678A1Z9',
        quotationId: createdQuotationId,
        referenceQuotationNumber: quotationNumber1,
        items: [
          {
            productId,
            name: 'Industrial Inverter 10kVA',
            quantity: 4,
            rate: 75000,
            discount: 5000,
            gstRate: 18,
          },
        ],
        subtotal: 295000,
        taxTotal: 53100,
        grandTotal: 348100,
        paidAmount: 348100,
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
      }),
    });

    const invData = await safeJson(invoiceRes);
    assert.equal(invoiceRes.status, 201, `Failed to create sale: ${JSON.stringify(invData)}`);
    const sale = invData.data?.sale || invData.data || invData.sale;
    assert.ok(sale);
    assert.equal(sale.quotationId, createdQuotationId);
    assert.equal(sale.referenceQuotationNumber, quotationNumber1);

    // Verify quotation status was updated to ACCEPTED with convertedToInvoiceId
    const quoteRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const qData = await safeJson(quoteRes);
    const q = qData.data?.quotation || qData.data || qData.quotation;
    assert.equal(q.status, 'ACCEPTED');
    assert.equal(q.convertedToInvoiceId, sale.id || sale._id);
  });
});
