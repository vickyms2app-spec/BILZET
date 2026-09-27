import { Router } from 'express';
import paymentController from '../controllers/payment.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  collectCreditPaymentSchema,
  supplierPaymentSchema
} from '../validators/payment.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);

// CASHIER, MANAGER, ADMIN can collect customer credit payments
router.post('/', validate(collectCreditPaymentSchema), paymentController.collectCreditPayment);
router.get('/', paymentController.getPayments);

// Supplier settlement payment is restricted to ADMIN and MANAGER
router.post(
  '/supplier',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  validate(supplierPaymentSchema),
  paymentController.makeSupplierPayment
);

export default router;
