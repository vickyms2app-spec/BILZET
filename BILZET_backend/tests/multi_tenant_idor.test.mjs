import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/prisma.mjs';
import {
  getSales,
  getSaleById,
  returnSale,
  getMySales,
} from '../src/services/billing.service.mjs';
import { ApiError } from '../src/utils/ApiError.mjs';

test('Phase 3 Multi-Tenant Isolation & Anti-IDOR Enforcement', async (t) => {
  const tenantA_Id = 'busi-tenant-a';
  const tenantB_Id = 'busi-tenant-b';

  const userTenantA = {
    id: 'user-tenant-a-cashier',
    name: 'Cashier Tenant A',
    businessId: tenantA_Id,
    role: 'CASHIER',
  };

  const userTenantB = {
    id: 'user-tenant-b-cashier',
    name: 'Cashier Tenant B',
    businessId: tenantB_Id,
    role: 'CASHIER',
  };

  const superAdminUser = {
    id: 'super-admin-01',
    name: 'Platform Super Admin',
    businessId: null,
    role: 'SUPER_ADMIN',
  };

  // Seed sales for Tenant A and Tenant B
  const saleTenantA = await prisma.sale.create({
    data: {
      id: 'sale-tenant-a-101',
      invoiceNumber: 'INV-TENANT-A-101',
      businessId: tenantA_Id,
      createdById: userTenantA.id,
      subtotal: 500,
      taxTotal: 50,
      grandTotal: 550,
      paidAmount: 550,
      status: 'COMPLETED',
    },
  });

  const saleTenantB = await prisma.sale.create({
    data: {
      id: 'sale-tenant-b-201',
      invoiceNumber: 'INV-TENANT-B-201',
      businessId: tenantB_Id,
      createdById: userTenantB.id,
      subtotal: 900,
      taxTotal: 90,
      grandTotal: 990,
      paidAmount: 990,
      status: 'COMPLETED',
    },
  });

  await t.test('1. getSales filters by user.businessId', async () => {
    const listA = await getSales({}, userTenantA);
    const idsA = listA.sales.map((s) => s.id);
    assert.ok(idsA.includes(saleTenantA.id), 'Tenant A must see Tenant A invoice');
    assert.ok(!idsA.includes(saleTenantB.id), 'Tenant A must NOT see Tenant B invoice');

    const listB = await getSales({}, userTenantB);
    const idsB = listB.sales.map((s) => s.id);
    assert.ok(idsB.includes(saleTenantB.id), 'Tenant B must see Tenant B invoice');
    assert.ok(!idsB.includes(saleTenantA.id), 'Tenant B must NOT see Tenant A invoice');
  });

  await t.test('2. Anti-IDOR: Tenant A staff cannot fetch Tenant B invoice by ID', async () => {
    // Tenant A staff accessing Tenant B invoice must reject with 403 Forbidden
    await assert.rejects(
      async () => {
        await getSaleById(saleTenantB.id, userTenantA);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /organization|Access denied/i);
        return true;
      }
    );
  });

  await t.test('3. Anti-IDOR: Tenant B staff cannot refund Tenant A invoice', async () => {
    // Tenant B staff attempting return on Tenant A invoice must reject with 403
    await assert.rejects(
      async () => {
        await returnSale(saleTenantA.id, { reason: 'Malicious refund attempt' }, userTenantB);
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /organization|Access denied/i);
        return true;
      }
    );
  });

  await t.test('4. Legitimate access: Tenant A staff can access Tenant A invoice', async () => {
    const fetched = await getSaleById(saleTenantA.id, userTenantA);
    assert.ok(fetched);
    assert.equal(fetched.id, saleTenantA.id);
    assert.equal(fetched.invoiceNumber, 'INV-TENANT-A-101');
  });

  await t.test('5. Platform Super Admin can inspect invoices across any tenant', async () => {
    const fetchedA = await getSaleById(saleTenantA.id, superAdminUser);
    const fetchedB = await getSaleById(saleTenantB.id, superAdminUser);
    assert.equal(fetchedA.id, saleTenantA.id);
    assert.equal(fetchedB.id, saleTenantB.id);
  });

  await t.test('6. getMySales filters by user.businessId in addition to user.id', async () => {
    const mySales = await getMySales(userTenantA.id, {}, userTenantA);
    const ids = mySales.sales.map((s) => s.id);
    assert.ok(ids.includes(saleTenantA.id));
    assert.ok(!ids.includes(saleTenantB.id));
  });

  // Cleanup
  await prisma.sale.deleteMany({
    where: {
      id: { in: [saleTenantA.id, saleTenantB.id] },
    },
  });
});
