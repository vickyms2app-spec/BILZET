import { Router } from 'express';
import inventoryController from '../controllers/inventory.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import { stockAdjustmentSchema } from '../validators/inventory.validator.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('inventory.view'), inventoryController.getInventoryOverview);
router.get('/low-stock', requirePermission('inventory.view'), inventoryController.getLowStockProducts);
router.get('/history', requirePermission('inventory.view'), inventoryController.getStockHistory);
router.get('/:productId/history', requirePermission('inventory.view'), inventoryController.getProductStockHistory);
router.post('/adjust', requirePermission('inventory.adjust'), validate(stockAdjustmentSchema), inventoryController.adjustStock);

export default router;
