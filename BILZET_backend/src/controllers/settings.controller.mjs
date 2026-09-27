import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import prisma from '../config/prisma.mjs';

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
  return sendResponse(res, 200, { settings: { ...settings, _id: settings.id } }, 'Shop settings fetched successfully');
});

export const updateShopSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.shopSettings.findFirst();
  const allowed = [
    'shopName', 'ownerName', 'phone', 'email', 'address',
    'gstin', 'state', 'stateCode', 'invoicePrefix', 'paperSize', 'terms'
  ];
  const data = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      data[key] = req.body[key];
    }
  }

  if (!settings) {
    settings = await prisma.shopSettings.create({ data });
  } else {
    settings = await prisma.shopSettings.update({
      where: { id: settings.id },
      data,
    });
  }

  return sendResponse(res, 200, { settings: { ...settings, _id: settings.id } }, 'Shop settings updated successfully');
});

export default {
  getShopSettings,
  updateShopSettings,
};
