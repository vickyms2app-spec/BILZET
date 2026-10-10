import { Router } from 'express';
import userController from '../controllers/user.controller.mjs';
import storeController from '../controllers/store.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requireAnyPermission, requirePermission } from '../middleware/permission.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';

const router = Router();

// All user management routes require authentication
router.use(authMiddleware);

// Store switching & store directory endpoints
router.get('/stores', storeController.getUserStores);
router.post('/switch-store', storeController.switchStore);

// Team directory & user profile inspection
router.get('/', requireAnyPermission('team.view', 'team.manage', 'settings.view'), userController.getUsers);
router.post('/', requireAnyPermission('team.manage', 'settings.edit'), userController.createSubUser);

router.get('/:id', userController.getUserById);
router.patch('/:id', requireAnyPermission('team.manage', 'settings.edit'), userController.updateUser);
router.patch('/:id/status', requireAnyPermission('team.manage', 'settings.edit'), userController.toggleUserStatus);
router.delete('/:id', requireAnyPermission('team.manage', 'settings.edit'), userController.deleteUser);

// Granular permissions inspection & overrides (Overrides require Premium)
router.get('/:id/permissions', requireAnyPermission('team.view', 'team.manage'), userController.getUserPermissions);
router.patch(
  '/:id/permissions',
  requirePlanTier('PREMIUM', 'Granular permission overrides'),
  requireAnyPermission('team.manage', 'roles.manage'),
  userController.updateUserPermissions
);

export default router;
