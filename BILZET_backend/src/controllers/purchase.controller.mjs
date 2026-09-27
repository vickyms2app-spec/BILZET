import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import purchaseService from '../services/purchase.service.mjs';

export const createPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase(req.body, req.user, { req });
  return sendResponse(res, 201, { purchase }, 'Purchase order created successfully');
});

export const getPurchases = asyncHandler(async (req, res) => {
  const { purchases, meta } = await purchaseService.getPurchases(req.query);
  return sendResponse(res, 200, { purchases }, 'Purchases fetched successfully', meta);
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.getPurchaseById(req.params.id);
  return sendResponse(res, 200, { purchase }, 'Purchase fetched successfully');
});

export default {
  createPurchase,
  getPurchases,
  getPurchaseById
};
