import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').trim(),
  companyName: z.string().trim().optional().or(z.literal('')),
  phone: z.string().min(5, 'Valid phone number is required').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase().optional().or(z.literal('')),
  address: z.string().trim().optional(),
  gstin: z.string().trim().toUpperCase().optional(),
  openingBalance: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true)
});

export const updateSupplierSchema = createSupplierSchema.partial();

export default {
  createSupplierSchema,
  updateSupplierSchema
};
