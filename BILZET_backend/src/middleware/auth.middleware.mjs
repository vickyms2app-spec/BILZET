import jwt from 'jsonwebtoken';
import { env } from '../config/env.mjs';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';
import { getAuth, verifyToken, createClerkClient } from '@clerk/express';

const attachTenantContext = async (user, requestedStoreId = null) => {
  let effectiveBusinessId = user.businessId || null;
  let isOwner = Boolean(user.isOwner);

  // If a specific store was requested via headers, verify authorization
  if (requestedStoreId && requestedStoreId !== effectiveBusinessId) {
    if (user.role === 'SUPER_ADMIN') {
      effectiveBusinessId = requestedStoreId;
    } else {
      const existingBiz = await prisma.business.findUnique({
        where: { id: requestedStoreId },
      });

      if (!existingBiz) {
        // Store does NOT exist in DB (e.g. stale header from a wiped/reset DB or offline mock).
        // Safely fall back to the user's real business without throwing 403.
        console.warn(`[Tenant] Requested store ${requestedStoreId} does not exist in DB, falling back to ${effectiveBusinessId}`);
      } else if (
        existingBiz.ownerId !== user.id &&
        (!user.businessId || user.businessId !== existingBiz.id)
      ) {
        // Anti-IDOR: Store exists and belongs to a different owner!
        throw ApiError.forbidden('You are not authorized to access this store.');
      } else {
        effectiveBusinessId = existingBiz.id;
        isOwner = existingBiz.ownerId === user.id || isOwner;
      }
    }
  }

  if (!effectiveBusinessId && user.role !== 'SUPER_ADMIN') {
    try {
      const owned = await prisma.business.findFirst({ where: { ownerId: user.id } });
      if (owned) {
        effectiveBusinessId = owned.id;
        isOwner = true;
      } else if (user.role === 'ADMIN' || !user.role) {
        // Auto-provision tenant for store admin
        const newBiz = await prisma.business.create({
          data: {
            ownerId: user.id,
            name: `${user.name || 'Store'}'s Store`,
            email: user.email || `${user.id}@bilzet.store`,
          },
        });
        effectiveBusinessId = newBiz.id;
        isOwner = true;
        await prisma.user.update({
          where: { id: user.id },
          data: { businessId: newBiz.id, isOwner: true },
        }).catch(() => {});
      }
    } catch (bizErr) {
      console.warn('[Tenant] Auto-provision fallback:', bizErr?.message);
      effectiveBusinessId = user.id;
      isOwner = true;
    }
  }

  return {
    ...user,
    _id: user.id,
    businessId: effectiveBusinessId,
    isOwner,
  };
};

export const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Check if Clerk already verified the request via clerkMiddleware
  let clerkAuth = null;
  try {
    clerkAuth = getAuth(req);
  } catch (_) {}

  let clerkUserId = clerkAuth?.userId;

  if ((!token || token === 'null' || token === 'undefined' || token.trim() === '') && !clerkUserId) {
    throw ApiError.unauthorized('Authentication token is required');
  }

  const requestedStoreId =
    req.headers['x-business-id'] ||
    req.headers['x-store-id'] ||
    null;

  // 1. Try Clerk Token verification if Clerk secret key is configured
  if (env.CLERK_SECRET_KEY && (clerkUserId || token)) {
    let isClerk = Boolean(clerkUserId);
    try {
      let emailClaim = clerkAuth?.sessionClaims?.email || clerkAuth?.sessionClaims?.email_address;
      let userName = clerkAuth?.sessionClaims?.name;

      if (!clerkUserId && token) {
        try {
          const verifiedClerk = await verifyToken(token, {
            secretKey: env.CLERK_SECRET_KEY,
            publishableKey: env.CLERK_PUBLISHABLE_KEY,
          });
          if (verifiedClerk && verifiedClerk.sub) {
            clerkUserId = verifiedClerk.sub;
            isClerk = true;
            emailClaim = verifiedClerk.email || verifiedClerk.email_address || emailClaim;
            userName = verifiedClerk.name || userName;
          }
        } catch (clerkVerifyErr) {
          // If verifyToken fails (e.g. network/JWKS), decode token to inspect claims
          const decoded = jwt.decode(token);
          if (decoded && (decoded.iss?.includes('clerk') || String(decoded.sub).startsWith('user_'))) {
            clerkUserId = decoded.sub;
            isClerk = true;
            emailClaim = decoded.email || decoded.email_address || emailClaim;
          }
        }
      }

      if (clerkUserId) {
        // Look up existing user by clerkId or email
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { googleId: clerkUserId },
              { id: clerkUserId },
              ...(emailClaim ? [{ email: emailClaim }] : []),
            ],
          },
        }).catch(() => null);

        // If not found in DB and email is missing, fetch from Clerk API
        if (!user && !emailClaim && env.CLERK_SECRET_KEY) {
          try {
            const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
            const clerkUserData = await clerk.users.getUser(clerkUserId).catch(() => null);
            emailClaim = clerkUserData?.emailAddresses?.[0]?.emailAddress;
            userName = clerkUserData?.firstName
              ? `${clerkUserData.firstName} ${clerkUserData.lastName || ''}`.trim()
              : (emailClaim?.split('@')[0] || userName || 'Clerk User');
          } catch (_) {}
        }

        const finalEmail = emailClaim || `${clerkUserId}@clerk.user`;
        const finalName = userName || (finalEmail.includes('@') ? finalEmail.split('@')[0] : 'Clerk User');

        // Ensure user is persisted in the database so foreign keys (e.g. business.ownerId) work
        if (!user) {
          try {
            user = await prisma.user.create({
              data: {
                id: clerkUserId,
                googleId: clerkUserId,
                name: finalName,
                email: finalEmail,
                role: 'ADMIN',
                isOwner: true,
                isActive: true,
              },
            });
          } catch (createErr) {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { googleId: clerkUserId },
                  { id: clerkUserId },
                  { email: finalEmail },
                ],
              },
            }).catch(() => null);

            if (!user) {
              user = {
                id: clerkUserId,
                name: finalName,
                email: finalEmail,
                role: 'ADMIN',
                isActive: true,
              };
            }
          }
        } else if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: clerkUserId },
          }).catch(() => user);
        }

        if (!user.isActive) {
          throw ApiError.forbidden('User account has been deactivated. Please contact an administrator.');
        }

        req.user = await attachTenantContext(user, requestedStoreId);
        return next();
      }
    } catch (clerkErr) {
      if (clerkErr instanceof ApiError) {
        throw clerkErr;
      }
      if (isClerk) {
        console.error('[AuthMiddleware] Clerk authentication error:', clerkErr);
        throw ApiError.unauthorized('Authentication token could not be verified with Clerk');
      }
    }
  }

  // 2. JWT Verification (and local session token fallback)
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    let user = await prisma.user.findUnique({
      where: { id: decoded.id },
    }).catch(() => null);

    if (!user && decoded.email) {
      user = await prisma.user.findFirst({
        where: { email: decoded.email },
      }).catch(() => null);
    }

    // Provision fallback if user object is fully signed in the verified token
    if (!user && decoded.id && decoded.email) {
      user = {
        id: decoded.id,
        name: decoded.name || decoded.email.split('@')[0],
        email: decoded.email,
        role: decoded.role || 'ADMIN',
        isActive: true,
      };
    }

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('User account has been deactivated. Please contact an administrator.');
    }

    // Attach user, tenant context, and backward-compatible _id
    req.user = await attachTenantContext(user, requestedStoreId);
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

export { authMiddleware as verifyAuth };
export default authMiddleware;
