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

/**
 * List all connected CAs & tax consultants. (Guarded by requirePremiumPlan)
 */
export const getConnectedAccountants = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;

  const staff = await prisma.staff.findMany({
    where: {
      businessId,
      OR: [
        { role: 'Accountant' },
        { role: 'CA' },
        { department: 'Finance & Taxation' },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  return sendResponse(res, 200, {
    accountants: staff,
    total: staff.length,
  }, 'Connected accountants retrieved successfully');
});

/**
 * Invite a new CA / Chartered Accountant. (Guarded by requirePremiumPlan)
 */
export const inviteAccountant = asyncHandler(async (req, res) => {
  const { name, email, phone, notes } = req.body;

  if (!email) {
    throw ApiError.badRequest('Accountant email is required.');
  }

  const businessId = req.user.businessId;
  const caName = (name && name.trim()) || 'Chartered Accountant';

  // Check if already invited
  const existing = await prisma.staff.findFirst({
    where: {
      businessId,
      email: email.trim().toLowerCase(),
    },
  });

  if (existing) {
    return sendResponse(res, 200, {
      accountant: existing,
      isExisting: true,
    }, 'Accountant already connected.');
  }

  const created = await prisma.staff.create({
    data: {
      name: caName,
      email: email.trim().toLowerCase(),
      phone: phone || null,
      role: 'Accountant',
      department: 'Finance & Taxation',
      businessId,
      status: 'ACTIVE',
      notes: notes || 'Invited via CA Connect Portal',
    },
  });

  // Explicitly link CA user in caStoreAccess if account exists
  try {
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
    if (existingUser) {
      await prisma.caStoreAccess.create({
        data: {
          caUserId: existingUser.id,
          businessId,
          status: 'ACTIVE',
        },
      });
    }
  } catch (_) {}

  return sendResponse(res, 201, {
    accountant: created,
  }, `Invitation successfully sent to ${email.trim()}`);
});

/**
 * Revoke access for a connected CA. (Guarded by requirePremiumPlan)
 */
export const revokeAccountant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const businessId = req.user.businessId;

  const found = await prisma.staff.findFirst({
    where: {
      id,
      businessId,
    },
  });

  if (!found) {
    throw ApiError.notFound('Accountant record not found.');
  }

  // Deactivate or remove any explicit caStoreAccess
  try {
    if (found.email) {
      const u = await prisma.user.findFirst({
        where: { email: { equals: found.email.trim(), mode: 'insensitive' } },
      });
      if (u) {
        await prisma.caStoreAccess.deleteMany({
          where: { caUserId: u.id, businessId },
        });
      }
    }
  } catch (_) {}

  await prisma.staff.delete({
    where: { id },
  });

  return sendResponse(res, 200, { id }, 'Accountant access revoked successfully.');
});

export default {
  getStatus,
  getConnectedAccountants,
  inviteAccountant,
  revokeAccountant,
};
