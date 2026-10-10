import { Router } from 'express';
import saleController from '../controllers/sale.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Sales Invoices
router.post('/', requirePermission('billing.create'), saleController.createSale);
router.get('/', requirePermission('billing.view'), saleController.getSales);
router.get('/my', requirePermission('billing.view'), saleController.getMySales);

// Delivery Challans
router.post('/challans', requirePermission('sales_ops.challan'), saleController.createDeliveryChallan);
router.get('/challans', requirePermission('sales_ops.challan'), saleController.getDeliveryChallans);

// Customer Payments (Payment In)
router.get('/payments-in', requirePermission('sales_ops.payment'), saleController.getPaymentsIn);
router.post('/payments-in', requirePermission('sales_ops.payment'), saleController.createPaymentIn);

// Returns
router.get('/returns', requirePermission('sales_ops.return'), saleController.getSalesReturns);
router.post('/:id/return', requirePermission('sales_ops.return'), saleController.returnSale);

// Invoice detail & Audit trail
router.get('/:id/audit-trail', requirePermission('billing.view'), saleController.getSaleAuditTrail);
router.get('/:id/credit-notes', requirePermission('billing.view'), saleController.getSaleCreditNotes);
router.get('/:id/returns', requirePermission('billing.view'), saleController.getSaleCreditNotes);
router.post('/:id/payment', requirePermission('sales_ops.payment'), saleController.recordPayment);
router.get('/:id', requirePermission('billing.view'), saleController.getSaleById);

// Guard: Prevent arbitrary edits or deletes to finalized invoices (Req 8 & Req 9)
router.put('/:id', saleController.preventInvoiceEdit);
router.patch('/:id', saleController.preventInvoiceEdit);
router.delete('/:id', saleController.preventInvoiceDelete);

export default router;

