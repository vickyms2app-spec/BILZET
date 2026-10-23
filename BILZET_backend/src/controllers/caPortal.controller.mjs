import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import caPortalService from '../services/caPortal.service.mjs';
import auditRulesService from '../services/auditRules.service.mjs';
import bankReconciliationService from '../services/bankReconciliation.service.mjs';
import caWorkpapersService from '../services/caWorkpapers.service.mjs';
import caExceptionsService from '../services/caExceptions.service.mjs';

/**
 * Controller for the Chartered Accountant (CA) Portal.
 * All actions are strictly role-guarded on the server.
 */

const resolveStoreId = (req) => {
  return (
    req.query?.storeId ||
    req.query?.businessId ||
    req.body?.storeId ||
    req.body?.businessId ||
    req.headers?.['x-business-id'] ||
    req.headers?.['x-store-id'] ||
    req.user?.businessId ||
    null
  );
};

export const getAuthorizedStores = asyncHandler(async (req, res) => {
  const stores = await caPortalService.getAuthorizedStoresForCA(req.user);
  return sendResponse(res, 200, { stores, total: stores.length }, 'Authorized stores retrieved successfully');
});

export const getInvoices = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
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
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const summary = await caPortalService.getFinancialSummaryForCA(req.user, storeId, query);
  return sendResponse(res, 200, { summary }, 'Financial summary retrieved successfully');
});

export const getInvoiceCreditNotes = asyncHandler(async (req, res) => {
  const result = await caPortalService.getInvoiceCreditNotesForCA(req.user, req.params.id);
  return sendResponse(res, 200, result, 'Invoice credit notes retrieved successfully');
});

export const getCreditNotes = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStoreCreditNotesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Store credit notes retrieved successfully');
});

export const getStoreActivity = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStoreActivityForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Store invoice activity ledger retrieved successfully');
});

export const getPurchases = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStorePurchasesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Purchases retrieved successfully', result.meta);
});

export const getSuppliers = asyncHandler(async (req, res) => {
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStoreSuppliersForCA(req.user, storeId);
  return sendResponse(res, 200, result, 'Suppliers retrieved successfully');
});

export const getPayments = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStorePaymentsForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Payments retrieved successfully', result.meta);
});

export const getExpenses = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStoreExpensesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Expenses retrieved successfully', result.meta);
});

export const getInventory = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStoreInventoryForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Inventory audit retrieved successfully', result.meta);
});

export const getTasks = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStoreTasksForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Audit tasks retrieved successfully');
});

export const createTask = asyncHandler(async (req, res) => {
  const storeId = resolveStoreId(req);
  const task = await caPortalService.createTaskForCA(req.user, storeId, req.body);
  return sendResponse(res, 201, { task }, 'Audit task created successfully');
});

export const updateTask = asyncHandler(async (req, res) => {
  const storeId = resolveStoreId(req);
  const task = await caPortalService.updateTaskForCA(req.user, storeId, req.params.id, req.body);
  return sendResponse(res, 200, { task }, 'Audit task updated successfully');
});

export const deleteTask = asyncHandler(async (req, res) => {
  const storeId = resolveStoreId(req);
  const result = await caPortalService.deleteTaskForCA(req.user, storeId, req.params.id);
  return sendResponse(res, 200, result, 'Audit task deleted successfully');
});

export const getDiscrepancies = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caPortalService.getStoreDiscrepanciesForCA(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Discrepancies retrieved successfully');
});

export const flagDiscrepancy = asyncHandler(async (req, res) => {
  const storeId = resolveStoreId(req);
  const discrepancy = await caPortalService.flagDiscrepancyForCA(req.user, storeId, req.body);
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

export const requestInvoiceCorrection = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const discrepancy = await caPortalService.requestInvoiceCorrection(
    req.user,
    storeId || req.body.storeId,
    req.params.id,
    req.body
  );
  return sendResponse(res, 201, { discrepancy }, 'Invoice correction requested and registered in audit log');
});

export const approveInvoiceCorrection = asyncHandler(async (req, res) => {
  const result = await caPortalService.approveInvoiceCorrection(req.user, req.params.id, req.body);
  return sendResponse(res, 200, result, 'Invoice correction approved, applied to record, and broadcast');
});

