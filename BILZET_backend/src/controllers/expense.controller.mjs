import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { Expense } from '../models/Expense.mjs';
import { recordAudit } from '../middleware/audit.middleware.mjs';
import { AUDIT_ACTIONS } from '../utils/constants.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

export const getExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPaginationParams(req.query);
  const filter = {};

  if (req.query.category) filter.category = req.query.category;
  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort(sort).skip(skip).limit(limit).populate('createdBy', 'name email'),
    Expense.countDocuments(filter)
  ]);

  return sendResponse(
    res,
    200,
    { expenses },
    'Expenses fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id).populate('createdBy', 'name email');
  if (!expense) {
    throw ApiError.notFound('Expense record not found');
  }
  return sendResponse(res, 200, { expense }, 'Expense fetched successfully');
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    ...req.body,
    createdBy: req.user._id
  });

  await recordAudit({
    user: req.user,
    action: AUDIT_ACTIONS.CREATE_EXPENSE,
    entity: 'Expense',
    entityId: expense._id,
    description: `Expense '${expense.title}' recorded for ₹${expense.amount}`,
    req
  });

  return sendResponse(res, 201, { expense }, 'Expense created successfully');
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }

  Object.assign(expense, req.body);
  await expense.save();

  return sendResponse(res, 200, { expense }, 'Expense updated successfully');
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    throw ApiError.notFound('Expense not found');
  }

  await Expense.findByIdAndDelete(expense._id);

  await recordAudit({
    user: req.user,
    action: AUDIT_ACTIONS.DELETE_RECORD,
    entity: 'Expense',
    entityId: expense._id,
    description: `Expense '${expense.title}' of ₹${expense.amount} deleted`,
    req
  });

  return sendResponse(res, 200, {}, 'Expense deleted successfully');
});

export default {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense
};
