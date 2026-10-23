import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.mjs';
import { env } from '../config/env.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';
import {
  assertCanAddSubUser,
  getSubscriptionUsage,
  getActiveSubscription,
} from '../services/subscription.service.mjs';
import {
  getUserPermissionBreakdown,
  updateUserPermissionOverrides,
} from '../services/permission.service.mjs';

/**
 * Lists team members belonging exclusively to the caller's business.
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPaginationParams(req.query);
  const where = {};

  // Enforce multi-tenant isolation
  if (req.user.role !== 'SUPER_ADMIN') {
    if (!req.user.businessId) {
      return sendResponse(res, 200, { users: [] }, 'No business associated', buildPaginationMeta(0, page, limit));
    }
    where.businessId = req.user.businessId;
  }

  if (req.query.role) {
    where.role = req.query.role;
  }
  if (req.query.isActive !== undefined) {
    where.isActive = req.query.isActive === 'true';
  }
  if (req.query.search) {
    const q = req.query.search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [users, total, usage] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isOwner: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        appRole: {
          select: {
            id: true,
            name: true,
            code: true,
            isSystem: true,
          },
        },
        _count: {
          select: {
            permissionOverrides: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    getSubscriptionUsage(req.user.businessId, req.user.id),
  ]);

  return sendResponse(
    res,
    200,
    {
      users: users.map((u) => ({
        ...u,
        _id: u.id,
        roleName: u.appRole?.name || u.role,
        overridesCount: u._count?.permissionOverrides || 0,
      })),
      usage,
    },
    'Team members retrieved successfully',
    buildPaginationMeta(total, page, limit)
  );
});

/**
 * Get detailed profile of a specific team member with permissions breakdown.
 */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const where = { id };

  if (req.user.role !== 'SUPER_ADMIN') {
    where.businessId = req.user.businessId;
  }

  const user = await prisma.user.findFirst({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isOwner: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      appRole: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('Team member not found.');
  }

  const permissionsBreakdown = await getUserPermissionBreakdown(user.id);

  return sendResponse(
    res,
    200,
    {
      user: {
        ...user,
        _id: user.id,
      },
      permissions: permissionsBreakdown.permissions,
    },
    'Team member details retrieved successfully'
  );
});

/**
 * Creates a new team sub-user under the caller's business with subscription seat validation.
 */
