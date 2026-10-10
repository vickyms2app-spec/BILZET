import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import referralController from '../controllers/referral.controller.mjs';

const router = Router();

// Public validation endpoint (usable during registration / checkout without prior login)
router.get('/validate', referralController.validateCode);
router.post('/validate', referralController.validateCode);

// Authenticated merchant referral endpoints
router.use(authMiddleware);

router.get('/info', referralController.getMyReferralInfo);
router.get('/details', referralController.getMyReferralInfo);
router.post('/apply', referralController.applyReferralCode);

export default router;
