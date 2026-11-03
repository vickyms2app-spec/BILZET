import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { SYSTEM_ROLE_DEFINITIONS, SYSTEM_ROLES, PERMISSIONS_CATALOG } from '../config/permissions.catalog.mjs';

/**
 * Resolves all effective permissions for a user into a Set of permission keys.
 * Deterministic precedence:
 * 1. SUPER_ADMIN -> ALL
 * 2. True Business Owner of active business -> ALL
 * 3. Business Member explicit permissions array from businessMember -> ALLOW
 * 4. Custom AppRole assigned by owner -> ALLOW
 * 5. Default permissions from System Role catalog -> ALLOW
 * 6. User explicit overrides: false -> DENY, true -> ALLOW
 * 7. Default -> DENY
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
  if (user.role === 'SUPER_ADMIN' || Boolean(user.isSuperAdmin)) {
    const allPerms = await prisma.permission.findMany({ select: { key: true } }).catch(() => []);
    if (allPerms.length > 0) {
      return new Set(allPerms.map((p) => p.key));
    }
    return new Set(PERMISSIONS_CATALOG.map((p) => p.key));
  }

  // 2. Business Owner: Only grant tenant owner bypass if user genuinely owns the business
  let isTrueOwner = false;
  if (user.isOwner || user.role === 'ADMIN' || user.role === 'OWNER') {
    if (user.businessId) {
      const biz = await prisma.business.findFirst({
        where: { id: user.businessId, ownerId: user.id },
      }).catch(() => null);
      if (biz) isTrueOwner = true;
    } else {
      const ownedBiz = await prisma.business.findFirst({
        where: { ownerId: user.id },
      }).catch(() => null);
      if (ownedBiz) isTrueOwner = true;
    }
  }

  if (isTrueOwner) {
    const allPerms = await prisma.permission.findMany({ select: { key: true } }).catch(() => []);
    if (allPerms.length > 0) {
      return new Set(allPerms.map((p) => p.key));
    }
    return new Set(PERMISSIONS_CATALOG.map((p) => p.key));
  }

  const effectiveSet = new Set();

  // 3. Check BusinessMember record for explicit assigned permissions
  const activeMember = await prisma.businessMember.findFirst({
    where: {
      userId: user.id,
      status: 'ACTIVE',
      ...(user.businessId ? { businessId: user.businessId } : {}),
    },
  }).catch(() => null);

  if (activeMember?.permissions && Array.isArray(activeMember.permissions)) {
    activeMember.permissions.forEach((permKey) => {
      if (typeof permKey === 'string' && permKey.trim()) {
        effectiveSet.add(permKey.trim());
      }
    });
  }

  // 4. Collect permissions from assigned custom AppRole
  if (user.appRole?.permissions) {
    user.appRole.permissions.forEach((rp) => {
      if (rp.permission?.key) effectiveSet.add(rp.permission.key);
    });
  }

  // 5. Fallback: Add default permissions from System Role catalog
  const effectiveRoleCode = String(activeMember?.role || user.role || '').toUpperCase();
  const matchedSystemRole = (SYSTEM_ROLE_DEFINITIONS || SYSTEM_ROLES || []).find((r) => r.code === effectiveRoleCode);
  if (matchedSystemRole && Array.isArray(matchedSystemRole.permissions)) {
    matchedSystemRole.permissions.forEach((pk) => effectiveSet.add(pk));
  }

  // 6. CA Store Access default permissions
  if (effectiveRoleCode === 'CA' || effectiveRoleCode === 'ACCOUNTANT') {
    const caDefaults = [
      'ca_portal.view', 'billing.view', 'billing.export', 'billing.print',
      'gst.view', 'gst.export', 'reports.view', 'reports.sales',
      'reports.profit_loss', 'reports.export'
    ];
    caDefaults.forEach((pk) => effectiveSet.add(pk));
  }

  // 7. Apply explicit user overrides
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
 * Retrieves the full permission matrix breakdown for a specific user.
 * @param {string} userId
 */
