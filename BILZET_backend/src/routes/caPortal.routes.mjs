import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import caPortalController from '../controllers/caPortal.controller.mjs';

const router = Router();

// ══════════════════════════════════════════════════════════════
// SERVER-SIDE ROLE-BASED ACCESS CONTROL (RBAC)
// ONLY Authenticated Users with 'CA' or 'SUPER_ADMIN' Role are permitted!
// Hiding navigation alone is insufficient — all API requests are validated here.
// ══════════════════════════════════════════════════════════════
router.use(verifyAuth);
router.use(authorizeRoles('CA', 'SUPER_ADMIN'));

router.get('/stores', caPortalController.getAuthorizedStores);
router.get('/invoices', caPortalController.getInvoices);
router.get('/invoices/:id/audit-trail', caPortalController.getInvoiceAuditTrail);
router.get('/invoices/:id/activity', caPortalController.getInvoiceAuditTrail);
router.get('/invoices/:id/credit-notes', caPortalController.getInvoiceCreditNotes);
router.get('/invoices/:id', caPortalController.getInvoiceById);
router.get('/credit-notes', caPortalController.getCreditNotes);
router.get('/financial-summary', caPortalController.getFinancialSummary);
router.get('/activity', caPortalController.getStoreActivity);

// Purchases & Suppliers
router.get('/purchases', caPortalController.getPurchases);
router.get('/suppliers', caPortalController.getSuppliers);

// Payments & Bank Reconciliation
router.get('/payments', caPortalController.getPayments);

// Expenses
router.get('/expenses', caPortalController.getExpenses);

// Inventory & Stock Movements
router.get('/inventory', caPortalController.getInventory);

// Tasks Pipeline
router.get('/tasks', caPortalController.getTasks);
router.post('/tasks', caPortalController.createTask);
router.put('/tasks/:id', caPortalController.updateTask);
router.patch('/tasks/:id', caPortalController.updateTask);
router.delete('/tasks/:id', caPortalController.deleteTask);

// Discrepancies & Corrections
router.get('/discrepancies', caPortalController.getDiscrepancies);
router.post('/discrepancies', caPortalController.flagDiscrepancy);
router.post('/discrepancies/:id/verify', caPortalController.verifyDiscrepancy);
router.patch('/discrepancies/:id/verify', caPortalController.verifyDiscrepancy);
router.post('/discrepancies/:id/approve', caPortalController.approveInvoiceCorrection);
router.patch('/discrepancies/:id/approve', caPortalController.approveInvoiceCorrection);
router.post('/discrepancies/:id/reject', caPortalController.rejectInvoiceCorrection);
router.patch('/discrepancies/:id/reject', caPortalController.rejectInvoiceCorrection);
router.post('/invoices/:id/request-correction', caPortalController.requestInvoiceCorrection);

// Documents & Evidence
router.get('/documents', caPortalController.getDocuments);
router.post('/documents', caPortalController.createDocument);

// Period Closing & Sign-off
router.get('/period-closings', caPortalController.getPeriodClosings);
router.post('/period-closings', caPortalController.closePeriod);
router.post('/period-closings/:id/sign-off', caPortalController.signOffPeriod);

// Audit Rules Engine
router.get('/audit-rules', caPortalController.getAuditRules);
router.post('/audit-rules/run', caPortalController.runAuditRules);

// Bank & Payment Reconciliation
router.get('/bank-reconciliation', caPortalController.getBankReconciliation);
router.post('/bank-reconciliation/import', caPortalController.importBankStatement);
router.patch('/bank-reconciliation/match/:id', caPortalController.updateBankMatch);

// Reports & Workpapers
router.get('/workpapers', caPortalController.getWorkpapers);

export default router;

