import { Router } from 'express';
import warehouseController from '../controllers/warehouse.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('inventory.view'), warehouseController.getWarehouses);
router.post('/', requirePermission('inventory.create'), warehouseController.createWarehouse);
router.patch('/:id', requirePermission('inventory.edit'), warehouseController.updateWarehouse);
router.delete('/:id', requirePermission('inventory.delete'), warehouseController.deleteWarehouse);

router.post('/transfer', requirePermission('inventory.transfer'), warehouseController.transferStock);
router.get('/transfers', requirePermission('inventory.view'), warehouseController.getStockTransfers);

export default router;
