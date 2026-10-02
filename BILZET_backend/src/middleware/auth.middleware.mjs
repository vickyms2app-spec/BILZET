import jwt from 'jsonwebtoken';
import { env } from '../config/env.mjs';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';
import { verifyToken } from '@clerk/express';

export const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  // 1. Try Clerk Token verification if Clerk secret key is configured
  if (env.CLERK_SECRET_KEY) {
    try {
      const verifiedClerk = await verifyToken(token, {
        secretKey: env.CLERK_SECRET_KEY,
      });

      if (verifiedClerk && verifiedClerk.sub) {
        const clerkUserId = verifiedClerk.sub;
        const emailClaim = verifiedClerk.email || verifiedClerk.email_address;

        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { googleId: clerkUserId },
              ...(emailClaim ? [{ email: emailClaim }] : []),
            ],
          },
        });

        if (!user && emailClaim) {
          // Provision application user for Clerk identity
          const count = await prisma.user.count();
          user = await prisma.user.create({
            data: {
              name: verifiedClerk.name || emailClaim.split('@')[0],
              email: emailClaim,
              googleId: clerkUserId,
              role: count === 0 ? 'ADMIN' : 'CASHIER',
              isActive: true,
            },
          });
        }

        if (user) {
          if (!user.isActive) {
            throw ApiError.forbidden('User account has been deactivated. Please contact an administrator.');
          }
          req.user = {
            ...user,
            _id: user.id,
          };
          return next();
        }
      }
    } catch (clerkErr) {
      // Fall through to JWT verification below
    }
  }

  // 2. JWT Verification (and local session token fallback)
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });
    } catch (dbErr) {
      if (dbErr.message?.includes("Can't reach database server") || dbErr.code === 'P1001') {
        user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'ADMIN',
          isActive: true,
        };
      } else {
        throw dbErr;
      }
    }

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
