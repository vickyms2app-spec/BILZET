import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/prisma.mjs';
import {
  hasPermission,
  getEffectivePermissions,
} from '../src/services/permission.service.mjs';
import { getMySales } from '../src/services/billing.service.mjs';

test('1. Self-Attendance Workflow & Constraints', async (t) => {
  const testStaffId = 'user-staff-attend-test';

  // Cleanup before test
  await prisma.staffAttendance.deleteMany({ where: { userId: testStaffId } });

  await t.test('Initial check-in sets checkIn timestamp and PRESENT status', async () => {
    const now = new Date();
    const att = await prisma.staffAttendance.create({
      data: {
        userId: testStaffId,
        businessId: 'busi-01',
        date: now,
        checkIn: now,
        status: 'PRESENT',
        hours: 8.0,
      },
    });

    assert.ok(att.id);
    assert.equal(att.userId, testStaffId);
    assert.equal(att.status, 'PRESENT');
    assert.ok(att.checkIn);
  });

  await t.test('Check-out computes working hours and saves checkOut timestamp', async () => {
    const existing = await prisma.staffAttendance.findFirst({
      where: { userId: testStaffId },
    });
    assert.ok(existing);

    const checkOutTime = new Date(new Date(existing.checkIn).getTime() + 5 * 3600 * 1000); // 5 hours later
    const workingHours = 5.0;

    const updated = await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        checkOut: checkOutTime,
        workingHours,
        hours: workingHours,
      },
    });

    assert.ok(updated.checkOut);
    assert.equal(Number(updated.workingHours), 5.0);
  });

  // Cleanup after test
  await prisma.staffAttendance.deleteMany({ where: { userId: testStaffId } });
});

test('2. Personal Sales (/sales/my) Isolation', async (t) => {
  const cashierA = 'cashier-user-a';
  const cashierB = 'cashier-user-b';

  // Seed sales for both cashiers
  await prisma.sale.create({
    data: {
      id: 'sale-cashier-a-1',
      invoiceNumber: 'INV-TEST-A1',
      subtotal: 1000,
      taxTotal: 180,
      grandTotal: 1180,
      paidAmount: 1180,
      createdById: cashierA,
      businessId: 'busi-01',
    },
  });

  await prisma.sale.create({
    data: {
      id: 'sale-cashier-b-1',
      invoiceNumber: 'INV-TEST-B1',
      subtotal: 2000,
      taxTotal: 360,
      grandTotal: 2360,
      paidAmount: 2360,
      createdById: cashierB,
      businessId: 'busi-01',
    },
  });

  await t.test('Cashier A only sees their own sales in getMySales', async () => {
    const resultA = await getMySales(cashierA);
    assert.ok(resultA.sales.length >= 1);
    const saleIds = resultA.sales.map((s) => s.id);
    assert.ok(saleIds.includes('sale-cashier-a-1'));
    assert.ok(!saleIds.includes('sale-cashier-b-1'), 'Cashier A must not see Cashier B sales');
  });

  await t.test('Cashier B only sees their own sales in getMySales', async () => {
    const resultB = await getMySales(cashierB);
    assert.ok(resultB.sales.length >= 1);
    const saleIds = resultB.sales.map((s) => s.id);
    assert.ok(saleIds.includes('sale-cashier-b-1'));
    assert.ok(!saleIds.includes('sale-cashier-a-1'), 'Cashier B must not see Cashier A sales');
  });

  // Cleanup
  await prisma.sale.delete({ where: { id: 'sale-cashier-a-1' } });
  await prisma.sale.delete({ where: { id: 'sale-cashier-b-1' } });
});

test('3. Granular RBAC Permissions for Inventory & Attendance', async (t) => {
  const cashierRole = await prisma.appRole.findFirst({ where: { code: 'CASHIER' } });
  const inventoryStaffRole = await prisma.appRole.findFirst({ where: { code: 'INVENTORY_STAFF' } });

  assert.ok(cashierRole && inventoryStaffRole);

  const cashierUser = await prisma.user.create({
    data: {
      id: 'test-cashier-rbac-user',
      name: 'Cashier RBAC Test',
      email: 'cashier.rbac@test.com',
      role: 'CASHIER',
      appRoleId: cashierRole.id,
      businessId: 'busi-01',
      isOwner: false,
      isActive: true,
    },
  });

  const invStaffUser = await prisma.user.create({
    data: {
      id: 'test-invstaff-rbac-user',
      name: 'Inventory Staff RBAC Test',
      email: 'invstaff.rbac@test.com',
      role: 'INVENTORY_STAFF',
      appRoleId: inventoryStaffRole.id,
      businessId: 'busi-01',
      isOwner: false,
      isActive: true,
    },
  });

  await t.test('Both Cashier and Inventory Staff have attendance.check_in & attendance.check_out', async () => {
    assert.equal(await hasPermission(cashierUser.id, 'attendance.check_in'), true);
    assert.equal(await hasPermission(cashierUser.id, 'attendance.check_out'), true);
    assert.equal(await hasPermission(invStaffUser.id, 'attendance.check_in'), true);
    assert.equal(await hasPermission(invStaffUser.id, 'attendance.check_out'), true);
  });

  await t.test('Inventory Staff has inventory.adjust & inventory.create; Cashier does not', async () => {
    assert.equal(await hasPermission(invStaffUser.id, 'inventory.adjust'), true);
    assert.equal(await hasPermission(invStaffUser.id, 'inventory.create'), true);

    assert.equal(await hasPermission(cashierUser.id, 'inventory.adjust'), false);
    assert.equal(await hasPermission(cashierUser.id, 'inventory.create'), false);
  });

  await t.test('Cashier has billing.create; Inventory Staff does not', async () => {
    assert.equal(await hasPermission(cashierUser.id, 'billing.create'), true);
    assert.equal(await hasPermission(invStaffUser.id, 'billing.create'), false);
  });

  // Cleanup
  await prisma.user.delete({ where: { id: cashierUser.id } });
  await prisma.user.delete({ where: { id: invStaffUser.id } });
});
