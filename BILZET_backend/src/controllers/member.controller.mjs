import memberService from '../services/member.service.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

/**
 * Controller for Store Members Management
 */

const resolveBusinessId = (req) =>
  req.query?.businessId ||
  req.query?.storeId ||
  req.body?.businessId ||
  req.body?.storeId ||
  req.headers['x-business-id'] ||
  req.headers['x-store-id'] ||
  req.user?.businessId;

export const getMembers = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  if (!businessId) throw ApiError.badRequest('businessId is required.');
  const result = await memberService.getBusinessMembers(req.user, businessId);
  return sendResponse(res, 200, result, 'Members fetched successfully.');
});

export const updateRole = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  if (!businessId) throw ApiError.badRequest('businessId is required.');
  const result = await memberService.updateMemberRole(req.user, businessId, req.params.id, req.body);
  return sendResponse(res, 200, result, 'Member updated successfully.');
});

export const removeMember = asyncHandler(async (req, res) => {
  const businessId = resolveBusinessId(req);
  if (!businessId) throw ApiError.badRequest('businessId is required.');
  const result = await memberService.removeMember(req.user, businessId, req.params.id);
  return sendResponse(res, 200, result, 'Member removed successfully.');
});

export default {
  getMembers,
  updateRole,
  removeMember,
};
