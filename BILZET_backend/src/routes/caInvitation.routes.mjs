import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import * as caInvitationController from '../controllers/caInvitation.controller.mjs';

const router = Router();

// Public routes for verification and declining
router.get('/verify', caInvitationController.verifyInvitation);
router.post('/decline', caInvitationController.declineInvitation);

// Protected routes (Authentication required)
router.use(authMiddleware);

// Acceptance endpoint (Authenticated CA)
router.post('/accept', caInvitationController.acceptInvitation);

// Admin invitation management endpoints
router.post('/', caInvitationController.createInvitation);
router.get('/', caInvitationController.getInvitations);
router.get('/connected', caInvitationController.getConnectedCas);
router.post('/:id/resend', caInvitationController.resendInvitation);
router.post('/:id/revoke', caInvitationController.revokeInvitation);
router.delete('/connected/:caUserId', caInvitationController.revokeCaAccess);

export default router;
