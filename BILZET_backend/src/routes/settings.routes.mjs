import { Router } from 'express';
import settingsController from '../controllers/settings.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import { updateShopSettingsSchema } from '../validators/settings.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

// Public asset serving for uploaded branding logos & signatures (with CORS & path traversal protection)
router.get('/branding/file/:businessId/:filename', settingsController.serveBrandingFile);

// Authentication required for settings operations
router.use(authMiddleware);

// View shop settings (ADMIN, MANAGER, CASHIER)
router.get('/shop', settingsController.getShopSettings);
router.get('/', settingsController.getShopSettings);

// Update shop settings (ADMIN, SUPER_ADMIN)
router.patch(
  '/shop',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(updateShopSettingsSchema),
  settingsController.updateShopSettings
);
router.patch(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(updateShopSettingsSchema),
  settingsController.updateShopSettings
);
router.put(
  '/shop',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(updateShopSettingsSchema),
  settingsController.updateShopSettings
);
router.put(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(updateShopSettingsSchema),
  settingsController.updateShopSettings
);

// Invoice Branding management (Upload, Remove, Visibility Preferences)
router.post(
  '/branding/upload',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  settingsController.uploadBrandingImage
);

router.delete(
  '/branding/:type',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  settingsController.removeBrandingImage
);

router.put(
  '/branding/preferences',
  authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  settingsController.updateBrandingPreferences
);

export default router;