export const createSubUser = asyncHandler(async (req, res) => {
  const { name, email, username, phone, role, customRoleId, password, permissions, isActive, status } = req.body;

  const resolvedEmail = (email || username || '').toLowerCase().trim();
  if (!name || !resolvedEmail) {
    throw ApiError.badRequest('Name and email/username are required to add a team member.');
  }

  // If username provided without @, make it a standard local account
  const finalEmail = resolvedEmail.includes('@') ? resolvedEmail : `${resolvedEmail}@bilzet.local`;

  let businessId =
    req.body?.businessId ||
    req.body?.storeId ||
    req.headers['x-business-id'] ||
    req.headers['x-store-id'] ||
    req.user.businessId;

  if (!businessId) {
    const ownedBiz = await prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (ownedBiz) businessId = ownedBiz.id;
  }

  if (!businessId) {
    throw ApiError.badRequest('You must have an active business profile to add sub-users.');
  }

  // 1. Enforce Subscription Seat Limit (Backend Guaranteed)
  await assertCanAddSubUser(businessId, req.user.id);

  // 1b. Premium Tier Validation for Custom Roles and Granular Permission Overrides
  const hasCustomFeatures = Boolean(customRoleId) || (Array.isArray(permissions) && permissions.length > 0);
  if (hasCustomFeatures && req.user.role !== 'SUPER_ADMIN' && !req.user.isSuperAdmin) {
    const subInfo = await getActiveSubscription(businessId, req.user.id);
    const isPremium = subInfo.isActive && (subInfo.planTier === 'PREMIUM' || subInfo.planTier === 'ENTERPRISE');
    if (!isPremium) {
      throw ApiError.forbidden('Custom roles and granular permission overrides require an active Premium subscription.');
    }
  }

  const requestedRole = (role || 'CASHIER').toUpperCase();
  if (requestedRole === 'SUPER_ADMIN') {
    throw ApiError.forbidden('Sub-users cannot be assigned the SUPER_ADMIN role.');
  }

  // 2. Check if email already exists globally
  const existingEmail = await prisma.user.findUnique({
    where: { email: finalEmail },
  });

  if (existingEmail) {
    const existingMember = await prisma.businessMember.findFirst({
      where: { userId: existingEmail.id, businessId, status: 'ACTIVE' },
    });
    if (existingMember) {
      throw ApiError.conflict('A user with this email or username is already an active member of your store.');
    }

    // Connect the existing user to this store as a member
    await prisma.businessMember.upsert({
      where: { userId_businessId: { userId: existingEmail.id, businessId } },
      update: { role: requestedRole, status: 'ACTIVE' },
      create: { userId: existingEmail.id, businessId, role: requestedRole, status: 'ACTIVE', acceptedAt: new Date() },
    });

    if (requestedRole === 'CA') {
      await prisma.caStoreAccess.upsert({
        where: { caUserId_businessId: { caUserId: existingEmail.id, businessId } },
        update: {
          status: 'ACTIVE',
          permissions: [
            'sales_audit',
            'purchase_audit',
            'tax_audit',
            'reconciliation',
            'reports',
            'tasks',
            'discrepancies',
            'documents',
          ],
        },
        create: {
          caUserId: existingEmail.id,
          businessId,
          status: 'ACTIVE',
          permissions: [
            'sales_audit',
            'purchase_audit',
            'tax_audit',
            'reconciliation',
            'reports',
            'tasks',
            'discrepancies',
            'documents',
          ],
        },
      });

      if (!existingEmail.businessId || existingEmail.role === 'NONE' || existingEmail.role === 'VIEWER') {
        await prisma.user.update({
          where: { id: existingEmail.id },
          data: { role: 'CA', businessId },
        }).catch(() => {});
      }
    }

    return sendResponse(
      res,
      201,
      { user: existingEmail },
      `Account connected to your workspace with role ${requestedRole}.`
    );
  }

  // 4. Resolve status
  const resolvedStatus = isActive !== undefined
    ? Boolean(isActive)
    : status !== undefined
    ? (status === true || status === 'ACTIVE' || status === 'active')
    : true;

  // 5. Resolve password or generate a secure default
  const rawPassword = password && password.length >= 6 ? password : `Bilzet@${Math.floor(1000 + Math.random() * 9000)}`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rawPassword, salt);

  // 6. Create user
  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: finalEmail,
      phone: phone?.trim() || null,
      passwordHash,
      role: requestedRole,
      appRoleId: customRoleId || null,
      businessId,
      isOwner: false,
      isActive: resolvedStatus,
    },
  });

  // 6b. Save BusinessMember record
  await prisma.businessMember.upsert({
    where: { userId_businessId: { userId: newUser.id, businessId } },
    update: { role: requestedRole, status: 'ACTIVE' },
    create: {
      userId: newUser.id,
      businessId,
      role: requestedRole,
      status: 'ACTIVE',
      acceptedAt: new Date(),
    },
  }).catch(() => {});

  // 6c. If CA role, save CaStoreAccess record
  if (requestedRole === 'CA') {
    await prisma.caStoreAccess.upsert({
      where: {
        caUserId_businessId: {
          caUserId: newUser.id,
          businessId,
        },
      },
      update: {
        status: 'ACTIVE',
        permissions: [
          'sales_audit',
          'purchase_audit',
          'tax_audit',
          'reconciliation',
          'reports',
          'tasks',
          'discrepancies',
          'documents',
        ],
      },
      create: {
        caUserId: newUser.id,
        businessId,
        status: 'ACTIVE',
        permissions: [
          'sales_audit',
          'purchase_audit',
          'tax_audit',
          'reconciliation',
          'reports',
          'tasks',
          'discrepancies',
          'documents',
        ],
      },
    }).catch(() => {});
  }

  // 6d. Apply initial permission overrides if provided
  if (Array.isArray(permissions) && permissions.length > 0) {
    await updateUserPermissionOverrides(newUser.id, permissions);
  }

  // 7. Sync Staff profile
  try {
    const existingStaff = await prisma.staff.findFirst({
      where: {
        OR: [
          { userId: newUser.id },
          { email: { equals: newUser.email, mode: 'insensitive' } },
        ],
      },
    });

    if (!existingStaff) {
      const dep = newUser.role === 'CASHIER' ? 'Billing' : newUser.role === 'MANAGER' ? 'Management' : 'Operations';
      await prisma.staff.create({
        data: {
          staffId: `EMP-${Date.now().toString().slice(-5)}`,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          department: dep,
          salary: 0,
          status: newUser.isActive ? 'ACTIVE' : 'INACTIVE',
          isDeleted: false,
          businessId,
          userId: newUser.id,
        },
      });
    }
  } catch (_) {}

  // 8. Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: newUser.id,
        changes: {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          businessId,
        },
        ipAddress: req.ip || '',
      },
    });
  } catch (_) {}

  // 9. Generate official invitation link & token for the newly created team member
  let inviteLink = null;
  let rawToken = null;
  try {
    rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.roleInvitation.create({
      data: {
        businessId,
        inviterId: req.user.id,
        recipientEmail: finalEmail,
        recipientUserId: newUser.id,
        name: newUser.name,
        role: requestedRole,
        tokenHash,
        status: 'PENDING',
        deliveryStatus: 'PENDING',
        expiresAt,
      },
    }).catch(() => null);

    const origin = env.FRONTEND_URL || 'http://localhost:5173';
    inviteLink = `${origin}/accept-invitation?token=${rawToken}&role=${requestedRole.toLowerCase()}`;
  } catch (_) {}

  const originFallback = env.FRONTEND_URL || 'http://localhost:5173';
  const finalInviteLink = inviteLink || `${originFallback}/join-team`;

  return sendResponse(
    res,
    201,
    {
      user: {
        id: newUser.id,
        _id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isActive: newUser.isActive,
      },
      temporaryPassword: password ? undefined : rawPassword,
      invitationLink: finalInviteLink,
      inviteToken: rawToken,
    },
    'Team member created successfully.'
  );
});

