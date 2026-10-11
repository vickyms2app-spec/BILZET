import caInvitationService from '../services/caInvitation.service.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

/**
 * Chartered Accountant (CA) Invitation Controller
 */

export const createInvitation = asyncHandler(async (req, res) => {
  const businessId = req.body.businessId || req.query.storeId || req.user.businessId;
  const result = await caInvitationService.createInvitation(req.user, businessId, req.body);
  return sendResponse(res, 201, result, 'Invitation successfully sent to Chartered Accountant.');
});

export const resendInvitation = asyncHandler(async (req, res) => {
  const result = await caInvitationService.resendInvitation(req.user, req.params.id);
  return sendResponse(res, 200, result, 'Invitation successfully resent.');
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  const result = await caInvitationService.revokeInvitation(req.user, req.params.id);
  return sendResponse(res, 200, { invitation: result }, 'Invitation successfully revoked.');
});

export const verifyInvitation = asyncHandler(async (req, res) => {
  const token = req.query.token;
  if (!token) {
    throw ApiError.badRequest('Token parameter is required.');
  }
  const result = await caInvitationService.verifyInvitationToken(token);
  return sendResponse(res, 200, result, 'Invitation verification completed.');
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw ApiError.badRequest('Invitation token is required.');
  }
  const result = await caInvitationService.acceptInvitation(req.user, token);
  return sendResponse(res, 200, result, 'Invitation accepted and CA workspace connected.');
});

export const declineInvitation = asyncHandler(async (req, res) => {
  const { token, reason } = req.body;
  if (!token) {
    throw ApiError.badRequest('Invitation token is required.');
  }
  const result = await caInvitationService.declineInvitation(req.user, token, reason);
  return sendResponse(res, 200, result, 'Invitation declined.');
});

export const revokeCaAccess = asyncHandler(async (req, res) => {
  const businessId = req.query.storeId || req.body.businessId || req.user.businessId;
  const { caUserId } = req.params;
  const result = await caInvitationService.revokeCaAccess(req.user, businessId, caUserId);
  return sendResponse(res, 200, result, 'Chartered Accountant connection revoked.');
});

export const getInvitations = asyncHandler(async (req, res) => {
  const businessId = req.query.storeId || req.user.businessId;
  if (!businessId) {
    throw ApiError.badRequest('Store ID / businessId is required.');
  }
  const invitations = await caInvitationService.getInvitationsForStore(req.user, businessId);
  return sendResponse(res, 200, { invitations, total: invitations.length }, 'Invitations retrieved successfully.');
});

export const getConnectedCas = asyncHandler(async (req, res) => {
  const businessId = req.query.storeId || req.user.businessId;
  if (!businessId) {
    throw ApiError.badRequest('Store ID / businessId is required.');
  }
  const accountants = await caInvitationService.getConnectedCasForStore(req.user, businessId);
  return sendResponse(res, 200, { accountants, total: accountants.length }, 'Connected Chartered Accountants retrieved successfully.');
});

export default {
  createInvitation,
  resendInvitation,
  revokeInvitation,
  verifyInvitation,
  acceptInvitation,
  declineInvitation,
  revokeCaAccess,
  getInvitations,
  getConnectedCas,
};
