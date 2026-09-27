import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import inventoryService from '../services/inventory.service.mjs';

export const getInventoryOverview = asyncHandler(async (req, res) => {
  const { inventory, meta } = await inventoryService.getInventoryOverview(req.query);
  return sendResponse(res, 200, { inventory }, 'Inventory overview fetched successfully', meta);
});

export const getLowStockProducts = asyncHandler(async (req, res) => {
  const { products, meta } = await inventoryService.getLowStockProducts(req.query);
  return sendResponse(res, 200, { products }, 'Low stock products fetched successfully', meta);
});

export const getStockHistory = asyncHandler(async (req, res) => {
  const { transactions, meta } = await inventoryService.getStockHistory(req.query);
  return sendResponse(res, 200, { transactions }, 'Stock history fetched successfully', meta);
});

export const getProductStockHistory = asyncHandler(async (req, res) => {
  const { transactions, meta } = await inventoryService.getProductStockHistory(
    req.params.productId,
    req.query
  );
  return sendResponse(res, 200, { transactions }, 'Product stock history fetched successfully', meta);
});

export const adjustStock = asyncHandler(async (req, res) => {
  const result = await inventoryService.adjustStock(req.body, req.user, { req });
  return sendResponse(res, 200, result, 'Stock adjusted successfully');
});

export default {
  getInventoryOverview,
  getLowStockProducts,
  getStockHistory,
  getProductStockHistory,
  adjustStock
};
