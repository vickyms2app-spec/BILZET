import { Router } from 'express';
import saleController from '../controllers/sale.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Sales Invoices
router.post('/', saleController.createSale);
router.get('/', saleController.getSales);

// Delivery Challans
router.post('/challans', saleController.createDeliveryChallan);
router.get('/challans', saleController.getDeliveryChallans);

// Customer Payments (Payment In)
router.post('/payments-in', saleController.createPaymentIn);

// Returns
router.post('/:id/return', saleController.returnSale);

router.get('/:id', saleController.getSaleById);

export default router;
