import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER));

router.get('/', dashboardController.getDashboardStats);

export default router;
