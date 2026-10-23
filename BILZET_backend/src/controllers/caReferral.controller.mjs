import * as caReferralService from '../services/caReferral.service.mjs';

/**
 * CA Dashboard overview: coins balance, conversions, stats, referral link
 */
export async function getDashboard(req, res) {
  try {
    const dashboard = await caReferralService.getCaDashboard(req.user);
    res.json({
      success: true,
      data: dashboard,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Get paginated referral history for the authenticated CA
 */
export async function getReferralHistory(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || null;

    const data = await caReferralService.getCaReferralHistory(req.user, { page, limit, status });
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Get paginated redemption / payout history for the authenticated CA
 */
export async function getPayoutHistory(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const data = await caReferralService.getCaPayoutHistory(req.user, { page, limit });
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Request redemption (min 500 coins)
 */
export async function submitRedemption(req, res) {
  try {
    const { coinsRequested, payoutMethod, upiId, bankAccountNumber, bankIfsc, bankAccountName } = req.body;

    const request = await caReferralService.submitRedemptionRequest(req.user, {
      coinsRequested: Number(coinsRequested),
      payoutMethod,
      upiId,
      bankAccountNumber,
      bankIfsc,
      bankAccountName,
    });

    res.status(201).json({
      success: true,
      message: 'Redemption request submitted successfully and queued for admin review.',
      data: request,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Public referral code validator (used during signup / registration flow)
 */
export async function validateCode(req, res) {
  try {
    const { code } = req.params;
    const result = await caReferralService.validateCaReferralCode(code);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}

/* ------------------- ADMIN CONTROLS ------------------- */

/**
 * Admin: Get paginated referrals across all CAs
 */
export async function getAdminReferrals(req, res) {
  try {
    const adminUser = req.user;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status, search } = req.query;

    const data = await caReferralService.getAdminReferrals(adminUser, { page, limit, status, search });
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Admin: Get paginated redemption requests
 */
export async function getAdminRedemptions(req, res) {
  try {
    const adminUser = req.user;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { status } = req.query;

    const data = await caReferralService.getAdminRedemptions(adminUser, { page, limit, status });
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Admin: Approve a redemption request (authorizes manual payment)
 */
export async function approveRedemption(req, res) {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { notes } = req.body;

    const updated = await caReferralService.approveRedemption(adminUser, id, notes);
    res.json({
      success: true,
      message: 'Redemption request approved for manual payout processing.',
      data: updated,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Admin: Reject a redemption request (requires reason, releases reserved coins)
 */
export async function rejectRedemption(req, res) {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    const updated = await caReferralService.rejectRedemption(adminUser, id, reason);
    res.json({
      success: true,
      message: 'Redemption request rejected and reserved coins refunded.',
      data: updated,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Admin: Record actual completed payout payment
 */
export async function recordPayout(req, res) {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { transactionReference, paymentDate, notes } = req.body;

    const updated = await caReferralService.recordPayoutPayment(adminUser, id, {
      transactionReference,
      paymentDate,
      notes,
    });

    res.json({
      success: true,
      message: 'Payout payment recorded and redemption finalized.',
      data: updated,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Admin: Get Referral Program Configuration
 */
export async function getProgramConfig(req, res) {
  try {
    const config = await caReferralService.getProgramConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Admin: Update Referral Program Configuration
 */
export async function updateProgramConfig(req, res) {
  try {
    const adminUser = req.user;
    const { coinsPerReferral, coinToInrRate, minRedemptionCoins, isEnabled } = req.body;

    const config = await caReferralService.updateProgramConfig(adminUser, {
      coinsPerReferral,
      coinToInrRate,
      minRedemptionCoins,
      isEnabled,
    });

    res.json({
      success: true,
      message: 'Referral program configuration updated.',
      data: config,
    });
  } catch (err) {
    const statusCode = err.message.includes('Forbidden') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  }
}
