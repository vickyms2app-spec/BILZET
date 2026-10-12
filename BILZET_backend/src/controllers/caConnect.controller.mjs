import prisma from '../config/prisma.mjs';
import { getActiveSubscription } from '../services/subscription.service.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

/**
 * Check CA Connect status and unlock state for the current authenticated user/business.
 */
export const getStatus = asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'SUPER_ADMIN' || req.user.isSuperAdmin;
  const subInfo = await getActiveSubscription(req.user.businessId, req.user.id);

  const isUnlocked =
    isSuperAdmin ||
    (subInfo.isActive && (subInfo.planTier === 'PREMIUM' || subInfo.planTier === 'ENTERPRISE'));

  const planTier = subInfo.actualPlanTier || subInfo.planTier || 'FREE';

  let message = 'CA Connect is unlocked and available.';
  if (!isUnlocked) {
    if (subInfo.isExpired) {
      message = 'Your Premium subscription has expired. Renew your plan to access CA Connect.';
    } else if (planTier === 'PRO') {
      message = 'Upgrade to Premium to access CA Connect.';
    } else {
      message = 'CA Connect is available exclusively with the Premium plan.';
    }
  }

  return sendResponse(res, 200, {
    isUnlocked,
    currentPlan: planTier,
    status: subInfo.status,
    isExpired: subInfo.isExpired,
    expiresAt: subInfo.expiresAt,
    message,
    requiredPlan: 'PREMIUM',
  });
});

import caInvitationService from '../services/caInvitation.service.mjs';

/**
 * List all connected CAs & tax consultants and invitations.
 */
export const getConnectedAccountants = asyncHandler(async (req, res) => {
  const businessId = req.query.storeId || req.user.businessId;

  const [connectedCas, invitations, staff] = await Promise.all([
    caInvitationService.getConnectedCasForStore(req.user, businessId).catch(() => []),
    caInvitationService.getInvitationsForStore(req.user, businessId).catch(() => []),
    prisma.staff.findMany({
      where: {
        businessId,
        OR: [
          { role: 'Accountant' },
          { role: 'CA' },
          { department: 'Finance & Taxation' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Merge connected CAs with active pending invitations and legacy staff records
  const allAccountants = [...connectedCas];
  for (const inv of invitations) {
    if (inv.status === 'REVOKED' || inv.status === 'EXPIRED') continue;
    if (!allAccountants.some((a) => a.id === inv.id || (a.email && a.email.toLowerCase() === inv.email?.toLowerCase()))) {
      allAccountants.push({
        id: inv.id,
        connectionId: inv.id,
        name: inv.name || inv.email,
        email: inv.email,
        phone: inv.phone || '',
        role: 'Chartered Accountant',
        permissions: inv.permissions || ['sales_audit', 'purchase_audit', 'tax_audit'],
        status: inv.status || 'PENDING',
        connectedAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      });
    }
  }
  for (const st of staff) {
    if (!allAccountants.some((a) => a.id === st.id || (a.email && a.email.toLowerCase() === st.email?.toLowerCase()))) {
      allAccountants.push({
        id: st.id,
        connectionId: st.id,
        name: st.name,
        email: st.email,
        phone: st.phone,
        role: st.role || 'Accountant',
        permissions: ['sales_audit', 'purchase_audit', 'tax_audit'],
        status: st.status || 'ACTIVE',
        connectedAt: st.createdAt,
      });
    }
  }

  return sendResponse(res, 200, {
    accountants: allAccountants,
    invitations,
    total: allAccountants.length,
    pendingInvitationsTotal: invitations.filter((i) => i.status === 'PENDING').length,
  }, 'Connected accountants and invitations retrieved successfully');
});

/**
 * Invite a new CA / Chartered Accountant. (Guarded by requirePremiumPlan)
 */
export const inviteAccountant = asyncHandler(async (req, res) => {
  const { name, email, message, permissions, expiresInDays } = req.body;
  const businessId = req.body.businessId || req.query.storeId || req.user.businessId;

  if (!email) {
    throw ApiError.badRequest('Accountant email is required.');
  }

  const result = await caInvitationService.createInvitation(req.user, businessId, {
    name,
    email,
    message,
    permissions,
    expiresInDays,
  });

  // Also synchronize staff entry for backward compatibility
  try {
    await prisma.staff.upsert({
      where: { id: result.invitation.id },
      update: {
        name: name || email,
        email: email.trim(),
        role: 'Accountant',
        department: 'Finance & Taxation',
        status: 'PENDING',
      },
      create: {
        id: result.invitation.id,
        businessId,
        name: name || email,
        email: email.trim(),
        role: 'Accountant',
        department: 'Finance & Taxation',
        status: 'PENDING',
      },
    });
  } catch (_) {}

  return sendResponse(res, 201, {
    accountant: result.invitation,
    invitation: result.invitation,
    inviteLink: result.inviteLink,
  }, `Invitation successfully sent to ${email.trim()}`);
});

/**
 * Revoke access for a connected CA or revoke a pending invitation.
 */
export const revokeAccountant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const businessId = req.query.storeId || req.user.businessId;

  // Check if it's an invitation first
  const invitation = await prisma.caInvitation.findUnique({ where: { id } }).catch(() => null);
  if (invitation) {
    if (invitation.businessId !== businessId && req.user.role !== 'SUPER_ADMIN') {
      throw ApiError.notFound('Accountant or invitation record not found.');
    }
    const revoked = await caInvitationService.revokeInvitation(req.user, id);
    await prisma.staff.deleteMany({ where: { id } }).catch(() => {});
    return sendResponse(res, 200, { invitation: revoked }, 'Invitation successfully revoked.');
  }

  // Check if it's a CaStoreAccess connection
  const access = await prisma.caStoreAccess.findFirst({
    where: { OR: [{ id }, { caUserId: id }] },
  }).catch(() => null);

  if (access) {
    if (access.businessId !== businessId && req.user.role !== 'SUPER_ADMIN') {
      throw ApiError.notFound('Accountant or invitation record not found.');
    }
    await caInvitationService.revokeCaAccess(req.user, businessId, access.caUserId);
    return sendResponse(res, 200, { id }, 'Accountant connection revoked successfully.');
  }

  // Fallback to legacy staff record
  const found = await prisma.staff.findFirst({
    where: { id, businessId },
  });

  if (found) {
    await prisma.staff.delete({ where: { id } });
    return sendResponse(res, 200, { id }, 'Accountant record removed successfully.');
  }

  throw ApiError.notFound('Accountant or invitation record not found.');
});

export default {
  getStatus,
  getConnectedAccountants,
  inviteAccountant,
  revokeAccountant,
};
