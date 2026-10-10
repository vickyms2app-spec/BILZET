import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import caPortalService from '../services/caPortal.service.mjs';

/**
 * Controller for the Chartered Accountant (CA) Portal.
 * All actions are strictly role-guarded on the server.
 */

export const getAuthorizedStores = asyncHandler(async (req, res) => {
  const stores = await caPortalService.getAuthorizedStoresForCA(req.user);
  return sendResponse(res, 200, { stores, total: stores.length }, 'Authorized stores retrieved successfully');
});

export const getInvoices = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreInvoicesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Invoices retrieved successfully', result.meta);
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await caPortalService.getInvoiceByIdForCA(req.user, req.params.id);
  return sendResponse(res, 200, { invoice }, 'Invoice details retrieved successfully');
});

export const getInvoiceAuditTrail = asyncHandler(async (req, res) => {
  const auditData = await caPortalService.getInvoiceAuditTrailForCA(req.user, req.params.id);
  return sendResponse(res, 200, auditData, 'Invoice audit trail retrieved successfully');
});

export const getFinancialSummary = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const summary = await caPortalService.getFinancialSummaryForCA(req.user, storeId, query);
  return sendResponse(res, 200, { summary }, 'Financial summary retrieved successfully');
});

export const getInvoiceCreditNotes = asyncHandler(async (req, res) => {
  const result = await caPortalService.getInvoiceCreditNotesForCA(req.user, req.params.id);
  return sendResponse(res, 200, result, 'Invoice credit notes retrieved successfully');
});

export const getCreditNotes = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreCreditNotesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Store credit notes retrieved successfully');
});

export default {
  getAuthorizedStores,
  getInvoices,
  getInvoiceById,
  getInvoiceAuditTrail,
  getFinancialSummary,
  getInvoiceCreditNotes,
  getCreditNotes,
};

