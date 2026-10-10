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

describe('PHASE 6: Product Catalog & Category Index Full Lifecycle', () => {
  const adminId = 'admin-01';
  const businessId = 'busi-01';
  let token;
  let createdCategoryId = null;
  let createdProductId = null;
  let tempEmptyCategoryId = null;

  before(async () => {
    token = generateToken({
      userId: adminId,
      id: adminId,
      email: 'admin@bilzet.com',
      role: 'ADMIN',
      appRole: 'ADMIN',
      businessId,
    });
  });

  test('1. Category Create: Should successfully create a new category', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Office Furniture',
        description: 'Chairs, desks, and office furnishing equipment',
        isActive: true,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.category.name, 'Office Furniture');
    createdCategoryId = body.data.category.id || body.data.category._id;
    assert.ok(createdCategoryId);
  });

  test('2. Category Conflict: Should reject duplicate category name in same store', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Office Furniture',
        description: 'Duplicate name attempt',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 409);
    assert.match(body.message, /already exists/i);
  });

  test('3. Category Edit: Should rename category and update description', async () => {
    const res = await fetch(`${baseUrl}/categories/${createdCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Office Chairs',
        description: 'Ergonomic seating and executive chairs',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.category.name, 'Office Chairs');
  });

  test('4. Product Creation & Category Assignment: Should create product with opening stock 25 assigned to category', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Ergonomic Mesh Chair',
        sku: 'EMC-PH6',
        barcode: '8901234999991',
        categoryId: createdCategoryId,
        sellingPrice: 4500,
        purchasePrice: 2800,
        stock: 25,
        minimumStock: 5,
        unit: 'piece',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.product.name, 'Ergonomic Mesh Chair');
    assert.equal(body.data.product.stock, 25);
    assert.equal(body.data.product.categoryId, createdCategoryId);
    createdProductId = body.data.product.id || body.data.product._id;
    assert.ok(createdProductId);
  });

  test('5. Stock Overview Sync: Product must automatically appear in Stock Overview with stock 25', async () => {
    const res = await fetch(`${baseUrl}/inventory`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    const list = body.data?.inventory || [];
    const item = list.find((p) => (p.id || p._id) === createdProductId || p.sku === 'EMC-PH6');
    assert.ok(item, 'Product must appear in Stock Overview');
    assert.equal(item.currentStock, 25);
    assert.equal(item.stock, 25);
  });

  test('6. Stock Adjustment Sync: Adjusting stock in Stock Overview updates Product Catalog stock', async () => {
    // Perform stock adjustment (+10 units)
    const adjustRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: createdProductId,
        type: 'ADD',
        quantity: 10,
        reason: 'Restocking shipment received',
      }),
    });

    const adjustBody = await adjustRes.json();
    assert.equal(adjustRes.status, 200);
    assert.equal(adjustBody.data.newStock, 35);

    // Verify Product Catalog directly reflects updated stock 35
    const catalogRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const catalogBody = await catalogRes.json();
    assert.equal(catalogRes.status, 200);
    assert.equal(catalogBody.data.product.stock, 35);
  });

  test('7. Category Delete Protection: Attempting to delete category containing products must fail safely', async () => {
    const res = await fetch(`${baseUrl}/categories/${createdCategoryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(
      body.message,
      'This category contains products and cannot be deleted. Reassign the products first.'
    );

    // Verify category still exists
    const checkCat = await fetch(`${baseUrl}/categories/${createdCategoryId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(checkCat.status, 200);
  });

  test('8. Category Filtering: Should filter products by categoryId without mixing', async () => {
    const res = await fetch(`${baseUrl}/products?categoryId=${createdCategoryId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    const products = body.data.products || [];
    assert.ok(products.length >= 1);
    for (const p of products) {
      assert.equal(p.categoryId, createdCategoryId);
    }
  });

  test('9. Category Delete Success: Should delete an unused category with 0 products', async () => {
    // Create empty category
    const createRes = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Temporary Unused Category',
        description: 'To test deletion of empty category',
      }),
    });

    const createBody = await createRes.json();
    assert.equal(createRes.status, 201);
    tempEmptyCategoryId = createBody.data.category.id || createBody.data.category._id;

    // Delete empty category
    const delRes = await fetch(`${baseUrl}/categories/${tempEmptyCategoryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const delBody = await delRes.json();
    assert.equal(delRes.status, 200);
    assert.equal(delBody.success, true);

    // Verify it is gone
    const checkRes = await fetch(`${baseUrl}/categories/${tempEmptyCategoryId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(checkRes.status, 404);
  });

  test('10. Category Rename Propagation: Updating category name propagates to product details', async () => {
    const renameRes = await fetch(`${baseUrl}/categories/${createdCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Executive Ergonomic Seating',
      }),
    });

    const renameBody = await renameRes.json();
    assert.equal(renameRes.status, 200);

    // Fetch product and verify category name reflects update
    const prodRes = await fetch(`${baseUrl}/products/${createdProductId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const prodBody = await prodRes.json();
    assert.equal(prodRes.status, 200);
    assert.equal(prodBody.data.product.category?.name, 'Executive Ergonomic Seating');
  });

  test('11. Category Index List: Should return category count and product count', async () => {
    const res = await fetch(`${baseUrl}/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body.data.categories));
    const currentCat = body.data.categories.find(
      (c) => (c.id || c._id) === createdCategoryId
    );
    assert.ok(currentCat);
    assert.equal(currentCat.name, 'Executive Ergonomic Seating');
    assert.ok(currentCat.productCount >= 1);
  });
});
