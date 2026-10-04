import { z } from 'zod';

export const updateShopSettingsSchema = z.object({
  shopName: z.string().min(1).optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  logo: z.string().optional(),
  invoicePrefix: z.string().min(1).max(20).optional(),
  paperSize: z.string().optional(),
  terms: z.string().optional(),
  currency: z.string().optional(),
  template: z.string().optional(),
  themeColor: z.string().optional(),
  invoiceTitle: z.string().optional(),
  showHsnSummary: z.boolean().optional(),
  showBankDetails: z.boolean().optional(),
  showQrCode: z.boolean().optional(),
  showSignatory: z.boolean().optional(),
  showTerms: z.boolean().optional(),
  showAmountInWords: z.boolean().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  accountHolder: z.string().optional(),
  upiId: z.string().optional(),
  taxSettings: z
    .object({
      enableGst: z.boolean().optional(),
      defaultGstRate: z.number().min(0).max(100).optional(),
    })
    .optional(),
}).passthrough();

export default {
  updateShopSettingsSchema,
};
