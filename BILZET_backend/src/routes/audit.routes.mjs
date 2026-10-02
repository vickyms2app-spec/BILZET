import { Router } from 'express';
import auditController from '../controllers/audit.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', auditController.getAuditLogs);

export default router;
