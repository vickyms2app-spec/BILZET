import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

const mapProduct = (p) => {
  if (!p) return null;
  return {
    ...p,
    _id: p.id,
    currentStock: Number(p.stock ?? p.stockQuantity ?? 0),
    stock: Number(p.stock ?? p.stockQuantity ?? 0),
    sellingPrice: Number(p.sellingPrice ?? 0),
    purchasePrice: Number(p.purchasePrice ?? 0),
    gstRate: Number(p.gstRate ?? 0),
    minimumStock: Number(p.minimumStock ?? 5),
  };
};

export const getInventoryOverview = async (query = {}) => {
  const { page, limit, skip } = getPaginationParams(query, 500, 1000);
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
  const { page, limit, skip } = getPaginationParams(query, 100, 500);
  
  const allActive = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { stock: 'asc' },
  });

  const lowStock = allActive.filter((p) => Number(p.stock || 0) <= Number(p.minimumStock || 5));
  const total = lowStock.length;
  const paginated = lowStock.slice(skip, skip + limit);

  return {
    products: paginated.map(mapProduct),
    meta: buildPaginationMeta(total, page, limit),
  };
};

export const getStockHistory = async (query = {}) => {
  const { page, limit, skip } = getPaginationParams(query, 50, 200);
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
  const { page, limit, skip } = getPaginationParams(query, 50, 200);
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
  const { productId, warehouseId, type = 'ADD', quantity, reason } = adjustmentData;

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw ApiError.notFound('Product not found in inventory catalog');
      }

      const prevStock = Number(product.stock ?? product.stockQuantity ?? 0);
      const absQty = Math.abs(Number(quantity));

      if (isNaN(absQty) || absQty === 0) {
        throw ApiError.badRequest('Adjustment quantity must be greater than zero');
      }

      // Check whether this is an addition or removal
      const isRemoval =
        type === 'REMOVE' ||
        type === 'REDUCE' ||
        type === 'DAMAGE' ||
        type === 'OUT' ||
        type === 'DEDUCT' ||
        Number(quantity) < 0;

      const delta = isRemoval ? -absQty : absQty;
      const newStock = prevStock + delta;

      if (newStock < 0) {
        throw ApiError.badRequest(
          `Cannot reduce stock by ${absQty}. Current stock is ${prevStock}.`
        );
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
        include: { category: { select: { id: true, name: true } } },
      });

      if (warehouseId) {
        const existingWhStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_productId: { warehouseId, productId },
          },
        });
        const whCurrent = existingWhStock ? existingWhStock.quantity : 0;
        const whNew = whCurrent + delta;
        if (whNew < 0) {
          throw ApiError.badRequest(
            `Adjustment would result in negative warehouse stock. Current: ${whCurrent}, Adjustment: ${delta}`
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
          type: isRemoval ? 'REMOVE' : 'ADD',
          quantity: delta,
          previousStock: prevStock,
          newStock,
          reason: `${reason || (isRemoval ? 'Stock Deduction' : 'Stock Addition')}${warehouseId ? ` [Warehouse: ${warehouseId}]` : ''}${user?.name ? ` by ${user.name}` : ''}`,
        },
      });

      return {
        product: mapProduct(updated),
        transaction: { ...stockTx, _id: stockTx.id },
        newStock,
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
