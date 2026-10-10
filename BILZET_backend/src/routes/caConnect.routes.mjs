import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePremiumPlan } from '../middleware/plan.middleware.mjs';
import { requireAnyPermission } from '../middleware/permission.middleware.mjs';
import caConnectController from '../controllers/caConnect.controller.mjs';

const router = Router();

// All routes require user authentication
router.use(authMiddleware);

// Status check (returns whether user has unlocked status or locked status with current plan info)
router.get('/status', caConnectController.getStatus);

// All operational CA Connect endpoints are strictly guarded by requirePremiumPlan
router.use(requirePremiumPlan);

router.get('/', requireAnyPermission('staff.view', 'team.view', 'gst.view', 'reports.view'), caConnectController.getConnectedAccountants);
router.get('/accountants', requireAnyPermission('staff.view', 'team.view', 'gst.view', 'reports.view'), caConnectController.getConnectedAccountants);
router.post('/invite', requireAnyPermission('staff.create', 'team.manage', 'team.create'), caConnectController.inviteAccountant);
router.delete('/:id', requireAnyPermission('staff.delete', 'team.manage', 'team.delete'), caConnectController.revokeAccountant);
router.delete('/invite/:id', requireAnyPermission('staff.delete', 'team.manage', 'team.delete'), caConnectController.revokeAccountant);

export default router;
