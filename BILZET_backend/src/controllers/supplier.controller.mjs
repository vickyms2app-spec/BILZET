import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { Supplier } from '../models/Supplier.mjs';
import { Purchase } from '../models/Purchase.mjs';
import { Payment } from '../models/Payment.mjs';
import { recordAudit } from '../middleware/audit.middleware.mjs';
import { AUDIT_ACTIONS } from '../utils/constants.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

export const getSuppliers = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPaginationParams(req.query);
  const filter = {};

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { phone: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort(sort).skip(skip).limit(limit),
    Supplier.countDocuments(filter)
  ]);

  return sendResponse(
    res,
    200,
    { suppliers },
    'Suppliers fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }
  return sendResponse(res, 200, { supplier }, 'Supplier fetched successfully');
});

export const createSupplier = asyncHandler(async (req, res) => {
  const { openingBalance = 0 } = req.body;
  const supplier = await Supplier.create({
    ...req.body,
    currentBalance: openingBalance
  });

  await recordAudit({
    user: req.user,
    action: AUDIT_ACTIONS.CREATE_SUPPLIER,
    entity: 'Supplier',
    entityId: supplier._id,
    description: `Supplier '${supplier.name}' created`,
    req
  });

  return sendResponse(res, 201, { supplier }, 'Supplier created successfully');
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }

  Object.assign(supplier, req.body);
  await supplier.save();

  await recordAudit({
    user: req.user,
    action: AUDIT_ACTIONS.UPDATE_SUPPLIER,
    entity: 'Supplier',
    entityId: supplier._id,
    description: `Supplier '${supplier.name}' updated`,
    req
  });

  return sendResponse(res, 200, { supplier }, 'Supplier updated successfully');
});

export const getSupplierPurchases = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }

  const { page, limit, skip, sort } = getPaginationParams(req.query);
  const [purchases, total] = await Promise.all([
    Purchase.find({ supplier: supplier._id }).sort(sort).skip(skip).limit(limit),
    Purchase.countDocuments({ supplier: supplier._id })
  ]);

  return sendResponse(
    res,
    200,
    { purchases },
    'Supplier purchases fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getSupplierPayments = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }

  const { page, limit, skip, sort } = getPaginationParams(req.query);
  const [payments, total] = await Promise.all([
    Payment.find({ supplier: supplier._id }).sort(sort).skip(skip).limit(limit),
    Payment.countDocuments({ supplier: supplier._id })
  ]);

  return sendResponse(
    res,
    200,
    { payments },
    'Supplier payments fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export default {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  getSupplierPurchases,
  getSupplierPayments
};
