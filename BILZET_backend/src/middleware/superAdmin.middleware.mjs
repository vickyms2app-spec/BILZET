import { ApiError } from '../utils/ApiError.mjs';

const MASTER_SUPER_ADMIN_EMAIL = 'vickyms2app@gmail.com';

/**
 * Middleware that strictly permits only the designated platform master admin.
 * Authorized Email: Vickyms2app@gmail.com
 */
export const superAdminMiddleware = (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const userEmail = (req.user.email || '').trim().toLowerCase();
  const isMasterEmail = userEmail === MASTER_SUPER_ADMIN_EMAIL;
  const isSuperAdminRole = req.user.role === 'SUPER_ADMIN';

  if (!isMasterEmail && !isSuperAdminRole) {
    throw ApiError.forbidden(
      'Access Denied: Only application super admins can access this control panel.'
    );
  }

  next();
};

export default superAdminMiddleware;
