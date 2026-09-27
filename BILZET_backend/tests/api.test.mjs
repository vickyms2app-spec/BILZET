import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.mjs';
import { connectDB, disconnectDB } from '../src/config/db.mjs';
import { Product } from '../src/models/Product.mjs';
import { Customer } from '../src/models/Customer.mjs';
import { Sale } from '../src/models/Sale.mjs';
import { Payment } from '../src/models/Payment.mjs';
import { withTransaction } from '../src/utils/transaction.mjs';

let server;
let baseUrl;
let adminToken;
let managerToken;
let cashierToken;
let testCategoryId;
let testProductId;
let testCustomerId;
let testSupplierId;
let createdSaleId;

const runId = Date.now();

before(async () => {
  await connectDB();

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
  await disconnectDB();
});

describe('1. Health Check & Diagnostics', () => {
  test('GET /health returns 200 and connected status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.database, 'connected');
  });
});

describe('2. Authentication & Authorization', () => {
  test('POST /auth/login with Admin credentials succeeds', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@shop.com',
        password: 'Admin@12345'
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.accessToken);
    assert.equal(body.data.user.role, 'ADMIN');
    adminToken = body.data.accessToken;
  });

  test('POST /auth/login with Manager credentials succeeds', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@shop.com',
        password: 'Manager@12345'
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    managerToken = body.data.accessToken;
  });

  test('POST /auth/login with Cashier credentials succeeds', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cashier@shop.com',
        password: 'Cashier@12345'
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    cashierToken = body.data.accessToken;
  });

  test('GET /auth/me returns current authenticated user profile', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.email, 'admin@shop.com');
  });

  test('Reject unauthorized access without token', async () => {
    const res = await fetch(`${baseUrl}/products`);
    assert.equal(res.status, 401);
  });

  test('Role Authorization: Cashier cannot access user management', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert.equal(res.status, 403);
  });
});

describe('3. Category & Product Management', () => {
  test('POST /categories creates a new category', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Test Cat ${runId}`,
        description: 'Test category'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    testCategoryId = body.data.category._id;
    assert.ok(testCategoryId);
  });

  test('POST /products creates product with stock and initial transaction', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Coffee Roast ${runId}`,
        sku: `SKU-${runId}`,
        category: testCategoryId,
        brand: 'Blue Tokai',
        unit: 'packet',
        purchasePrice: 300,
        sellingPrice: 450,
        gstRate: 5,
        stock: 25,
        minimumStock: 5
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    testProductId = body.data.product._id;
    assert.equal(body.data.product.stock, 25);
  });

  test('GET /products searches by keyword', async () => {
    const res = await fetch(`${baseUrl}/products?search=${runId}`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.products.length >= 1);
  });

  test('GET /products/:id/barcode returns barcode PNG image', async () => {
    const res = await fetch(`${baseUrl}/products/${testProductId}/barcode`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/png');
  });
});

describe('4. Customer & Supplier Management', () => {
  test('POST /customers creates a customer with credit limit', async () => {
    const res = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        name: `Customer ${runId}`,
        phone: `9${String(runId).slice(-9)}`,
        email: `cust${runId}@test.com`,
        address: '5th Main, Koramangala',
        creditLimit: 3000
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    testCustomerId = body.data.customer._id;
  });

  test('POST /suppliers creates a new supplier', async () => {
    const res = await fetch(`${baseUrl}/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: `Supplier ${runId}`,
        phone: `8${String(runId).slice(-9)}`,
        email: `sup${runId}@test.com`
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    testSupplierId = body.data.supplier._id;
  });
});

describe('5. Purchase Order Workflow (Stock Increase)', () => {
  test('POST /purchases increases product stock and records stock transaction', async () => {
    const initialProduct = await Product.findById(testProductId);
    const initialStock = initialProduct.stock;

    const res = await fetch(`${baseUrl}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        supplier: testSupplierId,
        items: [
          {
            productId: testProductId,
            quantity: 10,
            purchasePrice: 300,
            gstRate: 5
          }
        ],
        paidAmount: 2000
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.data.purchase.purchaseNumber);

    const updatedProduct = await Product.findById(testProductId);
    assert.equal(updatedProduct.stock, initialStock + 10);
  });
});

