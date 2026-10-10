import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

export const getCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, 100);
  const where = {};

  const activeBusinessId = req.query.businessId || req.headers['x-business-id'] || req.user?.businessId;
  if (activeBusinessId) {
    where.businessId = activeBusinessId;
  }

  if (req.query.isActive !== undefined) {
    where.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    where.name = { contains: req.query.search, mode: 'insensitive' };
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { products: true } },
      },
    }),
    prisma.category.count({ where }),
  ]);

  const mapped = categories.map((c) => ({
    ...c,
    _id: c.id,
    productCount: c._count?.products || 0,
  }));

  return sendResponse(
    res,
    200,
    { categories: mapped },
    'Categories fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
  });
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  return sendResponse(res, 200, { category: { ...category, _id: category.id } }, 'Category fetched successfully');
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;
  const trimmedName = name?.trim();
  const activeBusinessId = req.body.businessId || req.headers['x-business-id'] || req.user?.businessId || 'busi-01';

  const existing = await prisma.category.findFirst({
    where: {
      name: { equals: trimmedName, mode: 'insensitive' },
      ...(activeBusinessId ? { businessId: activeBusinessId } : {}),
    },
  });
  if (existing) {
    throw ApiError.conflict(`Category '${trimmedName}' already exists`);
  }

  const category = await prisma.category.create({
    data: {
      name: trimmedName,
      description: description?.trim() || '',
      isActive: isActive !== undefined ? isActive : true,
      businessId: activeBusinessId,
    },
  });

  return sendResponse(res, 201, { category: { ...category, _id: category.id } }, 'Category created successfully');
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw ApiError.notFound('Category not found');
  }

  const trimmedName = name !== undefined ? name.trim() : undefined;
  if (trimmedName && trimmedName.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.category.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        ...(existing.businessId ? { businessId: existing.businessId } : {}),
      },
    });
    if (duplicate && duplicate.id !== id) {
      throw ApiError.conflict(`Category '${trimmedName}' already exists`);
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(trimmedName && { name: trimmedName }),
      ...(description !== undefined && { description: description.trim() }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return sendResponse(res, 200, { category: { ...category, _id: category.id } }, 'Category updated successfully');
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Safe deletion check: cannot delete category if any active or inactive products are assigned to it
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw ApiError.badRequest('This category contains products and cannot be deleted. Reassign the products first.');
  }

  await prisma.category.delete({ where: { id } });
  return sendResponse(res, 200, {}, 'Category deleted successfully');
});

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
