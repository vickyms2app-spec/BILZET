import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';
import * as roleInvitationController from '../controllers/roleInvitation.controller.mjs';

const router = Router();

// Public routes for verification and declining
router.get('/verify', roleInvitationController.verifyInvitation);
router.post('/decline', roleInvitationController.declineInvitation);

// Protected routes (Authentication required)
router.use(authMiddleware);

// User acceptance & self-invitations
router.get('/my', roleInvitationController.getMyInvitations);
router.post('/accept', roleInvitationController.acceptInvitation);

// Admin invitation management
router.post(
  '/',
  requirePlanTier('PRO', 'Team invitations', 'users.sub_users'),
  roleInvitationController.createInvitation
);
router.get('/', roleInvitationController.getBusinessInvitations);
router.post('/:id/resend', roleInvitationController.resendInvitation);
router.post('/:id/revoke', roleInvitationController.revokeInvitation);

export default router;
