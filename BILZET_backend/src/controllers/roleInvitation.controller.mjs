import roleInvitationService from '../services/roleInvitation.service.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

/**
 * Controller for Role Invitations (Staff, Manager, CA)
 */

const resolveBusinessId = (req) =>
  req.body?.businessId ||
  req.body?.storeId ||
  req.query?.storeId ||
  req.query?.businessId ||
  req.headers['x-business-id'] ||
  req.headers['x-store-id'] ||
  req.user?.businessId;

export const createInvitation = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const result = await roleInvitationService.createInvitation(req.user, businessId, req.body);
  const msg = result.emailSent
    ? 'Invitation dispatched via email and in-app notification.'
    : result.warning || 'Invitation created and delivered to in-app notification center.';

  return sendResponse(res, 201, result, msg);
});

export const getBusinessInvitations = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  const result = await roleInvitationService.getBusinessInvitations(req.user, businessId, req.query);
  return sendResponse(res, 200, result, 'Invitations fetched successfully.');
});

export const getMyInvitations = asyncHandler(async (req, res) => {
  try {
    const result = await roleInvitationService.getMyInvitations(req.user);
    return sendResponse(res, 200, result || { invitations: [] }, 'Your pending invitations fetched successfully.');
  } catch (err) {
    console.warn('[RoleInvitationController.getMyInvitations fallback]:', err?.message);
    return sendResponse(res, 200, { invitations: [] }, 'Your pending invitations fetched successfully.');
  }
});

export const verifyInvitation = asyncHandler(async (req, res) => {
  const token = req.query.token;
  if (!token) {
    throw ApiError.badRequest('Token query parameter is required.');
  }
  const result = await roleInvitationService.verifyInvitationToken(token);
  return sendResponse(res, 200, result, 'Invitation verification completed.');
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw ApiError.badRequest('Invitation token is required.');
  }
  const result = await roleInvitationService.acceptInvitation(req.user, token);
  return sendResponse(res, 200, result, result.message || 'Invitation accepted successfully.');
});

export const declineInvitation = asyncHandler(async (req, res) => {
  const { token, reason } = req.body;
  if (!token) {
    throw ApiError.badRequest('Invitation token is required.');
  }
  const result = await roleInvitationService.rejectInvitation(req.user, token, reason);
  return sendResponse(res, 200, result, 'Invitation declined.');
});

export const resendInvitation = asyncHandler(async (req, res) => {
  const result = await roleInvitationService.resendInvitation(req.user, req.params.id);
  const msg = result.emailSent
    ? 'Invitation email resent.'
    : 'Invitation refreshed with secure link and in-app notification.';
  return sendResponse(res, 200, result, msg);
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  const result = await roleInvitationService.revokeInvitation(req.user, req.params.id);
  return sendResponse(res, 200, result, 'Invitation revoked.');
});

export default {
  createInvitation,
  getBusinessInvitations,
  getMyInvitations,
  verifyInvitation,
  acceptInvitation,
  declineInvitation,
  resendInvitation,
  revokeInvitation,
};
