import { Router } from 'express';
import roleController from '../controllers/role.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requireAnyPermission } from '../middleware/permission.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';

const router = Router();

router.use(authMiddleware);

// Roles list & catalog (accessible to all authenticated users)
router.get('/', roleController.getRoles);
router.get('/permissions', roleController.getPermissionsCatalog);

// Custom role administration (Premium subscription required)
router.post(
  '/',
  requirePlanTier('PREMIUM', 'Custom roles'),
  requireAnyPermission('roles.manage', 'settings.edit'),
  roleController.createCustomRole
);
router.patch(
  '/:id',
  requirePlanTier('PREMIUM', 'Custom roles'),
  requireAnyPermission('roles.manage', 'settings.edit'),
  roleController.updateCustomRole
);
router.delete(
  '/:id',
  requirePlanTier('PREMIUM', 'Custom roles'),
  requireAnyPermission('roles.manage', 'settings.edit'),
  roleController.deleteCustomRole
);

export default router;