/**
 * Updates a team member's details, role, or contact information.
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, customRoleId, password, isActive, status } = req.body;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    if (String(id).startsWith('mock-')) {
      return sendResponse(res, 200, { user: { id, name, phone, role } }, 'Team member updated successfully.');
    }
    throw ApiError.notFound('Team member not found.');
  }

  // Tenant Isolation Check
  if (req.user.role !== 'SUPER_ADMIN' && targetUser.businessId !== req.user.businessId) {
    throw ApiError.forbidden('You do not have permission to modify users outside your business.');
  }

  // Anti-Privilege Escalation Rules:
  // 1. Sub-users cannot change their own role or another user's role unless they have team.manage
  if (req.user.id === targetUser.id && (role !== undefined || customRoleId !== undefined)) {
    throw ApiError.forbidden('You cannot change your own role.');
  }

  // 2. Cannot demote the business owner
  if (targetUser.isOwner && role && role !== targetUser.role) {
    throw ApiError.forbidden('The primary business owner role cannot be altered.');
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

  if (isActive !== undefined && !targetUser.isOwner) {
    updateData.isActive = Boolean(isActive);
  } else if (status !== undefined && !targetUser.isOwner) {
    updateData.isActive = status === true || status === 'ACTIVE' || status === 'active';
  }

  if (role !== undefined && !targetUser.isOwner) {
    if (role === 'SUPER_ADMIN') throw ApiError.forbidden('Cannot assign SUPER_ADMIN role.');
    updateData.role = role;
  }

  if (customRoleId !== undefined && !targetUser.isOwner) {
    if (customRoleId && req.user.role !== 'SUPER_ADMIN' && !req.user.isSuperAdmin) {
      const subInfo = await getActiveSubscription(targetUser.businessId || req.user.businessId, req.user.id);
      const isPremium = subInfo.isActive && (subInfo.planTier === 'PREMIUM' || subInfo.planTier === 'ENTERPRISE');
      if (!isPremium) {
        throw ApiError.forbidden('Assigning custom roles requires an active Premium subscription.');
      }
    }
    updateData.appRoleId = customRoleId || null;
  }

  if (password && password.length >= 6) {
    const salt = await bcrypt.genSalt(10);
    updateData.passwordHash = await bcrypt.hash(password, salt);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isOwner: true,
      isActive: true,
      appRole: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  return sendResponse(
    res,
    200,
    { user: { ...updatedUser, _id: updatedUser.id } },
    'Team member updated successfully.'
  );
});

/**
 * Toggles a team member's active/suspended status.
 */
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    if (String(id).startsWith('mock-')) {
      return sendResponse(res, 200, { user: { id, isActive: !isActive } }, 'Status updated successfully.');
    }
    throw ApiError.notFound('Team member not found.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && targetUser.businessId !== req.user.businessId) {
    throw ApiError.forbidden('Access denied.');
  }

  if (targetUser.isOwner) {
    throw ApiError.forbidden('The primary business owner account cannot be deactivated.');
  }

  if (req.user.id === targetUser.id) {
    throw ApiError.forbidden('You cannot deactivate your own account.');
  }

  const newStatus = isActive !== undefined ? Boolean(isActive) : !targetUser.isActive;

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: newStatus },
    select: { id: true, name: true, email: true, isActive: true },
  });

  // Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: newStatus ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
        entity: 'User',
        entityId: targetUser.id,
        ipAddress: req.ip || '',
      },
    });
  } catch (_) {}

  return sendResponse(
    res,
    200,
    { user: { ...updated, _id: updated.id } },
    `Team member account ${newStatus ? 'activated' : 'deactivated'} successfully.`
  );
});

