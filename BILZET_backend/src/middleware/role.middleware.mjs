import { ApiError } from '../utils/ApiError.mjs';

/**
 * Higher-order middleware to authorize specific user roles.
 * @param  {...string} allowedRoles
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Role '${req.user.role}' is not authorized for this resource`
        )
      );
    }

    next();
  };
};

export default authorizeRoles;
