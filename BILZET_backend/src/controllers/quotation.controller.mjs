import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import quotationService from '../services/quotation.service.mjs';

export const getQuotations = asyncHandler(async (req, res) => {
  const { quotations, meta } = await quotationService.getQuotations(req.query, req.user);
  return sendResponse(res, 200, { quotations }, 'Quotations fetched successfully', meta);
});

export const getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await quotationService.getQuotationById(req.params.id, req.user);
  return sendResponse(res, 200, { quotation }, 'Quotation fetched successfully');
});

export const createQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationService.createQuotation(req.body, req.user);
  return sendResponse(res, 201, { quotation }, 'Quotation created successfully');
});

export const updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await quotationService.updateQuotation(req.params.id, req.body, req.user);
  return sendResponse(res, 200, { quotation }, 'Quotation updated successfully');
});

export const updateQuotationStatus = asyncHandler(async (req, res) => {
  const quotation = await quotationService.updateQuotationStatus(req.params.id, req.body.status, req.user);
  return sendResponse(res, 200, { quotation }, 'Quotation status updated successfully');
});

export const convertToInvoice = asyncHandler(async (req, res) => {
  const result = await quotationService.convertToInvoice(req.params.id, req.body, req.user, { req });
  return sendResponse(res, 200, result, result.message || 'Quotation converted to invoice successfully');
});

export const deleteQuotation = asyncHandler(async (req, res) => {
  await quotationService.deleteQuotation(req.params.id, req.user);
  return sendResponse(res, 200, {}, 'Quotation deleted successfully');
});

export default {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  convertToInvoice,
  deleteQuotation,
};
