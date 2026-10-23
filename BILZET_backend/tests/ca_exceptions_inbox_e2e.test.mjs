import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import * as caExceptionsService from '../src/services/caExceptions.service.mjs';

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

const makeRequest = async (path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
};

describe('BILZET CA PORTAL — EXCEPTIONS INBOX WITH B2B, B2C & SEZ CLASSIFICATION E2E', () => {
  const storeId = 'busi-01';
  const caUserId = `ca-test-${Date.now()}`;
  const nonCaUserId = `merchant-test-${Date.now()}`;
  let caToken;
  let nonCaToken;

  before(async () => {
    // 1. Seed CA user & store access
    await prisma.user.create({
      data: {
        id: caUserId,
        email: `ca.${Date.now()}@auditfirm.in`,
        name: 'Karthik Raja FCA',
        role: 'CA',
        businessId: storeId,
      },
    });

    await prisma.caStoreAccess.create({
      data: {
        id: `csa-${caUserId}`,
        caUserId,
        businessId: storeId,
        status: 'ACTIVE',
      },
    });

    // 2. Non-CA merchant user
    await prisma.user.create({
      data: {
        id: nonCaUserId,
        email: `merchant.${Date.now()}@store.in`,
        name: 'Retail Merchant',
        role: 'ADMIN',
        businessId: storeId,
      },
    });

    caToken = generateToken({
      id: caUserId,
      email: `ca.${Date.now()}@auditfirm.in`,
      role: 'CA',
      businessId: storeId,
    });

    nonCaToken = generateToken({
      id: nonCaUserId,
      email: `merchant.${Date.now()}@store.in`,
      role: 'ADMIN',
      businessId: storeId,
    });
  });

  describe('1. CA Authorization & Access Control', () => {
    test('Verified CA can access the Exceptions Inbox', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.success, true);
      assert.ok(Array.isArray(data?.data?.exceptions));
      assert.ok(data?.data?.counts);
    });

    test('Non-CA merchant is forbidden from CA Exceptions Inbox (403 Forbidden)', async () => {
      const { status } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${nonCaToken}` },
      });
      assert.strictEqual(status, 403);
    });

    test('Unauthenticated request is rejected (401 Unauthorized)', async () => {
      const { status } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}`);
      assert.strictEqual(status, 401);
    });
  });

  describe('2. Authoritative Customer Type Classification (B2B, B2C, SEZ, UNCLASSIFIED)', () => {
    test('B2B: Qualifying transaction with valid recipient GSTIN is classified as B2B', () => {
      const classification = caExceptionsService.classifyCustomerAndTransaction({
        sale: { grandTotal: 25000, invoiceNumber: 'INV-B2B-01' },
        customer: { name: 'Acme Corp', gstin: '33AAACA1234A1Z5', state: 'Tamil Nadu' },
        store: { state: 'Tamil Nadu' },
      });
      assert.strictEqual(classification.customerType, 'B2B');
      assert.strictEqual(classification.sezTaxTreatment, null);
      assert.ok(classification.reason.includes('Valid recipient GSTIN verified'));
    });

    test('B2C: Consumer transaction without GSTIN within statutory threshold is classified as B2C', () => {
      const classification = caExceptionsService.classifyCustomerAndTransaction({
        sale: { grandTotal: 3200, invoiceNumber: 'INV-B2C-01' },
        customer: { name: 'Priya Retail Customer', gstin: '', state: 'Tamil Nadu' },
        store: { state: 'Tamil Nadu' },
      });
      assert.strictEqual(classification.customerType, 'B2C');
      assert.strictEqual(classification.sezTaxTreatment, null);
      assert.ok(classification.reason.includes('Classified as B2C'));
    });

    test('SEZ: Supply to Special Economic Zone recipient is classified as SEZ with tax treatment', () => {
      // SEZ with payment of IGST
      const sezWithPayment = caExceptionsService.classifyCustomerAndTransaction({
        sale: { grandTotal: 118000, taxTotal: 18000, igst: 18000, isSez: true },
        customer: { name: 'Infosys SEZ Tech Unit', gstin: '33AAACI1234I1Z8', isSez: true },
        store: { state: 'Tamil Nadu' },
      });
      assert.strictEqual(sezWithPayment.customerType, 'SEZ');
      assert.strictEqual(sezWithPayment.sezTaxTreatment, 'WITH_PAYMENT');

      // SEZ zero-rated under LUT
      const sezLut = caExceptionsService.classifyCustomerAndTransaction({
        sale: { grandTotal: 100000, taxTotal: 0, sezTaxTreatment: 'WITHOUT_PAYMENT_UNDER_LUT' },
        customer: { name: 'TCS SEZ Developer', isSez: true },
        store: { state: 'Tamil Nadu' },
      });
      assert.strictEqual(sezLut.customerType, 'SEZ');
      assert.strictEqual(sezLut.sezTaxTreatment, 'WITHOUT_PAYMENT_UNDER_LUT');
    });

    test('UNCLASSIFIED: Corrupted or invalid GSTIN format is flagged as UNCLASSIFIED', () => {
      const invalidGstin = caExceptionsService.classifyCustomerAndTransaction({
        sale: { grandTotal: 12000 },
        customer: { name: 'Defective Buyer Ltd', gstin: 'INVALID_GSTIN_123' },
        store: { state: 'Tamil Nadu' },
      });
      assert.strictEqual(invalidGstin.customerType, 'UNCLASSIFIED');
      assert.ok(invalidGstin.reason.includes('fails statutory 15-character'));
    });

    test('UNCLASSIFIED: High-value transaction (> ₹50,000) lacking GSTIN is flagged as UNCLASSIFIED', () => {
      const highValueUnregistered = caExceptionsService.classifyCustomerAndTransaction({
        sale: { grandTotal: 85000 },
        customer: { name: 'Metro Bulk Buyers', gstin: '' },
        store: { state: 'Tamil Nadu' },
      });
      assert.strictEqual(highValueUnregistered.customerType, 'UNCLASSIFIED');
      assert.ok(highValueUnregistered.reason.includes('exceeds statutory threshold'));
    });
  });

  describe('3. Customer Type Filtering and Multi-Select', () => {
    test('Filtering by customerType=B2B returns only B2B exceptions', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}&customerType=B2B`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      const list = data?.data?.exceptions || [];
      assert.ok(list.length > 0);
      assert.ok(list.every((e) => e.customerType === 'B2B'));
    });

    test('Filtering by customerType=SEZ returns only SEZ transactions', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}&customerType=SEZ`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      const list = data?.data?.exceptions || [];
      assert.ok(list.length > 0);
      assert.ok(list.every((e) => e.customerType === 'SEZ'));
    });

    test('Multi-select customerType filter (B2B,SEZ) returns both classifications', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}&customerType=B2B,SEZ`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      const list = data?.data?.exceptions || [];
      assert.ok(list.every((e) => ['B2B', 'SEZ'].includes(e.customerType)));
    });
  });

  describe('4. Category Tabs, Counts & Pagination', () => {
    test('Returns genuine category counts for filter bar badges', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      const counts = data?.data?.counts;
      assert.ok(counts.all >= 4);
      assert.ok(typeof counts.gstMismatches === 'number');
      assert.ok(typeof counts.returnsCreditNotes === 'number');
      assert.ok(typeof counts.missingInvoices === 'number');
      assert.ok(typeof counts.pendingDocuments === 'number');

      const custCounts = data?.data?.customerTypeCounts;
      assert.ok(custCounts.b2b >= 1);
      assert.ok(custCounts.sez >= 1);
      assert.ok(custCounts.unclassified >= 1);
    });

    test('Category filter (GST_MISMATCH) returns only mismatches', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}&category=GST_MISMATCH`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      const list = data?.data?.exceptions || [];
      assert.ok(list.length > 0);
      assert.ok(list.every((e) => e.category === 'GST_MISMATCH'));
    });

    test('Pagination works with custom page and limit', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}&page=1&limit=2`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.data?.exceptions.length, 2);
      assert.strictEqual(data?.data?.meta?.page, 1);
      assert.strictEqual(data?.data?.meta?.limit, 2);
      assert.ok(data?.data?.meta?.totalPages >= 2);
    });
  });

  describe('5. Live BILZET Billing Synchronization (Sync Now)', () => {
    test('Triggering Sync Now scans live records and updates lastSync timestamp', async () => {
      const { status, data } = await makeRequest('/ca-portal/exceptions/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({ storeId }),
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.data?.success, true);
      assert.ok(data?.data?.lastSync);
      assert.ok(typeof data?.data?.exceptionsSynced === 'number');
    });

    test('Sync is idempotent: repeated triggers do not duplicate existing exceptions', async () => {
      // Get initial count
      const initial = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      const initialCount = initial.data?.data?.meta?.total;

      // Trigger sync again
      await makeRequest('/ca-portal/exceptions/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({ storeId }),
      });

      // Count should remain unchanged
      const afterSync = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(afterSync.data?.data?.meta?.total, initialCount);
    });
  });

  describe('6. Detail Drawer, GST Comparison & Review Workflows', () => {
    let testExceptionId;

    before(async () => {
      const res = await makeRequest(`/ca-portal/exceptions?storeId=${storeId}&limit=1`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      testExceptionId = res.data?.data?.exceptions[0]?.id;
    });

    test('Fetch single exception details with GST comparison breakdown', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions/${testExceptionId}`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(status, 200);
      const exc = data?.data?.exception;
      assert.ok(exc);
      assert.strictEqual(exc.id, testExceptionId);
      assert.ok(exc.customerType);
      assert.ok(typeof exc.taxableAmount === 'number');
      assert.ok(typeof exc.gstAmount === 'number');
    });

    test('Add Review Note: Appends review note and preserves audit trail', async () => {
      const noteText = 'Verified against bank credit ledger. Discrepancy confirmed with client accountant.';
      const { status, data } = await makeRequest(`/ca-portal/exceptions/${testExceptionId}/notes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({ note: noteText }),
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.data?.success, true);
      assert.strictEqual(data?.data?.newNote?.note, noteText);

      // Verify note is saved in exception
      const detail = await makeRequest(`/ca-portal/exceptions/${testExceptionId}`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      const notes = detail.data?.data?.exception?.reviewNotes || [];
      assert.ok(notes.some((n) => n.note === noteText));
    });

    test('Request Document: Records document request in audit trail', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions/${testExceptionId}/request-document`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          documentType: 'Letter of Undertaking (LUT)',
          message: 'Please upload FY2026-27 LUT approval copy.',
        }),
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.data?.success, true);
      assert.strictEqual(data?.data?.request?.documentType, 'Letter of Undertaking (LUT)');
    });

    test('Resolution Lifecycle: Mark as RESOLVED records authenticated CA and reason', async () => {
      const resolutionReason = 'HSN rate adjusted and difference reconciled in October return.';
      const { status, data } = await makeRequest(`/ca-portal/exceptions/${testExceptionId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          status: 'RESOLVED',
          reason: resolutionReason,
        }),
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.data?.success, true);
      assert.strictEqual(data?.data?.exception?.status, 'RESOLVED');

      // Verify audit history contains resolution
      const detail = await makeRequest(`/ca-portal/exceptions/${testExceptionId}`, {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.strictEqual(detail.data?.data?.exception?.status, 'RESOLVED');
      const hist = detail.data?.data?.exception?.history || [];
      assert.ok(hist.some((h) => h.action === 'EXCEPTION_RESOLVED'));
    });

    test('Reopen Workflow: CA can reopen a resolved exception', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions/${testExceptionId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          status: 'REOPENED',
          reason: 'Client provided conflicting reconciliation figures.',
        }),
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.data?.exception?.status, 'REOPENED');
    });

    test('Customer Classification Update: CA can update classification and preserve audit history', async () => {
      const { status, data } = await makeRequest(`/ca-portal/exceptions/${testExceptionId}/classify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          customerType: 'B2B',
          reason: 'Client supplied official 15-digit GST certificate.',
        }),
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(data?.data?.exception?.customerType, 'B2B');
    });
  });
});
