import { Router } from 'express';
import userController from '../controllers/user.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import { updateUserSchema } from '../validators/auth.validator.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ADMIN));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
