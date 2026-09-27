import { Router } from 'express';
import inventoryController from '../controllers/inventory.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import { stockAdjustmentSchema } from '../validators/inventory.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER));

router.get('/', inventoryController.getInventoryOverview);
router.get('/low-stock', inventoryController.getLowStockProducts);
router.get('/history', inventoryController.getStockHistory);
router.get('/:productId/history', inventoryController.getProductStockHistory);
router.post('/adjust', validate(stockAdjustmentSchema), inventoryController.adjustStock);

export default router;
