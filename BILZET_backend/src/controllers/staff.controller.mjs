import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

// ─── STAFF DIRECTORY ───
export const getStaffList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const activeBusinessId =
    req.query.businessId ||
    req.headers['x-business-id'] ||
    req.user?.businessId;

  const where = {};
  if (activeBusinessId) {
    where.OR = [
      { businessId: activeBusinessId },
      { businessId: null },
    ];
  }

  if (req.query.status && req.query.status !== 'ALL') {
    where.status = req.query.status.toUpperCase();
  } else if (req.query.includeInactive !== 'true') {
    where.isDeleted = { not: true };
  }

  if (req.query.department && req.query.department !== 'ALL') {
    where.department = req.query.department;
  }

  const [staff, total] = await Promise.all([
    prisma.staff.findMany({
      where,
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
    prisma.staff.count({ where }),
  ]);

  return sendResponse(res, 200, { staff }, 'Staff list fetched successfully', buildPaginationMeta(total, page, limit));
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, phone, address, role, department, salary, joiningDate } = req.body;
  if (!name) {
    throw ApiError.badRequest('Staff member name is required');
  }

  const activeBusinessId =
    req.body.businessId ||
    req.headers['x-business-id'] ||
    req.user?.businessId ||
    'busi-01';

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
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      businessId: activeBusinessId,
    },
  });

  return sendResponse(res, 201, { staff: member }, 'Staff member onboarded successfully');
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, role, department, salary, status, joiningDate } = req.body;

  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Staff member not found');
  }

  const activeBusinessId = req.headers['x-business-id'] || req.user?.businessId;
  if (existing.businessId && activeBusinessId && existing.businessId !== activeBusinessId) {
    throw ApiError.forbidden('Unauthorized store access for staff profile');
  }

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
      ...(joiningDate && { joiningDate: new Date(joiningDate) }),
    },
  });

  // If status changed to INACTIVE, revoke access on linked user
  if (status && status.toUpperCase() === 'INACTIVE' && (member.userId || member.email)) {
    const linkedUsers = await prisma.user.findMany({
      where: {
        OR: [
          ...(member.userId ? [{ id: member.userId }] : []),
          ...(member.email ? [{ email: member.email }] : []),
        ],
      },
    });
    for (const u of linkedUsers) {
      if (!u.isOwner) {
        await prisma.user.update({
          where: { id: u.id },
          data: { isActive: false },
        });
      }
    }
  }

  return sendResponse(res, 200, { staff: member }, 'Staff profile updated successfully');
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) {
    throw ApiError.notFound('Staff member not found');
  }

  const activeBusinessId = req.headers['x-business-id'] || req.user?.businessId;
  if (staff.businessId && activeBusinessId && staff.businessId !== activeBusinessId) {
    throw ApiError.forbidden('Unauthorized: Staff member belongs to another store');
  }

  // Self and owner deletion prevention
  if (staff.userId && req.user?.id && staff.userId === req.user.id) {
    throw ApiError.forbidden('You cannot delete your own account');
  }
  if (staff.email && req.user?.email && staff.email === req.user.email) {
    throw ApiError.forbidden('You cannot delete your own account');
  }

  // Check historical records
  const [attendanceCount, payrollCount] = await Promise.all([
    prisma.staffAttendance.count({ where: { staffId: id } }),
    prisma.staffPayroll.count({ where: { staffId: id } }),
  ]);

  const hasHistory = attendanceCount > 0 || payrollCount > 0;

  if (hasHistory) {
    // Soft deletion: preserve historical data
    await prisma.staff.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  } else {
    await prisma.staff.delete({ where: { id } });
  }

  // Revoke application access on any linked user accounts
  if (staff.userId || staff.email) {
    const linkedUsers = await prisma.user.findMany({
      where: {
        OR: [
          ...(staff.userId ? [{ id: staff.userId }] : []),
          ...(staff.email ? [{ email: staff.email }] : []),
        ],
      },
    });
    for (const u of linkedUsers) {
      if (!u.isOwner) {
        await prisma.user.update({
          where: { id: u.id },
          data: { isActive: false },
        });
      }
    }
  }

  return sendResponse(
    res,
    200,
    {
      id,
      name: staff.name,
      isDeactivated: hasHistory,
      historyPreserved: hasHistory,
      attendanceRecords: attendanceCount,
      payrollRecords: payrollCount,
    },
    hasHistory
      ? `Employee ${staff.name} deactivated successfully. Historical attendance (${attendanceCount}) and payroll (${payrollCount}) records have been preserved.`
      : `Employee ${staff.name} deleted successfully.`
  );
});

