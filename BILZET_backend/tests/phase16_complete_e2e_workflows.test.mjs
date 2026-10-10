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

describe('PHASE 16: COMPREHENSIVE END-TO-END WORKFLOWS & REGRESSION VALIDATION', () => {
  const storeAId = 'biz-p16-storeA';
  const storeAOwnerId = 'user-p16-ownerA';
  const storeBId = 'biz-p16-storeB';
  const storeBOwnerId = 'user-p16-ownerB';

  let storeAToken;
  let storeBToken;

  before(async () => {
    // 1. Setup Store A (Initially Free)
    await prisma.business.create({
      data: {
        id: storeAId,
        name: 'Store A Flagship Retail',
        ownerId: storeAOwnerId,
        email: 'storeA@bilzet.test',
        phone: '+91 9000011111',
        address: '100 North Road, Chennai',
        gstin: '33AAAAA9999A1Z1',
      },
    });
    await prisma.user.create({
      data: {
        id: storeAOwnerId,
        name: 'Store A Merchant',
        email: 'merchantA@bilzet.test',
        role: 'ADMIN',
        businessId: storeAId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p16-storeA',
        userId: storeAOwnerId,
        businessId: storeAId,
        planTier: 'FREE',
        planName: 'Free Starter',
        status: 'ACTIVE',
      },
    });

    // 2. Setup Store B (Pro)
    await prisma.business.create({
      data: {
        id: storeBId,
        name: 'Store B Branch Godown',
        ownerId: storeBOwnerId,
        email: 'storeB@bilzet.test',
        phone: '+91 9000022222',
        address: '200 South Road, Bengaluru',
        gstin: '29BBBBB8888B1Z2',
      },
    });
    await prisma.user.create({
      data: {
        id: storeBOwnerId,
        name: 'Store B Merchant',
        email: 'merchantB@bilzet.test',
        role: 'ADMIN',
        businessId: storeBId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p16-storeB',
        userId: storeBOwnerId,
        businessId: storeBId,
        planTier: 'PRO',
        planName: 'Pro Tier',
        status: 'ACTIVE',
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    storeAToken = generateToken({
      id: storeAOwnerId,
      email: 'merchantA@bilzet.test',
      role: 'ADMIN',
      businessId: storeAId,
      isOwner: true,
      isActive: true,
    });

    storeBToken = generateToken({
      id: storeBOwnerId,
      email: 'merchantB@bilzet.test',
      role: 'ADMIN',
      businessId: storeBId,
      isOwner: true,
      isActive: true,
    });
  });

  // ════════════════════════════════════════════════════════════
  // WORKFLOW A: PRODUCT AND STOCK LIFECYCLE
  // ════════════════════════════════════════════════════════════
  describe('Workflow A: Product & Stock Lifecycle', () => {
    let testCategoryId;
    let testProductId;

    test('Step 1: Create Category and assign to Store A', async () => {
      const res = await fetch(`${baseUrl}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          name: 'P16 Hardware & Tools',
          description: 'Industrial tools category',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      testCategoryId = json.data.category.id;
      assert.ok(testCategoryId);
    });

    test('Step 2: Create Product with opening stock of 50 assigned to category', async () => {
      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          name: 'P16 Heavy Duty Wrench',
          sku: 'SKU-WRENCH-50',
          sellingPrice: 500,
          purchasePrice: 350,
          stock: 50,
          minimumStock: 5,
          categoryId: testCategoryId,
          unit: 'piece',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      testProductId = json.data.product.id;
      assert.equal(json.data.product.stock, 50);
    });

    test('Step 3: Stock Overview synchronization & Add Stock (+10 -> 60)', async () => {
      const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          type: 'ADD',
          quantity: 10,
          reason: 'Supplier replenishment',
        }),
      });
      assert.equal(adjustRes.status, 200);

      // Verify product stock in database
      const product = await prisma.product.findUnique({ where: { id: testProductId } });
      assert.equal(product.stock, 60, 'Stock must increase from 50 to 60');
    });

    test('Step 4: Remove Stock (-10 -> 50) and verify accuracy', async () => {
      const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          type: 'REMOVE',
          quantity: 10,
          reason: 'Damaged item write-off',
        }),
      });
      assert.equal(adjustRes.status, 200);

      const product = await prisma.product.findUnique({ where: { id: testProductId } });
      assert.equal(product.stock, 50, 'Stock must return to 50');
    });

    test('Step 5: Attempting to remove excessive stock (60 from 50) is rejected', async () => {
      const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          type: 'REMOVE',
          quantity: 60,
          reason: 'Illegal excessive reduction',
        }),
      });
      // Must be rejected with 400 Bad Request
      assert.equal(adjustRes.status, 400);

      // Stock remains exactly 50
      const product = await prisma.product.findUnique({ where: { id: testProductId } });
      assert.equal(product.stock, 50);
    });
  });

  // ════════════════════════════════════════════════════════════
  // WORKFLOW B: STOCK TRANSFERS & CONSERVATION
  // ════════════════════════════════════════════════════════════
  describe('Workflow B: Godown Stock Transfer & Conservation', () => {
    let sourceWhId;
    let destWhId;
    let transferProdId;

    before(async () => {
      // 1. Create source and destination warehouses in Store A
      const wh1 = await prisma.warehouse.create({
        data: {
          businessId: storeAId,
          name: 'Source Godown Central',
          code: 'WH-SRC-16',
          address: 'Chennai Godown 1',
        },
      });
      sourceWhId = wh1.id;

      const wh2 = await prisma.warehouse.create({
        data: {
          businessId: storeAId,
          name: 'Destination Godown North',
          code: 'WH-DST-16',
          address: 'Chennai Godown 2',
        },
      });
      destWhId = wh2.id;

      // 2. Create product with 70 units total
      const prod = await prisma.product.create({
        data: {
          businessId: storeAId,
          name: 'Transferable Copper Cable',
          sku: 'SKU-CABLE-16',
          sellingPrice: 100,
          purchasePrice: 70,
          stock: 70,
        },
      });
      transferProdId = prod.id;

      // 3. Initialize source warehouse with 50, destination with 20
      await prisma.warehouseStock.create({
        data: { warehouseId: sourceWhId, productId: transferProdId, quantity: 50 },
      });
      await prisma.warehouseStock.create({
        data: { warehouseId: destWhId, productId: transferProdId, quantity: 20 },
      });
    });

    test('Transfers 10 units: Source 50 -> 40, Destination 20 -> 30, Total conserved at 70', async () => {
      const res = await fetch(`${baseUrl}/warehouses/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          sourceWarehouseId: sourceWhId,
          destinationWarehouseId: destWhId,
          productId: transferProdId,
          quantity: 10,
          notes: 'Routine inter-godown balance',
        }),
      });
      assert.ok(res.status === 200 || res.status === 201, `Expected 200 or 201, got ${res.status}`);

      // Verify stock in source (40) and destination (30)
      const srcStock = await prisma.warehouseStock.findFirst({
        where: { warehouseId: sourceWhId, productId: transferProdId },
      });
      const dstStock = await prisma.warehouseStock.findFirst({
        where: { warehouseId: destWhId, productId: transferProdId },
      });

      assert.equal(srcStock.quantity, 40);
      assert.equal(dstStock.quantity, 30);
      assert.equal(srcStock.quantity + dstStock.quantity, 70, 'Total stock must be conserved at 70');
    });

    test('Rejects invalid stock transfer between different stores (Store A -> Store B)', async () => {
      const res = await fetch(`${baseUrl}/warehouses/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          sourceWarehouseId: sourceWhId,
          destinationWarehouseId: 'wh-nonexistent-or-storeB',
          productId: transferProdId,
          quantity: 10,
        }),
      });
      assert.equal(res.status, 404);
    });
  });

  // ════════════════════════════════════════════════════════════
  // WORKFLOW C: SALES TRANSACTION & REPORTS SYNC
  // ════════════════════════════════════════════════════════════
  describe('Workflow C: Sales Invoicing & Reports Aggregation', () => {
    let billingProdId;

    before(async () => {
      const prod = await prisma.product.create({
        data: {
          businessId: storeAId,
          name: 'Thermal Receipt Rolls',
          sku: 'SKU-ROLL-P16',
          sellingPrice: 100,
          purchasePrice: 60,
          gstRate: 18,
          stock: 100,
        },
      });
      billingProdId = prod.id;
    });

    test('Creates sale: 5 units @ 100 with 18% GST -> stock deducted to 95', async () => {
      const saleRes = await fetch(`${baseUrl}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          customerName: 'Karthi Customer',
          customerPhone: '9840199999',
          items: [
            {
              productId: billingProdId,
              quantity: 5,
              rate: 100,
              gstRate: 18,
            },
          ],
          paymentMethod: 'UPI',
          paidAmount: 590, // 500 subtotal + 90 GST
        }),
      });
      assert.equal(saleRes.status, 201);
      const json = await saleRes.json();
      const sale = json.data?.sale || json.data;
      assert.equal(sale.subtotal, 500);
      assert.equal(sale.taxTotal, 90);
      assert.equal(sale.grandTotal, 590);

      // Verify stock was decremented to 95
      const updatedProduct = await prisma.product.findUnique({ where: { id: billingProdId } });
      assert.equal(updatedProduct.stock, 95);
    });

    test('GST Report aggregates newly created sale accurately', async () => {
      const gstRes = await fetch(`${baseUrl}/reports/gst`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(gstRes.status, 200);
      const json = await gstRes.json();
      assert.ok(json.data.totalTaxable >= 500);
      assert.ok(json.data.totalGst >= 90);
      assert.equal(json.data.totalCgst, json.data.totalGst / 2);
      assert.equal(json.data.totalSgst, json.data.totalGst / 2);
    });
  });

  // ════════════════════════════════════════════════════════════
  // WORKFLOW D: STORE SWITCHING & DATA ISOLATION
  // ════════════════════════════════════════════════════════════
  describe('Workflow D: Store Switching & Multi-Tenant Isolation', () => {
    test('Store A cannot view Store B sales or reports', async () => {
      // Create a sale in Store B
      await prisma.sale.create({
        data: {
          invoiceNumber: 'INV-STOREB-EXCLUSIVE',
          businessId: storeBId,
          subtotal: 10000,
          discountTotal: 0,
          taxTotal: 1800,
          grandTotal: 11800,
          paidAmount: 11800,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          status: 'COMPLETED',
        },
      });

      // Query Store A sales
      const resA = await fetch(`${baseUrl}/sales`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(resA.status, 200);
      const jsonA = await resA.json();
      const hasStoreBSale = jsonA.data.sales.some((s) => s.invoiceNumber === 'INV-STOREB-EXCLUSIVE');
      assert.equal(hasStoreBSale, false, 'Store A must never see Store B invoices');
    });

    test('Header tampering with unauthorized x-business-id is rejected by middleware', async () => {
      const tamperRes = await fetch(`${baseUrl}/sales`, {
        headers: {
          Authorization: `Bearer ${storeAToken}`,
          'x-business-id': storeBId, // Attempt IDOR access to Store B
        },
      });
      assert.equal(tamperRes.status, 403, 'Cross-tenant IDOR attempt must be rejected');
    });
  });

  // ════════════════════════════════════════════════════════════
  // WORKFLOW E: STAFF LIFECYCLE & HISTORICAL DATA INTEGRITY
  // ════════════════════════════════════════════════════════════
  describe('Workflow E: Staff Management & Historical Integrity', () => {
    let testStaffId;

    test('Admin creates staff member and records attendance & payroll', async () => {
      const staffRes = await fetch(`${baseUrl}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          name: 'Ramesh Senior Accountant',
          email: 'ramesh.staff@bilzet.test',
          phone: '+91 9888877777',
          role: 'Accountant',
          department: 'Finance',
          salary: 30000,
        }),
      });
      assert.equal(staffRes.status, 201);
      const staffJson = await staffRes.json();
      testStaffId = staffJson.data.staff.id;

      // Mark attendance
      await prisma.staffAttendance.create({
        data: {
          staffId: testStaffId,
          businessId: storeAId,
          date: new Date(),
          status: 'PRESENT',
          hours: 8.5,
        },
      });

      // Record payroll
      await prisma.staffPayroll.create({
        data: {
          staffId: testStaffId,
          businessId: storeAId,
          month: 10,
          year: 2026,
          basicSalary: 30000,
          netSalary: 30000,
          paymentStatus: 'PAID',
        },
      });
    });

    test('Soft-deleting staff preserves attendance and payroll history in database', async () => {
      const deleteRes = await fetch(`${baseUrl}/staff/${testStaffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(deleteRes.status, 200);

      // Verify attendance and payroll records still exist
      const attendance = await prisma.staffAttendance.findFirst({
        where: { staffId: testStaffId },
      });
      assert.ok(attendance, 'Historical attendance must remain preserved');

      const payroll = await prisma.staffPayroll.findFirst({
        where: { staffId: testStaffId },
      });
      assert.ok(payroll, 'Historical payroll must remain preserved');
    });
  });

  // ════════════════════════════════════════════════════════════
  // WORKFLOW F & G: SUBSCRIPTION UPGRADE & CA CONNECT ACCESS
  // ════════════════════════════════════════════════════════════
  describe('Workflow F & G: Subscription Transitions & CA Connect Premium Access', () => {
    test('Free account: CA Connect is locked (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(res.status, 403);
    });

    test('Upgrade to PRO: CA Connect remains locked (403 Forbidden)', async () => {
      // Upgrade Store A to PRO
      const upgradeRes = await fetch(`${baseUrl}/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          planTier: 'PRO',
          billingCycle: 'ANNUAL',
          amount: 1999,
          paymentReference: 'PAY-P16-PRO-UPGRADE',
        }),
      });
      assert.equal(upgradeRes.status, 200);

      // CA Connect must remain locked for Pro users
      const caRes = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(caRes.status, 403);
    });

    test('Upgrade to PREMIUM: CA Connect is unlocked immediately (200 OK)', async () => {
      const upgradeRes = await fetch(`${baseUrl}/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${storeAToken}`,
        },
        body: JSON.stringify({
          planTier: 'PREMIUM',
          billingCycle: 'ANNUAL',
          amount: 4999,
          paymentReference: 'PAY-P16-PREM-UPGRADE',
        }),
      });
      assert.equal(upgradeRes.status, 200);

      // CA Connect must now be unlocked!
      const caRes = await fetch(`${baseUrl}/ca-connect/accountants`, {
        headers: { Authorization: `Bearer ${storeAToken}` },
      });
      assert.equal(caRes.status, 200);
      const json = await caRes.json();
      assert.ok(Array.isArray(json.data.accountants));
    });
  });
});
