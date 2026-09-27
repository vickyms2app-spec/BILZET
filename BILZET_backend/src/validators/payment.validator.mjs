import { z } from 'zod';
import { PAYMENT_METHODS } from '../utils/constants.mjs';

export const collectCreditPaymentSchema = z.object({
  customerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid customer ID'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  method: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const supplierPaymentSchema = z.object({
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid supplier ID'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  method: z.enum(PAYMENT_METHODS),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export default {
  collectCreditPaymentSchema,
  supplierPaymentSchema
};
