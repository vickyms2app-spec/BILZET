import jwt from 'jsonwebtoken';
import { env } from '../config/env.mjs';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

export const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('User account has been deactivated. Please contact an administrator.');
    }

    // Attach user and backward-compatible _id
    req.user = {
      ...user,
      _id: user.id,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired, please log in again');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid authentication token');
    }
    throw error;
  }
});

export default authMiddleware;
