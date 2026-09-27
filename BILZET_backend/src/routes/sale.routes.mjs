import { Router } from 'express';
import saleController from '../controllers/sale.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import { createSaleSchema, returnSaleSchema } from '../validators/sale.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);

// All roles (ADMIN, MANAGER, CASHIER) can create sales and view sales
router.post('/', validate(createSaleSchema), saleController.createSale);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSaleById);

// Returns require MANAGER or ADMIN authorization
router.post(
  '/:id/return',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  validate(returnSaleSchema),
  saleController.returnSale
);

export default router;
