import { z } from 'zod';
import { STOCK_TRANSACTION_TYPES } from '../utils/constants.mjs';

export const stockAdjustmentSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  type: z.enum([
    STOCK_TRANSACTION_TYPES.ADJUSTMENT,
    STOCK_TRANSACTION_TYPES.DAMAGE,
    STOCK_TRANSACTION_TYPES.INITIAL
  ]),
  quantity: z.number().int().refine((val) => val !== 0, 'Adjustment quantity cannot be 0'),
  reason: z.string().min(3, 'A reason of at least 3 characters is required').trim()
});

export default {
  stockAdjustmentSchema
};
