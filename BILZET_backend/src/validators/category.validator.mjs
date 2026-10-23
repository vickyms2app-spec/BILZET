import { z } from 'zod';

export const SUPPORTED_GST_RATES = [0, 3, 5, 12, 18, 28];

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').trim(),
  description: z.string().trim().optional(),
  defaultGstRate: z.coerce
    .number()
    .refine((val) => SUPPORTED_GST_RATES.includes(val), {
      message: 'Default GST rate must be one of: 0%, 3%, 5%, 12%, 18%, 28%',
    })
    .optional()
    .default(18),
  default_gst_rate: z.coerce
    .number()
    .refine((val) => SUPPORTED_GST_RATES.includes(val), {
      message: 'Default GST rate must be one of: 0%, 3%, 5%, 12%, 18%, 28%',
    })
    .optional(),
  isActive: z.boolean().optional().default(true),
  businessId: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export default {
  SUPPORTED_GST_RATES,
  createCategorySchema,
  updateCategorySchema
};
