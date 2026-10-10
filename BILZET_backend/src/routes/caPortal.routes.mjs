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
router.get('/invoices/:id/credit-notes', caPortalController.getInvoiceCreditNotes);
router.get('/invoices/:id', caPortalController.getInvoiceById);
router.get('/credit-notes', caPortalController.getCreditNotes);
router.get('/financial-summary', caPortalController.getFinancialSummary);

export default router;

