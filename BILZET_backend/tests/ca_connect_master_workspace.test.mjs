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

describe('BILZET CA CONNECT: MASTER AUDIT & REVIEW WORKSPACE SUITE', () => {
  const storeId = 'store-ca-master-audit';
  const ownerId = 'user-ca-master-owner';
  const caId = 'user-ca-master-auditor';
  const strangerId = 'user-ca-master-stranger';

  let caToken;
  let ownerToken;
  let strangerToken;

  before(async () => {
    // 1. Seed Business & Store
    await prisma.business.create({
      data: {
        id: storeId,
        name: 'Grand Horizon Superstore',
        ownerId,
        email: 'horizon@bilzet.test',
        phone: '+91 98888 77777',
        gstin: '33AABCG1234F1Z9',
        address: '77 Mount Road, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 2. Seed Users
    await prisma.user.create({
      data: {
        id: ownerId,
        email: 'owner@horizon.test',
        name: 'Horizon Store Owner',
        role: 'ADMIN',
        businessId: storeId,
        isOwner: true,
      },
    });

    await prisma.user.create({
      data: {
        id: caId,
        email: 'ca.auditor@firm.test',
        name: 'Srinivasan & Partners CA',
        role: 'CA',
        businessId: null,
      },
    });

    await prisma.user.create({
      data: {
        id: strangerId,
        email: 'stranger@other.test',
        name: 'Unauthorized Stranger',
        role: 'STAFF',
        businessId: 'other-biz',
      },
    });

    // 3. Grant CA Access to Store
    await prisma.caStoreAccess.create({
      data: {
        id: 'access-ca-master',
        caUserId: caId,
        businessId: storeId,
        status: 'ACTIVE',
      },
    });

    // 4. Seed Product Catalog
    await prisma.product.create({
      data: {
        id: 'prod-horizon-1',
        name: 'Premium Basmati Rice 10kg',
        costPrice: 400,
        sellingPrice: 500,
        taxPercent: 5,
        stock: 50,
        unit: 'BAG',
        businessId: storeId,
      },
    });

    await prisma.product.create({
      data: {
        id: 'prod-horizon-negative',
        name: 'Imported Olive Oil 1L',
        costPrice: 600,
        sellingPrice: 800,
        taxPercent: 12,
        stock: -5, // Anomaly for audit rule check
        unit: 'BTL',
        businessId: storeId,
      },
    });

    // 5. Seed High Expense (Anomaly for audit rule check)
    await prisma.expense.create({
      data: {
        id: 'exp-high-audit',
        title: 'Emergency Generator Overhaul',
        category: 'MAINTENANCE',
        amount: 35000,
        paymentMethod: 'BANK_TRANSFER',
        businessId: storeId,
        recordedById: ownerId,
      },
    });

    // 6. Generate Tokens
    caToken = generateToken({ id: caId, email: 'ca.auditor@firm.test', role: 'CA' });
    ownerToken = generateToken({ id: ownerId, email: 'owner@horizon.test', role: 'ADMIN', businessId: storeId });
    strangerToken = generateToken({ id: strangerId, email: 'stranger@other.test', role: 'STAFF', businessId: 'other-biz' });
  });

  test('1. Bill Invoice Creation with line items and GST breakdown', async () => {
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        customerName: 'Horizon Regular Retail Customer',
        customerPhone: '+91 97777 66666',
        items: [
          {
            productId: 'prod-horizon-1',
            quantity: 10,
            rate: 500,
            gstRate: 5,
          },
        ],
        paidAmount: 5250,
        paymentMethod: 'BANK_TRANSFER',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.sale.invoiceNumber);
    assert.equal(body.data.sale.grandTotal, 5250);
    assert.equal(body.data.sale.paymentStatus, 'PAID');
  });

  test('2. Audit Rules Engine: Detects negative stock and high expenses anomalies', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/audit-rules?storeId=${storeId}&autoCreateTasks=true`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.rulesEvaluatedCount >= 8);
    assert.ok(body.data.exceptionsFoundCount >= 2);

    const rules = body.data.exceptions.map((e) => e.ruleId);
    assert.ok(rules.includes('RULE_NEGATIVE_STOCK'));
    assert.ok(rules.includes('RULE_HIGH_EXPENSE'));
    assert.ok(body.data.tasksCreatedCount >= 1);
  });

  test('3. Bank & Payment Reconciliation: Import statement CSV and auto-match against payments and expenses', async () => {
    const statementRows = [
      {
        date: '2026-10-11',
        description: 'Customer Payment NEFT TXN-BANK-9988',
        refNumber: 'TXN-BANK-9988',
        credit: 5250,
        debit: 0,
        balance: 105250,
      },
      {
        date: '2026-10-11',
        description: 'Chq Generator Repair Outflow',
        refNumber: 'CHQ-8822',
        credit: 0,
        debit: 35000,
        balance: 70250,
      },
      {
        date: '2026-10-11',
        description: 'Unknown Miscellaneous Deposit',
        refNumber: 'UPI-UNREC-1',
        credit: 1200,
        debit: 0,
        balance: 71450,
      },
    ];

    const importRes = await fetch(`${baseUrl}/ca-portal/bank-reconciliation/import?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        fileName: 'HDFC_Current_Account_Oct2026.csv',
        rows: statementRows,
      }),
    });

    assert.equal(importRes.status, 200);
    const importBody = await importRes.json();
    assert.equal(importBody.success, true);
    assert.equal(importBody.data.session.statementRows.length, 3);
    assert.equal(importBody.data.session.totalDeposits, 6450);
    assert.equal(importBody.data.session.totalWithdrawals, 35000);

    // Verify auto-matching
    const rows = importBody.data.session.statementRows;
    const paymentRow = rows.find((r) => r.credit === 5250);
    assert.ok(paymentRow);
    assert.equal(paymentRow.matchStatus, 'SUGGESTED_MATCH');
    assert.equal(paymentRow.matchedTransaction.type, 'PAYMENT');

    const expenseRow = rows.find((r) => r.debit === 35000);
    assert.ok(expenseRow);
    assert.equal(expenseRow.matchStatus, 'SUGGESTED_MATCH');
    assert.equal(expenseRow.matchedTransaction.type, 'EXPENSE');

    const unmatchedRow = rows.find((r) => r.credit === 1200);
    assert.ok(unmatchedRow);
    assert.equal(unmatchedRow.matchStatus, 'UNMATCHED');

    // Confirm match on payment row
    const confirmRes = await fetch(`${baseUrl}/ca-portal/bank-reconciliation/match/${paymentRow.id}?storeId=${storeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ action: 'CONFIRM' }),
    });

    assert.equal(confirmRes.status, 200);
    const confirmBody = await confirmRes.json();
    assert.equal(confirmBody.data.row.matchStatus, 'RECONCILED');
  });

  test('4. Reports & Workpapers: Generates complete multi-register accounting workpapers', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/workpapers?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const wp = body.data.workpapers;
    assert.ok(wp.metadata);
    assert.equal(wp.metadata.storeName, 'Grand Horizon Superstore');
    assert.ok(wp.reconciliationSummary);
    assert.equal(wp.reconciliationSummary.grossSales, 5250);
    assert.equal(wp.reconciliationSummary.grossOutputGst, 250);
    assert.ok(Array.isArray(wp.salesRegister));
    assert.equal(wp.salesRegister.length, 1);
    assert.equal(wp.salesRegister[0].grandTotal, 5250);
  });

  test('5. Security: Rejects non-CA users and unauthorized access with 403 Forbidden', async () => {
    // Non-CA user trying to run audit rules
    const nonCaRes = await fetch(`${baseUrl}/ca-portal/audit-rules?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(nonCaRes.status, 403);

    // Stranger trying to access bank reconciliation
    const strangerRes = await fetch(`${baseUrl}/ca-portal/bank-reconciliation?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    assert.equal(strangerRes.status, 403);
  });
});
