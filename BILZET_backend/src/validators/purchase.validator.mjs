import { z } from 'zod';

export const createPurchaseSchema = z.object({
  supplier: z.string().optional(),
  supplierId: z.string().optional(),
  newSupplier: z
    .object({
      name: z.string().min(1, 'Supplier name is required'),
      companyName: z.string().optional().or(z.literal('')),
      phone: z.string().optional().or(z.literal('')),
      email: z.string().optional().or(z.literal('')),
      address: z.string().optional().or(z.literal('')),
      gstin: z.string().optional().or(z.literal('')),
    })
    .optional(),
  items: z
    .array(
      z.object({
        productId: z.string().optional().or(z.literal('')),
        name: z.string().optional().or(z.literal('')),
        sku: z.string().optional().or(z.literal('')),
        barcode: z.string().optional().or(z.literal('')),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        purchasePrice: z.number().nonnegative('Purchase price cannot be negative'),
        gstRate: z.number().min(0).max(100).optional().default(0),
        taxRate: z.number().min(0).max(100).optional(),
        discount: z.number().nonnegative().optional().default(0),
      })
    )
    .min(1, 'At least one purchase item is required'),
  discount: z.number().nonnegative().optional().default(0),
  paidAmount: z.number().nonnegative().optional().default(0),
  purchaseDate: z.string().optional(),
});

export default {
  createPurchaseSchema,
};
