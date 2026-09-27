import { Router } from 'express';
import settingsController from '../controllers/settings.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import { updateShopSettingsSchema } from '../validators/settings.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);

// View shop settings (ADMIN, MANAGER, CASHIER)
router.get('/shop', settingsController.getShopSettings);

// Update shop settings (ADMIN only)
router.patch(
  '/shop',
  authorizeRoles(ROLES.ADMIN),
  validate(updateShopSettingsSchema),
  settingsController.updateShopSettings
);

export default router;
