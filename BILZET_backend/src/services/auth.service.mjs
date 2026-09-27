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

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: role || 'CASHIER',
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

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return sanitizeUser(user);
};

export default {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
};
