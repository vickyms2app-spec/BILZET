import { z } from 'zod';

export const updateShopSettingsSchema = z.object({
  shopName: z.string().min(1).optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  logo: z.string().optional(),
  invoicePrefix: z.string().min(1).max(10).optional(),
  currency: z.string().optional(),
  taxSettings: z
    .object({
      enableGst: z.boolean().optional(),
      defaultGstRate: z.number().min(0).max(100).optional()
    })
    .optional(),
  upiId: z.string().optional()
});

export default {
  updateShopSettingsSchema
};
