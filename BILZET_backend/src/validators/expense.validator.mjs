import { z } from 'zod';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../utils/constants.mjs';

export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive('Amount must be greater than zero'),
  description: z.string().trim().optional(),
  date: z.string().datetime().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default('cash')
});

export const updateExpenseSchema = createExpenseSchema.partial();

export default {
  createExpenseSchema,
  updateExpenseSchema
};
