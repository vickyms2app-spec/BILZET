import { Router } from 'express';
import auditController from '../controllers/audit.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePlanTier('PREMIUM', 'Audit logs', 'audit.logs'), auditController.getAuditLogs);

export default router;
