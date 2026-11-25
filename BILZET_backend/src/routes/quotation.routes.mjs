import { Router } from 'express';
import quotationController from '../controllers/quotation.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Quotation Endpoints
router.get('/', requirePermission('billing.view'), quotationController.getQuotations);
router.get('/next-number', requirePermission('billing.view'), quotationController.getNextQuotationNumber);
router.post('/', requirePermission('billing.create'), quotationController.createQuotation);
router.get('/:id', requirePermission('billing.view'), quotationController.getQuotationById);
router.patch('/:id', requirePermission('billing.edit'), quotationController.updateQuotation);
router.patch('/:id/status', requirePermission('billing.edit'), quotationController.updateQuotationStatus);
router.post('/:id/convert-to-invoice', requirePermission('billing.create'), quotationController.convertToInvoice);
router.delete('/:id', requirePermission('billing.delete'), quotationController.deleteQuotation);

export default router;
