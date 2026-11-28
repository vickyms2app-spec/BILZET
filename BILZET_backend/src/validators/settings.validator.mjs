import { z } from 'zod';

const optStr = z.string().nullable().optional();
const optBool = z.boolean().nullable().optional();

export const updateShopSettingsSchema = z.object({
  shopName: z.string().min(1).nullable().optional(),
  name: z.string().min(1).nullable().optional(),
  ownerName: optStr,
  phone: optStr,
  email: z.string().email().nullable().optional().or(z.literal('')),
  address: optStr,
  city: optStr,
  state: optStr,
  stateCode: optStr,
  pincode: optStr,
  gstin: optStr,
  pan: optStr,
  logo: optStr,
  invoicePrefix: z.string().max(20).nullable().optional(),
  paperSize: optStr,
  terms: optStr,
  currency: optStr,
  template: optStr,
  themeColor: optStr,
  invoiceTitle: optStr,
  showHsnSummary: optBool,
  showBankDetails: optBool,
  showQrCode: optBool,
  showSignatory: optBool,
  showTerms: optBool,
  showAmountInWords: optBool,
  bankName: optStr,
  accountNumber: optStr,
  ifsc: optStr,
  accountHolder: optStr,
  upiId: optStr,
  taxSettings: z
    .object({
      enableGst: optBool,
      defaultGstRate: z.number().min(0).max(100).nullable().optional(),
    })
    .nullable()
    .optional(),
  logoUrl: optStr,
  signatureUrl: optStr,
  showLogoOnInvoices: optBool,
  showSignatureOnInvoices: optBool,
}).passthrough();

export default {
  updateShopSettingsSchema,
};
