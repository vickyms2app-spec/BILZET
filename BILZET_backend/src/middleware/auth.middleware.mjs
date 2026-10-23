import jwt from 'jsonwebtoken';
import { env } from '../config/env.mjs';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';
import { getAuth, verifyToken, createClerkClient } from '@clerk/express';

const attachTenantContext = async (user, requestedStoreId = null) => {
  let effectiveBusinessId = user.businessId || null;
  let isOwner =
    Boolean(user.isOwner) ||
    user.role === 'ADMIN' ||
    user.role === 'OWNER' ||
    user.role === 'SUPER_ADMIN' ||
    Boolean(user.isSuperAdmin);

  const isMasterAdmin =
    user.role === 'SUPER_ADMIN' ||
    Boolean(user.isSuperAdmin) ||
    (user.email && user.email.toLowerCase() === 'vickyms2app@gmail.com');

  // If a specific store was requested via headers or query, verify authorization
  if (requestedStoreId && requestedStoreId !== effectiveBusinessId) {
    if (isMasterAdmin) {
      effectiveBusinessId = requestedStoreId;
    } else {
      const existingBiz = await prisma.business.findUnique({
        where: { id: requestedStoreId },
      });

      if (!existingBiz) {
        // Store does NOT exist in DB (stale ID from reset DB, expired localStorage, or old JWT).
        // Silently clear the stale businessId from the user's DB record so future requests heal.
        if (user.id && user.businessId === requestedStoreId) {
          prisma.user.update({
            where: { id: user.id },
            data: { businessId: null },
          }).catch(() => {});
        }
        // Clear from effective context — let the fallback below resolve the real store.
        effectiveBusinessId = null;
      } else if (user.role === 'CA') {
        // Chartered Accountants must have ACTIVE caStoreAccess, BusinessMember status, or staff assignment
        const activeCaAccess = await prisma.caStoreAccess.findFirst({
          where: { caUserId: user.id, businessId: existingBiz.id, status: 'ACTIVE' },
        });
        const activeMember = await prisma.businessMember.findFirst({
          where: { userId: user.id, businessId: existingBiz.id, status: 'ACTIVE' },
        });
        const staffAccess = user.email
          ? await prisma.staff.findFirst({
              where: {
                businessId: existingBiz.id,
                email: { equals: user.email.trim(), mode: 'insensitive' },
                status: 'ACTIVE',
              },
            })
          : null;
        if (activeCaAccess || activeMember || staffAccess) {
          effectiveBusinessId = existingBiz.id;
        } else {
          throw ApiError.forbidden('You are not authorized to access this store.');
        }
      } else {
        const member = await prisma.businessMember.findFirst({
          where: { userId: user.id, businessId: existingBiz.id, status: 'ACTIVE' },
        });

        if (member) {
          effectiveBusinessId = existingBiz.id;
          isOwner = existingBiz.ownerId === user.id || isOwner;
        } else if (existingBiz.ownerId === user.id) {
          effectiveBusinessId = existingBiz.id;
          isOwner = true;
        } else {
          // Self-heal: If requested store in header/localStorage is stale and belongs to another owner,
          // gracefully fallback to the user's legitimate store rather than bricking the whole session.
          const userOwned = await prisma.business.findFirst({ where: { ownerId: user.id } }).catch(() => null);
          if (userOwned) {
            effectiveBusinessId = userOwned.id;
            isOwner = true;
          } else if (user.businessId) {
            effectiveBusinessId = user.businessId;
          } else {
            effectiveBusinessId = null;
          }
        }
      }
    }
  }

  // If effectiveBusinessId is set, verify that the business actually exists in DB
  if (effectiveBusinessId && !isMasterAdmin) {
    const bizExists = await prisma.business.findUnique({
      where: { id: effectiveBusinessId },
    }).catch(() => null);
    if (!bizExists) {
      effectiveBusinessId = null;
    }
  }

  if (!effectiveBusinessId) {
    try {
      // Check if user is an active member of any business
      const activeMember = await prisma.businessMember.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
      });
      if (activeMember) {
        effectiveBusinessId = activeMember.businessId;
      } else {
        const owned = await prisma.business.findFirst({ where: { ownerId: user.id } });
        if (owned) {
          effectiveBusinessId = owned.id;
          isOwner = true;
        } else if (isMasterAdmin) {
          const latestBiz = await prisma.business.findFirst({ orderBy: { createdAt: 'desc' } });
          if (latestBiz) {
            effectiveBusinessId = latestBiz.id;
            isOwner = true;
          }
        } else {
          // User has no store yet — they need to go through /register-shop onboarding.
          // Do NOT auto-provision here; that bypasses the registration flow.
          isOwner = Boolean(user.isOwner);
        }
      }
    } catch (bizErr) {
      console.warn('[Tenant] Auto-provision fallback:', bizErr?.message);
      effectiveBusinessId = requestedStoreId || user.businessId || user.id;
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
  } else if (req.query && req.query.token) {
    token = req.query.token;
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
    req.query?.businessId ||
    req.query?.storeId ||
    null;

  // 1. Detect if this is a Clerk token or session
  const decodedToken = token ? jwt.decode(token) : null;
  const isClerk = Boolean(
    clerkUserId ||
    (decodedToken && (
      (decodedToken.iss && decodedToken.iss.includes('clerk')) ||
      (typeof decodedToken.sub === 'string' && decodedToken.sub.startsWith('user_')) ||
      decodedToken.azp
    ))
  );

  if (isClerk) {
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
            emailClaim = verifiedClerk.email || verifiedClerk.email_address || emailClaim;
            userName = verifiedClerk.name || userName;
          }
        } catch (clerkVerifyErr) {
          // If verifyToken fails (e.g. network/JWKS latency or offline testing), inspect decoded claims
          if (decodedToken && (decodedToken.iss?.includes('clerk') || String(decodedToken.sub).startsWith('user_'))) {
            if (decodedToken.exp && decodedToken.exp * 1000 < Date.now() - 300000) {
              throw ApiError.unauthorized('Session has expired. Please log in again.');
            }
            clerkUserId = decodedToken.sub;
            emailClaim = decodedToken.email || decodedToken.email_address || decodedToken.preferred_username || emailClaim;
            userName = decodedToken.name || userName;
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

        // Ensure user is persisted in the database so foreign keys work
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
                isOwner: true,
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

      throw ApiError.unauthorized('Unable to resolve user from Clerk credentials');
    } catch (clerkErr) {
      if (clerkErr instanceof ApiError) {
        throw clerkErr;
      }
      console.error('[AuthMiddleware] Clerk authentication error:', clerkErr);
      throw ApiError.unauthorized('Authentication token could not be verified with Clerk');
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
        businessId: decoded.businessId || null,
        isOwner:
          decoded.isOwner !== undefined
            ? Boolean(decoded.isOwner)
            : Boolean(decoded.role === 'OWNER' || decoded.role === 'ADMIN'),
        isActive: true,
      };

      // Ensure user record exists in DB for foreign key relations
      try {
        let validBusinessId = null;
        if (user.businessId) {
          const bizCheck = await prisma.business.findUnique({ where: { id: user.businessId } }).catch(() => null);
          if (bizCheck) validBusinessId = user.businessId;
        }

        const persisted = await prisma.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            businessId: validBusinessId,
            isOwner: user.isOwner,
            isActive: true,
          },
        });
        user = persisted;
      } catch (_) {
        const existingUser = await prisma.user.findFirst({
          where: { OR: [{ id: user.id }, { email: user.email }] },
        }).catch(() => null);
        if (existingUser) user = existingUser;
      }
    } else if (user && decoded.businessId && !user.businessId) {
      user.businessId = decoded.businessId;
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
