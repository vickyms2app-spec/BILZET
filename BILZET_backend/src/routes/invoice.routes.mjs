import { Router } from 'express';
import invoiceController from '../controllers/invoice.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Accessible by users with billing.view permission (CASHIER, MANAGER, ADMIN, OWNER)
router.get('/:saleId/pdf', requirePermission('billing.view'), invoiceController.getInvoicePdf);

export default router;
