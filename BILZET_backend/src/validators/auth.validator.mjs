import { z } from 'zod';
import { ROLES } from '../utils/constants.mjs';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(Object.values(ROLES)).optional().default(ROLES.CASHIER)
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional()
});

export default {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateUserSchema
};
