import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { recordAudit } from '../middleware/audit.middleware.mjs';
import { AUDIT_ACTIONS } from '../utils/constants.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

const normalizePaymentMethod = (method) => {
  if (!method) return 'CASH';
  const m = String(method).toUpperCase().trim();
  if (['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CREDIT'].includes(m)) return m;
  if (m === 'BANK' || m === 'TRANSFER' || m === 'NET_BANKING') return 'BANK_TRANSFER';
  return 'CASH';
};

const mapExpense = (e) => {
  if (!e) return null;
  const amt = Number(e.amount || 0);
  return {
    ...e,
    _id: e.id,
    id: e.id,
    amount: amt,
    description: e.note || e.description || '',
    note: e.note || e.description || '',
    createdBy: e.recordedBy ? { _id: e.recordedBy.id, id: e.recordedBy.id, name: e.recordedBy.name, email: e.recordedBy.email } : null,
  };
};

export const getExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPaginationParams(req.query);
  const where = {};

  if (req.user && req.user.role !== 'SUPER_ADMIN' && req.user.businessId) {
    where.OR = [
      { businessId: req.user.businessId },
      { recordedById: req.user.id },
      { businessId: null }
    ];
  }

  if (req.query.category && req.query.category !== 'ALL') {
    where.category = { equals: req.query.category, mode: 'insensitive' };
  }

  if (req.query.startDate || req.query.endDate) {
    where.date = {};
    if (req.query.startDate) where.date.gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  const mapped = (expenses || []).map(mapExpense);

  return sendResponse(
    res,
    200,
    { expenses: mapped },
    'Expenses fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await prisma.expense.findUnique({
    where: { id: req.params.id },
    include: {
      recordedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!expense) {
    throw ApiError.notFound('Expense record not found');
  }

  return sendResponse(res, 200, { expense: mapExpense(expense) }, 'Expense fetched successfully');
});

export const createExpense = asyncHandler(async (req, res) => {
  const { title, category, amount, description, note, date, paymentMethod } = req.body;

  if (!title || !title.trim()) {
    throw ApiError.badRequest('Expense title is required');
  }
  if (!category || !category.trim()) {
    throw ApiError.badRequest('Expense category is required');
  }
  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw ApiError.badRequest('Expense amount must be greater than zero');
  }

  const effectiveBusinessId = req.user?.businessId || null;
  const effectiveUserId = req.user?.id || null;

  // Prevent duplicate submissions within last 3 seconds
  const threeSecondsAgo = new Date(Date.now() - 3000);
  const recentDuplicate = await prisma.expense.findFirst({
    where: {
      title: title.trim(),
      amount: parsedAmount,
      recordedById: effectiveUserId,
      createdAt: { gte: threeSecondsAgo },
    },
  }).catch(() => null);

  if (recentDuplicate) {
    return sendResponse(res, 200, { expense: mapExpense(recentDuplicate) }, 'Expense already recorded');
  }

  const finalDate = date ? new Date(date) : new Date();
  const finalNote = (note || description || '').trim();
  const finalMethod = normalizePaymentMethod(paymentMethod);

  const expense = await prisma.expense.create({
    data: {
      title: title.trim(),
      category: category.trim(),
      amount: parsedAmount,
      paymentMethod: finalMethod,
      date: finalDate,
      note: finalNote,
      businessId: effectiveBusinessId,
      recordedById: effectiveUserId,
    },
    include: {
      recordedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await recordAudit({
    user: req.user,
    action: AUDIT_ACTIONS.CREATE_EXPENSE,
    entity: 'Expense',
    entityId: expense.id,
    description: `Expense '${expense.title}' recorded for ₹${parsedAmount}`,
    req,
  }).catch(() => {});

  return sendResponse(res, 201, { expense: mapExpense(expense) }, 'Expense created successfully');
});

export const updateExpense = asyncHandler(async (req, res) => {
  const existing = await prisma.expense.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw ApiError.notFound('Expense not found');
  }

  const updateData = {};
  if (req.body.title !== undefined) updateData.title = req.body.title.trim();
  if (req.body.category !== undefined) updateData.category = req.body.category.trim();
  if (req.body.amount !== undefined) updateData.amount = Number(req.body.amount);
  if (req.body.note !== undefined || req.body.description !== undefined) {
    updateData.note = (req.body.note || req.body.description || '').trim();
  }
  if (req.body.paymentMethod !== undefined) {
    updateData.paymentMethod = normalizePaymentMethod(req.body.paymentMethod);
  }
  if (req.body.date !== undefined) {
    updateData.date = new Date(req.body.date);
  }

  const updated = await prisma.expense.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      recordedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return sendResponse(res, 200, { expense: mapExpense(updated) }, 'Expense updated successfully');
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const existing = await prisma.expense.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw ApiError.notFound('Expense not found');
  }

  await prisma.expense.delete({
    where: { id: req.params.id },
  });

  await recordAudit({
    user: req.user,
    action: AUDIT_ACTIONS.DELETE_RECORD,
    entity: 'Expense',
    entityId: existing.id,
    description: `Expense '${existing.title}' of ₹${Number(existing.amount)} deleted`,
    req,
  }).catch(() => {});

  return sendResponse(res, 200, {}, 'Expense deleted successfully');
});

export default {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
