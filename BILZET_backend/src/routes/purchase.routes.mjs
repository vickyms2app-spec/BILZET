import { Router } from 'express';
import purchaseController from '../controllers/purchase.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import { createPurchaseSchema } from '../validators/purchase.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER));

router.post('/', validate(createPurchaseSchema), purchaseController.createPurchase);
router.get('/', purchaseController.getPurchases);
router.get('/:id', purchaseController.getPurchaseById);

export default router;
