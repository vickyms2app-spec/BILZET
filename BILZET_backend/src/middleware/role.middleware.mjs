import { ApiError } from '../utils/ApiError.mjs';

/**
 * Higher-order middleware to authorize specific user roles.
 * Super Admins and Business Owners automatically have administrative authority.
 * @param  {...string} allowedRoles
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // 1. Super Admin has platform-wide authority
    if (req.user.role === 'SUPER_ADMIN' || Boolean(req.user.isSuperAdmin)) {
      return next();
    }

    // 2. Business Owner has administrative authority over their tenant
    if (req.user.isOwner && (allowedRoles.includes('ADMIN') || allowedRoles.includes('MANAGER'))) {
      return next();
    }

    // 3. Direct role match
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(
      ApiError.forbidden(
        `Access forbidden: Role '${req.user.role}' is not authorized for this resource`
      )
    );
  };
};

export default authorizeRoles;
