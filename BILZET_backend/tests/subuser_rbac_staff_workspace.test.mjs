import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERMISSIONS_CATALOG,
  SYSTEM_ROLE_DEFINITIONS,
} from '../src/config/permissions.catalog.mjs';
import { getEffectivePermissions } from '../src/services/permission.service.mjs';

test('1. RBAC Roles Verification: Admin, Manager, Staff, Cashier', () => {
  const roleCodes = SYSTEM_ROLE_DEFINITIONS.map((r) => r.code);

  assert.ok(roleCodes.includes('ADMIN'), 'ADMIN role must exist');
  assert.ok(roleCodes.includes('MANAGER'), 'MANAGER role must exist');
  assert.ok(roleCodes.includes('STAFF'), 'STAFF role must exist');
  assert.ok(roleCodes.includes('CASHIER'), 'CASHIER role must exist');

  const adminRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'ADMIN');
  const managerRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'MANAGER');
  const staffRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'STAFF');
  const cashierRole = SYSTEM_ROLE_DEFINITIONS.find((r) => r.code === 'CASHIER');

  // Admin has complete access
  assert.equal(adminRole.permissions.length, PERMISSIONS_CATALOG.length);

  // Manager has broad operations
  assert.ok(managerRole.permissions.includes('billing.create'));
  assert.ok(managerRole.permissions.includes('inventory.edit'));
  assert.ok(managerRole.permissions.includes('purchases.create'));
  assert.ok(managerRole.permissions.includes('reports.sales'));

  // Staff has billing POS, inventory view, delivery challans
  assert.ok(staffRole.permissions.includes('billing.create'));
  assert.ok(staffRole.permissions.includes('billing.print'));
  assert.ok(staffRole.permissions.includes('inventory.view'));
  assert.ok(!staffRole.permissions.includes('inventory.edit'), 'Staff cannot edit inventory prices');
  assert.ok(!staffRole.permissions.includes('purchases.create'), 'Staff cannot create purchase orders');

  // Cashier has billing POS and counter customer creation
  assert.ok(cashierRole.permissions.includes('billing.create'));
  assert.ok(cashierRole.permissions.includes('billing.print'));
  assert.ok(cashierRole.permissions.includes('customers.create'));
  assert.ok(!cashierRole.permissions.includes('reports.sales'), 'Cashier cannot view revenue reports');
});

test('2. Permission Structure: Supports View, Create, Edit, Delete, Print, Export', () => {
  const actions = new Set(PERMISSIONS_CATALOG.map((p) => p.action));

  assert.ok(actions.has('view'), 'Catalog supports view');
  assert.ok(actions.has('create'), 'Catalog supports create');
  assert.ok(actions.has('edit'), 'Catalog supports edit');
  assert.ok(actions.has('delete'), 'Catalog supports delete');
  assert.ok(actions.has('print'), 'Catalog supports print');
  assert.ok(actions.has('export'), 'Catalog supports export');
});

test('3. Extensibility: Future Roles can be defined and plugged in', () => {
  const customRole = {
    code: 'SENIOR_AUDITOR',
    name: 'Senior Financial Auditor',
    permissions: ['billing.view', 'billing.export', 'reports.view', 'reports.export', 'gst.view', 'gst.export'],
  };

  assert.ok(customRole.permissions.every((k) => PERMISSIONS_CATALOG.some((p) => p.key === k)));
});
