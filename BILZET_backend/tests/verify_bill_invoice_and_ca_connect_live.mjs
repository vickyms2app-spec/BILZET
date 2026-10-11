import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';

async function runLiveVerification() {
  console.log('======================================================================');
  console.log('🚀 LIVE VERIFICATION: BILL INVOICE & CA CONNECT WORKFLOW TEST');
  console.log('======================================================================\n');

  // 1. Start Server on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;
  console.log(`[1] Test HTTP Server running at: ${baseUrl}`);

  const generateToken = (payload) => {
    return jwt.sign(payload, env.JWT_SECRET || 'secret', { expiresIn: '1d' });
  };

  const storeId = 'store-live-mart';
  const ownerId = 'user-live-owner';
  const caId = 'user-live-ca';
  const outsiderId = 'user-live-outsider';

  try {
    // 2. Setup Data
    console.log('[2] Seeding store, owner, CA, and product catalog...');
    await prisma.business.create({
      data: {
        id: storeId,
        name: 'Bilzet Metro Retail Mart',
        ownerId,
        email: 'metro@bilzet.test',
        phone: '+91 94444 88888',
        gstin: '33AABCB9999F1Z1',
        address: '500 Anna Salai, Chennai',
        state: 'Tamil Nadu',
      },
    });

    await prisma.user.create({
      data: {
        id: ownerId,
        email: 'owner@bilzet.test',
        name: 'Karthik Retail Owner',
        role: 'ADMIN',
        businessId: storeId,
        isOwner: true,
      },
    });

    await prisma.user.create({
      data: {
        id: caId,
        email: 'auditor@cafirm.in',
        name: 'Venkatesh & Co, CA',
        role: 'CA',
        businessId: null,
      },
    });

    await prisma.user.create({
      data: {
        id: outsiderId,
        email: 'outsider@other.in',
        name: 'Outsider User',
        role: 'STAFF',
        businessId: 'other-store',
      },
    });

    await prisma.caStoreAccess.create({
      data: {
        id: 'access-live-ca',
        caUserId: caId,
        businessId: storeId,
        status: 'ACTIVE',
      },
    });

    await prisma.product.create({
      data: {
        id: 'prod-live-laptop',
        name: 'Commercial Billing Terminal X1',
        hsnCode: '8471',
        costPrice: 150,
        sellingPrice: 200,
        taxPercent: 18,
        stock: 200,
        unit: 'PCS',
        businessId: storeId,
      },
    });

    const ownerToken = generateToken({
      id: ownerId,
      email: 'owner@bilzet.test',
      role: 'ADMIN',
      businessId: storeId,
    });

    const caToken = generateToken({
      id: caId,
      email: 'auditor@cafirm.in',
      role: 'CA',
      businessId: null,
    });

    const outsiderToken = generateToken({
      id: outsiderId,
      email: 'outsider@other.in',
      role: 'STAFF',
      businessId: 'other-store',
    });

    // ──────────────────────────────────────────────────────────────────
    // STEP 1: CREATE BILL INVOICE
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[3] Testing Bill Invoice Creation (50 units @ ₹200 + 18% GST)...');
    const createSaleRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        customerName: 'Nexus Global Logistics',
        customerPhone: '+91 91111 22222',
        customerGstin: '33AAAAA5555A1Z5',
        customerState: 'Tamil Nadu',
        items: [
          {
            productId: 'prod-live-laptop',
            quantity: 50,
            rate: 200,
            gstRate: 18,
            hsn: '8471',
          },
        ],
        paymentMethod: 'UPI',
        paidAmount: 5000, // Partial payment
      }),
    });

    assert.equal(createSaleRes.status, 201, 'Invoice creation failed');
    const createSaleJson = await createSaleRes.json();
    const sale = createSaleJson.data.sale;
    const invoiceId = sale.id;

    console.log(`    ✅ Bill Created Successfully: Invoice #${sale.invoiceNumber} (ID: ${invoiceId})`);
    console.log(`    Original Taxable: ₹${sale.subtotal} | Original GST (18%): ₹${sale.taxTotal} | Total: ₹${sale.grandTotal}`);
    console.log(`    Paid: ₹${sale.paidAmount} | Balance Due: ₹${sale.balanceDue} | Status: ${sale.paymentStatus}`);

    assert.equal(Number(sale.subtotal), 10000, 'Taxable must be 10000');
    assert.equal(Number(sale.taxTotal), 1800, 'GST must be 1800');
    assert.equal(Number(sale.grandTotal), 11800, 'Grand total must be 11800');
    assert.equal(Number(sale.paidAmount), 5000, 'Paid must be 5000');
    assert.equal(Number(sale.balanceDue), 6800, 'Balance due must be 6800');
    assert.equal(sale.paymentStatus, 'PARTIALLY_PAID', 'Payment status must be PARTIALLY_PAID');

    // ──────────────────────────────────────────────────────────────────
    // STEP 2: RECORD PAYMENT ON INVOICE
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[4] Testing Payment Recording on Invoice (Paying remaining ₹6,800)...');
    const payRes = await fetch(`${baseUrl}/sales/${invoiceId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        amount: 6800,
        paymentMethod: 'NEFT',
        note: 'Settled remaining balance',
      }),
    });

    assert.equal(payRes.status, 200, 'Payment recording failed');
    const payJson = await payRes.json();
    const paidSale = payJson.data.sale;

    console.log(`    ✅ Payment Recorded: Paid Amount: ₹${paidSale.paidAmount} | Status: ${paidSale.paymentStatus} | Due: ₹${paidSale.balanceDue}`);
    assert.equal(Number(paidSale.paidAmount), 11800);
    assert.equal(Number(paidSale.balanceDue), 0);
    assert.equal(paidSale.paymentStatus, 'PAID');

    // ──────────────────────────────────────────────────────────────────
    // STEP 3: PERFORM CUSTOMER RETURN (10 UNITS) & GST ADJUSTMENT
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[5] Testing Customer Return (10 units returned) with Automatic GST Reversal...');
    const returnRes = await fetch(`${baseUrl}/sales/${invoiceId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            saleItemId: paidSale.items[0].id,
            productId: 'prod-live-laptop',
            quantity: 10,
          },
        ],
        reason: 'Surplus inventory returned by customer',
        refundMethod: 'BANK_TRANSFER',
      }),
    });

    assert.equal(returnRes.status, 200, 'Return processing failed');
    const returnJson = await returnRes.json();
    const returnedSale = returnJson.data.sale;
    const creditNote = returnedSale.returns[0];

    console.log(`    ✅ Return Processed & Linked Credit Note Generated: ${creditNote.creditNoteNumber}`);
    console.log(`    Returned Taxable Value: ₹${returnedSale.returnedTaxableAmount} (Expected: ₹2,000)`);
    console.log(`    GST Reversal (18%):     ₹${returnedSale.gstAdjustment} (Expected: ₹360)`);
    console.log(`    Total Credit Value:     ₹${returnedSale.totalReturnedAmount} (Expected: ₹2,360)`);
    console.log(`    Revised Net Taxable:    ₹${returnedSale.netTaxableAmount} (Expected: ₹8,000)`);
    console.log(`    Revised Net GST:        ₹${returnedSale.netTaxTotal} (Expected: ₹1,440)`);
    console.log(`    Revised Net Payable:    ₹${returnedSale.netPayable} (Expected: ₹9,440)`);
    console.log(`    Original Grand Total:   ₹${returnedSale.originalGrandTotal} (Permanently Preserved)`);

    assert.equal(Number(returnedSale.returnedTaxableAmount), 2000);
    assert.equal(Number(returnedSale.gstAdjustment), 360);
    assert.equal(Number(returnedSale.totalReturnedAmount), 2360);
    assert.equal(Number(returnedSale.netTaxableAmount), 8000);
    assert.equal(Number(returnedSale.netTaxTotal), 1440);
    assert.equal(Number(returnedSale.netPayable), 9440);
    assert.equal(Number(returnedSale.originalGrandTotal), 11800);

    // ──────────────────────────────────────────────────────────────────
    // STEP 4: CA CONNECT / CA PORTAL LIVE VERIFICATION
    // ──────────────────────────────────────────────────────────────────
    console.log('\n[6] Testing CA Connect & CA Portal Access...');

    // 4.1 CA Store Switcher
    const storesRes = await fetch(`${baseUrl}/ca-portal/stores`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(storesRes.status, 200);
    const storesJson = await storesRes.json();
    const authorizedStores = storesJson.data.stores;
    console.log(`    ✅ CA Assigned Stores: ${authorizedStores.map((s) => s.name).join(', ')}`);
    assert.ok(authorizedStores.some((s) => s.id === storeId));

    // 4.2 CA Financial Dashboard
    const summaryRes = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(summaryRes.status, 200);
    const summaryJson = await summaryRes.json();
    const metrics = summaryJson.data.summary.metrics;
    console.log(`    ✅ CA Dashboard Metrics Reconciled:`);
    console.log(`       - Gross Sales:         ₹${metrics.totalSalesBeforeReturns}`);
    console.log(`       - Output GST (Gross):  ₹${metrics.gstCollectedOnSales}`);
    console.log(`       - GST Reversed (Ret):  ₹${metrics.gstAdjustmentsFromReturns}`);
    console.log(`       - Net GST Liability:   ₹${metrics.netGst}`);
    console.log(`       - Net Sales Turnover:  ₹${metrics.netSalesAfterReturns}`);

    assert.equal(Number(metrics.totalSalesBeforeReturns), 11800);
    assert.equal(Number(metrics.gstCollectedOnSales), 1800);
    assert.equal(Number(metrics.gstAdjustmentsFromReturns), 360);
    assert.equal(Number(metrics.netGst), 1440);
    assert.equal(Number(metrics.netSalesAfterReturns), 9440);

    // 4.3 CA Invoice Detail
    const caInvRes = await fetch(`${baseUrl}/ca-portal/invoices/${invoiceId}?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caInvRes.status, 200);
    const caInvJson = await caInvRes.json();
    const caInv = caInvJson.data.invoice;
    console.log(`    ✅ CA Invoice Inspection: Original ₹${caInv.originalGrandTotal} | Net ₹${caInv.netPayable} | CNs: ${caInv.creditNotes?.length}`);
    assert.equal(Number(caInv.originalGrandTotal), 11800);
    assert.equal(Number(caInv.netPayable), 9440);

    // 4.4 CA Credit Notes Register
    const cnRes = await fetch(`${baseUrl}/ca-portal/credit-notes?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(cnRes.status, 200);
    const cnJson = await cnRes.json();
    console.log(`    ✅ CA Credit Notes Register: ${cnJson.data.creditNotes?.length} credit note(s) found`);
    assert.ok(cnJson.data.creditNotes?.length >= 1);

    // 4.5 CA Synchronized Activity Ledger
    const actRes = await fetch(`${baseUrl}/ca-portal/activity?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(actRes.status, 200);
    const actJson = await actRes.json();
    console.log(`    ✅ CA Activity Ledger: ${actJson.data.activity?.length} immutable events recorded`);
    assert.ok(actJson.data.activity?.length >= 3);

    // 4.6 CA Audit Discrepancies & Merchant Resolution Flow
    console.log('\n[7] Testing Two-Way Audit Discrepancy & Merchant Correction Workflow...');
    const flagRes = await fetch(`${baseUrl}/ca-portal/discrepancies?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        title: 'GST Reversal Verification for CN #1',
        description: 'Please verify matching credit note on GST portal.',
        discrepancyType: 'TAX_MISMATCH',
        referenceNumber: creditNote.creditNoteNumber,
      }),
    });
    assert.equal(flagRes.status, 201);
    const flagJson = await flagRes.json();
    const discId = flagJson.data.discrepancy.id;
    console.log(`    ✅ CA Flagged Discrepancy: ID ${discId} (Status: CORRECTION_REQUESTED)`);

    // Merchant responds
    const resolveRes = await fetch(`${baseUrl}/ca-connect/discrepancies/${discId}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        correctionResponse: 'Reconciled with Table 9B of GSTR-1 draft.',
      }),
    });
    assert.equal(resolveRes.status, 200);
    console.log(`    ✅ Store Owner Responded: Correction Status -> RESOLVED`);

    // CA verifies
    const verifyRes = await fetch(`${baseUrl}/ca-portal/discrepancies/${discId}/verify?storeId=${storeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ verificationNotes: 'Auditor checked GSTR-1 matching.' }),
    });
    assert.equal(verifyRes.status, 200);
    console.log(`    ✅ CA Verified Correction: Discrepancy Status -> VERIFIED`);

    // 4.7 Period Closing & Sign-off
    console.log('\n[8] Testing Period Closing & CA Sign-off...');
    const closeRes = await fetch(`${baseUrl}/ca-portal/period-closings?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({
        period: '2026-10',
        signOffNotes: 'October 2026 tax accounts balanced.',
      }),
    });
    assert.equal(closeRes.status, 200);
    const closeJson = await closeRes.json();
    const periodId = closeJson.data.period.id;
    console.log(`    ✅ Tax Period 2026-10 Closed & Frozen: Net GST Payable ₹${closeJson.data.period.netGstPayable}`);

    const signRes = await fetch(`${baseUrl}/ca-portal/period-closings/${periodId}/sign-off?storeId=${storeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${caToken}`,
      },
      body: JSON.stringify({ signOffNotes: 'Venkatesh & Co, CA digital sign-off certificate.' }),
    });
    assert.equal(signRes.status, 200);
    console.log(`    ✅ CA Audit Sign-off Issued: Status -> SIGNED_OFF`);

    // 4.8 Security & Tenant Isolation Check
    console.log('\n[9] Testing Multi-Tenant Store Security & Isolation...');
    const deniedRes = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeId}`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert.equal(deniedRes.status, 403, 'Unauthorized user should be rejected with 403');
    console.log(`    ✅ Security Check: Unauthorized user blocked with 403 Forbidden`);

    console.log('\n======================================================================');
    console.log('🎉 ALL TESTS PASSED: BILL INVOICE & CA CONNECT ARE 100% OPERATIONAL!');
    console.log('======================================================================\n');
  } finally {
    server.close();
  }
}

runLiveVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
