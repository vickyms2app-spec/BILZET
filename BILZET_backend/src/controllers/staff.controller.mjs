import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

// ─── STAFF DIRECTORY ───
export const getStaffList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        attendances: {
          take: 5,
          orderBy: { date: 'desc' },
        },
      },
    }),
    prisma.staff.count(),
  ]);

  return sendResponse(res, 200, { staff }, 'Staff list fetched successfully', buildPaginationMeta(total, page, limit));
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
  const { page, limit, skip } = getPaginationParams(req.query);

  const [attendances, total] = await Promise.all([
    prisma.staffAttendance.findMany({
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        staff: { select: { id: true, staffId: true, name: true, department: true } },
      },
    }),
    prisma.staffAttendance.count(),
  ]);

  return sendResponse(res, 200, { attendances }, 'Attendance logs fetched', buildPaginationMeta(total, page, limit));
});

// ─── PAYROLL ───
export const generatePayroll = asyncHandler(async (req, res) => {
  const { staffId, month, year, allowances = 0, deductions = 0, bonus = 0, overtimePay = 0 } = req.body;

  const monthMap = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };
  const numericMonth =
    typeof month === 'string' && monthMap[month.toLowerCase()]
      ? monthMap[month.toLowerCase()]
      : Number(month) || new Date().getMonth() + 1;
  const targetYear = Number(year) || new Date().getFullYear();

  if (staffId) {
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
        month: numericMonth,
        year: targetYear,
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
  }

  // If no specific staffId, generate for all active staff members
  const allStaff = await prisma.staff.findMany({
    where: { status: 'ACTIVE' },
  });

  if (!allStaff.length) {
    return sendResponse(res, 200, { payrolls: [] }, 'No active staff found');
  }

  const createdPayrolls = [];
  for (const s of allStaff) {
    const basic = Number(s.salary || 0);
    const net = Math.max(
      0,
      basic + Number(allowances) + Number(bonus) + Number(overtimePay) - Number(deductions)
    );

    const pr = await prisma.staffPayroll.create({
      data: {
        staffId: s.id,
        month: numericMonth,
        year: targetYear,
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
    createdPayrolls.push(pr);
  }

  return sendResponse(
    res,
    201,
    { payrolls: createdPayrolls, count: createdPayrolls.length },
    `Payroll processed for ${createdPayrolls.length} staff members`
  );
});

export const getPayrollHistory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);

  const [payrolls, total] = await Promise.all([
    prisma.staffPayroll.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        staff: { select: { id: true, staffId: true, name: true, department: true } },
      },
    }),
    prisma.staffPayroll.count(),
  ]);

  return sendResponse(res, 200, { payrolls }, 'Payroll history fetched', buildPaginationMeta(total, page, limit));
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
