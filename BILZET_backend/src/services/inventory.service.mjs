import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

const mapProduct = (p) => {
  if (!p) return null;
  return {
    ...p,
    _id: p.id,
    currentStock: p.stock,
  };
};

export const getInventoryOverview = async (query = {}) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { isActive: true };

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { sku: { contains: query.search, mode: 'insensitive' } },
      { barcode: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    inventory: products.map(mapProduct),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getLowStockProducts = async (query = {}) => {
  const { page, limit, skip } = getPaginationParams(query);
  
  const allActive = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { stock: 'asc' },
  });

  const lowStock = allActive.filter((p) => p.stock <= p.minimumStock);
  const total = lowStock.length;
  const paginated = lowStock.slice(skip, skip + limit);

  return {
    products: paginated.map(mapProduct),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getStockHistory = async (query = {}) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};

  if (query.type) where.type = query.type;
  if (query.productId) where.productId = query.productId;

  const [transactions, total] = await Promise.all([
    prisma.stockTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    }),
    prisma.stockTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({ ...t, _id: t.id })),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getProductStockHistory = async (productId, query = {}) => {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { productId };

  const [transactions, total] = await Promise.all([
    prisma.stockTransaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
    }),
    prisma.stockTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((t) => ({ ...t, _id: t.id })),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const adjustStock = async (adjustmentData, user, context = {}) => {
  const { productId, warehouseId, type = 'ADJUST', quantity, reason } = adjustmentData;

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      const prevStock = product.stock;
      const newStock = prevStock + Number(quantity);

      if (newStock < 0) {
        throw ApiError.badRequest(
          `Adjustment would result in negative stock. Current: ${prevStock}, Adjustment: ${quantity}`
        );
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      if (warehouseId) {
        const existingWhStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: { warehouseId, productId },
          },
        });
        const whCurrent = existingWhStock ? existingWhStock.quantity : 0;
        const whNew = whCurrent + Number(quantity);
        if (whNew < 0) {
          throw ApiError.badRequest(
            `Adjustment would result in negative warehouse stock. Current: ${whCurrent}, Adjustment: ${quantity}`
          );
        }
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_productId: { warehouseId, productId },
          },
          create: {
            warehouseId,
            productId,
            quantity: Math.max(0, whNew),
          },
          update: {
            quantity: Math.max(0, whNew),
          },
        });
      }

      const stockTx = await tx.stockTransaction.create({
        data: {
          productId,
          type: type || 'ADJUST',
          quantity: Number(quantity),
          previousStock: prevStock,
          newStock,
          reason: `${reason || 'Stock Adjustment'}${warehouseId ? ` [Warehouse: ${warehouseId}]` : ''}${user?.name ? ` by ${user.name}` : ''}`,
        },
      });

      return {
        product: mapProduct(updated),
        transaction: { ...stockTx, _id: stockTx.id },
      };
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw err;
  }
};

export default {
  getInventoryOverview,
  getLowStockProducts,
  getStockHistory,
  getProductStockHistory,
  adjustStock,
};
