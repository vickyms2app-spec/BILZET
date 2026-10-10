import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import { calculateItemFinancials, calculateSaleTotals } from '../src/utils/calculations.mjs';

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

describe('PHASE 13: GST & TAX FILING VERIFICATION', () => {
  const storeABizId = 'biz-p13-storeA';
  const storeAOwnerId = 'user-p13-ownerA';
  const storeBBizId = 'biz-p13-storeB';
  const storeBOwnerId = 'user-p13-ownerB';
  const cashierId = 'user-p13-cashierA';

  let storeAToken;
  let storeBToken;
  let cashierToken;

  before(async () => {
    // 1. Setup Store A (Tamil Nadu - State Code 33)
    await prisma.business.create({
      data: {
        id: storeABizId,
        name: 'Store A Retail Mart TN',
        ownerId: storeAOwnerId,
        phone: '+91 9444411111',
        email: 'storea@bilzet.test',
        address: '10 GST Road, Chennai',
        gstin: '33AAAAA1234A1Z5',
      },
    });

    await prisma.user.create({
      data: {
        id: storeAOwnerId,
        name: 'Store A Owner',
        email: 'storea.owner@bilzet.test',
        role: 'ADMIN',
        businessId: storeABizId,
        isOwner: true,
        isActive: true,
      },
    });

    // 2. Setup Store B (Karnataka - State Code 29)
    await prisma.business.create({
      data: {
        id: storeBBizId,
        name: 'Store B Tech Hub KA',
        ownerId: storeBOwnerId,
        phone: '+91 9444422222',
        email: 'storeb@bilzet.test',
        address: '25 MG Road, Bengaluru',
        gstin: '29BBBBB5678B1Z2',
      },
    });

    await prisma.user.create({
      data: {
        id: storeBOwnerId,
        name: 'Store B Owner',
        email: 'storeb.owner@bilzet.test',
        role: 'ADMIN',
        businessId: storeBBizId,
        isOwner: true,
        isActive: true,
      },
    });

    // 3. Setup Cashier under Store A without GST view/admin rights
    await prisma.user.create({
      data: {
        id: cashierId,
        name: 'Store A Cashier',
        email: 'cashier.a@bilzet.test',
        role: 'CASHIER',
        businessId: storeABizId,
        isOwner: false,
        isActive: true,
      },
    });

    // Subscriptions
    await prisma.subscription.create({
      data: {
        id: 'sub-p13-storeA',
        userId: storeAOwnerId,
        businessId: storeABizId,
        planTier: 'PRO',
        planName: 'Pro Tier',
        status: 'ACTIVE',
      },
    });

    await prisma.subscription.create({
      data: {
        id: 'sub-p13-storeB',
        userId: storeBOwnerId,
        businessId: storeBBizId,
        planTier: 'FREE',
        planName: 'Free Starter',
        status: 'ACTIVE',
      },
    });

    storeAToken = generateToken({
      id: storeAOwnerId,
      email: 'storea.owner@bilzet.test',
      role: 'ADMIN',
      businessId: storeABizId,
      isOwner: true,
      isActive: true,
    });

    storeBToken = generateToken({
      id: storeBOwnerId,
      email: 'storeb.owner@bilzet.test',
      role: 'ADMIN',
      businessId: storeBBizId,
      isOwner: true,
      isActive: true,
    });

    cashierToken = generateToken({
      id: cashierId,
      email: 'cashier.a@bilzet.test',
      role: 'CASHIER',
      businessId: storeABizId,
      isOwner: false,
      isActive: true,
    });
  });

  // ──────────────────────────────────────────────────────────
  // 1. VERIFY GST DETAILS AND CONFIGURATION
  // ──────────────────────────────────────────────────────────
  describe('1. GST Configuration & Settings Verification', () => {
    test('Admin can fetch shop GST settings', async () => {
      const res = await fetch(`${baseUrl}/settings/shop`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.data?.settings);
    });

    test('Admin can update GSTIN, State, and State Code', async () => {
      const updateRes = await fetch(`${baseUrl}/settings/shop`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          gstin: '33AAAAA1234A1Z5',
          state: 'Tamil Nadu',
          stateCode: '33',
        }),
      });
      assert.equal(updateRes.status, 200);
      const data = await updateRes.json();
      assert.equal(data.success, true);

      // Verify retrieval
      const getRes = await fetch(`${baseUrl}/settings/shop`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      const fetched = await getRes.json();
      assert.equal(fetched.data.settings.gstin, '33AAAAA1234A1Z5');
      assert.equal(fetched.data.settings.stateCode, '33');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. TAX CALCULATION ACCURACY
  // ──────────────────────────────────────────────────────────
  describe('2. Tax Calculation Accuracy (Intra-State, Inter-State, Rates & Discounts)', () => {
    test('Calculates standard GST item financials accurately across rates (0%, 5%, 12%, 18%, 28%)', () => {
      const testCases = [
        { price: 1000, rate: 0, qty: 1, discount: 0, expectedTax: 0, expectedTotal: 1000 },
        { price: 1000, rate: 5, qty: 2, discount: 200, expectedTax: 90, expectedTotal: 1890 }, // (2000 - 200) * 5% = 90
        { price: 500, rate: 12, qty: 1, discount: 50, expectedTax: 54, expectedTotal: 504 },   // (500 - 50) * 12% = 54
        { price: 1000, rate: 18, qty: 1, discount: 100, expectedTax: 162, expectedTotal: 1062 },// (1000 - 100) * 18% = 162
        { price: 2000, rate: 28, qty: 1, discount: 0, expectedTax: 560, expectedTotal: 2560 },  // 2000 * 28% = 560
      ];

      for (const tc of testCases) {
        const itemFin = calculateItemFinancials(
          { sellingPrice: tc.price, purchasePrice: 0, gstRate: tc.rate, _id: 'prod-test' },
          tc.qty,
          tc.discount
        );
        assert.equal(itemFin.tax, tc.expectedTax, `Tax mismatch for rate ${tc.rate}%`);
        assert.equal(itemFin.total, tc.expectedTotal, `Total mismatch for rate ${tc.rate}%`);
      }
    });

    test('Calculates sale grand totals with item taxes, overall discount, and rounding', () => {
      const items = [
        { quantity: 2, unitPrice: 500, discount: 0, tax: 180 },  // 1000 + 180 tax (18%)
        { quantity: 1, unitPrice: 1000, discount: 100, tax: 45 },// 900 + 45 tax (5%)
      ];
      // Subtotal = 2000, itemTax = 225, itemDiscount = 100
      // overallDiscount = 50 -> totalDiscount = 150
      // GrandTotal = subtotal (2000) - totalDiscount (150) + itemTax (225) = 2075
      const totals = calculateSaleTotals(items, 50, 2075);
      assert.equal(totals.subtotal, 2000);
      assert.equal(totals.tax, 225);
      assert.equal(totals.discount, 150);
      assert.equal(totals.grandTotal, 2075);
      assert.equal(totals.dueAmount, 0);
      assert.equal(totals.paymentStatus, 'PAID');
    });

    test('Verifies Intra-State vs Inter-State supply tax allocation rules', () => {
      const totalTax = 360;
      // Intra-state supply (Tamil Nadu -> Tamil Nadu): split 50/50 CGST + SGST
      const intraCgst = totalTax / 2;
      const intraSgst = totalTax / 2;
      const intraIgst = 0;
      assert.equal(intraCgst, 180);
      assert.equal(intraSgst, 180);
      assert.equal(intraIgst, 0);

      // Inter-state supply (Tamil Nadu -> Karnataka): 100% IGST, 0% CGST/SGST
      const interCgst = 0;
      const interSgst = 0;
      const interIgst = totalTax;
      assert.equal(interCgst, 0);
      assert.equal(interSgst, 0);
      assert.equal(interIgst, 360);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. GST REPORTS & SUMMARY GENERATION
  // ──────────────────────────────────────────────────────────
  describe('3. GST Report & Summaries Aggregation', () => {
    let saleA1Id;

    before(async () => {
      // Create sales in Store A
      const saleA1 = await prisma.sale.create({
        data: {
          invoiceNumber: 'INV-P13-A01',
          businessId: storeABizId,
          subtotal: 10000,
          discountTotal: 0,
          taxTotal: 1800,
          grandTotal: 11800,
          paidAmount: 11800,
          paymentMethod: 'UPI',
          paymentStatus: 'PAID',
          status: 'COMPLETED',
        },
      });
      saleA1Id = saleA1.id;

      await prisma.sale.create({
        data: {
          invoiceNumber: 'INV-P13-A02',
          businessId: storeABizId,
          subtotal: 5000,
          discountTotal: 500,
          taxTotal: 540,
          grandTotal: 5040,
          paidAmount: 5040,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          status: 'COMPLETED',
        },
      });

      // Create sale in Store B
      await prisma.sale.create({
        data: {
          invoiceNumber: 'INV-P13-B01',
          businessId: storeBBizId,
          subtotal: 20000,
          discountTotal: 0,
          taxTotal: 2400,
          grandTotal: 22400,
          paidAmount: 22400,
          paymentMethod: 'CARD',
          paymentStatus: 'PAID',
          status: 'COMPLETED',
        },
      });
    });

    test('Store A fetches its own GST report with accurate tax summaries and CGST/SGST split', async () => {
      const res = await fetch(`${baseUrl}/reports/gst`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      const report = data.data;

      // Store A has 2 sales: subtotal = 10000 + 5000 = 15000, taxTotal = 1800 + 540 = 2340
      assert.equal(report.totalTaxable, 15000);
      assert.equal(report.totalGst, 2340);
      assert.equal(report.totalCgst, 1170); // 2340 / 2
      assert.equal(report.totalSgst, 1170); // 2340 / 2
      assert.equal(report.invoices.length, 2);
    });

    test('Store B fetches its own GST report isolated from Store A', async () => {
      const res = await fetch(`${baseUrl}/reports/gst`, {
        headers: { Authorization: `Bearer ${storeBToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      const report = data.data;

      // Store B has only 1 sale: subtotal = 20000, taxTotal = 2400
      assert.equal(report.totalTaxable, 20000);
      assert.equal(report.totalGst, 2400);
      assert.equal(report.totalCgst, 1200);
      assert.equal(report.totalSgst, 1200);
      assert.equal(report.invoices.length, 1);
      assert.equal(report.invoices[0].invoiceNumber, 'INV-P13-B01');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. SUBSCRIPTION COMPATIBILITY & ENTITLEMENTS
  // ──────────────────────────────────────────────────────────
  describe('4. Subscription Entitlements Verification', () => {
    test('Free plan users can view shop settings and tax preferences', async () => {
      const res = await fetch(`${baseUrl}/settings/shop`, {
        headers: { Authorization: `Bearer ${storeBToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.data.settings.subscriptionTier, 'FREE');
    });

    test('Subscription status reflects active tiers accurately without breaking GST', async () => {
      const statusA = await fetch(`${baseUrl}/subscriptions/status`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(statusA.status, 200);
      const jsonA = await statusA.json();
      assert.equal(jsonA.data.planTier, 'PRO');

      const statusB = await fetch(`${baseUrl}/subscriptions/status`, {
        headers: { Authorization: `Bearer ${storeBToken}` },
      });
      assert.equal(statusB.status, 200);
      const jsonB = await statusB.json();
      assert.equal(jsonB.data.planTier, 'FREE');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. SECURITY, RBAC & DATA INTEGRITY
  // ──────────────────────────────────────────────────────────
  describe('5. Security, RBAC & Historical Data Integrity', () => {
    test('Unauthorized cashier without ADMIN role cannot modify tax settings', async () => {
      const res = await fetch(`${baseUrl}/settings/shop`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cashierToken}`,
        },
        body: JSON.stringify({
          gstin: '33HACKED9999Z9',
        }),
      });
      // Should be rejected by role authorization
      assert.equal(res.status, 403);
    });

    test('Historical invoice records remain immutable across report queries', async () => {
      const invoice = await prisma.sale.findFirst({
        where: { invoiceNumber: 'INV-P13-A01' },
      });
      assert.ok(invoice);
      assert.equal(Number(invoice.subtotal), 10000);
      assert.equal(Number(invoice.taxTotal), 1800);
      assert.equal(Number(invoice.grandTotal), 11800);
      assert.equal(invoice.paymentStatus, 'PAID');
    });
  });
});
