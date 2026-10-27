import { Router } from 'express';
import quotationController from '../controllers/quotation.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Quotation Endpoints
router.get('/', quotationController.getQuotations);
router.get('/next-number', quotationController.getNextQuotationNumber);
router.post('/', quotationController.createQuotation);
router.get('/:id', quotationController.getQuotationById);
router.patch('/:id', quotationController.updateQuotation);
router.patch('/:id/status', quotationController.updateQuotationStatus);
router.post('/:id/convert-to-invoice', quotationController.convertToInvoice);
router.delete('/:id', quotationController.deleteQuotation);

export default router;
