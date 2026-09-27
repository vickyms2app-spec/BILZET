import { Router } from 'express';
import invoiceController from '../controllers/invoice.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Accessible by CASHIER, MANAGER, ADMIN
router.get('/:saleId/pdf', invoiceController.getInvoicePdf);

export default router;
