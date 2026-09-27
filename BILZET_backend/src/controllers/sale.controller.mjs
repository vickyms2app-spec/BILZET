import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import billingService from '../services/billing.service.mjs';

export const createSale = asyncHandler(async (req, res) => {
  const sale = await billingService.createSale(req.body, req.user, { req });
  return sendResponse(res, 201, { sale }, 'Sale created successfully');
});

export const getSales = asyncHandler(async (req, res) => {
  // If user is Cashier, they can optionally view only their own sales or all
  const query = { ...req.query };
  if (req.user.role === 'CASHIER' && query.ownOnly === 'true') {
    query.cashier = req.user._id;
  }

  const { sales, meta } = await billingService.getSales(query);
  return sendResponse(res, 200, { sales }, 'Sales fetched successfully', meta);
});

export const getSaleById = asyncHandler(async (req, res) => {
  const sale = await billingService.getSaleById(req.params.id);
  return sendResponse(res, 200, { sale }, 'Sale fetched successfully');
});

export const returnSale = asyncHandler(async (req, res) => {
  const sale = await billingService.returnSale(req.params.id, req.body, req.user, { req });
  return sendResponse(res, 200, { sale }, 'Sale return processed successfully');
});

export default {
  createSale,
  getSales,
  getSaleById,
  returnSale
};
