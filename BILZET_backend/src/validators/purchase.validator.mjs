import { z } from 'zod';

export const createPurchaseSchema = z.object({
  supplier: z.string().min(1, 'Invalid supplier ID').optional(),
  supplierId: z.string().min(1, 'Invalid supplier ID').optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Invalid product ID'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        purchasePrice: z.number().nonnegative('Purchase price cannot be negative'),
        gstRate: z.number().min(0).max(100).optional().default(0),
        taxRate: z.number().min(0).max(100).optional(),
        discount: z.number().nonnegative().optional().default(0)
      })
    )
    .min(1, 'At least one purchase item is required'),
  discount: z.number().nonnegative().optional().default(0),
  paidAmount: z.number().nonnegative().optional().default(0),
  purchaseDate: z.string().datetime().optional()
});

export default {
  createPurchaseSchema
};
