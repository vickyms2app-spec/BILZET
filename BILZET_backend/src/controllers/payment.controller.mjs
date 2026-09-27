import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import paymentService from '../services/payment.service.mjs';

export const collectCreditPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.collectCreditPayment(req.body, req.user, { req });
  return sendResponse(res, 201, result, 'Credit payment collected successfully');
});

export const makeSupplierPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.makeSupplierPayment(req.body, req.user, { req });
  return sendResponse(res, 201, result, 'Supplier payment recorded successfully');
});

export const getPayments = asyncHandler(async (req, res) => {
  const { payments, meta } = await paymentService.getPayments(req.query);
  return sendResponse(res, 200, { payments }, 'Payments fetched successfully', meta);
});

export default {
  collectCreditPayment,
  makeSupplierPayment,
  getPayments
};
