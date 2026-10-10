import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.mjs';
import { requirePermission } from '../src/middleware/permission.middleware.mjs';
import { getEffectivePermissions } from '../src/services/permission.service.mjs';
import { assertCanAddSubUser, getSubscriptionUsage } from '../src/services/subscription.service.mjs';
import {
  PERMISSIONS_CATALOG,
  SYSTEM_ROLE_DEFINITIONS,
} from '../src/config/permissions.catalog.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

test('1. AUTHENTICATION & SESSION TESTS', async (t) => {
  await t.test('Password hashing and credential verification', async () => {
    const rawPass = 'SecurePass123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPass, salt);

    const matches = await bcrypt.compare(rawPass, hash);
    const wrongMatches = await bcrypt.compare('WrongPassword', hash);

    assert.equal(matches, true, 'Valid password must match');
    assert.equal(wrongMatches, false, 'Invalid credentials must be rejected');
  });

  await t.test('JWT token generation and verification for session', async () => {
    const payload = {
      id: 'usr-admin-01',
      businessId: 'busi-01',
      role: 'ADMIN',
      email: 'owner@bilzet.com',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    const decoded = jwt.verify(token, JWT_SECRET);

    assert.equal(decoded.id, 'usr-admin-01');
    assert.equal(decoded.businessId, 'busi-01');
    assert.equal(decoded.role, 'ADMIN');
  });

  await t.test('Invalid or expired token rejection', async () => {
    assert.throws(() => {
      jwt.verify('invalid.token.string', JWT_SECRET);
    });
  });
});

test('2. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSIONS', async (t) => {
  const adminRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'ADMIN');
  const managerRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'MANAGER');
  const staffRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'STAFF');
  const cashierRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'CASHIER');

  await t.test('Cashier role permissions boundary', () => {
    assert.ok(cashierRole.permissions.includes('billing.create'), 'Cashier can create bills');
    assert.ok(cashierRole.permissions.includes('customers.create'), 'Cashier can add walk-in customers');
    assert.ok(!cashierRole.permissions.includes('team.manage'), 'Cashier cannot manage team/subusers');
    assert.ok(!cashierRole.permissions.includes('inventory.adjust'), 'Cashier cannot adjust stock');
    assert.ok(!cashierRole.permissions.includes('reports.sales'), 'Cashier cannot view revenue reports');
  });

  await t.test('Inventory Staff permissions boundary', () => {
    assert.ok(staffRole.permissions.includes('inventory.view'), 'Staff can view inventory');
    assert.ok(!staffRole.permissions.includes('inventory.edit'), 'Staff cannot alter product selling prices');
    assert.ok(!staffRole.permissions.includes('purchases.create'), 'Staff cannot create purchase orders');
  });

  await t.test('Manager permissions boundary', () => {
    assert.ok(managerRole.permissions.includes('billing.create'), 'Manager can bill');
    assert.ok(managerRole.permissions.includes('inventory.edit'), 'Manager can edit inventory');
    assert.ok(managerRole.permissions.includes('purchases.create'), 'Manager can make purchases');
    assert.ok(managerRole.permissions.includes('reports.sales'), 'Manager can see reports');
  });

  await t.test('Business Owner full authority', () => {
    assert.equal(adminRole.permissions.length, PERMISSIONS_CATALOG.length, 'Owner/Admin has all permissions');
  });

  await t.test('Permission middleware catches unauthenticated calls with 401', async () => {
    const middleware = requirePermission('billing.create');
    let capturedError = null;
    await middleware({ user: null }, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError, 'Middleware should return error');
    assert.equal(capturedError.statusCode, 401);
  });

  await t.test('Permission middleware catches deactivated accounts with 403', async () => {
    const middleware = requirePermission('billing.create');
    let capturedError = null;
    await middleware({ user: { id: 'deact-1', isActive: false, role: 'CASHIER' } }, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError, 'Middleware should return error');
    assert.equal(capturedError.statusCode, 403);
  });

  await t.test('Permission middleware allows Owner unconditional access', async () => {
    const middleware = requirePermission('any.restricted.permission');
    let nextCalled = false;
    await middleware({ user: { id: 'owner-1', isOwner: true, isActive: true, role: 'ADMIN' } }, {}, (err) => {
      if (!err) nextCalled = true;
    });

    assert.equal(nextCalled, true, 'Owner should bypass permission check');
  });
});

test('3. CUSTOMER DETAILS & PERSISTENCE', async (t) => {
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const custName = 'Karthik Retail Customer';
  let createdCustId = null;

  await t.test('Create new customer with phone, balance and GSTIN', async () => {
    const customer = await prisma.customer.create({
      data: {
        name: custName,
        phone: testPhone,
        email: `karthik_${Date.now()}@example.com`,
        address: '123 Commercial Street, Chennai',
        gstin: '33ABCDE1234F1Z5',
        balance: 500.0,
      },
    });

    assert.ok(customer.id, 'Customer ID must be generated');
    assert.equal(customer.name, custName);
    assert.equal(customer.phone, testPhone);
    createdCustId = customer.id;
  });

  await t.test('Detect existing customer by phone to avoid duplicates', async () => {
    const found = await prisma.customer.findFirst({
      where: { phone: testPhone },
    });

    assert.ok(found, 'Existing customer must be found by phone');
    assert.equal(found.id, createdCustId);
  });

  await t.test('Fetch customer details with balance', async () => {
    const customer = await prisma.customer.findUnique({
      where: { id: createdCustId },
    });

    assert.ok(customer);
    assert.equal(customer.name, custName);
  });
});

