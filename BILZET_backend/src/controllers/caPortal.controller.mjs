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

export const getStoreActivity = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreActivityForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Store invoice activity ledger retrieved successfully');
});

export const getPurchases = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStorePurchasesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Purchases retrieved successfully', result.meta);
});

export const getSuppliers = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const result = await caPortalService.getStoreSuppliersForCA(req.user, storeId);
  return sendResponse(res, 200, result, 'Suppliers retrieved successfully');
});

export const getPayments = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStorePaymentsForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Payments retrieved successfully', result.meta);
});

export const getExpenses = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreExpensesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Expenses retrieved successfully', result.meta);
});

export const getInventory = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreInventoryForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Inventory audit retrieved successfully', result.meta);
});

export const getTasks = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreTasksForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Audit tasks retrieved successfully');
});

export const createTask = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const task = await caPortalService.createTaskForCA(req.user, storeId || req.body.storeId, req.body);
  return sendResponse(res, 201, { task }, 'Audit task created successfully');
});

export const updateTask = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const task = await caPortalService.updateTaskForCA(req.user, storeId || req.body.storeId, req.params.id, req.body);
  return sendResponse(res, 200, { task }, 'Audit task updated successfully');
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const result = await caPortalService.deleteTaskForCA(req.user, storeId, req.params.id);
  return sendResponse(res, 200, result, 'Audit task deleted successfully');
});

export const getDiscrepancies = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreDiscrepanciesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Discrepancies retrieved successfully');
});

export const flagDiscrepancy = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const discrepancy = await caPortalService.flagDiscrepancyForCA(req.user, storeId || req.body.storeId, req.body);
  return sendResponse(res, 201, { discrepancy }, 'Discrepancy flagged and correction requested');
});

export const resolveDiscrepancy = asyncHandler(async (req, res) => {
  const discrepancy = await caPortalService.resolveDiscrepancy(req.user, req.params.id, req.body);
  return sendResponse(res, 200, { discrepancy }, 'Discrepancy correction submitted successfully');
});

export const verifyDiscrepancy = asyncHandler(async (req, res) => {
  const discrepancy = await caPortalService.verifyDiscrepancyForCA(req.user, req.params.id, req.body);
  return sendResponse(res, 200, { discrepancy }, 'Discrepancy verified by CA successfully');
});

export const getDocuments = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const result = await caPortalService.getStoreDocumentsForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Audit documents retrieved successfully');
});

export const createDocument = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const document = await caPortalService.createDocumentForCA(req.user, storeId || req.body.storeId, req.body);
  return sendResponse(res, 201, { document }, 'Evidence document attached successfully');
});

export const getPeriodClosings = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const result = await caPortalService.getStorePeriodClosingsForCA(req.user, storeId);
  return sendResponse(res, 200, result, 'Period closings retrieved successfully');
});

export const closePeriod = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const period = await caPortalService.closePeriodForCA(req.user, storeId || req.body.storeId, req.body);
  return sendResponse(res, 200, { period }, 'Period closed successfully');
});

export const signOffPeriod = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const period = await caPortalService.signOffPeriodForCA(req.user, storeId || req.body.storeId, req.params.id, req.body);
  return sendResponse(res, 200, { period }, 'Period signed off by CA successfully');
});

export default {
  getAuthorizedStores,
  getInvoices,
  getInvoiceById,
  getInvoiceAuditTrail,
  getFinancialSummary,
  getInvoiceCreditNotes,
  getCreditNotes,
  getStoreActivity,
  getPurchases,
  getSuppliers,
  getPayments,
  getExpenses,
  getInventory,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getDiscrepancies,
  flagDiscrepancy,
  resolveDiscrepancy,
  verifyDiscrepancy,
  getDocuments,
  createDocument,
  getPeriodClosings,
  closePeriod,
  signOffPeriod,
};

