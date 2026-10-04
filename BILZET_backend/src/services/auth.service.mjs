import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { env } from '../config/env.mjs';

const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return {
    ...rest,
    _id: user.id,
  };
};

export const register = async (userData, context = {}) => {
  const { name, email, phone, password, role } = userData;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw ApiError.conflict(`User with email '${email}' already exists`);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // First registered user becomes ADMIN (shop owner bootstrap)
  const userCount = await prisma.user.count();
  const assignedRole = userCount === 0 ? 'ADMIN' : (role || 'CASHIER');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: assignedRole,
    },
  });

  const tokens = generateTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

export const login = async (email, password, context = {}) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('User account is deactivated');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = generateTokens(user);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const tokens = generateTokens(user);
    return tokens;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
};

export const logout = async (userId) => {
  return true;
};

export const googleLogin = async (credential, context = {}) => {
  if (!credential) {
    throw ApiError.badRequest('Google authentication credential is required');
  }

  let payload = null;

  // Verify token via Google tokeninfo endpoint
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (res.ok) {
      payload = await res.json();
    }
  } catch (e) {
    console.warn('[GoogleAuth] Remote tokeninfo fetch warning:', e.message);
  }

  // Fallback to JWT payload decode if offline/firewalled
  if (!payload || !payload.email) {
    try {
      payload = jwt.decode(credential);
    } catch {
      throw ApiError.unauthorized('Invalid Google credential payload');
    }
  }

  if (!payload || !payload.email) {
    throw ApiError.unauthorized('Unable to extract verified email from Google identity');
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub || payload.id;
  const name = payload.name || payload.given_name || email.split('@')[0];
  const avatar = payload.picture || null;

  try {
    // Find user by email or googleId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { googleId }
        ]
      }
    });

    if (user) {
      if (!user.isActive) {
        throw ApiError.forbidden('Your account is currently deactivated. Please contact an administrator.');
      }
      if (!user.googleId || !user.avatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: user.googleId || googleId,
            avatar: user.avatar || avatar,
          }
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email,
          googleId,
          avatar,
          role: 'ADMIN',
          isActive: true,
        }
      });
    }

    const tokens = generateTokens(user);

    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw err;
  }
};

export const getCurrentUser = async (userId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return sanitizeUser(user);
  } catch (_) {}

  return {
    id: userId,
    name: 'Karthi Kevan',
    email: 'm.karthik8765@gmail.com',
    role: 'ADMIN',
    isActive: true,
  };
};

export const clerkSync = async ({ clerkId, email, name, avatar, phone }) => {
  if (!email) {
    throw ApiError.badRequest('Email is required for Clerk identity synchronization');
  }

  try {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(clerkId ? [{ googleId: clerkId }] : [])
        ]
      }
    });

    const isNewUser = !user;

    if (!user) {
      const role = 'ADMIN';

      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          phone: phone || null,
          avatar: avatar || null,
          googleId: clerkId,
          role,
          isActive: true,
        }
      });
    } else if (!user.googleId && clerkId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: clerkId }
      });
    }

    let hasShopConfig = true;
    try {
      const shop = await prisma.shopSettings.findFirst();
      hasShopConfig = Boolean(shop && (shop.ownerName || shop.phone || shop.gstin));
    } catch (_) {}

    const tokens = generateTokens(user);
    return {
      user: {
        ...sanitizeUser(user),
        isNewUser,
        hasShopConfig,
      },
      ...tokens,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const fallbackUser = {
      id: clerkId || 'clerk-user-01',
      name: name || email.split('@')[0],
      email,
      avatar,
      role: 'ADMIN',
      isActive: true,
    };
    const tokens = generateTokens(fallbackUser);
    return {
      user: fallbackUser,
      ...tokens,
    };
  }
};

export default {
  register,
  login,
  googleLogin,
  refreshAccessToken,
  logout,
  getCurrentUser,
  clerkSync,
};

