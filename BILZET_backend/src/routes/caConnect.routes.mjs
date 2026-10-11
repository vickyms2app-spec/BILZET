import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePremiumPlan } from '../middleware/plan.middleware.mjs';
import { requireAnyPermission } from '../middleware/permission.middleware.mjs';
import * as caConnectController from '../controllers/caConnect.controller.mjs';
import caPortalController from '../controllers/caPortal.controller.mjs';

const router = Router();

// All routes require user authentication
router.use(authMiddleware);

// Status check (returns whether user has unlocked status or locked status with current plan info)
router.get('/status', caConnectController.getStatus);

// CA Connect & Invoice History Synchronization Endpoints
router.get('/stores', caPortalController.getAuthorizedStores);
router.get('/invoices', caPortalController.getInvoices);
router.get('/invoices/:id/audit-trail', caPortalController.getInvoiceAuditTrail);
router.get('/invoices/:id/activity', caPortalController.getInvoiceAuditTrail);
router.get('/invoices/:id/credit-notes', caPortalController.getInvoiceCreditNotes);
router.get('/invoices/:id', caPortalController.getInvoiceById);
router.get('/activity', caPortalController.getStoreActivity);
router.get('/credit-notes', caPortalController.getCreditNotes);
router.get('/financial-summary', caPortalController.getFinancialSummary);

// Operational CA invitation endpoints guarded by requirePremiumPlan for store merchants
router.use(requirePremiumPlan);

router.get('/', requireAnyPermission('staff.view', 'team.view', 'gst.view', 'reports.view'), caConnectController.getConnectedAccountants);
router.get('/accountants', requireAnyPermission('staff.view', 'team.view', 'gst.view', 'reports.view'), caConnectController.getConnectedAccountants);
router.post('/invite', requireAnyPermission('staff.create', 'team.manage', 'team.create'), caConnectController.inviteAccountant);
router.delete('/:id', requireAnyPermission('staff.delete', 'team.manage', 'team.delete'), caConnectController.revokeAccountant);
router.delete('/invite/:id', requireAnyPermission('staff.delete', 'team.manage', 'team.delete'), caConnectController.revokeAccountant);

export default router;
