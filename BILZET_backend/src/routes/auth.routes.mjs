import { Router } from 'express';
import authController from '../controllers/auth.controller.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema
} from '../validators/auth.validator.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);

export default router;