export const getUserPermissionBreakdown = async (userId) => {
  if (!userId) throw ApiError.badRequest('User ID is required.');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissionOverrides: {
        include: { permission: true },
      },
      appRole: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!user) throw ApiError.notFound('User not found.');

  const effectiveSet = await getEffectivePermissions(userId);

  let allPermissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  }).catch(() => []);

  if (!allPermissions || allPermissions.length === 0) {
    allPermissions = PERMISSIONS_CATALOG;
  }

  const overrideMap = new Map();
  if (user.permissionOverrides) {
    user.permissionOverrides.forEach((po) => {
      const key = po.permission?.key;
      if (key) overrideMap.set(key, po.allowed);
    });
  }

  const roleInheritedKeys = new Set();
  if (user.appRole?.permissions) {
    user.appRole.permissions.forEach((rp) => {
      if (rp.permission?.key) roleInheritedKeys.add(rp.permission.key);
    });
  } else {
    const roleUpper = String(user.role || '').toUpperCase();
    const systemRole = (SYSTEM_ROLE_DEFINITIONS || SYSTEM_ROLES || []).find((r) => r.code === roleUpper);
    if (systemRole && Array.isArray(systemRole.permissions)) {
      systemRole.permissions.forEach((pk) => roleInheritedKeys.add(pk));
    }
  }

  const breakdown = allPermissions.map((perm) => {
    const key = perm.key;
    const hasOverride = overrideMap.has(key);
    const overrideVal = hasOverride ? overrideMap.get(key) : null;
    const isInherited = roleInheritedKeys.has(key);
    const isGranted = effectiveSet.has(key);

    return {
      id: perm.id || `perm-${key}`,
      key,
      module: perm.module,
      action: perm.action,
      description: perm.description,
      granted: isGranted,
      inherited: isInherited,
      override: overrideVal,
    };
  });

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    role: user.role,
    isOwner: Boolean(user.isOwner),
    effectivePermissions: Array.from(effectiveSet),
    permissions: breakdown,
  };
};

/**
 * Updates explicit permission overrides for a team member.
 * @param {string} userId
 * @param {Array|Object} overrides
 */
export const updateUserPermissionOverrides = async (userId, overrides) => {
  if (!userId) throw ApiError.badRequest('User ID is required.');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissionOverrides: true },
  });

  if (!user) throw ApiError.notFound('User not found.');

  let overrideItems = [];
  if (Array.isArray(overrides)) {
    if (overrides.length > 0 && typeof overrides[0] === 'string') {
      const grantedKeys = new Set(overrides);
      const allPerms = await prisma.permission.findMany().catch(() => []);
      const permsList = allPerms.length > 0 ? allPerms : PERMISSIONS_CATALOG;
      overrideItems = permsList.map((p) => ({
        permissionKey: p.key,
        allowed: grantedKeys.has(p.key),
      }));
    } else {
      overrideItems = overrides.map((o) => ({
        permissionKey: o.permissionKey || o.key || o.permissionId,
        allowed: Boolean(o.allowed),
      }));
    }
  } else if (overrides && typeof overrides === 'object') {
    overrideItems = Object.entries(overrides).map(([key, allowed]) => ({
      permissionKey: key,
      allowed: Boolean(allowed),
    }));
  }

  for (const item of overrideItems) {
    if (!item.permissionKey) continue;
    const permRecord = await prisma.permission.findUnique({
      where: { key: item.permissionKey },
    }).catch(() => null);

    if (permRecord) {
      await prisma.permissionOverride.upsert({
        where: {
          userId_permissionId: {
            userId: user.id,
            permissionId: permRecord.id,
          },
        },
        update: { allowed: item.allowed },
        create: {
          userId: user.id,
          permissionId: permRecord.id,
          allowed: item.allowed,
        },
      }).catch(() => {});
    }
  }

  if (user.businessId) {
    const grantedList = overrideItems.filter((i) => i.allowed).map((i) => i.permissionKey);
    await prisma.businessMember.updateMany({
      where: { userId: user.id, businessId: user.businessId },
      data: { permissions: grantedList },
    }).catch(() => {});
  }

  return getUserPermissionBreakdown(userId);
};

export default {
  getEffectivePermissions,
  hasPermission,
  getUserPermissionMap,
  getUserPermissionBreakdown,
  updateUserPermissionOverrides,
};
