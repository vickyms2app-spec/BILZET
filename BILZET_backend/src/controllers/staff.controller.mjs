import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';

// ─── STAFF DIRECTORY ───
export const getStaffList = asyncHandler(async (req, res) => {
  const staff = await prisma.staff.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      attendances: {
        take: 5,
        orderBy: { date: 'desc' },
      },
    },
  });

  return sendResponse(res, 200, { staff }, 'Staff list fetched successfully');
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, phone, address, role, department, salary } = req.body;
  if (!name) {
    throw ApiError.badRequest('Staff member name is required');
  }

  const staffId = `EMP-${Date.now().toString().slice(-5)}`;

  const member = await prisma.staff.create({
    data: {
      staffId,
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      role: role || 'Staff',
      department: department || 'Operations',
      salary: Number(salary || 0),
      status: 'ACTIVE',
    },
  });

  return sendResponse(res, 201, { staff: member }, 'Staff member onboarded successfully');
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, role, department, salary, status } = req.body;

  const member = await prisma.staff.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(address !== undefined && { address }),
      ...(role && { role }),
      ...(department && { department }),
      ...(salary !== undefined && { salary: Number(salary) }),
      ...(status && { status }),
    },
  });

  return sendResponse(res, 200, { staff: member }, 'Staff profile updated successfully');
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.staff.delete({ where: { id } });
  return sendResponse(res, 200, {}, 'Staff record removed');
});

// ─── ATTENDANCE ───
export const markAttendance = asyncHandler(async (req, res) => {
  const { staffId, date, status = 'PRESENT', hours = 8.0, notes } = req.body;

  if (!staffId) {
    throw ApiError.badRequest('Staff ID is required to mark attendance');
  }

  const attendance = await prisma.staffAttendance.create({
    data: {
      staffId,
      date: date ? new Date(date) : new Date(),
      status: status.toUpperCase(),
      hours: Number(hours || 8.0),
      notes: notes || null,
    },
  });

  return sendResponse(res, 201, { attendance }, 'Attendance recorded');
});

export const getAttendanceList = asyncHandler(async (req, res) => {
  const attendances = await prisma.staffAttendance.findMany({
    orderBy: { date: 'desc' },
    include: {
      staff: { select: { id: true, staffId: true, name: true, department: true } },
    },
  });

  return sendResponse(res, 200, { attendances }, 'Attendance logs fetched');
});

// ─── PAYROLL ───
export const generatePayroll = asyncHandler(async (req, res) => {
  const { staffId, month, year, allowances = 0, deductions = 0, bonus = 0, overtimePay = 0 } = req.body;

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff) {
    throw ApiError.notFound('Staff member not found');
  }

  const basic = Number(staff.salary || 0);
  const net = Math.max(
    0,
    basic + Number(allowances) + Number(bonus) + Number(overtimePay) - Number(deductions)
  );

  const payroll = await prisma.staffPayroll.create({
    data: {
      staffId,
      month: Number(month) || new Date().getMonth() + 1,
      year: Number(year) || new Date().getFullYear(),
      basicSalary: basic,
      allowances: Number(allowances),
      deductions: Number(deductions),
      overtimePay: Number(overtimePay),
      bonus: Number(bonus),
      netSalary: net,
      paymentStatus: 'PAID',
      paidAt: new Date(),
    },
    include: { staff: true },
  });

  return sendResponse(res, 201, { payroll }, 'Payroll processed successfully');
});

export const getPayrollHistory = asyncHandler(async (req, res) => {
  const payrolls = await prisma.staffPayroll.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      staff: { select: { id: true, staffId: true, name: true, department: true } },
    },
  });

  return sendResponse(res, 200, { payrolls }, 'Payroll history fetched');
});

export default {
  getStaffList,
  createStaff,
  updateStaff,
  deleteStaff,
  markAttendance,
  getAttendanceList,
  generatePayroll,
  getPayrollHistory,
};
