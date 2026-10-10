import prisma from '../config/prisma.mjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

/**
 * Get all stores/businesses that the current user is authorized to access.
 */
export const getUserStores = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const isSuperAdmin = req.user.role === 'SUPER_ADMIN' || req.user.isSuperAdmin;

  let stores = [];

  if (isSuperAdmin) {
    stores = await prisma.business.findMany({
      orderBy: { createdAt: 'asc' },
    });
  } else {
    // Find businesses where user is owner, or where business ID matches user's assigned business
    stores = await prisma.business.findMany({
      where: {
        OR: [
          { ownerId: userId },
          ...(req.user.businessId ? [{ id: req.user.businessId }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // If user is admin/owner and has no store yet, auto-provision initial store
  if (stores.length === 0 && (req.user.role === 'ADMIN' || req.user.isOwner)) {
    const initialStore = await prisma.business.create({
      data: {
        ownerId: userId,
        name: `${req.user.name || 'Admin'}'s Store`,
        email: req.user.email,
        address: 'Main Branch',
      },
    });
    stores = [initialStore];
    await prisma.user.update({
      where: { id: userId },
      data: { businessId: initialStore.id, isOwner: true },
    }).catch(() => {});
    req.user.businessId = initialStore.id;
  }

  const currentStoreId = req.user.businessId || stores[0]?.id || null;
  const currentStore = stores.find((s) => s.id === currentStoreId) || stores[0] || null;

  return sendResponse(res, 200, {
    currentStoreId: currentStore?.id || null,
    currentStore,
    totalStores: stores.length,
    isMultiStore: stores.length > 1,
    stores: stores.map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address || 'Main Branch',
      phone: s.phone || '',
      email: s.email || '',
      gstin: s.gstin || '',
      isCurrent: s.id === currentStoreId,
      isOwner: s.ownerId === userId,
    })),
  }, 'Authorized stores retrieved successfully');
});

/**
 * Switch the active store context for the current user.
 * Strictly verifies that the target store is authorized for this user.
 */
export const switchStore = asyncHandler(async (req, res) => {
  const { storeId } = req.body;

  if (!storeId) {
    throw ApiError.badRequest('Target store ID is required.');
  }

  const userId = req.user.id;
  const isSuperAdmin = req.user.role === 'SUPER_ADMIN' || req.user.isSuperAdmin;

  let targetStore = null;

  if (isSuperAdmin) {
    targetStore = await prisma.business.findUnique({
      where: { id: storeId },
    });
  } else {
    // Strictly verify authorization: store must be owned by user or user belongs to it
    targetStore = await prisma.business.findFirst({
      where: {
        id: storeId,
        OR: [
          { ownerId: userId },
          { id: req.user.businessId },
        ],
      },
    });
  }

  if (!targetStore) {
    throw ApiError.forbidden('You are not authorized to access this store.');
  }

  // Update user's active businessId in database
  await prisma.user.update({
    where: { id: userId },
    data: { businessId: targetStore.id },
  }).catch(() => {});

  // Generate fresh token with updated businessId
  const tokenPayload = {
    id: userId,
    email: req.user.email,
    role: req.user.role,
    businessId: targetStore.id,
    isOwner: targetStore.ownerId === userId || req.user.isOwner,
  };

  const newToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '7d',
  });

  return sendResponse(res, 200, {
    activeStoreId: targetStore.id,
    activeStore: {
      id: targetStore.id,
      name: targetStore.name,
      address: targetStore.address || 'Main Branch',
      phone: targetStore.phone || '',
      email: targetStore.email || '',
      gstin: targetStore.gstin || '',
      isOwner: targetStore.ownerId === userId,
    },
    token: newToken,
    user: {
      ...req.user,
      businessId: targetStore.id,
      isOwner: targetStore.ownerId === userId || req.user.isOwner,
    },
  }, 'Store switched successfully.');
});

/**
 * Register a new store / branch for the current Admin.
 */
export const createStore = asyncHandler(async (req, res) => {
  const { name, address, phone, email, gstin } = req.body;

  if (!name || !name.trim()) {
    throw ApiError.badRequest('Store name is required.');
  }

  // Only Admin or Super Admin can create stores
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && !req.user.isOwner) {
    throw ApiError.forbidden('Only an Admin or Business Owner can add new stores.');
  }

  const newStore = await prisma.business.create({
    data: {
      name: name.trim(),
      ownerId: req.user.id,
      address: address ? address.trim() : 'Branch Store',
      phone: phone ? phone.trim() : req.user.phone || '',
      email: email ? email.trim() : req.user.email,
      gstin: gstin ? gstin.trim() : '',
    },
  });

  return sendResponse(res, 201, {
    store: newStore,
  }, 'New store branch created successfully.');
});

export default {
  getUserStores,
  switchStore,
  createStore,
};
