import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';

/**
 * Resolves all effective permissions for a user into a Set of permission keys.
 * Deterministic precedence:
 * 1. SUPER_ADMIN -> ALL
 * 2. isOwner: true -> ALL
 * 3. User explicit override: false -> DENY, true -> ALLOW
 * 4. Role inherited permission -> ALLOW
 * 5. Default -> DENY
 *
 * @param {string} userId
 * @returns {Promise<Set<string>>} Set of granted permission keys
 */
export const getEffectivePermissions = async (userId) => {
  if (!userId) return new Set();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      appRole: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
      permissionOverrides: {
        include: { permission: true },
      },
    },
  });

  if (!user || !user.isActive) {
    return new Set();
  }

  // 1. Platform Super Admin has unrestricted access to all permissions
  if (user.role === 'SUPER_ADMIN') {
    const allPerms = await prisma.permission.findMany({ select: { key: true } });
    return new Set(allPerms.map((p) => p.key));
  }

  // 2. Business Owner has full access to all tenant operations
  if (user.isOwner) {
    const allPerms = await prisma.permission.findMany({ select: { key: true } });
    return new Set(allPerms.map((p) => p.key));
  }

  const effectiveSet = new Set();

  // 3. Collect permissions from assigned role (or fallback to system role by enum)
  let rolePermissionKeys = new Set();

  if (user.appRole?.permissions) {
    user.appRole.permissions.forEach((rp) => {
      if (rp.permission?.key) rolePermissionKeys.add(rp.permission.key);
    });
  } else if (user.role) {
    // If user has no custom role assigned, load permissions from system role matching enum code
    const systemRole = await prisma.appRole.findFirst({
      where: {
        code: String(user.role),
        isSystem: true,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (systemRole?.permissions) {
      systemRole.permissions.forEach((rp) => {
        if (rp.permission?.key) rolePermissionKeys.add(rp.permission.key);
      });
    }
  }

  // Add all role permissions initially
  rolePermissionKeys.forEach((k) => effectiveSet.add(k));

  // 4. Apply explicit user overrides
  if (user.permissionOverrides && user.permissionOverrides.length > 0) {
    user.permissionOverrides.forEach((override) => {
      const key = override.permission?.key;
      if (!key) return;

      if (override.allowed === true) {
        effectiveSet.add(key); // Force Grant
      } else if (override.allowed === false) {
        effectiveSet.delete(key); // Force Revoke
      }
    });
  }

  return effectiveSet;
};

/**
 * Checks if a specific user possesses a given permission.
 * @param {string} userId
 * @param {string} permissionKey
 * @returns {Promise<boolean>}
 */
export const hasPermission = async (userId, permissionKey) => {
  const permSet = await getEffectivePermissions(userId);
  return permSet.has(permissionKey);
};

/**
 * Returns a dictionary mapping permissionKey -> boolean for frontend consumption.
 * @param {string} userId
 */
export const getUserPermissionMap = async (userId) => {
  const permSet = await getEffectivePermissions(userId);
  const map = {};
  permSet.forEach((k) => {
    map[k] = true;
  });
  return map;
};

/**
 * Returns a comprehensive permission inspection breakdown distinguishing
 * inherited role permissions, overrides, and default state for UI display.
 * @param {string} userId
 */
export const getUserPermissionBreakdown = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      appRole: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
      permissionOverrides: {
        include: { permission: true },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const allPermissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });

  const rolePermKeys = new Set();
  if (user.appRole?.permissions) {
    user.appRole.permissions.forEach((rp) => {
      if (rp.permission?.key) rolePermKeys.add(rp.permission.key);
    });
  } else if (user.role) {
    const systemRole = await prisma.appRole.findFirst({
      where: { code: String(user.role), isSystem: true },
      include: {
        permissions: { include: { permission: true } },
      },
    });
    systemRole?.permissions?.forEach((rp) => {
      if (rp.permission?.key) rolePermKeys.add(rp.permission.key);
    });
  }

  const overrideMap = new Map();
  user.permissionOverrides?.forEach((o) => {
    if (o.permission?.key) {
      overrideMap.set(o.permission.key, o.allowed);
    }
  });

  const breakdown = allPermissions.map((perm) => {
    let effective = false;
    let source = 'DEFAULT_DENY';

    if (user.role === 'SUPER_ADMIN') {
      effective = true;
      source = 'SUPER_ADMIN';
    } else if (user.isOwner) {
      effective = true;
      source = 'OWNER';
    } else if (overrideMap.has(perm.key)) {
      const allowed = overrideMap.get(perm.key);
      effective = allowed;
      source = allowed ? 'USER_OVERRIDE_ALLOW' : 'USER_OVERRIDE_DENY';
    } else if (rolePermKeys.has(perm.key)) {
      effective = true;
      source = 'ROLE';
    }

    return {
      id: perm.id,
      key: perm.key,
      module: perm.module,
      action: perm.action,
      description: perm.description,
      effective,
      source,
      roleDefault: rolePermKeys.has(perm.key),
      hasOverride: overrideMap.has(perm.key),
      overrideAllowed: overrideMap.get(perm.key) ?? null,
    };
  });

  return {
    userId: user.id,
    userName: user.name,
    email: user.email,
    isOwner: user.isOwner,
    role: user.role,
    customRole: user.appRole ? { id: user.appRole.id, name: user.appRole.name, code: user.appRole.code } : null,
    permissions: breakdown,
  };
};

/**
 * Updates a user's explicit permission overrides.
 * @param {string} userId
 * @param {Array<{ permissionId?: string, key?: string, allowed: boolean | null }>} overrides
 */
export const updateUserPermissionOverrides = async (userId, overrides = []) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  if (user.isOwner) {
    throw ApiError.badRequest('Cannot set permission overrides for the business owner.');
  }

  // Clear existing overrides and replace with new set
  await prisma.userPermission.deleteMany({ where: { userId } });

  for (const item of overrides) {
    const isAllowed =
      item.allowed !== undefined
        ? item.allowed
        : item.isGranted !== undefined
        ? item.isGranted
        : item.granted;

    if (isAllowed === null || isAllowed === undefined) {
      continue; // null indicates reverting back to role default
    }

    let permissionId = item.permissionId;
    if (!permissionId && item.key) {
      const p = await prisma.permission.findUnique({ where: { key: item.key } });
      permissionId = p?.id;
    }

    if (permissionId) {
      await prisma.userPermission.create({
        data: {
          userId,
          permissionId,
          allowed: Boolean(isAllowed),
        },
      });
    }
  }

  return getUserPermissionBreakdown(userId);
};

export default {
  hasPermission,
  getEffectivePermissions,
  getUserPermissionMap,
  getUserPermissionBreakdown,
  updateUserPermissionOverrides,
};
