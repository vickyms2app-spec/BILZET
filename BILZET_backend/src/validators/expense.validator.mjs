import { z } from 'zod';

export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  category: z.string().min(1, 'Category is required').trim(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  description: z.string().trim().optional(),
  note: z.string().trim().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  paymentMethod: z.string().optional().default('cash'),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export default {
  createExpenseSchema,
  updateExpenseSchema
};
