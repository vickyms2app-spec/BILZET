import { Router } from 'express';
import warehouseController from '../controllers/warehouse.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', warehouseController.getWarehouses);
router.post('/', warehouseController.createWarehouse);
router.patch('/:id', warehouseController.updateWarehouse);
router.delete('/:id', warehouseController.deleteWarehouse);

router.post('/transfer', warehouseController.transferStock);
router.get('/transfers', warehouseController.getStockTransfers);

export default router;
