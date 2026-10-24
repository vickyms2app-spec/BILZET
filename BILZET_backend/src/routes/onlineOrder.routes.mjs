import { Router } from 'express';
import onlineOrderController from '../controllers/onlineOrder.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';

const router = Router();

router.use(authMiddleware);
router.use(requirePlanTier('PRO', 'Online Store Orders'));

router.get('/', onlineOrderController.getOnlineOrders);
router.post('/', onlineOrderController.createOnlineOrder);
router.patch('/:id/status', onlineOrderController.updateOrderStatus);

export default router;
