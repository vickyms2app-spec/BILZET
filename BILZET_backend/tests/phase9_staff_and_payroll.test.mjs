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

describe('PHASE 9: Operations & HR: Staff, Attendance & Payroll', () => {
  const storeAAdminToken = generateToken({
    userId: 'admin-01',
    id: 'admin-01',
    email: 'admin@bilzet.com',
    role: 'ADMIN',
    appRole: 'ADMIN',
    permissions: ['*'],
    businessId: 'busi-01',
  });

  const storeBAdminToken = generateToken({
    userId: 'admin-02',
    id: 'admin-02',
    email: 'electronics@bilzet.com',
    role: 'ADMIN',
    appRole: 'ADMIN',
    permissions: ['*'],
    businessId: 'busi-02',
  });

  const cashierToken = generateToken({
    userId: 'cashier-01',
    id: 'cashier-01',
    email: 'cashier@bilzet.com',
    role: 'CASHIER',
    appRoleId: 'role-cashier',
    businessId: 'busi-01',
  });

  let createdStaffId = null;
  let createdManagerId = null;

  test('1. Staff Directory: Store A Admin lists active staff scoped to store', async () => {
    const res = await fetch(`${baseUrl}/staff`, {
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.staff));
    assert.ok(body.data.staff.length >= 1);

    // Verify all returned staff belong to busi-01
    for (const s of body.data.staff) {
      assert.ok(!s.businessId || s.businessId === 'busi-01');
    }
  });

  test('2. Staff Creation: Admin can add new staff member and manager', async () => {
    // 2a. Add General Staff
    const resStaff = await fetch(`${baseUrl}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Arun Prakash',
        role: 'Staff',
        department: 'Logistics',
        phone: '9840556677',
        email: 'arun@bilzet.com',
        salary: 24000,
        joiningDate: '2025-08-01',
      }),
    });

    const bodyStaff = await resStaff.json();
    assert.equal(resStaff.status, 201);
    assert.equal(bodyStaff.success, true);
    assert.equal(bodyStaff.data.staff.name, 'Arun Prakash');
    createdStaffId = bodyStaff.data.staff.id;
    assert.ok(createdStaffId);

    // 2b. Add Manager
    const resManager = await fetch(`${baseUrl}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Sangeetha Natarajan',
        role: 'Manager',
        department: 'Operations',
        phone: '9840667788',
        email: 'sangeetha@bilzet.com',
        salary: 42000,
        joiningDate: '2025-05-10',
      }),
    });

    const bodyManager = await resManager.json();
    assert.equal(resManager.status, 201);
    assert.equal(bodyManager.success, true);
    assert.equal(bodyManager.data.staff.role, 'Manager');
    createdManagerId = bodyManager.data.staff.id;
    assert.ok(createdManagerId);
  });

  test('3. Staff Profile Update: Admin can update details and salary', async () => {
    const res = await fetch(`${baseUrl}/staff/${createdStaffId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAAdminToken}`,
      },
      body: JSON.stringify({
        department: 'Inventory Control',
        salary: 26000,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.staff.department, 'Inventory Control');
    assert.equal(body.data.staff.salary, 26000);
  });

  test('4. Authorization Guard: Unauthorized user (Cashier) cannot delete staff', async () => {
    const res = await fetch(`${baseUrl}/staff/${createdStaffId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${cashierToken}`,
      },
    });

    assert.equal(res.status, 403);
  });

  test('5. Admin Delete Staff: Admin can delete staff without historical data', async () => {
    const res = await fetch(`${baseUrl}/staff/${createdStaffId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.match(body.message, /removed|deleted/i);
  });

  test('6. Admin Delete Manager: Admin can delete/deactivate a manager', async () => {
    const res = await fetch(`${baseUrl}/staff/${createdManagerId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.match(body.message, /removed|deleted|deactivated/i);
  });

  test('7. Historical Data Integrity: Soft-deleting staff preserves attendance and payroll history', async () => {
    // emp-02 (Dinesh Kumar) has both attendance (att-01) and payroll (pay-01) records
    const preAttCount = await prisma.staffAttendance.count({ where: { staffId: 'emp-02' } });
    const prePayCount = await prisma.staffPayroll.count({ where: { staffId: 'emp-02' } });
    assert.ok(preAttCount >= 1, 'Pre-condition: emp-02 must have attendance');
    assert.ok(prePayCount >= 1, 'Pre-condition: emp-02 must have payroll');

    const res = await fetch(`${baseUrl}/staff/emp-02`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.historyPreserved, true);
    assert.equal(body.data.isDeactivated, true);

    // Verify historical attendance and payroll records are 100% PRESERVED
    const postAttCount = await prisma.staffAttendance.count({ where: { staffId: 'emp-02' } });
    const postPayCount = await prisma.staffPayroll.count({ where: { staffId: 'emp-02' } });
    assert.equal(postAttCount, preAttCount, 'Historical attendance records must NOT be deleted');
    assert.equal(postPayCount, prePayCount, 'Historical payroll records must NOT be deleted');

    // Verify staff record itself exists as INACTIVE
    const staff = await prisma.staff.findUnique({ where: { id: 'emp-02' } });
    assert.ok(staff);
    assert.equal(staff.status, 'INACTIVE');
    assert.equal(staff.isDeleted, true);
  });

  test('8. Staff Directory Scoping: Default list excludes soft-deleted/inactive staff', async () => {
    const res = await fetch(`${baseUrl}/staff`, {
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    const ids = body.data.staff.map((s) => s.id);
    assert.ok(!ids.includes('emp-02'), 'Inactive emp-02 should not be in default active roster');

    // Querying with includeInactive=true or status=ALL retrieves inactive records for reporting
    const resAll = await fetch(`${baseUrl}/staff?includeInactive=true`, {
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });
    const bodyAll = await resAll.json();
    assert.equal(resAll.status, 200);
    const allIds = bodyAll.data.staff.map((s) => s.id);
    assert.ok(allIds.includes('emp-02'), 'Inactive emp-02 should be available when includeInactive=true');
  });

  test('9. Store Isolation: Store A Admin cannot delete Store B employee', async () => {
    // emp-04 belongs to Store B (busi-02)
    const res = await fetch(`${baseUrl}/staff/emp-04`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });

    assert.equal(res.status, 403);
  });

  test('10. Attendance Supervision: Admin marks and fetches staff attendance', async () => {
    const res = await fetch(`${baseUrl}/staff/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAAdminToken}`,
      },
      body: JSON.stringify({
        staffId: 'emp-01',
        date: new Date().toISOString(),
        status: 'PRESENT',
        hours: 8.5,
        notes: 'Regular on-time shift',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.attendance.status, 'PRESENT');

    const listRes = await fetch(`${baseUrl}/staff/attendance?staffId=emp-01`, {
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });
    const listBody = await listRes.json();
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listBody.data.attendances));
    assert.ok(listBody.data.attendances.length >= 1);
  });

  test('11. Payroll Processing: Generates and preserves salary calculation accurately', async () => {
    const res = await fetch(`${baseUrl}/staff/payroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storeAAdminToken}`,
      },
      body: JSON.stringify({
        staffId: 'emp-01', // Kavitha Raman (salary: 35000)
        month: 10,
        year: 2026,
        allowances: 2000,
        deductions: 1000,
        bonus: 1500,
        overtimePay: 500,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.payroll);
    // Net = 35000 + 2000 + 1500 + 500 - 1000 = 38000
    assert.equal(body.data.payroll.basicSalary, 35000);
    assert.equal(body.data.payroll.netSalary, 38000);
    assert.equal(body.data.payroll.paymentStatus, 'PAID');

    // Fetch payroll history
    const histRes = await fetch(`${baseUrl}/staff/payroll`, {
      headers: {
        Authorization: `Bearer ${storeAAdminToken}`,
      },
    });
    const histBody = await histRes.json();
    assert.equal(histRes.status, 200);
    assert.ok(Array.isArray(histBody.data.payrolls));
    assert.ok(histBody.data.payrolls.length >= 1);
  });
});
