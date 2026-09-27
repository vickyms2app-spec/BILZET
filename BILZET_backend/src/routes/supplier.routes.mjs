import { Router } from 'express';
import supplierController from '../controllers/supplier.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  createSupplierSchema,
  updateSupplierSchema
} from '../validators/supplier.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER));

router.get('/', supplierController.getSuppliers);
router.post('/', validate(createSupplierSchema), supplierController.createSupplier);
router.get('/:id', supplierController.getSupplierById);
router.patch('/:id', validate(updateSupplierSchema), supplierController.updateSupplier);
router.get('/:id/purchases', supplierController.getSupplierPurchases);
router.get('/:id/payments', supplierController.getSupplierPayments);

export default router;
