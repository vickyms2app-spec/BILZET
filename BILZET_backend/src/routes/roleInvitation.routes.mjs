import { Router } from 'express';
import { authMiddleware, softAuthMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';
import * as roleInvitationController from '../controllers/roleInvitation.controller.mjs';

const router = Router();

// Public routes for verification and declining
router.get('/verify', roleInvitationController.verifyInvitation);
router.post('/decline', roleInvitationController.declineInvitation);

// User acceptance & self-invitations
// /my gracefully serves empty invitations if unauthenticated/transitioning rather than breaking the page
router.get('/my', softAuthMiddleware, roleInvitationController.getMyInvitations);

// Protected routes (Authentication strictly required)
router.post('/accept', authMiddleware, roleInvitationController.acceptInvitation);

// Admin invitation management
router.post(
  '/',
  authMiddleware,
  requirePlanTier('PRO', 'Team invitations', 'users.sub_users'),
  roleInvitationController.createInvitation
);
router.get('/', authMiddleware, roleInvitationController.getBusinessInvitations);
router.post('/:id/resend', authMiddleware, roleInvitationController.resendInvitation);
router.post('/:id/revoke', authMiddleware, roleInvitationController.revokeInvitation);
router.post('/generate-link', authMiddleware, roleInvitationController.generateRoleLink);
router.get('/:id/link', authMiddleware, roleInvitationController.getInvitationLink);

export default router;