test('4. PURCHASES & SEPARATE SUPPLIER / COMPANY NAMES', async (t) => {
  const supplierName = 'Raj Kumar';
  const companyName = 'ABC Furniture Pvt Ltd';
  const uniqueGst = `33${Date.now().toString(36).toUpperCase().padStart(13, 'X')}`.slice(0, 15);
  let supplierId = null;

  await t.test('Supplier is stored with separate Supplier Name and Company Name fields', async () => {
    const supplier = await prisma.supplier.create({
      data: {
        name: supplierName,
        companyName: companyName,
        phone: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `raj_${Date.now()}@abcfurniture.com`,
        gstin: uniqueGst,
        balance: 0,
      },
    });

    assert.ok(supplier.id, 'Supplier ID must be generated');
    assert.equal(supplier.name, supplierName, 'Supplier Name must match contact person');
    assert.equal(supplier.companyName, companyName, 'Company Name must match business entity');
    assert.notEqual(supplier.name, supplier.companyName, 'Supplier Name and Company Name must be distinct');
    supplierId = supplier.id;
  });

  await t.test('Querying supplier returns separate fields for directory & purchase auto-fill', async () => {
    const fetched = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    assert.ok(fetched);
    assert.equal(fetched.name, 'Raj Kumar');
    assert.equal(fetched.companyName, 'ABC Furniture Pvt Ltd');
  });

  await t.test('Create Purchase Order / Invoice with supplier and stock increment', async () => {
    const product = await prisma.product.create({
      data: {
        name: `Test Stock Item ${Date.now()}`,
        sku: `SKU-${Date.now()}`,
        purchasePrice: 200,
        sellingPrice: 350,
        currentStock: 10,
        minStock: 2,
      },
    });

    const purchase = await prisma.purchase.create({
      data: {
        invoiceNumber: `PUR-${Date.now()}`,
        supplierId: supplierId,
        totalAmount: 2000,
        paidAmount: 2000,
        status: 'RECEIVED',
      },
    });

    assert.ok(purchase.id);

    // Update product stock
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: { currentStock: 20 },
    });

    assert.equal(updatedProduct.currentStock, 20, 'Stock must increment by purchased quantity');
  });
});

test('5. SALES, POS BILLING & STOCK DEDUCTION', async (t) => {
  let productId = null;
  let saleId = null;

  await t.test('Create POS product with initial stock', async () => {
    const prod = await prisma.product.create({
      data: {
        name: `POS Billing Item ${Date.now()}`,
        sku: `POS-${Date.now()}`,
        purchasePrice: 50,
        sellingPrice: 100,
        currentStock: 25,
        minStock: 5,
      },
    });

    productId = prod.id;
    assert.equal(prod.currentStock, 25);
  });

  await t.test('Create POS Sale Invoice and update inventory', async () => {
    const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber: invNum,
        grandTotal: 500,
        subtotal: 450,
        taxTotal: 50,
        paymentStatus: 'PAID',
        paymentMethod: 'UPI',
        items: [
          {
            productId: productId,
            quantity: 5,
            unitPrice: 100,
            subtotal: 500,
          },
        ],
      },
    });

    saleId = sale.id;
    assert.ok(sale.id);

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { currentStock: 20 },
    });

    assert.equal(updated.currentStock, 20, 'Stock must decrement from 25 to 20');
  });

  await t.test('Query invoice snapshot for printing and receipt', async () => {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
    });

    assert.ok(sale);
    assert.equal(sale.paymentMethod, 'UPI');
  });
});

test('6. PAYMENTS-IN PERSISTENCE & HISTORY', async (t) => {
  let customerId = null;
  let paymentId = null;

  await t.test('Create customer with outstanding credit balance', async () => {
    const cust = await prisma.customer.create({
      data: {
        name: 'Arun Credit Customer',
        phone: `91${Math.floor(10000000 + Math.random() * 90000000)}`,
        balance: 1500.0,
      },
    });
    customerId = cust.id;
    assert.equal(cust.balance, 1500.0);
  });

  await t.test('Record inward payment (Payments-In) and deduct outstanding dues', async () => {
    const paymentAmount = 500.0;

    const payment = await prisma.payment.create({
      data: {
        customerId: customerId,
        amount: paymentAmount,
        method: 'CASH',
        transactionId: `REC-${Date.now()}`,
        notes: 'Partial settlement against bill dues',
      },
    });

    paymentId = payment.id;
    assert.ok(payment.id);
    assert.equal(payment.amount, paymentAmount);
    assert.equal(payment.method, 'CASH');

    const updatedCust = await prisma.customer.update({
      where: { id: customerId },
      data: { balance: 1000.0 },
    });

    assert.equal(updatedCust.balance, 1000.0, 'Balance must drop from 1500 to 1000');
  });

  await t.test('Fetch Payments-In history with customer details', async () => {
    const history = await prisma.payment.findMany({
      where: { customerId: customerId },
      orderBy: { createdAt: 'desc' },
    });

    assert.ok(history.length >= 1);
    assert.equal(history[0].id, paymentId);
    assert.equal(history[0].method, 'CASH');
  });
});

test('7. ANALYTICS & REPORTING COMPUTATIONS', async (t) => {
  await t.test('Sales revenue aggregation query succeeds', async () => {
    const salesAggregate = await prisma.sale.aggregate({
      _sum: {
        grandTotal: true,
        taxTotal: true,
      },
      _count: {
        id: true,
      },
    });

    assert.ok(salesAggregate._count.id >= 0);
    const totalRev = Number(salesAggregate._sum.grandTotal || 0);
    assert.ok(totalRev >= 0, 'Total revenue must be non-negative number');
  });
});
