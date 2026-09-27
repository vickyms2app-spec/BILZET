import { z } from 'zod';
import { PRODUCT_UNITS } from '../utils/constants.mjs';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').trim(),
  sku: z.string().min(1, 'SKU is required').trim().toUpperCase(),
  barcode: z.string().trim().optional(),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
  brand: z.string().trim().optional(),
  description: z.string().trim().optional(),
  unit: z.enum(PRODUCT_UNITS).optional().default('piece'),
  purchasePrice: z.number().nonnegative('Purchase price cannot be negative'),
  sellingPrice: z.number().nonnegative('Selling price cannot be negative'),
  gstRate: z.number().min(0).max(100).optional().default(0),
  stock: z.number().int().min(0, 'Initial stock cannot be negative').optional().default(0),
  minimumStock: z.number().int().min(0).optional().default(5),
  isActive: z.boolean().optional().default(true)
});

export const updateProductSchema = createProductSchema.partial();

export const queryProductSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  lowStock: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export default {
  createProductSchema,
  updateProductSchema,
  queryProductSchema
};
