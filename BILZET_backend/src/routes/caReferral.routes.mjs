import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.mjs';
import superAdminMiddleware from '../middleware/superAdmin.middleware.mjs';
import * as caReferralController from '../controllers/caReferral.controller.mjs';
import { ApiError } from '../utils/ApiError.mjs';

const router = Router();

/**
 * Middleware ensuring only verified CA users can access CA-specific referral endpoints
 */
const requireVerifiedCa = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required.'));
  }
  if (req.user.role !== 'CA') {
    return next(
      ApiError.forbidden('Forbidden: Only verified Chartered Accountants (CAs) are eligible for the referral program.')
    );
  }
  if (!req.user.isActive) {
    return next(ApiError.forbidden('Forbidden: Account is inactive or suspended.'));
  }
  // If isVerified is explicitly false, reject
  if (req.user.isVerified === false) {
    return next(ApiError.forbidden('Forbidden: Only verified CA accounts can participate in Refer & Earn.'));
  }
  next();
};

/**
 * Public route to validate a CA referral code during merchant signup/store registration
 */
router.get('/validate/:code', caReferralController.validateCode);

/**
 * CA-protected endpoints
 */
router.get('/dashboard', authMiddleware, requireVerifiedCa, caReferralController.getDashboard);
router.get('/referrals', authMiddleware, requireVerifiedCa, caReferralController.getReferralHistory);
router.get('/payouts', authMiddleware, requireVerifiedCa, caReferralController.getPayoutHistory);
router.post('/redemptions', authMiddleware, requireVerifiedCa, caReferralController.submitRedemption);

/**
 * Admin-protected management endpoints
 */
router.get('/admin/referrals', authMiddleware, superAdminMiddleware, caReferralController.getAdminReferrals);
router.get('/admin/redemptions', authMiddleware, superAdminMiddleware, caReferralController.getAdminRedemptions);
router.post('/admin/redemptions/:id/approve', authMiddleware, superAdminMiddleware, caReferralController.approveRedemption);
router.post('/admin/redemptions/:id/reject', authMiddleware, superAdminMiddleware, caReferralController.rejectRedemption);
router.post('/admin/redemptions/:id/payout', authMiddleware, superAdminMiddleware, caReferralController.recordPayout);
router.get('/admin/config', authMiddleware, superAdminMiddleware, caReferralController.getProgramConfig);
router.put('/admin/config', authMiddleware, superAdminMiddleware, caReferralController.updateProgramConfig);

export default router;
