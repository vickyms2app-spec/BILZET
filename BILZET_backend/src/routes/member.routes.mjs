import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import * as memberController from '../controllers/member.controller.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', memberController.getMembers);
router.patch('/:id/role', memberController.updateRole);
router.patch('/:id', memberController.updateRole);
router.delete('/:id', memberController.removeMember);

export default router;
