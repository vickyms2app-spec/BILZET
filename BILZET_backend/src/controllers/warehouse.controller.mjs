import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';

// ─── WAREHOUSES ───
export const getWarehouses = asyncHandler(async (req, res) => {
  const activeBusinessId =
    req.query.businessId ||
    req.headers['x-business-id'] ||
    req.user?.businessId;

  const where = {};
  if (activeBusinessId) {
    where.businessId = activeBusinessId;
  }

  const warehouses = await prisma.warehouse.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      stocks: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, sellingPrice: true },
          },
        },
      },
    },
  });

  return sendResponse(res, 200, { warehouses }, 'Warehouses fetched successfully');
});

export const createWarehouse = asyncHandler(async (req, res) => {
  const { name, code, address, contactPerson, manager, phone, capacity, businessId } = req.body;
  if (!name || !code) {
    throw ApiError.badRequest('Warehouse name and unique code are required');
  }

  const activeBusinessId =
    businessId ||
    req.headers['x-business-id'] ||
    req.user?.businessId ||
    'busi-01';

  const existing = await prisma.warehouse.findFirst({
    where: {
      code: code.toUpperCase(),
      ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    },
  });
  if (existing) {
    throw ApiError.conflict(`Warehouse code '${code}' is already registered`);
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      name,
      code: code.toUpperCase(),
      address: address || null,
      contactPerson: contactPerson || manager || null,
      manager: manager || contactPerson || null,
      phone: phone || null,
      capacity: capacity ? Number(capacity) : null,
      businessId: activeBusinessId,
      isActive: true,
    },
  });

  return sendResponse(res, 201, { warehouse }, 'Warehouse created successfully');
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, address, contactPerson, manager, phone, capacity, isActive } = req.body;

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(address !== undefined && { address }),
      ...(contactPerson !== undefined && { contactPerson }),
      ...(manager !== undefined && { manager }),
      ...(phone !== undefined && { phone }),
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return sendResponse(res, 200, { warehouse }, 'Warehouse updated successfully');
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Safe deletion check: prevent deletion if warehouse has active stock
  const hasStock = await prisma.warehouseStock.count({
    where: {
      warehouseId: id,
      quantity: { gt: 0 },
    },
  });
  if (hasStock > 0) {
    throw ApiError.badRequest('Cannot delete warehouse with active stock. Transfer or clear stock first.');
  }

  await prisma.warehouse.delete({ where: { id } });
  return sendResponse(res, 200, {}, 'Warehouse deleted successfully');
});

// ─── STOCK TRANSFERS ───
export const transferStock = asyncHandler(async (req, res) => {
  const {
    fromWarehouseId,
    toWarehouseId,
    sourceWarehouseId,
    destinationWarehouseId,
    productId,
    quantity,
    notes,
  } = req.body;

  const srcWhId = fromWarehouseId || sourceWarehouseId;
  const destWhId = toWarehouseId || destinationWarehouseId;

  if (!srcWhId || !destWhId) {
    throw ApiError.badRequest('Both source and destination warehouses are required');
  }

  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw ApiError.badRequest('Transfer quantity must be greater than 0');
  }

  if (srcWhId === destWhId) {
    throw ApiError.badRequest('Source and destination warehouses cannot be the same');
  }

  const activeBusinessId =
    req.body.businessId ||
    req.headers['x-business-id'] ||
    req.user?.businessId;

  const [srcWh, destWh, product] = await Promise.all([
    prisma.warehouse.findUnique({ where: { id: srcWhId } }),
    prisma.warehouse.findUnique({ where: { id: destWhId } }),
    productId ? prisma.product.findUnique({ where: { id: productId } }) : null,
  ]);
  if (!srcWh) {
    throw ApiError.notFound('Source warehouse not found');
  }
  if (!destWh) {
    throw ApiError.notFound('Destination warehouse not found');
  }
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  // Cross-store isolation check: cannot transfer across different stores
  if (srcWh.businessId && destWh.businessId && srcWh.businessId !== destWh.businessId) {
    throw ApiError.badRequest('Cannot transfer stock between different stores');
  }

  // Store authorization: cannot transfer stock if warehouse or product belongs to another store
  if (activeBusinessId) {
    if (srcWh.businessId && srcWh.businessId !== activeBusinessId) {
      throw ApiError.forbidden('Unauthorized: Source godown belongs to another store');
    }
    if (destWh.businessId && destWh.businessId !== activeBusinessId) {
      throw ApiError.forbidden('Unauthorized: Destination godown belongs to another store');
    }
    if (product.businessId && product.businessId !== activeBusinessId) {
      throw ApiError.forbidden('Unauthorized: Product belongs to another store');
    }
  }

  const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Check source stock
    const sourceStock = await tx.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: srcWhId,
          productId,
        },
      },
    });

    if (!sourceStock || sourceStock.quantity < qty) {
      throw ApiError.badRequest(
        `Insufficient stock in source warehouse (Available: ${sourceStock?.quantity || 0})`
      );
    }

    // 2. Decrement source
    await tx.warehouseStock.update({
      where: {
        warehouseId_productId: {
          warehouseId: srcWhId,
          productId,
        },
      },
      data: { quantity: { decrement: qty } },
    });

    // 3. Increment destination
    await tx.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: destWhId,
          productId,
        },
      },
      update: { quantity: { increment: qty } },
      create: {
        warehouseId: destWhId,
        productId,
        quantity: qty,
      },
    });

    // 4. Create transfer record
    const transfer = await tx.stockTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId: srcWhId,
        toWarehouseId: destWhId,
        productId,
        quantity: qty,
        notes: notes || null,
        createdById: req.user?.id || req.user?._id || null,
        businessId: srcWh.businessId || activeBusinessId,
      },
    });

    return transfer;
  });

  return sendResponse(res, 201, { transfer: result }, 'Stock transfer completed successfully');
});

export const getStockTransfers = asyncHandler(async (req, res) => {
  const activeBusinessId =
    req.query.businessId ||
    req.headers['x-business-id'] ||
    req.user?.businessId;

  const transfers = await prisma.stockTransfer.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
      fromWarehouse: { select: { id: true, name: true, code: true, businessId: true } },
      toWarehouse: { select: { id: true, name: true, code: true, businessId: true } },
    },
  });

  const filtered = activeBusinessId
    ? transfers.filter(
        (t) =>
          !t.businessId ||
          t.businessId === activeBusinessId ||
          t.fromWarehouse?.businessId === activeBusinessId
      )
    : transfers;

  return sendResponse(res, 200, { transfers: filtered }, 'Stock transfers fetched successfully');
});

export default {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  transferStock,
  getStockTransfers,
};
