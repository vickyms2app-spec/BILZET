import { Router } from 'express';
import onlineOrderController from '../controllers/onlineOrder.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', onlineOrderController.getOnlineOrders);
router.post('/', onlineOrderController.createOnlineOrder);
router.patch('/:id/status', onlineOrderController.updateOrderStatus);

export default router;
