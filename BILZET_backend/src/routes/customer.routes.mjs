import { Router } from 'express';
import customerController from '../controllers/customer.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  createCustomerSchema,
  updateCustomerSchema
} from '../validators/customer.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);

// CASHIER, MANAGER, ADMIN can read and create customers
router.get('/', customerController.getCustomers);
router.post('/', validate(createCustomerSchema), customerController.createCustomer);

router.get('/:id', customerController.getCustomerById);
router.get('/:id/purchases', customerController.getCustomerPurchases);
router.get('/:id/payments', customerController.getCustomerPayments);
router.get('/:id/credit', customerController.getCustomerCredit);

// Updating customer details allowed for ADMIN, MANAGER, and CASHIER
router.patch('/:id', validate(updateCustomerSchema), customerController.updateCustomer);

export default router;
