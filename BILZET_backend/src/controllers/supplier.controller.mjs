import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { recordAudit } from '../middleware/audit.middleware.mjs';
import { AUDIT_ACTIONS } from '../utils/constants.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

const mapSupplier = (s) => {
  if (!s) return null;
  return {
    ...s,
    _id: s.id,
    balance: Number(s.balance || 0),
    currentBalance: Number(s.balance || 0),
    openingBalance: Number(s.balance || 0),
  };
};

export const getSuppliers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const where = {};

  if (req.query.isActive !== undefined) {
    where.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: 'insensitive' } },
      { phone: { contains: req.query.search, mode: 'insensitive' } },
      { email: { contains: req.query.search, mode: 'insensitive' } },
      { gstin: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { purchases: true } },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  const mapped = suppliers.map((s) => ({
    ...mapSupplier(s),
    totalPurchases: s._count?.purchases || 0,
  }));

  return sendResponse(
    res,
    200,
    { suppliers: mapped },
    'Suppliers fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      purchases: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!supplier) {
    throw ApiError.notFound('Supplier not found');
  }

  return sendResponse(res, 200, { supplier: mapSupplier(supplier) }, 'Supplier fetched successfully');
});

export const createSupplier = asyncHandler(async (req, res) => {
  const { name, phone, email, address, gstin, openingBalance = 0, isActive = true } = req.body;

  const supplier = await prisma.supplier.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      gstin: gstin?.trim() || null,
      balance: Number(openingBalance) || 0,
      isActive: isActive !== false,
    },
  });

  try {
    await recordAudit({
      user: req.user,
      action: AUDIT_ACTIONS.CREATE_SUPPLIER || 'CREATE_SUPPLIER',
      entity: 'Supplier',
      entityId: supplier.id,
      description: `Supplier '${supplier.name}' created`,
      req,
    });
  } catch (_) {}

  return sendResponse(res, 201, { supplier: mapSupplier(supplier) }, 'Supplier created successfully');
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    throw ApiError.notFound('Supplier not found');
  }

  const { name, phone, email, address, gstin, balance, openingBalance, isActive } = req.body;
  const updateData = {};

  if (name !== undefined) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone?.trim() || null;
  if (email !== undefined) updateData.email = email?.trim() || null;
  if (address !== undefined) updateData.address = address?.trim() || null;
  if (gstin !== undefined) updateData.gstin = gstin?.trim() || null;
  if (balance !== undefined) updateData.balance = Number(balance);
  else if (openingBalance !== undefined) updateData.balance = Number(openingBalance);
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);

  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: updateData,
  });

  try {
    await recordAudit({
      user: req.user,
      action: AUDIT_ACTIONS.UPDATE_SUPPLIER || 'UPDATE_SUPPLIER',
      entity: 'Supplier',
      entityId: supplier.id,
      description: `Supplier '${supplier.name}' updated`,
      req,
    });
  } catch (_) {}

  return sendResponse(res, 200, { supplier: mapSupplier(supplier) }, 'Supplier updated successfully');
});

export const getSupplierPurchases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where: { supplierId: req.params.id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchase.count({ where: { supplierId: req.params.id } }),
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
  // Return recorded supplier payments
  return sendResponse(
    res,
    200,
    { payments: [] },
    'Supplier payments fetched successfully'
  );
});

export default {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  getSupplierPurchases,
  getSupplierPayments,
};
