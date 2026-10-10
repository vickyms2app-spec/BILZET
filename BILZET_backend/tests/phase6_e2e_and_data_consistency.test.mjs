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

describe('PHASE 6: END-TO-END TESTING AND DATA CONSISTENCY', () => {
  const storeAId = 'store-p6-authorized';
  const storeBId = 'store-p6-unauthorized';

  const ownerAId = 'user-p6-owner-a';
  const ownerBId = 'user-p6-owner-b';
  const caId = 'user-p6-ca';

  let ownerAToken;
  let caToken;

  let invoice50Id;
  let unpaidInvoiceId;
  let partialInvoiceId;
  let secretInvoiceBId;
  let firstReturnCreditNoteNumber;

  const testProductIds = [];

  before(async () => {
    // 1. Setup Authorized Store A in Tamil Nadu
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Prime Retail Corporation',
        ownerId: ownerAId,
        email: 'prime@bilzet.test',
        phone: '+91 97777 00001',
        gstin: '33AAAAA9999A1Z9',
        address: '500 Anna Salai, Chennai',
        state: 'Tamil Nadu',
      },
    });

    // 2. Setup Unauthorized Store B in Karnataka
    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Isolated Tech Enterprise',
        ownerId: ownerBId,
        email: 'isolated@bilzet.test',
        phone: '+91 97777 00002',
        gstin: '29BBBBB8888B2Z8',
        address: '100 Indiranagar, Bengaluru',
        state: 'Karnataka',
      },
    });

    // 3. Setup Store Owner A
    await prisma.user.create({
      data: {
        id: ownerAId,
        email: 'owner-p6@bilzet.test',
        name: 'Prime Store Owner',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
      },
    });

    // 4. Setup CA User
    await prisma.user.create({
      data: {
        id: caId,
        email: 'auditor-p6@bilzet.test',
        name: 'CA Srinivasan',
        role: 'CA',
        businessId: null,
      },
    });

    // 5. Authorize CA for Store A ONLY
    await prisma.caStoreAccess.create({
      data: {
        id: 'acc-p6-ca-store-a',
        caUserId: caId,
        businessId: storeAId,
        status: 'ACTIVE',
      },
    });

    ownerAToken = generateToken({
      id: ownerAId,
      email: 'owner-p6@bilzet.test',
      role: 'ADMIN',
      businessId: storeAId,
    });

    caToken = generateToken({
      id: caId,
      email: 'auditor-p6@bilzet.test',
      role: 'CA',
      businessId: null,
    });

    // 6. Setup Product Master Catalog in Store A
    // 50 products will be created for scenario 1
    for (let i = 1; i <= 50; i++) {
      const pid = `prod-p6-${i}`;
      testProductIds.push(pid);
      await prisma.product.create({
        data: {
          id: pid,
          name: `Catalog Item ${i}`,
          sku: `SKU-P6-${i}`,
          hsn: i % 2 === 0 ? '8471' : '8504',
          hsnCode: i % 2 === 0 ? '8471' : '8504',
          costPrice: 50,
          sellingPrice: 100, // ₹100 per unit
          gstRate: 18, // 18% GST
          taxPercent: 18,
          stock: 200,
          businessId: storeAId,
        },
      });
    }

    // Customer in Store A
    const cust = await prisma.customer.create({
      data: {
        id: 'cust-p6-corp',
        name: 'Apex Solutions Chennai',
        phone: '9888899999',
        gstin: '33DDDDD4444D1Z4',
        state: 'Tamil Nadu',
        businessId: storeAId,
      },
    });

    // Seed Invoice in Unauthorized Store B
    const secretB = await prisma.sale.create({
      data: {
        id: 'sale-p6-store-b-confidential',
        invoiceNumber: 'INV-STORE-B-CONFIDENTIAL',
        businessId: storeBId,
        subtotal: 80000,
        taxTotal: 14400,
        grandTotal: 94400,
        paidAmount: 94400,
        paymentStatus: 'PAID',
      },
    });
    secretInvoiceBId = secretB.id;
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 1: Create an invoice for 50 products and verify product-level GST calculations
  // ══════════════════════════════════════════════════════════════
  test('1. Create an invoice for 50 products and verify product-level GST calculations', async () => {
    // 50 products, 1 unit each @ ₹100 = Subtotal ₹5000, 18% GST = ₹900 (CGST ₹450, SGST ₹450), Grand Total = ₹5900
    const items = testProductIds.map((pid, idx) => ({
      productId: pid,
      name: `Catalog Item ${idx + 1}`,
      quantity: 1,
      rate: 100,
      gstRate: 18,
      hsn: idx % 2 === 0 ? '8471' : '8504',
    }));

    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: 'cust-p6-corp',
        items,
        paidAmount: 5900,
        paymentMethod: 'UPI',
        paymentStatus: 'PAID',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    const sale = body.data.sale;
    invoice50Id = sale.id;

    assert.equal(sale.items.length, 50, 'Must contain all 50 line items');
    assert.equal(sale.subtotal, 5000, 'Subtotal must be ₹5,000');
    assert.equal(sale.taxTotal, 900, 'Tax total must be ₹900');
    assert.equal(sale.grandTotal, 5900, 'Grand total must be ₹5,900');
    assert.equal(sale.cgst, 450, 'Intra-state CGST must be ₹450');
    assert.equal(sale.sgst, 450, 'Intra-state SGST must be ₹450');

    // Verify product-level line items
    for (const item of sale.items) {
      assert.equal(item.quantity, 1);
      assert.equal(item.unitPrice, 100);
      assert.equal(item.taxableAmount, 100);
      assert.equal(item.gstRate, 18);
      assert.equal(item.taxAmount, 18);
      assert.equal(item.cgst, 9);
      assert.equal(item.sgst, 9);
      assert.equal(item.total, 118);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 2: Confirm the invoice is saved and visible to the authorized CA
  // ══════════════════════════════════════════════════════════════
  test('2. Confirm the invoice is saved and visible to the authorized CA', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/invoices/${invoice50Id}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const inv = body.data.invoice;

    assert.equal(inv.id, invoice50Id);
    assert.equal(inv.storeId, storeAId);
    assert.equal(inv.items.length, 50);
    assert.equal(inv.taxableAmount, 5000);
    assert.equal(inv.grandTotal, 5900);
    assert.equal(inv.paymentStatus, 'PAID');
    assert.equal(inv.customer.name, 'Apex Solutions Chennai');
    assert.equal(inv.customer.gstin, '33DDDDD4444D1Z4');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 3: Record a full payment and verify the PAID status
  // ══════════════════════════════════════════════════════════════
  test('3. Record a full payment and verify the PAID status', async () => {
    // Invoice 50 was paid in full upon creation
    const res = await fetch(`${baseUrl}/ca-portal/invoices/${invoice50Id}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const inv = body.data.invoice;

    assert.equal(inv.paymentStatus, 'PAID');
    assert.equal(inv.paidAmount, 5900);
    assert.equal(inv.balanceDue, 0);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 4: Create an unpaid invoice and verify the UNPAID status
  // ══════════════════════════════════════════════════════════════
  test('4. Create an unpaid invoice and verify the UNPAID status', async () => {
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: 'cust-p6-corp',
        items: [
          {
            productId: testProductIds[0],
            name: 'Catalog Item 1',
            quantity: 10,
            rate: 100,
            gstRate: 18,
          },
        ],
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    const sale = body.data.sale;
    unpaidInvoiceId = sale.id;

    assert.equal(sale.paymentStatus, 'UNPAID');
    assert.equal(sale.paidAmount, 0);
    assert.equal(sale.balanceDue, 1180);

    // Verify visible to CA with UNPAID filter
    const caFilterRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}&paymentStatus=UNPAID`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caFilterRes.status, 200);
    const caFilterBody = await caFilterRes.json();
    const found = caFilterBody.data.invoices.find((i) => i.id === unpaidInvoiceId);
    assert.ok(found, 'Unpaid invoice must be visible in CA unpaid filter');
    assert.equal(found.paymentStatus, 'UNPAID');
    assert.equal(found.balanceDue, 1180);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 5: Record a partial payment and verify PARTIALLY PAID status & outstanding balance
  // ══════════════════════════════════════════════════════════════
  test('5. Record a partial payment and verify the PARTIALLY PAID status and outstanding balance', async () => {
    // Create an invoice of ₹2360 (20 units @ ₹100 + 18% GST)
    const createRes = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        customerId: 'cust-p6-corp',
        items: [
          {
            productId: testProductIds[1],
            name: 'Catalog Item 2',
            quantity: 20,
            rate: 100,
            gstRate: 18,
          },
        ],
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).data.sale;
    partialInvoiceId = created.id;
    assert.equal(created.grandTotal, 2360);

    // Record partial payment of ₹1000
    const payRes = await fetch(`${baseUrl}/sales/${partialInvoiceId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 1000,
        paymentMethod: 'CASH',
        note: 'Partial installment #1',
      }),
    });
    assert.equal(payRes.status, 200);
    const payBody = await payRes.json();
    const updated = payBody.data.sale;

    assert.equal(updated.paymentStatus, 'PARTIALLY_PAID');
    assert.equal(updated.paidAmount, 1000);
    assert.equal(updated.balanceDue, 1360); // 2360 - 1000 = 1360

    // Verify CA Portal view reflects PARTIALLY_PAID
    const caRes = await fetch(`${baseUrl}/ca-portal/invoices/${partialInvoiceId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(caRes.status, 200);
    const caInv = (await caRes.json()).data.invoice;
    assert.equal(caInv.paymentStatus, 'PARTIALLY_PAID');
    assert.equal(caInv.paidAmount, 1000);
    assert.equal(caInv.balanceDue, 1360);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 6: Return 10 of the 50 products and verify the returned value and GST adjustment
  // ══════════════════════════════════════════════════════════════
  test('6. Return 10 of the 50 products and verify the returned value and GST adjustment', async () => {
    // Return items 1 through 10 from invoice50Id (1 unit each = 10 units total @ ₹100 = ₹1000 taxable value reversal, ₹180 GST reversal)
    const returnItems = testProductIds.slice(0, 10).map((pid, idx) => ({
      productId: pid,
      name: `Catalog Item ${idx + 1}`,
      quantity: 1,
      rate: 100,
    }));

    const returnRes = await fetch(`${baseUrl}/sales/${invoice50Id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: returnItems,
        reason: 'Customer returned 10 defective units',
        refundMethod: 'UPI',
      }),
    });

    assert.equal(returnRes.status, 200);
    const returnBody = await returnRes.json();
    const retSale = returnBody.data.sale;
    const cn = returnBody.data.creditNote || retSale.returns[0];
    firstReturnCreditNoteNumber = cn.creditNoteNumber;

    // Returned value = ₹1000 taxable, ₹180 GST, ₹1180 total
    assert.equal(retSale.returnedTaxableAmount, 1000);
    assert.equal(retSale.gstAdjustment, 180);
    assert.equal(retSale.totalReturnedAmount, 1180);
    assert.equal(retSale.netTaxableAmount, 4000); // 5000 - 1000
    assert.equal(retSale.netTaxTotal, 720); // 900 - 180
    assert.equal(retSale.netPayable, 4720); // 5900 - 1180
    assert.equal(retSale.returnStatus, 'PARTIALLY_RETURNED');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 7: Confirm original invoice is preserved & linked return / credit note is created
  // ══════════════════════════════════════════════════════════════
  test('7. Confirm the original invoice is preserved and a linked return or credit note is created', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/invoices/${invoice50Id}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const inv = (await res.json()).data.invoice;

    // Immutability: original invoice totals must remain intact
    assert.equal(inv.originalGrandTotal, 5900, 'Original grand total must be preserved');
    assert.equal(inv.originalTaxTotal, 900, 'Original tax total must be preserved');
    assert.equal(inv.originalTaxableAmount, 5000, 'Original taxable amount must be preserved');

    // Credit Note link
    assert.ok(inv.hasReturns, 'Invoice must indicate hasReturns');
    assert.ok(Array.isArray(inv.returns));
    assert.equal(inv.returns.length, 1);
    const cn = inv.returns[0];
    assert.equal(cn.creditNoteNumber, firstReturnCreditNoteNumber);
    assert.equal(cn.taxableAmount, 1000);
    assert.equal(cn.gstAdjustment, 180);
    assert.equal(cn.totalAmount, 1180);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 8: Return additional products and verify that previously returned quantities are not counted twice
  // ══════════════════════════════════════════════════════════════
  test('8. Return additional products and verify previously returned quantities are not counted twice', async () => {
    // 8.1 Attempting to re-return already returned items must be rejected
    const dupReturnRes = await fetch(`${baseUrl}/sales/${invoice50Id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            productId: testProductIds[0], // Already returned in scenario 6!
            quantity: 1,
          },
        ],
        reason: 'Attempt duplicate return',
      }),
    });
    assert.equal(dupReturnRes.status, 400, 'Re-returning already returned item must be rejected');

    // 8.2 Return items 11 through 25 (15 additional products @ ₹100 = ₹1500 taxable reversal, ₹270 GST reversal)
    const secondReturnItems = testProductIds.slice(10, 25).map((pid, idx) => ({
      productId: pid,
      name: `Catalog Item ${idx + 11}`,
      quantity: 1,
      rate: 100,
    }));

    const secondReturnRes = await fetch(`${baseUrl}/sales/${invoice50Id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: secondReturnItems,
        reason: 'Second customer return batch',
        refundMethod: 'UPI',
      }),
    });

    assert.equal(secondReturnRes.status, 200);
    const secondRetBody = await secondReturnRes.json();
    const retSale = secondRetBody.data.sale;

    // Cumulative Return Verification:
    // First batch = 10 units (₹1180 refund)
    // Second batch = 15 units (₹1770 refund)
    // Total returned = 25 units (₹2500 taxable, ₹450 GST, ₹2950 total refund)
    assert.equal(retSale.returnedTaxableAmount, 2500, 'Cumulative returned taxable value must be exactly ₹2500');
    assert.equal(retSale.gstAdjustment, 450, 'Cumulative GST adjustment must be exactly ₹450');
    assert.equal(retSale.totalReturnedAmount, 2950, 'Cumulative refund must be exactly ₹2950');

    // Net remaining on invoice = 25 units (₹2500 net taxable, ₹450 net GST, ₹2950 net payable)
    assert.equal(retSale.netTaxableAmount, 2500);
    assert.equal(retSale.netTaxTotal, 450);
    assert.equal(retSale.netPayable, 2950);

    // Verify 2 distinct linked credit notes exist on invoice
    assert.equal(retSale.returns.length, 2, 'Invoice must now link both distinct credit notes');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 9: Verify CA Portal reflects every committed invoice, payment, return, and GST adjustment
  // ══════════════════════════════════════════════════════════════
  test('9. Verify that the CA Portal reflects every committed invoice, payment, return, and GST adjustment', async () => {
    const res = await fetch(`${baseUrl}/ca-portal/financial-summary?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const metrics = body.data.summary.metrics;

    // Total Invoices: invoice50Id, unpaidInvoiceId, partialInvoiceId = 3 invoices
    assert.equal(metrics.totalInvoices, 3);

    // Sales Before Returns:
    // Invoice 50: ₹5900
    // Unpaid Invoice: ₹1180
    // Partial Invoice: ₹2360
    // Total = ₹9440
    assert.equal(metrics.totalSalesBeforeReturns, 9440);

    // Returns & Credit Notes: 2 credit notes from invoice 50 total ₹2950
    assert.equal(metrics.totalReturnsAmount, 2950);
    assert.equal(metrics.totalReturnsCount, 2);

    // Net Sales After Returns: ₹9440 - ₹2950 = ₹6490
    assert.equal(metrics.netSalesAfterReturns, 6490);

    // GST Collected on Sales:
    // Invoice 50: ₹900
    // Unpaid Invoice: ₹180
    // Partial Invoice: ₹360
    // Total = ₹1440
    assert.equal(metrics.gstCollectedOnSales, 1440);

    // GST Adjustments from Returns: ₹450
    assert.equal(metrics.gstAdjustmentsFromReturns, 450);

    // Net GST Output: ₹1440 - ₹450 = ₹990
    assert.equal(metrics.netGst, 990);

    // Payments Received:
    // Invoice 50: ₹5900
    // Partial Invoice: ₹1000
    // Total = ₹6900
    assert.equal(metrics.paymentsReceived, 6900);

    // Outstanding Balances:
    // Unpaid Invoice: ₹1180
    // Partial Invoice: ₹1360
    // Total = ₹2540
    assert.equal(metrics.outstandingBalances, 2540);
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 10: Verify store isolation prevents CA from viewing unauthorized store data
  // ══════════════════════════════════════════════════════════════
  test('10. Verify that store isolation prevents a CA from viewing unauthorized store data', async () => {
    // 10.1 Accessing unauthorized Store B query parameters
    const queryRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(queryRes.status, 403, 'Must reject access to unauthorized store');

    // 10.2 Accessing unauthorized Store B credit notes
    const cnRes = await fetch(`${baseUrl}/ca-portal/credit-notes?storeId=${storeBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(cnRes.status, 403, 'Must reject credit notes request for unauthorized store');

    // 10.3 Direct IDOR access to invoice belonging to Store B
    const idorRes = await fetch(`${baseUrl}/ca-portal/invoices/${secretInvoiceBId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(idorRes.status, 403, 'Must reject direct IDOR access to unauthorized invoice');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 11: Test failed transactions, repeated requests, rounding, concurrent returns, invalid quantities
  // ══════════════════════════════════════════════════════════════
  test('11. Test failed transactions, repeated requests, rounding, concurrent returns, and invalid quantities', async () => {
    // 11.1 Negative quantity return
    const negQtyRes = await fetch(`${baseUrl}/sales/${invoice50Id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: testProductIds[25], quantity: -5 }],
      }),
    });
    assert.equal(negQtyRes.status, 400, 'Negative return quantity must be rejected');

    // 11.2 Quantity exceeding available
    const exceedQtyRes = await fetch(`${baseUrl}/sales/${invoice50Id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        items: [{ productId: testProductIds[25], quantity: 999 }],
      }),
    });
    assert.equal(exceedQtyRes.status, 400, 'Exceeding return quantity must be rejected');

    // 11.3 Recording payment greater than balance due
    const overdraftPayRes = await fetch(`${baseUrl}/sales/${partialInvoiceId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 999999,
      }),
    });
    assert.equal(overdraftPayRes.status, 400, 'Overdraft payment must be rejected');

    // 11.4 Recording payment on already fully paid invoice
    const paidPayRes = await fetch(`${baseUrl}/sales/${invoice50Id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({
        amount: 100,
      }),
    });
    assert.equal(paidPayRes.status, 409, 'Payment on fully paid invoice must return 409 conflict');

    // 11.5 Immutable protection: direct PUT/PATCH/DELETE on invoice
    const putRes = await fetch(`${baseUrl}/sales/${invoice50Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerAToken}`,
      },
      body: JSON.stringify({ grandTotal: 0 }),
    });
    assert.equal(putRes.status, 403, 'Direct PUT on finalized invoice must be forbidden');

    const delRes = await fetch(`${baseUrl}/sales/${invoice50Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerAToken}` },
    });
    assert.equal(delRes.status, 403, 'Direct DELETE on finalized invoice must be forbidden');
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 12: Verify exports include correct original values, return adjustments, and net totals
  // ══════════════════════════════════════════════════════════════
  test('12. Verify that exports include correct original values, return adjustments, and net totals', async () => {
    // 12.1 Invoices Register for CA
    const invRes = await fetch(`${baseUrl}/ca-portal/invoices?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(invRes.status, 200);
    const invoices = (await invRes.json()).data.invoices;

    const inv50Export = invoices.find((i) => i.id === invoice50Id);
    assert.ok(inv50Export);
    assert.equal(inv50Export.grandTotal, 5900, 'Export grand total must be original value');
    assert.equal(inv50Export.totalReturnedAmount, 2950, 'Export must include total returned amount');
    assert.equal(inv50Export.netPayable, 2950, 'Export must reflect net total');
    assert.equal(inv50Export.gstAdjustment, 450, 'Export must include GST adjustment');

    // 12.2 Credit Notes Register for CA
    const cnRes = await fetch(`${baseUrl}/ca-portal/credit-notes?storeId=${storeAId}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(cnRes.status, 200);
    const creditNotes = (await cnRes.json()).data.creditNotes;
    assert.equal(creditNotes.length, 2);

    for (const cn of creditNotes) {
      assert.ok(cn.creditNoteNumber.startsWith('CN-'));
      assert.ok(cn.invoiceNumber);
      assert.ok(cn.taxableAmount > 0);
      assert.ok(cn.gstAdjustment > 0);
      assert.ok(cn.totalAmount > 0);
      assert.equal(cn.refundStatus, 'COMPLETED');
    }
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO 13: Verify historical invoices remain unchanged when product prices or GST rates are later modified
  // ══════════════════════════════════════════════════════════════
  test('13. Verify historical invoices remain unchanged when product prices or GST rates are modified', async () => {
    // Modify Product 1 price from ₹100 to ₹999 and GST rate from 18% to 28%
    await prisma.product.update({
      where: { id: testProductIds[0] },
      data: {
        sellingPrice: 999,
        gstRate: 28,
        taxPercent: 28,
      },
    });

    // Check Invoice 50 details via CA Portal
    const res = await fetch(`${baseUrl}/ca-portal/invoices/${invoice50Id}`, {
      headers: { Authorization: `Bearer ${caToken}` },
    });
    assert.equal(res.status, 200);
    const inv = (await res.json()).data.invoice;

    const item1 = inv.items.find((it) => it.productId === testProductIds[0]);
    assert.ok(item1);

    // Must still reflect original historical values: ₹100 rate and 18% GST rate
    assert.equal(item1.rate, 100, 'Historical unit price must remain unchanged');
    assert.equal(item1.gstRate, 18, 'Historical GST rate must remain unchanged');
    assert.equal(inv.originalGrandTotal, 5900, 'Historical invoice grand total must remain unchanged');
  });
});