export const rejectInvoiceCorrection = asyncHandler(async (req, res) => {
  const discrepancy = await caPortalService.rejectInvoiceCorrection(req.user, req.params.id, req.body);
  return sendResponse(res, 200, { discrepancy }, 'Invoice correction rejected and recorded');
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

// ══════════════════════════════════════════════════════════════
// AUDIT RULES ENGINE HANDLERS
// ══════════════════════════════════════════════════════════════
export const getAuditRules = asyncHandler(async (req, res) => {
  const { storeId, autoCreateTasks } = req.query;
  const result = await auditRulesService.runAuditRulesEngine(req.user, storeId, {
    autoCreateTasks: autoCreateTasks === 'true' || autoCreateTasks === true,
  });
  return sendResponse(res, 200, result, 'Audit rules evaluated successfully');
});

export const runAuditRules = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const result = await auditRulesService.runAuditRulesEngine(req.user, storeId || req.body.storeId, {
    autoCreateTasks: req.body.autoCreateTasks ?? true,
  });
  return sendResponse(res, 200, result, 'Audit rules executed and exceptions logged');
});

// ══════════════════════════════════════════════════════════════
// BANK RECONCILIATION HANDLERS
// ══════════════════════════════════════════════════════════════
export const getBankReconciliation = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const result = await bankReconciliationService.getBankReconciliationSession(req.user, storeId);
  return sendResponse(res, 200, result, 'Bank reconciliation session retrieved successfully');
});

export const importBankStatement = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const result = await bankReconciliationService.importBankStatement(req.user, storeId || req.body.storeId, req.body);
  return sendResponse(res, 200, result, 'Bank statement imported and reconciled successfully');
});

export const updateBankMatch = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const { action, matchDetails } = req.body;
  const result = await bankReconciliationService.updateStatementRowMatch(
    req.user,
    storeId || req.body.storeId,
    req.params.id,
    action,
    matchDetails
  );
  return sendResponse(res, 200, result, 'Statement row match status updated');
});

// ══════════════════════════════════════════════════════════════
// WORKPAPERS AND REPORTS HANDLERS
// ══════════════════════════════════════════════════════════════
export const getWorkpapers = asyncHandler(async (req, res) => {
  const { storeId, ...query } = req.query;
  const workpapers = await caWorkpapersService.generateAuditWorkpapers(req.user, storeId, query);
  return sendResponse(res, 200, { workpapers }, 'CA Audit workpapers compiled successfully');
});

// ══════════════════════════════════════════════════════════════
// EXCEPTIONS INBOX HANDLERS (B2B, B2C, SEZ & LIVE SYNC)
// ══════════════════════════════════════════════════════════════
export const getExceptions = asyncHandler(async (req, res) => {
  const { storeId: _, ...query } = req.query;
  const storeId = resolveStoreId(req);
  const result = await caExceptionsService.getStoreExceptions(req.user, storeId, query);
  return sendResponse(res, 200, result, 'Exceptions retrieved successfully', result.meta);
});

export const getExceptionDetail = asyncHandler(async (req, res) => {
  const result = await caExceptionsService.getExceptionById(req.user, req.params.id);
  return sendResponse(res, 200, result, 'Exception details retrieved successfully');
});

export const syncExceptions = asyncHandler(async (req, res) => {
  const storeId = resolveStoreId(req);
  const result = await caExceptionsService.syncStoreExceptions(req.user, storeId);
  return sendResponse(res, 200, result, 'Billing exceptions synchronized successfully');
});

export const updateExceptionStatus = asyncHandler(async (req, res) => {
  const result = await caExceptionsService.updateExceptionStatus(req.user, req.params.id, req.body);
  return sendResponse(res, 200, result, 'Exception status updated successfully');
});

export const addExceptionNote = asyncHandler(async (req, res) => {
  const result = await caExceptionsService.addExceptionNote(req.user, req.params.id, req.body);
  return sendResponse(res, 200, result, 'Review note added successfully');
});

export const requestExceptionDocument = asyncHandler(async (req, res) => {
  const result = await caExceptionsService.requestExceptionDocument(req.user, req.params.id, req.body);
  return sendResponse(res, 200, result, 'Document requested successfully');
});

export const classifyExceptionCustomer = asyncHandler(async (req, res) => {
  const result = await caExceptionsService.classifyExceptionCustomer(req.user, req.params.id, req.body);
  return sendResponse(res, 200, result, 'Customer classification updated successfully');
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
  requestInvoiceCorrection,
  approveInvoiceCorrection,
  rejectInvoiceCorrection,
  getDocuments,
  createDocument,
  getPeriodClosings,
  closePeriod,
  signOffPeriod,
  getAuditRules,
  runAuditRules,
  getBankReconciliation,
  importBankStatement,
  updateBankMatch,
  getWorkpapers,
  getExceptions,
  getExceptionDetail,
  syncExceptions,
  updateExceptionStatus,
  addExceptionNote,
  requestExceptionDocument,
  classifyExceptionCustomer,
};