// ─── ATTENDANCE (SELF) ───
export const checkInSelf = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const businessId = req.user.businessId;
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if attendance already recorded today for this user
  const existing = await prisma.staffAttendance.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (existing && existing.checkIn) {
    throw ApiError.badRequest(
      `You have already checked in today at ${new Date(existing.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
  }

  // Derive status based on standard store policy (09:15 late threshold)
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const isLate = hours > 9 || (hours === 9 && minutes > 15);
  const status = isLate ? 'LATE' : 'PRESENT';

  let attendance;
  if (existing) {
    attendance = await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        checkIn: now,
        status,
        notes: req.body.notes !== undefined ? req.body.notes : existing.notes,
      },
    });
  } else {
    // Find linked staff record if one exists
    const staffRec = await prisma.staff.findFirst({
      where: {
        OR: [
          { userId },
          ...(req.user.email ? [{ email: req.user.email }] : []),
        ],
      },
    });

    attendance = await prisma.staffAttendance.create({
      data: {
        userId,
        staffId: staffRec?.id || null,
        businessId: businessId || null,
        date: now,
        checkIn: now,
        status,
        hours: 8.0,
        notes: req.body.notes || null,
      },
    });
  }

  return sendResponse(
    res,
    201,
    { attendance },
    `Check-in recorded successfully at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${status})`
  );
});

export const checkOutSelf = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await prisma.staffAttendance.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (!existing || !existing.checkIn) {
    throw ApiError.badRequest('Cannot check out without checking in first.');
  }

  if (existing.checkOut) {
    throw ApiError.badRequest(
      `You have already checked out today at ${new Date(existing.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
  }

  const checkInTime = new Date(existing.checkIn).getTime();
  const checkOutTime = now.getTime();
  const diffHours = Number(((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2));
  const workingHours = Math.max(0.1, diffHours);

  // If working hours < 4.0 and status was PRESENT, mark as HALF_DAY
  let status = existing.status;
  if (workingHours < 4.0 && status === 'PRESENT') {
    status = 'HALF_DAY';
  }

  const attendance = await prisma.staffAttendance.update({
    where: { id: existing.id },
    data: {
      checkOut: now,
      workingHours,
      hours: workingHours,
      status,
      notes: req.body.notes !== undefined ? `${existing.notes ? existing.notes + ' | ' : ''}${req.body.notes}` : existing.notes,
    },
  });

  return sendResponse(
    res,
    200,
    { attendance },
    `Check-out recorded successfully. Total shift duration: ${Math.floor(workingHours)}h ${Math.round((workingHours % 1) * 60)}m`
  );
});

export const getMyAttendanceToday = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const record = await prisma.staffAttendance.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return sendResponse(
    res,
    200,
    {
      attendance: record || null,
      checkedIn: Boolean(record?.checkIn),
      checkedOut: Boolean(record?.checkOut),
    },
    'Today attendance retrieved'
  );
});

export const getMyAttendanceHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const attendances = await prisma.staffAttendance.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 30,
  });

  return sendResponse(res, 200, { attendances }, 'Attendance history retrieved');
});

// ─── ATTENDANCE (SUPERVISION / ADMIN) ───
export const markAttendance = asyncHandler(async (req, res) => {
  const { staffId, date, status = 'PRESENT', hours = 8.0, notes } = req.body;

  if (!staffId) {
    throw ApiError.badRequest('Staff ID is required to mark attendance');
  }

  // Parse target date and find start/end of day
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if an attendance already exists for this staff on this day
  const existing = await prisma.staffAttendance.findFirst({
    where: {
      staffId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  let attendance;
  if (existing) {
    attendance = await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        status: status.toUpperCase(),
        hours: Number(hours || 8.0),
        notes: notes !== undefined ? notes : existing.notes,
        date: targetDate,
      },
      include: {
        staff: { select: { id: true, staffId: true, name: true, department: true, role: true } },
      },
    });
  } else {
    attendance = await prisma.staffAttendance.create({
      data: {
        staffId,
        date: targetDate,
        status: status.toUpperCase(),
        hours: Number(hours || 8.0),
        notes: notes || null,
      },
      include: {
        staff: { select: { id: true, staffId: true, name: true, department: true, role: true } },
      },
    });
  }

  return sendResponse(res, 201, { attendance }, 'Attendance recorded');
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, hours, notes, date } = req.body;

  const attendance = await prisma.staffAttendance.update({
    where: { id },
    data: {
      ...(status && { status: status.toUpperCase() }),
      ...(hours !== undefined && { hours: Number(hours) }),
      ...(notes !== undefined && { notes }),
      ...(date && { date: new Date(date) }),
    },
    include: {
      staff: { select: { id: true, staffId: true, name: true, department: true, role: true } },
    },
  });

  return sendResponse(res, 200, { attendance }, 'Attendance updated successfully');
});

export const deleteAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.staffAttendance.delete({ where: { id } });
  return sendResponse(res, 200, {}, 'Attendance record removed');
});

export const getAttendanceList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { staffId, status, date, startDate, endDate } = req.query;

  const where = {};
  if (staffId) where.staffId = staffId;
  if (status && status !== 'ALL') where.status = status.toUpperCase();
  if (date) {
    const d = new Date(date);
    const s = new Date(d); s.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(23, 59, 59, 999);
    where.date = { gte: s, lte: e };
  } else if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      where.date.lte = e;
    }
  }

  const [attendances, total] = await Promise.all([
    prisma.staffAttendance.findMany({
      where,
      skip: limit ? skip : undefined,
      take: limit ? limit : 1000,
      orderBy: { date: 'desc' },
      include: {
        staff: { select: { id: true, staffId: true, name: true, department: true, role: true } },
      },
    }),
    prisma.staffAttendance.count({ where }),
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
  checkInSelf,
  checkOutSelf,
  getMyAttendanceToday,
  getMyAttendanceHistory,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceList,
  generatePayroll,
  getPayrollHistory,
};
