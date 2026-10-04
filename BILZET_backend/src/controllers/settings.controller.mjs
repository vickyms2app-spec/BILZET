import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import prisma from '../config/prisma.mjs';

let customizerStore = {
  template: 'modern',
  themeColor: '#1a5cff',
  invoiceTitle: 'TAX INVOICE',
  showHsnSummary: true,
  showBankDetails: true,
  showQrCode: true,
  showSignatory: true,
  showTerms: true,
  showAmountInWords: true,
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200012345678',
  ifsc: 'HDFC0001234',
  accountHolder: 'BILZET Retail Mart',
  upiId: 'bilzet@hdfcbank',
};

export const getShopSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.shopSettings.findFirst();
  if (!settings) {
    settings = await prisma.shopSettings.create({
      data: {
        shopName: 'BILZET Retail Mart',
        ownerName: 'demo',
        phone: '+91 9876543210',
        email: 'billing@bilzet.app',
        address: '123 Commercial Plaza, Main Market',
        gstin: '33AAAAA0000A1Z5',
        state: 'Tamil Nadu',
        stateCode: '33',
        invoicePrefix: 'INV-2026-',
        paperSize: 'A4',
      },
    });
  }

  const merged = {
    ...customizerStore,
    ...settings,
    _id: settings.id,
  };

  return sendResponse(res, 200, { settings: merged }, 'Shop settings fetched successfully');
});

export const updateShopSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.shopSettings.findFirst();

  // Update in-memory customizer store with any customization fields
  const customizerKeys = [
    'template', 'themeColor', 'invoiceTitle', 'showHsnSummary', 'showBankDetails',
    'showQrCode', 'showSignatory', 'showTerms', 'showAmountInWords',
    'bankName', 'accountNumber', 'ifsc', 'accountHolder', 'upiId'
  ];
  for (const k of customizerKeys) {
    if (req.body[k] !== undefined) {
      customizerStore[k] = req.body[k];
    }
  }

  // Database-supported columns in Prisma schema
  const dbAllowed = [
    'shopName', 'ownerName', 'phone', 'email', 'address',
    'gstin', 'state', 'stateCode', 'invoicePrefix', 'paperSize', 'terms'
  ];
  const dbData = {};
  for (const key of dbAllowed) {
    if (req.body[key] !== undefined) {
      dbData[key] = req.body[key];
    }
  }

  if (!settings) {
    settings = await prisma.shopSettings.create({ data: dbData });
  } else {
    settings = await prisma.shopSettings.update({
      where: { id: settings.id },
      data: dbData,
    });
  }

  const merged = {
    ...customizerStore,
    ...settings,
    _id: settings.id,
  };

  return sendResponse(res, 200, { settings: merged }, 'Shop settings updated successfully');
});

export default {
  getShopSettings,
  updateShopSettings,
};
