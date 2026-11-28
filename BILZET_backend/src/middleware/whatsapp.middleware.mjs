import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError.mjs';

/**
 * Resolves and enforces the active businessId from trusted auth/tenant context.
 * Rejects cross-tenant businessId spoofing attempts.
 */
export const requireWhatsAppBusinessContext = (req, _res, next) => {
  const user = req.user;
  if (!user || !user.id || user.id === 'anonymous') {
    return next(ApiError.unauthorized('Authentication required for WhatsApp access.'));
  }

  const requestedBusinessId = req.body?.businessId || req.query?.businessId;
  const isSuperAdmin = user.role === 'SUPER_ADMIN' || Boolean(user.isSuperAdmin);

  if (
    requestedBusinessId &&
    !isSuperAdmin &&
    user.businessId &&
    String(requestedBusinessId).trim() !== String(user.businessId).trim()
  ) {
    return next(ApiError.forbidden('Forbidden: cannot access another business WhatsApp session.'));
  }

  const businessId = isSuperAdmin && requestedBusinessId
    ? String(requestedBusinessId).trim()
    : (user.businessId ? String(user.businessId).trim() : '');

  if (!businessId) {
    return next(
      ApiError.badRequest('Active business/store context is required to use WhatsApp.')
    );
  }

  req.whatsappBusinessId = businessId;
  return next();
};

export const whatsappConnectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `wa-connect:${req.whatsappBusinessId || req.ip}`,
  message: {
    success: false,
    message: 'Too many WhatsApp connection attempts. Please wait a few minutes before retrying.',
  },
});

export const whatsappSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `wa-send:${req.whatsappBusinessId || req.ip}`,
  message: {
    success: false,
    message: 'WhatsApp sending rate limit reached. Please wait before sending more invoices.',
  },
});

export const disconnectWhatsAppSchema = z
  .object({
    unlink: z.boolean().optional().default(true),
  })
  .optional()
  .default({});

export const sendInvoiceWhatsAppSchema = z
  .object({
    invoiceId: z.string().min(1, 'invoiceId is required').trim(),
    customerPhone: z.string().min(6, 'customerPhone is required').trim(),
    customMessage: z.string().max(2000).optional(),
    allowDuplicate: z.boolean().optional().default(false),
  })
  .strict();
