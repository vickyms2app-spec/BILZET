import { Router } from 'express';
import purchaseController from '../controllers/purchase.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

// Allow authenticated requests
router.use(authMiddleware);

// Purchases
router.post('/', purchaseController.createPurchase);
router.get('/', purchaseController.getPurchases);

// Purchase Orders (PO)
router.post('/orders', purchaseController.createPurchaseOrder);
router.get('/orders', purchaseController.getPurchaseOrders);
router.patch('/orders/:id/status', purchaseController.updatePurchaseOrderStatus);

// Returns & Debit Notes
router.post('/returns', purchaseController.createPurchaseReturn);
router.post('/debit-notes', purchaseController.createDebitNote);
router.get('/debit-notes', purchaseController.getDebitNotes);

router.get('/:id', purchaseController.getPurchaseById);

export default router;