/**
 * Removes or deactivates a sub-user. Protects owner from deletion.
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    if (String(id).startsWith('mock-')) {
      return sendResponse(res, 200, { success: true }, 'Team member removed successfully.');
    }
    throw ApiError.notFound('Team member not found.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && targetUser.businessId !== req.user.businessId) {
    throw ApiError.forbidden('Access denied.');
  }

  if (targetUser.isOwner) {
    throw ApiError.forbidden('The primary business owner account cannot be deleted.');
  }

  if (req.user.id === targetUser.id) {
    throw ApiError.forbidden('You cannot delete your own account.');
  }

  // Soft-delete / deactivate to preserve historical invoice integrity
  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  // Also soft-delete / deactivate corresponding staff record
  try {
    await prisma.staff.updateMany({
      where: {
        OR: [
          { userId: id },
          { email: { equals: targetUser.email, mode: 'insensitive' } },
        ],
      },
      data: {
        status: 'INACTIVE',
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  } catch (_) {}

  // Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: targetUser.id,
        ipAddress: req.ip || '',
      },
    });
  } catch (_) {}

  return sendResponse(res, 200, {}, 'Team member removed successfully.');
});

/**
 * Inspect permission breakdown for a specific user.
 */
export const getUserPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw ApiError.notFound('User not found.');

  if (req.user.role !== 'SUPER_ADMIN' && targetUser.businessId !== req.user.businessId) {
    throw ApiError.forbidden('Access denied.');
  }

  const breakdown = await getUserPermissionBreakdown(id);
  return sendResponse(res, 200, breakdown, 'User permissions retrieved successfully.');
});

/**
 * Updates explicit permission overrides for a team member.
 */
export const updateUserPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { overrides } = req.body;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw ApiError.notFound('User not found.');

  if (req.user.role !== 'SUPER_ADMIN' && targetUser.businessId !== req.user.businessId) {
    throw ApiError.forbidden('Access denied.');
  }

  if (targetUser.isOwner) {
    throw ApiError.badRequest('Cannot override permissions for the business owner.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && !req.user.isSuperAdmin) {
    const subInfo = await getActiveSubscription(targetUser.businessId || req.user.businessId, req.user.id);
    const isPremium = subInfo.isActive && (subInfo.planTier === 'PREMIUM' || subInfo.planTier === 'ENTERPRISE');
    if (!isPremium) {
      throw ApiError.forbidden('Granular permission overrides require an active Premium subscription.');
    }
  }

  const updatedBreakdown = await updateUserPermissionOverrides(id, overrides);

  // Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PERMISSION_OVERRIDE_CHANGED',
        entity: 'User',
        entityId: id,
        changes: { overridesCount: overrides?.length || 0 },
        ipAddress: req.ip || '',
      },
    });
  } catch (_) {}

  return sendResponse(
    res,
    200,
    updatedBreakdown,
    'User permission overrides updated successfully.'
  );
});

export default {
  getUsers,
  getUserById,
  createSubUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getUserPermissions,
  updateUserPermissions,
};
