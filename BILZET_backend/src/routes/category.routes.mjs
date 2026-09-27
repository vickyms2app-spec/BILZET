import { Router } from 'express';
import categoryController from '../controllers/category.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  createCategorySchema,
  updateCategorySchema
} from '../validators/category.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  validate(createCategorySchema),
  categoryController.createCategory
);
router.patch(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  validate(updateCategorySchema),
  categoryController.updateCategory
);
router.delete(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.MANAGER),
  categoryController.deleteCategory
);

export default router;
