import { z } from 'zod';
import { PAYMENT_METHODS } from '../utils/constants.mjs';

// UUID v4 pattern (PostgreSQL) or legacy 24-char hex (MongoDB compat)
const flexibleIdPattern = /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

export const createSaleSchema = z.object({
  customerId: z
    .string()
    .regex(flexibleIdPattern, 'Invalid customer ID')
    .nullable()
    .optional(),
  items: z
    .array(
      z.object({
        // productId is optional — null/undefined means ad-hoc/custom item (no catalog FK)
        productId: z
          .string()
          .nullable()
          .optional(),
        name: z.string().trim().optional(),
        quantity: z.number().positive('Quantity must be greater than 0'),
        rate: z.number().nonnegative().optional(),
        price: z.number().nonnegative().optional(),
        sellingPrice: z.number().nonnegative().optional(),
        discount: z.number().nonnegative().optional().default(0),
        gstRate: z.number().nonnegative().optional(),
        taxPercent: z.number().nonnegative().optional(),
        isTaxInclusive: z.boolean().optional(),
        pricingMethod: z.enum(['INCLUSIVE', 'EXCLUSIVE']).optional(),
        hsn: z.string().optional(),
        hsnCode: z.string().optional(),
        sku: z.string().optional(),
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
