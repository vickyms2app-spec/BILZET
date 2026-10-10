import { z } from 'zod';
import { STOCK_TRANSACTION_TYPES } from '../utils/constants.mjs';

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  warehouseId: z.preprocess((val) => (val === '' ? null : val), z.string().optional().nullable()),
  type: z.string().optional(),
  quantity: z.coerce.number().int().refine((val) => val !== 0, 'Adjustment quantity cannot be 0'),
  reason: z.string().min(1, 'A reason is required').trim(),
});

export default {
  stockAdjustmentSchema,
};
