import prisma from '../config/prisma.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getActiveSubscription } from '../services/subscription.service.mjs';

/**
 * Lists available system roles and business custom roles.
 */
export const getRoles = asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;

  const roles = await prisma.appRole.findMany({
    where: {
      OR: [
        { isSystem: true },
        ...(businessId ? [{ businessId }] : []),
      ],
    },
    include: {
      permissions: {
        include: {
          permission: {
            select: { id: true, key: true, module: true, action: true, description: true },
          },
        },
      },
      _count: {
        select: { users: true },
      },
    },
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });

  return sendResponse(
    res,
    200,
    {
      roles: roles.map((r) => ({
        id: r.id,
        _id: r.id,
        name: r.name,
        code: r.code,
        description: r.description,
        isSystem: r.isSystem,
        userCount: r._count.users,
        permissionsCount: r.permissions.length,
        permissions: r.permissions.map((rp) => rp.permission),
      })),
    },
    'Roles retrieved successfully.'
  );
});

/**
 * Returns the entire master permission catalog grouped by module.
 */
export const getPermissionsCatalog = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });

  // Group by module for convenient UI rendering
  const grouped = {};
  permissions.forEach((p) => {
    if (!grouped[p.module]) {
      grouped[p.module] = [];
    }
    grouped[p.module].push(p);
  });

  return sendResponse(
    res,
    200,
    {
      permissions,
      grouped,
      modules: Object.keys(grouped),
    },
    'Permission catalog retrieved successfully.'
  );
});

/**
 * Creates a new custom role within the caller's business.
 */
export const createCustomRole = asyncHandler(async (req, res) => {
  const { name, description, permissionKeys } = req.body;

  if (!name || !name.trim()) {
    throw ApiError.badRequest('Role name is required.');
  }

  const businessId = req.user.businessId;
  if (!businessId) {
    throw ApiError.badRequest('You must have an active business profile to create custom roles.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && !req.user.isSuperAdmin) {
    const subInfo = await getActiveSubscription(businessId, req.user.id);
    const isPremium = subInfo.isActive && (subInfo.planTier === 'PREMIUM' || subInfo.planTier === 'ENTERPRISE');
    if (!isPremium) {
      throw ApiError.forbidden('Custom roles require an active Premium subscription.');
    }
  }

  // Generate unique slug code for custom role
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .slice(0, 30);
  const code = `CUSTOM_${slug}_${Math.floor(100 + Math.random() * 900)}`;

  const newRole = await prisma.appRole.create({
    data: {
      name: name.trim(),
      code,
      description: description?.trim() || null,
      isSystem: false,
      businessId,
    },
  });

  // Attach selected permissions
  if (Array.isArray(permissionKeys) && permissionKeys.length > 0) {
    const matchedPerms = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true },
    });

    for (const perm of matchedPerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: newRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_CREATED',
        entity: 'Role',
        entityId: newRole.id,
        changes: { name: newRole.name, code: newRole.code },
        ipAddress: req.ip || '',
      },
    });
  } catch (_) {}

  return sendResponse(
    res,
    201,
    { role: { ...newRole, _id: newRole.id } },
    'Custom role created successfully.'
  );
});

/**
 * Updates an existing custom role's name, description, or permissions.
 */
export const updateCustomRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, permissionKeys } = req.body;

  const role = await prisma.appRole.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('Role not found.');

  if (role.isSystem) {
    throw ApiError.forbidden('System roles cannot be modified.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && role.businessId !== req.user.businessId) {
    throw ApiError.forbidden('Access denied.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && !req.user.isSuperAdmin) {
    const subInfo = await getActiveSubscription(role.businessId || req.user.businessId, req.user.id);
    const isPremium = subInfo.isActive && (subInfo.planTier === 'PREMIUM' || subInfo.planTier === 'ENTERPRISE');
    if (!isPremium) {
      throw ApiError.forbidden('Custom roles require an active Premium subscription.');
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description ? description.trim() : null;

  const updatedRole = await prisma.appRole.update({
    where: { id },
    data: updateData,
  });

  if (Array.isArray(permissionKeys)) {
    // Replace role permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });

    const matchedPerms = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true },
    });

    for (const perm of matchedPerms) {
      await prisma.rolePermission.create({
        data: {
          roleId: id,
          permissionId: perm.id,
        },
      });
    }
  }

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_UPDATED',
        entity: 'Role',
        entityId: id,
        ipAddress: req.ip || '',
      },
    });
  } catch (_) {}

  return sendResponse(
    res,
    200,
    { role: { ...updatedRole, _id: updatedRole.id } },
    'Role updated successfully.'
  );
});

/**
 * Deletes a custom role (protected against deleting system roles or roles currently in use).
 */
export const deleteCustomRole = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await prisma.appRole.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) throw ApiError.notFound('Role not found.');

  if (role.isSystem) {
    throw ApiError.forbidden('System roles cannot be deleted.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && role.businessId !== req.user.businessId) {
    throw ApiError.forbidden('Access denied.');
  }

  if (req.user.role !== 'SUPER_ADMIN' && !req.user.isSuperAdmin) {
    const subInfo = await getActiveSubscription(role.businessId || req.user.businessId, req.user.id);
    const isPremium = subInfo.isActive && (subInfo.planTier === 'PREMIUM' || subInfo.planTier === 'ENTERPRISE');
    if (!isPremium) {
      throw ApiError.forbidden('Custom roles require an active Premium subscription.');
    }
  }

  if (role._count.users > 0) {
    throw ApiError.badRequest(
      `Cannot delete this role because ${role._count.users} team member(s) are currently assigned to it. Reassign them first.`
    );
  }

  await prisma.appRole.delete({ where: { id } });

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ROLE_DELETED',
        entity: 'Role',
        entityId: id,
        ipAddress: req.ip || '',
      },
    });
  } catch (_) {}

  return sendResponse(res, 200, {}, 'Custom role deleted successfully.');
});

export default {
  getRoles,
  getPermissionsCatalog,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
};
