import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';

// ─── WAREHOUSES ───
export const getWarehouses = asyncHandler(async (req, res) => {
  const warehouses = await prisma.warehouse.findMany({
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
  const { name, code, address, contactPerson, phone } = req.body;
  if (!name || !code) {
    throw ApiError.badRequest('Warehouse name and unique code are required');
  }

  const existing = await prisma.warehouse.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (existing) {
    throw ApiError.conflict(`Warehouse code '${code}' is already registered`);
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      name,
      code: code.toUpperCase(),
      address: address || null,
      contactPerson: contactPerson || null,
      phone: phone || null,
      isActive: true,
    },
  });

  return sendResponse(res, 201, { warehouse }, 'Warehouse created successfully');
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, address, contactPerson, phone, isActive } = req.body;

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(address !== undefined && { address }),
      ...(contactPerson !== undefined && { contactPerson }),
      ...(phone !== undefined && { phone }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return sendResponse(res, 200, { warehouse }, 'Warehouse updated successfully');
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.warehouse.delete({ where: { id } });
  return sendResponse(res, 200, {}, 'Warehouse deleted successfully');
});

// ─── STOCK TRANSFERS ───
export const transferStock = asyncHandler(async (req, res) => {
  const { fromWarehouseId, toWarehouseId, productId, quantity, notes } = req.body;

  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw ApiError.badRequest('Transfer quantity must be greater than 0');
  }

  if (fromWarehouseId === toWarehouseId) {
    throw ApiError.badRequest('Source and destination warehouses cannot be the same');
  }

  const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Check source stock
    const sourceStock = await tx.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: fromWarehouseId,
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
          warehouseId: fromWarehouseId,
          productId,
        },
      },
      data: { quantity: { decrement: qty } },
    });

    // 3. Increment destination
    await tx.warehouseStock.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: toWarehouseId,
          productId,
        },
      },
      update: { quantity: { increment: qty } },
      create: {
        warehouseId: toWarehouseId,
        productId,
        quantity: qty,
      },
    });

    // 4. Create transfer record
    const transfer = await tx.stockTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId,
        toWarehouseId,
        productId,
        quantity: qty,
        notes: notes || null,
        createdById: req.user?._id || null,
      },
    });

    return transfer;
  });

  return sendResponse(res, 201, { transfer: result }, 'Stock transfer completed successfully');
});

export const getStockTransfers = asyncHandler(async (req, res) => {
  const transfers = await prisma.stockTransfer.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return sendResponse(res, 200, { transfers }, 'Stock transfers fetched successfully');
});

export default {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  transferStock,
  getStockTransfers,
};
