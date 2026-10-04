import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').trim(),
  phone: z.string().trim().min(5, 'Valid phone number is required').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').trim().toLowerCase().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  gstin: z.string().trim().toUpperCase().optional().or(z.literal('')),
  state: z.string().trim().optional().or(z.literal('')),
  creditLimit: z.number().min(0).optional().default(0),
  balance: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true)
});

export const updateCustomerSchema = createCustomerSchema.partial();

export default {
  createCustomerSchema,
  updateCustomerSchema
};
