import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').trim(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional().default(true)
});

export const updateCategorySchema = createCategorySchema.partial();

export default {
  createCategorySchema,
  updateCategorySchema
};
