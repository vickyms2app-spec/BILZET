import { ApiError } from '../utils/ApiError.mjs';
import { getEffectivePermissions } from '../services/permission.service.mjs';

/**
 * Enforces that the authenticated user possesses the specific permission.
 * Super Admins and Business Owners automatically bypass tenant-level action checks.
 *
 * @param {string} permissionKey e.g. "billing.create", "inventory.adjust"
 */
export const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return next(ApiError.unauthorized('Authentication required'));
      }

      if (!user.isActive) {
        return next(ApiError.forbidden('Your account is deactivated. Contact your business owner.'));
      }

      // 1. Platform Super Admin bypasses tenant permission gates
      if (user.role === 'SUPER_ADMIN') {
        return next();
      }

      // 2. Business Owner has full authority over their tenant
      if (user.isOwner) {
        return next();
      }

      // 3. Resolve effective permissions with user overrides & role inheritance
      const effectivePermissions = await getEffectivePermissions(user.id);

      if (!effectivePermissions.has(permissionKey)) {
        return next(
          ApiError.forbidden(
            `Access denied. You do not have permission to perform this action ('${permissionKey}').`
          )
        );
      }

      req.effectivePermissions = effectivePermissions;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Enforces that the user has AT LEAST ONE of the specified permissions.
 * @param  {...string} permissionKeys
 */
export const requireAnyPermission = (...permissionKeys) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return next(ApiError.unauthorized('Authentication required'));
      if (!user.isActive) return next(ApiError.forbidden('Your account is deactivated.'));
      if (user.role === 'SUPER_ADMIN' || user.isOwner) return next();

      const effectivePermissions = await getEffectivePermissions(user.id);
      const hasAny = permissionKeys.some((k) => effectivePermissions.has(k));

      if (!hasAny) {
        return next(
          ApiError.forbidden(
            `Access denied. Required permissions: one of [${permissionKeys.join(', ')}]`
          )
        );
      }

      req.effectivePermissions = effectivePermissions;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Enforces that only the business owner or platform super admin can access the endpoint.
 * Protects subscription upgrades, owner deletions, and billing changes.
 */
export const requireBusinessOwner = (req, res, next) => {
  const user = req.user;
  if (!user) return next(ApiError.unauthorized('Authentication required'));
  if (user.role === 'SUPER_ADMIN' || user.isOwner) return next();

  return next(
    ApiError.forbidden('Only the primary business owner can perform this operation.')
  );
};

export default {
  requirePermission,
  requireAnyPermission,
  requireBusinessOwner,
};
