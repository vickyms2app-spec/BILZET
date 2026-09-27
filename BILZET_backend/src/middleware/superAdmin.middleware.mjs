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

  if (userEmail !== MASTER_SUPER_ADMIN_EMAIL) {
    throw ApiError.forbidden(
      'Access Denied: Only the application master super admin (Vickyms2app@gmail.com) can access this control panel.'
    );
  }

  next();
};

export default superAdminMiddleware;