describe('6. Sales / Billing Workflow (Server-Side Calculations & Consistency)', () => {
  test('POST /sales rejects request when requested quantity exceeds available stock', async () => {
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        items: [
          {
            productId: testProductId,
            quantity: 99999
          }
        ],
        paymentMethod: 'cash',
        paidAmount: 500
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.message.includes('Insufficient stock'));
  });

  test('POST /sales successfully creates sale, decrements stock, updates customer credit', async () => {
    const initialProduct = await Product.findById(testProductId);
    const initialStock = initialProduct.stock;

    // Unit price is 450, qty: 2. GST 5% = 45. Total = 945.
    // Customer pays 500 cash, remaining 445 on credit.
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        items: [
          {
            productId: testProductId,
            quantity: 2
          }
        ],
        discount: 0,
        paymentMethod: 'cash',
        paidAmount: 500
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);

    const sale = body.data.sale;
    createdSaleId = sale._id;
    assert.ok(sale.invoiceNumber.startsWith('INV-'));
    assert.equal(sale.items[0].quantity, 2);
    assert.equal(sale.paidAmount, 500);
    assert.equal(sale.dueAmount, 445);
    assert.equal(sale.paymentStatus, 'PARTIAL');

    // Verify Stock decreased by 2
    const updatedProduct = await Product.findById(testProductId);
    assert.equal(updatedProduct.stock, initialStock - 2);

    // Verify Customer credit increased by due amount (445)
    const updatedCustomer = await Customer.findById(testCustomerId);
    assert.equal(updatedCustomer.currentCredit, 445);
  });
});

describe('7. Payment Collection & Credit Settlement', () => {
  test('POST /payments collects outstanding customer credit', async () => {
    const res = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        amount: 200,
        method: 'upi',
        referenceNumber: 'UPI99228811'
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.remainingCredit, 245);

    const customer = await Customer.findById(testCustomerId);
    assert.equal(customer.currentCredit, 245);
  });
});

describe('8. Sales Return Workflow', () => {
  test('POST /sales/:id/return restores product stock and processes return refund', async () => {
    const initialProduct = await Product.findById(testProductId);
    const initialStock = initialProduct.stock;

    const res = await fetch(`${baseUrl}/sales/${createdSaleId}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        items: [
          {
            productId: testProductId,
            quantity: 1
          }
        ],
        refundMethod: 'cash',
        reason: 'Customer changed mind'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.sale.status, 'PARTIALLY_RETURNED');

    // Verify stock restored by 1
    const updatedProduct = await Product.findById(testProductId);
    assert.equal(updatedProduct.stock, initialStock + 1);
  });
});

describe('9. Invoices & Reports', () => {
  test('GET /invoices/:saleId/pdf generates downloadable A4 PDF invoice', async () => {
    const res = await fetch(`${baseUrl}/invoices/${createdSaleId}/pdf`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 500);
  });

  test('GET /reports/sales returns sales analytics metrics', async () => {
    const res = await fetch(`${baseUrl}/reports/sales`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.summary.totalBills >= 1);
  });

  test('GET /reports/profit computes gross and net profit', async () => {
    const res = await fetch(`${baseUrl}/reports/profit`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('grossProfit' in body.data);
    assert.ok('netProfit' in body.data);
  });

  test('GET /reports/sales/export downloads formatted Excel (.xlsx) file', async () => {
    const res = await fetch(`${baseUrl}/reports/sales/export`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get('content-type'),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
  });
});

describe('10. Dashboard Analytics', () => {
  test('GET /dashboard returns KPIs, top selling products, and chart datasets', async () => {
    const res = await fetch(`${baseUrl}/dashboard`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok('todaySales' in body.data);
    assert.ok('totalProducts' in body.data);
    assert.ok('salesByDay' in body.data);
    assert.ok('topSellingProducts' in body.data);
  });
});

describe('11. Data Consistency & Transaction Integrity', () => {
  test('Failed transaction does not corrupt stock or customer balance', async () => {
    const initialProduct = await Product.findById(testProductId);
    const initialStock = initialProduct.stock;
    const initialCustomer = await Customer.findById(testCustomerId);
    const initialCredit = initialCustomer.currentCredit;

    // Simulate an invalid credit sale (exceeding customer credit limit by huge margin)
    const res = await fetch(`${baseUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        items: [
          {
            productId: testProductId,
            quantity: 20 // 20 * 450 = 9000 >> customer credit limit of 3000
          }
        ],
        paymentMethod: 'credit',
        paidAmount: 0 // entire 9000+ is due
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.message.includes('exceeds customer credit limit'));

    // Assert that stock remained unchanged
    const afterProduct = await Product.findById(testProductId);
    assert.equal(afterProduct.stock, initialStock);

    // Assert that customer credit remained unchanged
    const afterCustomer = await Customer.findById(testCustomerId);
    assert.equal(afterCustomer.currentCredit, initialCredit);
  });
});
