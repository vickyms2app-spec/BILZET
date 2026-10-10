import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import referralService from '../services/referral.service.mjs';

/**
 * Get current user's referral code, link, tracking stats, and referral history.
 */
export const getMyReferralInfo = asyncHandler(async (req, res) => {
  const result = await referralService.getReferralInfo(req.user);
  return sendResponse(res, 200, result, 'Referral details fetched successfully');
});

/**
 * Validate a referral code and check referee discount eligibility.
 */
export const validateCode = asyncHandler(async (req, res) => {
  const code = req.query.code || req.body.code;
  const result = await referralService.validateReferralCode(code, req.user?.id);
  const status = result.valid ? 200 : 400;
  return sendResponse(res, status, result, result.message);
});

/**
 * Apply referral code to current user account.
 */
export const applyReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const validation = await referralService.validateReferralCode(code, req.user?.id);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      error: 'Invalid referral code',
      message: validation.message,
    });
  }

  const attribution = await referralService.recordReferralAttribution({
    referrerCode: code,
    refereeId: req.user.id,
    refereeName: req.user.name,
    refereeEmail: req.user.email,
  });

  return sendResponse(res, 200, {
    applied: Boolean(attribution),
    discountPercent: 10,
    referral: attribution,
  }, 'Referral code applied successfully. 10% discount enabled.');
});

export default {
  getMyReferralInfo,
  validateCode,
  applyReferralCode,
};
