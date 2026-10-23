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

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

describe('PHASE 17: QUOTATIONS, INVOICES, PRODUCT TAX MODES & LOGO/SIGNATURE ENHANCEMENTS', () => {
  const businessId = 'biz-p17-test-store';
  const ownerId = 'user-p17-owner';
  let token;
  let testProductId;

  before(async () => {
    // 1. Setup Business & Admin User
    await prisma.business.create({
      data: {
        id: businessId,
        name: 'Bilzet Enhancements Test Store',
        ownerId: ownerId,
        email: 'p17store@bilzet.test',
        phone: '+91 9888877777',
        address: '42 Tech Park, Coimbatore',
        gstin: '33AABCB1234F1Z9',
      },
    });

    await prisma.user.create({
      data: {
        id: ownerId,
        name: 'Karthik Admin',
        email: 'karthik@bilzet.test',
        role: 'ADMIN',
        businessId: businessId,
      },
    });

    token = generateToken({
      userId: ownerId,
      email: 'karthik@bilzet.test',
      role: 'ADMIN',
      businessId: businessId,
    });
  });

  // --------------------------------------------------------------------------
  // 1. PRODUCT CREATION: Units, Inclusive/Exclusive GST, Standard Brackets
  // --------------------------------------------------------------------------
  test('1. Product Creation: Supports custom units (litre, kg, etc.) and GST Inclusive mode', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Refined Sunflower Oil 1L',
        sku: 'OIL-1L-001',
        category: 'Groceries',
        unit: 'litre',
        purchasePrice: 110,
        sellingPrice: 150,
        isTaxInclusive: true,
        pricingMethod: 'INCLUSIVE',
        gstRate: 5,
        stock: 50,
        minStockAlert: 10,
      }),
    });

    const data = await safeJson(res);
    assert.equal(res.status, 201, `Failed to create product: ${JSON.stringify(data)}`);
    const prod = data.data?.product || data.data || data.product || data;
    testProductId = prod.id || prod._id;

    assert.ok(testProductId, 'Product must have an id');
    assert.equal(prod.unit, 'litre', 'Product unit must be litre');
    assert.equal(prod.isTaxInclusive, true, 'Product must have isTaxInclusive = true');
    assert.equal(prod.gstRate, 5, 'Product GST rate must be 5%');
  });

  test('2. Product Creation: Supports GST Exclusive mode and standard rates (18%)', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Executive Ergonomic Chair',
        sku: 'CHR-EX-002',
        category: 'Furniture',
        unit: 'piece',
        purchasePrice: 3500,
        sellingPrice: 5000,
        isTaxInclusive: false,
        pricingMethod: 'EXCLUSIVE',
        gstRate: 18,
        stock: 20,
        minStockAlert: 2,
      }),
    });

    const data = await safeJson(res);
    assert.equal(res.status, 201, `Failed to create product: ${JSON.stringify(data)}`);
    const prod = data.data?.product || data.data || data.product || data;
    assert.equal(prod.isTaxInclusive, false, 'Product must have isTaxInclusive = false');
    assert.equal(prod.gstRate, 18, 'Product GST rate must be 18%');
    assert.equal(prod.unit, 'piece');
  });

  // --------------------------------------------------------------------------
  // 2. QUOTATIONS MODULE: Full Lifecycle
  // --------------------------------------------------------------------------
  let createdQuotationId;
  let quotationNumber = `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  test('3. Quotation Creation: Creates full quotation with line items, tax, and notes', async () => {
    const res = await fetch(`${baseUrl}/quotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        quotationNumber,
        quotationDate: '2026-10-21',
        expiryDate: '2026-11-05',
        customerName: 'Acme Technologies Ltd',
        customerPhone: '9876543210',
        customerEmail: 'finance@acme.test',
        customerGstin: '33AAACA1111A1Z2',
        billingAddress: '404 Cyber City, Chennai',
        placeOfSupply: '33-TN',
        items: [
          {
            productId: testProductId,
            name: 'Refined Sunflower Oil 1L',
            quantity: 10,
            unit: 'litre',
            rate: 150,
            isTaxInclusive: true,
            gstRate: 5,
            discountPercent: 0,
            discountAmount: 0,
            taxableAmount: 1428.57,
            gstAmount: 71.43,
            cgst: 35.71,
            sgst: 35.71,
            igst: 0,
            total: 1500,
          },
        ],
        subtotal: 1500,
        taxableAmount: 1428.57,
        cgst: 35.71,
        sgst: 35.71,
        igst: 0,
        taxAmount: 71.43,
        grandTotal: 1500,
        status: 'DRAFT',
        notes: 'Special festive pricing valid until expiry.',
        termsAndConditions: '1. Standard warranty applies.\n2. Payment: 50% advance.',
      }),
    });

    const data = await safeJson(res);
    assert.equal(res.status, 201, `Failed to create quotation: ${JSON.stringify(data)}`);
    const quote = data.data?.quotation || data.data || data.quotation || data;
    createdQuotationId = quote.id || quote._id;

    assert.ok(createdQuotationId, 'Quotation must have an ID');
    assert.equal(quote.quotationNumber, quotationNumber);
    assert.equal(quote.customerName, 'Acme Technologies Ltd');
    assert.equal(quote.status, 'DRAFT');
    assert.equal(quote.items?.length, 1);
    assert.equal(quote.items[0].unit, 'litre');
  });

  test('4. Quotation List & Retrieval: Should list and filter quotations', async () => {
    const res = await fetch(`${baseUrl}/quotations`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await safeJson(res);
    const list = Array.isArray(data) ? data : data.data?.quotations || data.data || data.quotations || [];
    assert.ok(list.length >= 1, 'Should return at least 1 quotation');

    const found = list.find((q) => (q.id || q._id) === createdQuotationId);
    assert.ok(found, 'Created quotation must appear in list');

    // Fetch by ID
    const singleRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(singleRes.status, 200);
    const singleData = await safeJson(singleRes);
    const singleQuote = singleData.data?.quotation || singleData.data || singleData.quotation || singleData;
    assert.equal(singleQuote.customerPhone, '9876543210');
  });

  test('5. Quotation Status Update: Transitions Draft -> Sent -> Accepted', async () => {
    // 1. Mark Sent
    const sentRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'SENT' }),
    });
    assert.equal(sentRes.status, 200);
    const sentData = await safeJson(sentRes);
    const sentQuote = sentData.data?.quotation || sentData.data || sentData;
    assert.equal(sentQuote.status, 'SENT');

    // 2. Mark Accepted
    const acceptRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    assert.equal(acceptRes.status, 200);
    const acceptData = await safeJson(acceptRes);
    const acceptQuote = acceptData.data?.quotation || acceptData.data || acceptData;
    assert.equal(acceptQuote.status, 'ACCEPTED');
  });

  test('6. Convert Quotation to Invoice: Generates tax invoice and links records without duplicate stock deduction', async () => {
    // Check initial product stock (was 50)
    const prodBefore = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    const initialStock = prodBefore?.stock ?? 50;

    // Convert quotation to invoice
    const convertRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}/convert-to-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const convertData = await safeJson(convertRes);
    assert.equal(convertRes.status, 200, `Convert failed: ${JSON.stringify(convertData)}`);
    const invoiceNumber = convertData.data?.invoiceNumber || convertData.data?.sale?.invoiceNumber || convertData.invoiceNumber || convertData.sale?.invoiceNumber;
    assert.ok(invoiceNumber, 'Conversion must return a valid invoice number');

    // Check quotation status and invoice link
    const updatedQuoteRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedQuoteData = await safeJson(updatedQuoteRes);
    const updatedQuote = updatedQuoteData.data?.quotation || updatedQuoteData.data || updatedQuoteData;
    assert.equal(updatedQuote.status, 'ACCEPTED');
    assert.ok(updatedQuote.convertedToInvoice === true || !!updatedQuote.invoiceNumber, 'Quotation must be marked as converted');

    // Check that stock was deducted exactly once (10 litres sold)
    const prodAfter = await prisma.product.findUnique({
      where: { id: testProductId },
    });
    if (prodAfter) {
      assert.equal(prodAfter.stock, initialStock - 10, 'Stock must decrease by 10 litres exactly once');
    }

    // Attempting to convert again should be prevented or return existing invoice
    const secondConvertRes = await fetch(`${baseUrl}/quotations/${createdQuotationId}/convert-to-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    assert.ok(secondConvertRes.status === 400 || secondConvertRes.status === 200, 'Second conversion must be safely handled');
  });

  // --------------------------------------------------------------------------
  // 3. SETTINGS: Business Logo & Signature Upload and Persistence
  // --------------------------------------------------------------------------
  test('7. Business Settings: Preserves Logo and Signature URLs with display toggles', async () => {
    const settingsPayload = {
      logoUrl: 'https://bilzet.com/assets/test-brand-logo.png',
      signatureUrl: 'https://bilzet.com/assets/test-authorized-sig.png',
      showLogoOnInvoices: true,
      showSignatureOnInvoices: true,
      showSignatureOnQuotations: true,
      authorizedSignatoryName: 'Vigneshwaran MS',
      termsAndConditions: 'Goods once sold will not be taken back without valid bill.',
    };

    const res = await fetch(`${baseUrl}/settings/shop`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settingsPayload),
    });

    const data = await safeJson(res);
    assert.equal(res.status, 200, `Settings update failed: ${JSON.stringify(data)}`);
    const saved = data.data?.settings || data.settings || data.data || data;

    assert.equal(saved.logoUrl, settingsPayload.logoUrl);
    assert.equal(saved.showSignatureOnQuotations, true);
    assert.equal(saved.authorizedSignatoryName, 'Vigneshwaran MS');
  });
});
