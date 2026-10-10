import { Router } from 'express';
import purchaseController from '../controllers/purchase.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Purchases
router.post('/', requirePermission('purchases.create'), purchaseController.createPurchase);
router.get('/', requirePermission('purchases.view'), purchaseController.getPurchases);

// Purchase Orders (PO)
router.post('/orders', requirePermission('purchases.create'), purchaseController.createPurchaseOrder);
router.get('/orders', requirePermission('purchases.view'), purchaseController.getPurchaseOrders);
router.patch('/orders/:id/status', requirePermission('purchases.edit'), purchaseController.updatePurchaseOrderStatus);

// Returns & Debit Notes
router.post('/returns', requirePermission('purchases.edit'), purchaseController.createPurchaseReturn);
router.post('/debit-notes', requirePermission('purchases.debit'), purchaseController.createDebitNote);
router.get('/debit-notes', requirePermission('purchases.view'), purchaseController.getDebitNotes);

router.get('/:id', requirePermission('purchases.view'), purchaseController.getPurchaseById);

export default router;
