import { Router } from 'express';
import customerController from '../controllers/customer.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  createCustomerSchema,
  updateCustomerSchema
} from '../validators/customer.validator.mjs';

const router = Router();

router.use(authMiddleware);

// Customer directory inspection
router.get('/', requirePermission('customers.view'), customerController.getCustomers);
router.post('/', requirePermission('customers.create'), validate(createCustomerSchema), customerController.createCustomer);

router.get('/:id', requirePermission('customers.view'), customerController.getCustomerById);
router.get('/:id/purchases', requirePermission('customers.view'), customerController.getCustomerPurchases);
router.get('/:id/payments', requirePermission('customers.view'), customerController.getCustomerPayments);
router.get('/:id/credit', requirePermission('customers.view'), customerController.getCustomerCredit);

// Updating customer details
router.patch('/:id', requirePermission('customers.edit'), validate(updateCustomerSchema), customerController.updateCustomer);

export default router;
