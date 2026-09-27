import { z } from 'zod';
import { PAYMENT_METHODS } from '../utils/constants.mjs';

export const createSaleSchema = z.object({
  customerId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID')
    .nullable()
    .optional(),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        discount: z.number().nonnegative().optional().default(0)
      })
    )
    .min(1, 'At least one item is required for a sale'),
  discount: z.number().nonnegative().optional().default(0),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paidAmount: z.number().nonnegative().optional().default(0),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const returnSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
        quantity: z.number().int().min(1, 'Return quantity must be at least 1')
      })
    )
    .min(1, 'At least one return item is required'),
  refundMethod: z.enum(PAYMENT_METHODS).optional().default('cash'),
  reason: z.string().trim().optional()
});

export default {
  createSaleSchema,
  returnSaleSchema
};
