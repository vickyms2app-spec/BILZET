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

describe('PHASE 3: PRODUCT-WISE GST CALCULATION IN BILL INVOICE', () => {
  const storeId = 'store-p3-gst';
  const ownerId = 'user-p3-owner';
  const caId = 'user-p3-ca';

  let ownerToken;
  let caToken;

  const fiftyProductIds = [];

  before(async () => {
    // 1. Setup Store in Tamil Nadu (State Code 33)
    await prisma.business.create({
      data: {
        id: storeId,
        name: 'Bilzet Precision Retailing Store',
        ownerId,
        email: 'gst-store@bilzet.test',
        phone: '+91 97777 12345',
        gstin: '33ABCDE1234F1Z5',
        address: '100 GST Road, Guindy, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 2. Setup Owner
    await prisma.user.create({
      data: {
        id: ownerId,
        email: 'owner-p3@bilzet.test',
        name: 'Phase 3 Store Owner',
        role: 'ADMIN',
        businessId: storeId,
        isOwner: true,
      },
    });

    // 3. Setup CA
    await prisma.user.create({
      data: {
        id: caId,
        email: 'ca-p3@bilzet.test',
        name: 'CA Tax Auditor',
        role: 'CA',
        businessId: null,
      },
    });

    // 4. Assign CA store access
    await prisma.caStoreAccess.create({
      data: {
        id: 'acc-p3-ca',
        caUserId: caId,
        businessId: storeId,
        status: 'ACTIVE',
      },
    });

    ownerToken = generateToken({
      id: ownerId,
      email: 'owner-p3@bilzet.test',
      role: 'ADMIN',
      businessId: storeId,
    });

    caToken = generateToken({
      id: caId,
      email: 'ca-p3@bilzet.test',
      role: 'CA',
      businessId: null,
    });

    // 5. Create 50 distinct products across various GST slabs and HSN codes
    const gstSlabs = [0, 5, 12, 18, 28];
    const hsnCodes = ['1006', '0910', '0402', '8471', '8528'];

    for (let i = 1; i <= 50; i++) {
      const slabIdx = (i - 1) % gstSlabs.length;
      const slabGst = gstSlabs[slabIdx];
      const hsn = hsnCodes[slabIdx];
      const prodId = `prod-p3-${String(i).padStart(2, '0')}`;
      fiftyProductIds.push(prodId);

      await prisma.product.create({
        data: {
          id: prodId,
          name: `GST Catalog Item ${i} (${slabGst}%)`,
          sku: `SKU-P3-${String(i).padStart(3, '0')}`,
          hsnCode: hsn,
          sellingPrice: 100 + i * 10,
          purchasePrice: 80 + i * 8,
          gstRate: slabGst,
          stock: 500,
          businessId: storeId,
        },
      });
    }
  });

  // ── TEST 1: Product Master HSN and GST Rate Support ──
  test('1. Product master supports applicable GST rate and HSN/SAC code', async () => {
    const res = await fetch(`${baseUrl}/products/prod-p3-04`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.product.gstRate, 18);
    assert.equal(body.data.product.hsnCode, '8471');
  });

  // ── TEST 2: Acceptance Criteria: Invoice with 50 Products ──
  test('2. Acceptance Criteria: Single invoice containing 50 products calculates line-wise GST, taxable values, and totals correctly', async () => {
    // Construct 50 line items with varying quantities and line discounts
    const lineItems = [];
    let expectedSubtotal = 0;
    let expectedTaxTotal = 0;

    for (let i = 1; i <= 50; i++) {
      const prodId = fiftyProductIds[i - 1];
      const slabIdx = (i - 1) % 5;
      const gstRate = [0, 5, 12, 18, 28][slabIdx];
      const hsn = ['1006', '0910', '0402', '8471', '8528'][slabIdx];
      const qty = (i % 3) + 1; // 1, 2, or 3
      const rate = 100 + i * 10;
      const discount = i % 4 === 0 ? 20 : 0; // occasional discount

      const lineTaxable = rate * qty - discount;
      const lineTax = Number(((lineTaxable * gstRate) / 100).toFixed(2));

      expectedSubtotal += lineTaxable;
      expectedTaxTotal += lineTax;

      lineItems.push({
        productId: prodId,
        name: `GST Catalog Item ${i} (${gstRate}%)`,
        hsn,
        hsnCode: hsn,
        quantity: qty,
        rate,
        discount,
        gstRate,
      });
    }

    expectedSubtotal = Number(expectedSubtotal.toFixed(2));
    expectedTaxTotal = Number(expectedTaxTotal.toFixed(2));
    const expectedGrandTotal = Number((expectedSubtotal + expectedTaxTotal).toFixed(2));

    const invoicePayload = {
      invoiceNumber: 'INV-P3-50ITEMS-001',
      customerName: 'Mega Bulk Wholesale Buyer',
      customerPhone: '9840198401',
      customerState: 'Tamil Nadu', // Intra-state
      items: lineItems,
      paidAmount: expectedGrandTotal,
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'PAID',
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(invoicePayload),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    const sale = body.data.sale;

    // Verify 50 items returned
    assert.equal(sale.items.length, 50);

    // Verify subtotal, taxTotal, and grandTotal match exactly
    assert.equal(sale.subtotal, expectedSubtotal);
    assert.equal(sale.taxTotal, expectedTaxTotal);
    assert.equal(sale.grandTotal, expectedGrandTotal);

    // Verify Intra-state split: CGST = 50% of tax, SGST = 50% of tax, IGST = 0
    assert.equal(sale.cgst, Number((expectedTaxTotal / 2).toFixed(2)));
    assert.equal(sale.sgst, Number((expectedTaxTotal / 2).toFixed(2)));
    assert.equal(sale.igst, 0);

    // Verify HSN Summary table aggregation
    assert.ok(sale.hsnSummary);
    assert.equal(sale.hsnSummary.length, 5); // 5 distinct HSN codes (1006, 0910, 0402, 8471, 8528)

    const hsnTaxTotal = sale.hsnSummary.reduce((acc, h) => acc + h.taxAmount, 0);
    assert.equal(Number(hsnTaxTotal.toFixed(2)), expectedTaxTotal);
  });

  // ── TEST 3: Tax-Exclusive vs Tax-Inclusive Pricing Calculation ──
  test('3. Calculate GST correctly according to Tax-Exclusive vs Tax-Inclusive pricing methods', async () => {
    // 3.1 Tax-Exclusive Pricing (Standard)
    // Item: Rate 1000, Qty 2, Discount 100, GST 18%
    // Taxable = 1000 * 2 - 100 = 1900
    // Tax = 1900 * 18% = 342.00
    // Total = 1900 + 342 = 2242.00
    const exclusivePayload = {
      customerName: 'Standard Exclusive Buyer',
      customerState: 'Tamil Nadu',
      taxInclusive: false,
      pricingMethod: 'EXCLUSIVE',
      items: [
        {
          name: 'Precision Laser Meter',
          quantity: 2,
          rate: 1000,
          discount: 100,
          gstRate: 18,
          hsn: '9015',
        },
      ],
      paidAmount: 2242,
    };

    const resEx = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(exclusivePayload),
    });
    assert.equal(resEx.status, 201);
    const bodyEx = await resEx.json();
    const saleEx = bodyEx.data.sale;
    assert.equal(saleEx.subtotal, 1900);
    assert.equal(saleEx.taxTotal, 342);
    assert.equal(saleEx.grandTotal, 2242);
    assert.equal(saleEx.items[0].taxableAmount, 1900);
    assert.equal(saleEx.items[0].taxAmount, 342);
    assert.equal(saleEx.items[0].total, 2242);

    // 3.2 Tax-Inclusive Pricing (Retail MRP)
    // Rate 1180 (MRP inclusive of 18% GST), Qty 1, Discount 0
    // Gross = 1180
    // Taxable = 1180 * 100 / (100 + 18) = 1000.00
    // Tax = 1180 - 1000 = 180.00
    // Total = 1180.00
    const inclusivePayload = {
      customerName: 'Retail MRP Buyer',
      customerState: 'Tamil Nadu',
      taxInclusive: true,
      pricingMethod: 'INCLUSIVE',
      items: [
        {
          name: 'Packaged Lubricant (MRP Inclusive)',
          quantity: 1,
          rate: 1180,
          discount: 0,
          gstRate: 18,
          hsn: '2710',
          isTaxInclusive: true,
        },
      ],
      paidAmount: 1180,
    };

    const resIn = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(inclusivePayload),
    });
    assert.equal(resIn.status, 201);
    const bodyIn = await resIn.json();
    const saleIn = bodyIn.data.sale;
    assert.equal(saleIn.subtotal, 1000);
    assert.equal(saleIn.taxTotal, 180);
    assert.equal(saleIn.grandTotal, 1180);
    assert.equal(saleIn.items[0].taxableAmount, 1000);
    assert.equal(saleIn.items[0].taxAmount, 180);
    assert.equal(saleIn.items[0].total, 1180);
  });

  // ── TEST 4: Intra-State (CGST + SGST) vs Inter-State (IGST) ──
  test('4. Support CGST and SGST for intra-state transactions and IGST for inter-state transactions', async () => {
    // Inter-State Sale: Store in Tamil Nadu, Customer in Kerala
    const interstatePayload = {
      customerName: 'Cochin Marine Supplies',
      customerPhone: '9447012345',
      customerState: 'Kerala',
      items: [
        {
          name: 'Marine Grade Fasteners',
          quantity: 10,
          rate: 200,
          discount: 0,
          gstRate: 18,
          hsn: '7318',
        },
      ],
      paidAmount: 2360,
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(interstatePayload),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const sale = body.data.sale;

    assert.equal(sale.isInterState, true);
    assert.equal(sale.subtotal, 2000);
    assert.equal(sale.taxTotal, 360);
    assert.equal(sale.cgst, 0, 'CGST must be 0 for inter-state transaction');
    assert.equal(sale.sgst, 0, 'SGST must be 0 for inter-state transaction');
    assert.equal(sale.igst, 360, 'IGST must equal full tax amount for inter-state transaction');

    // Verify line item IGST
    assert.equal(sale.items[0].cgst, 0);
    assert.equal(sale.items[0].sgst, 0);
    assert.equal(sale.items[0].igst, 360);
  });

  // ── TEST 5: Snapshot Verification (Immutability of Historical Invoices) ──
  test('5. Product master changes do not silently alter existing historical invoices', async () => {
    // 5.1 Create product
    const tempProd = await prisma.product.create({
      data: {
        id: 'prod-p3-snapshot-test',
        name: 'Original 2026 Router Model',
        sku: 'SKU-P3-SNAP-01',
        sellingPrice: 1500,
        gstRate: 18,
        hsnCode: '8517',
        stock: 50,
        businessId: storeId,
      },
    });

    // 5.2 Create invoice with this product
    const invoiceRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: 'INV-P3-SNAP-001',
        customerName: 'Immutable Snapshot Client',
        customerState: 'Tamil Nadu',
        items: [
          {
            productId: tempProd.id,
            quantity: 2,
            rate: 1500,
            discount: 0,
            gstRate: 18,
          },
        ],
        paidAmount: 3540,
      }),
    });
    const invBody = await invoiceRes.json();
    const invoiceId = invBody.data.sale.id;

    // 5.3 Mutate the product master!
    await prisma.product.update({
      where: { id: tempProd.id },
      data: {
        name: 'Updated 2027 NextGen Router',
        sellingPrice: 3000, // Price doubled!
        gstRate: 28, // Tax rate changed!
        hsnCode: '9999', // HSN changed!
      },
    });

    // 5.4 Fetch historical invoice again
    const fetchRes = await fetch(`${baseUrl}/sales/${invoiceId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const fetchBody = await fetchRes.json();
    const savedSale = fetchBody.data.sale;

    // Verify historical snapshot remains completely frozen and unmodified!
    assert.equal(savedSale.items[0].name, 'Original 2026 Router Model');
    assert.equal(savedSale.items[0].rate, 1500);
    assert.equal(savedSale.items[0].gstRate, 18);
    assert.equal(savedSale.items[0].hsn, '8517');
    assert.equal(savedSale.subtotal, 3000);
    assert.equal(savedSale.taxTotal, 540);
    assert.equal(savedSale.grandTotal, 3540);
  });

  // ── TEST 6: Rounding Adjustment (Round Off to Nearest Rupee) ──
  test('6. Decimal-safe monetary calculations and rounding adjustment (roundOff)', async () => {
    // 3 items @ rate 33.33 with 18% GST:
    // Taxable = 99.99
    // Tax = 99.99 * 18% = 17.9982 -> 18.00
    // Raw total = 99.99 + 18.00 = 117.99
    // Round Off to nearest rupee: 118.00 (adjustment = +0.01)
    const roundPayload = {
      customerName: 'Rounding Test Buyer',
      customerState: 'Tamil Nadu',
      enableRoundOff: true,
      items: [
        {
          name: 'Precision Calibrated Shims',
          quantity: 3,
          rate: 33.33,
          discount: 0,
          gstRate: 18,
          hsn: '7318',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify(roundPayload),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    const sale = body.data.sale;

    assert.equal(sale.subtotal, 99.99);
    assert.equal(sale.taxTotal, 18.00);
    assert.equal(sale.roundOff, 0.01);
    assert.equal(sale.grandTotal, 118.00);
  });

  // ── TEST 7: Server-Side Validations for Prices, Quantities, Discounts, Tax Rates ──
  test('7. Server-side validations reject invalid quantities, negative prices, excessive discounts, and out-of-range GST rates', async () => {
    // 7.1 Zero quantity
    const resZeroQty = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Invalid Qty',
        items: [{ name: 'Item', quantity: 0, rate: 100 }],
      }),
    });
    assert.equal(resZeroQty.status, 400);

    // 7.2 Negative rate
    const resNegRate = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Invalid Rate',
        items: [{ name: 'Item', quantity: 1, rate: -50 }],
      }),
    });
    assert.equal(resNegRate.status, 400);

    // 7.3 Excessive discount exceeding item value
    const resExcessDisc = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Excess Discount',
        items: [{ name: 'Item', quantity: 1, rate: 100, discount: 200 }],
      }),
    });
    assert.equal(resExcessDisc.status, 400);

    // 7.4 Invalid GST rate (> 100%)
    const resInvalidGst = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Invalid GST',
        items: [{ name: 'Item', quantity: 1, rate: 100, gstRate: 120 }],
      }),
    });
    assert.equal(resInvalidGst.status, 400);

    // 7.5 Empty items array
    const resEmptyItems = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        customerName: 'Empty Items',
        items: [],
      }),
    });
    assert.equal(resEmptyItems.status, 400);
  });

  // ── TEST 8: Consistency Across Shop Owner Views and CA Portal ──
  test('8. Invoice calculations match across Shop Owner Invoice History and CA Portal Views', async () => {
    // Fetch from Shop Owner API
    const resShop = await fetch(`${baseUrl}/sales?search=INV-P3-50ITEMS-001`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(resShop.status, 200);
    const bodyShop = await resShop.json();
    assert.ok(bodyShop.data.sales.length > 0);
    const shopSale = bodyShop.data.sales[0];

    // Fetch from CA Portal API for authorized store
    const resCA = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeId}&search=INV-P3-50ITEMS-001`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(resCA.status, 200);
    const bodyCA = await resCA.json();
    assert.ok(bodyCA.data.invoices.length > 0);
    const caInvoice = bodyCA.data.invoices[0];

    // Ensure database-backed totals match 100% identically
    assert.equal(shopSale.invoiceNumber, caInvoice.invoiceNumber);
    assert.equal(shopSale.subtotal, caInvoice.subtotal);
    assert.equal(shopSale.taxTotal, caInvoice.taxTotal);
    assert.equal(shopSale.grandTotal, caInvoice.grandTotal);
    assert.equal(shopSale.cgst, caInvoice.cgst);
    assert.equal(shopSale.sgst, caInvoice.sgst);
    assert.equal(shopSale.igst, caInvoice.igst);
    assert.equal(shopSale.items.length, caInvoice.items.length);
  });
});
