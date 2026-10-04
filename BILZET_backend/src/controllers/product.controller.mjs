import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';
import { generateBarcodeBuffer, generateBarcodeString } from '../utils/generateBarcode.mjs';

const mapProduct = (p) => {
  if (!p) return null;
  return {
    ...p,
    _id: p.id,
    categoryId: p.categoryId || p.category?.id || null,
    category: p.category ? { ...p.category, _id: p.category.id } : null,
    sellingPrice: Number(p.sellingPrice),
    purchasePrice: Number(p.purchasePrice),
    gstRate: Number(p.gstRate),
  };
};

export const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const where = {};

  if (req.query.categoryId) where.categoryId = req.query.categoryId;
  if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: 'insensitive' } },
      { sku: { contains: req.query.search, mode: 'insensitive' } },
      { barcode: { contains: req.query.search, mode: 'insensitive' } },
      { brand: { contains: req.query.search, mode: 'insensitive' } },
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

  return sendResponse(
    res,
    200,
    { products: products.map(mapProduct) },
    'Products fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return sendResponse(res, 200, { product: mapProduct(product) }, 'Product fetched successfully');
});

export const getProductByBarcode = asyncHandler(async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { barcode: req.params.barcode, isActive: true },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) {
    throw ApiError.notFound(`No active product found with barcode '${req.params.barcode}'`);
  }
  return sendResponse(res, 200, { product: mapProduct(product) }, 'Product fetched successfully');
});

export const getLowStockProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  
  // Products where stock <= minimumStock
  const allActive = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { stock: 'asc' },
  });

  const lowStock = allActive.filter((p) => p.stock <= p.minimumStock);
  const total = lowStock.length;
  const paginated = lowStock.slice(skip, skip + limit);

  return sendResponse(
    res,
    200,
    { products: paginated.map(mapProduct) },
    'Low stock products fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    sku,
    barcode,
    categoryId,
    category,
    brand,
    unit = 'piece',
    purchasePrice = 0,
    sellingPrice,
    gstRate = 0,
    stock = 0,
    minimumStock = 5,
  } = req.body;

  const resolvedCategoryId = categoryId || category || undefined;

  const existingSku = await prisma.product.findUnique({
    where: { sku: sku.toUpperCase() },
  });
  if (existingSku) {
    throw ApiError.conflict(`Product with SKU '${sku}' already exists`);
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku: sku.toUpperCase(),
      barcode: barcode || generateBarcodeString(),
      categoryId: resolvedCategoryId,
      brand,
      unit,
      purchasePrice,
      sellingPrice,
      gstRate,
      stock: Number(stock),
      minimumStock: Number(minimumStock),
    },
    include: { category: true },
  });

  if (stock > 0) {
    await prisma.stockTransaction.create({
      data: {
        productId: product.id,
        type: 'INITIAL',
        quantity: Number(stock),
        previousStock: 0,
        newStock: Number(stock),
        reason: 'Initial stock recorded during creation',
      },
    });
  }

  return sendResponse(res, 201, { product: mapProduct(product) }, 'Product created successfully');
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Product not found');
  }

  const {
    name,
    sku,
    barcode,
    categoryId,
    category,
    brand,
    unit,
    purchasePrice,
    sellingPrice,
    gstRate,
    stock,
    minimumStock,
    isActive,
  } = req.body;

  const resolvedCategoryId =
    categoryId !== undefined
      ? categoryId || null
      : category !== undefined
      ? category || null
      : undefined;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(sku && { sku: sku.toUpperCase() }),
      ...(barcode && { barcode }),
      ...(resolvedCategoryId !== undefined && { categoryId: resolvedCategoryId }),
      ...(brand !== undefined && { brand }),
      ...(unit && { unit }),
      ...(purchasePrice !== undefined && { purchasePrice: Number(purchasePrice) }),
      ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
      ...(gstRate !== undefined && { gstRate: Number(gstRate) }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(minimumStock !== undefined && { minimumStock: Number(minimumStock) }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { category: true },
  });

  return sendResponse(res, 200, { product: mapProduct(updated) }, 'Product updated successfully');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hasSales = await prisma.saleItem.count({ where: { productId: id } });
  if (hasSales > 0) {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return sendResponse(
      res,
      200,
      { product: mapProduct(product) },
      'Product has historical sales and has been marked as inactive'
    );
  }

  await prisma.product.delete({ where: { id } });
  return sendResponse(res, 200, {}, 'Product deleted successfully');
});

export const getProductBarcodeImage = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }

  const barcode = product.barcode || generateBarcodeString();
  const pngBuffer = await generateBarcodeBuffer(barcode);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="barcode-${product.sku}.png"`);
  return res.send(pngBuffer);
});

export default {
  getProducts,
  getProductById,
  getProductByBarcode,
  getLowStockProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBarcodeImage,
};
