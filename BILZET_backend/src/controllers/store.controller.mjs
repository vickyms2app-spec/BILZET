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
    // Find businesses where user is owner, or where user has an active membership, or assigned businessId
    const activeMembers = await prisma.businessMember.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { businessId: true, role: true },
    });
    const memberBizIds = activeMembers.map((m) => m.businessId);

    stores = await prisma.business.findMany({
      where: {
        OR: [
          { ownerId: userId },
          ...(memberBizIds.length > 0 ? [{ id: { in: memberBizIds } }] : []),
          ...(req.user.businessId ? [{ id: req.user.businessId }] : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // NOTE: Do NOT auto-provision stores here. A new user who is ADMIN/isOwner but has no store
  // should see the empty state and go through /register-shop to complete onboarding.
  // Auto-provisioning here bypasses the onboarding flow and creates ghost stores.

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
  let activeMember = null;

  if (isSuperAdmin) {
    targetStore = await prisma.business.findUnique({
      where: { id: storeId },
    });
  } else {
    // Strictly verify authorization: store must be owned by user or user belongs to it via active membership
    activeMember = await prisma.businessMember.findFirst({
      where: { userId, businessId: storeId, status: 'ACTIVE' },
    });

    targetStore = await prisma.business.findFirst({
      where: {
        id: storeId,
        OR: [
          { ownerId: userId },
          ...(activeMember ? [{ id: storeId }] : []),
          ...(req.user.businessId === storeId ? [{ id: storeId }] : []),
        ],
      },
    });
  }

  if (!targetStore) {
    throw ApiError.forbidden('You are not authorized to access this store.');
  }

  const effectiveRole = targetStore.ownerId === userId ? 'ADMIN' : (activeMember?.role || req.user.role || 'STAFF');

  // Update user's active businessId and role in database
  await prisma.user.update({
    where: { id: userId },
    data: { businessId: targetStore.id, role: effectiveRole },
  }).catch(() => {});

  // Generate fresh token with updated businessId and role
  const tokenPayload = {
    id: userId,
    email: req.user.email,
    role: effectiveRole,
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
      role: effectiveRole,
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

  // Automatically link owner membership for the new store
  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: req.user.id,
        businessId: newStore.id,
      },
    },
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      userId: req.user.id,
      businessId: newStore.id,
      role: 'ADMIN',
      status: 'ACTIVE',
      acceptedAt: new Date(),
    },
  }).catch(() => {});

  // Update user's active store
  await prisma.user.update({
    where: { id: req.user.id },
    data: { businessId: newStore.id, isOwner: true, role: 'ADMIN' },
  }).catch(() => {});

  // Generate fresh token with updated businessId
  const tokenPayload = {
    id: req.user.id,
    email: req.user.email,
    role: 'ADMIN',
    businessId: newStore.id,
    isOwner: true,
  };

  const newToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '7d',
  });

  return sendResponse(res, 201, {
    store: newStore,
    activeStoreId: newStore.id,
    token: newToken,
    user: {
      ...req.user,
      businessId: newStore.id,
      role: 'ADMIN',
      isOwner: true,
    },
  }, 'New store branch created successfully.');
});

/**
 * Register a new shop and business for an authenticated user during onboarding.
 * Validates details, creates the Business record, assigns Admin/Owner role,
 * and saves BusinessMember with zero risk of duplicate creation.
 */
export const registerShop = asyncHandler(async (req, res) => {
  const { name, shopName, businessType, ownerName, phone, email, address, gstin, state } = req.body;
  const storeName = (name || shopName || '').trim();

  if (!storeName) {
    throw ApiError.badRequest('Shop or business name is required.');
  }

  const userId = req.user.id;

  // 1. Guard against Staff, Manager, and CA members attempting unauthorized shop registration
  if (
    req.user.role === 'STAFF' ||
    req.user.role === 'CASHIER' ||
    req.user.role === 'MANAGER' ||
    req.user.role === 'CA' ||
    req.user.role === 'ACCOUNTANT'
  ) {
    throw ApiError.forbidden('Staff, Manager, and Chartered Accountant accounts are not authorized to create stores.');
  }

  // Check if user is already an active member of any business as non-admin
  const existingMember = await prisma.businessMember.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
  if (
    existingMember &&
    existingMember.role !== 'ADMIN' &&
    existingMember.role !== 'OWNER' &&
    existingMember.role !== 'SUPER_ADMIN'
  ) {
    throw ApiError.forbidden('Staff, Manager, and Chartered Accountant accounts are not authorized to create stores.');
  }

  // 2. If business already exists for this owner, update it with the registered details!
  const existingOwned = await prisma.business.findFirst({
    where: { ownerId: userId },
  });

  if (existingOwned) {
    const updatedStore = await prisma.business.update({
      where: { id: existingOwned.id },
      data: {
        name: storeName,
        businessType: businessType ? businessType.trim() : existingOwned.businessType || 'RETAIL',
        phone: phone ? phone.trim() : existingOwned.phone || req.user.phone || '',
        email: email ? email.trim() : existingOwned.email || req.user.email,
        address: address ? address.trim() : existingOwned.address || 'Main Branch',
        gstin: gstin ? gstin.trim() : existingOwned.gstin || '',
        state: state ? state.trim() : existingOwned.state || 'Tamil Nadu',
      },
    });

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'ADMIN',
        businessId: updatedStore.id,
        isOwner: true,
        name: (ownerName && ownerName.trim()) || req.user.name,
      },
    }).catch(() => {});

    // Ensure BusinessMember exists
    await prisma.businessMember.upsert({
      where: {
        userId_businessId: {
          userId,
          businessId: updatedStore.id,
        },
      },
      update: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      create: {
        userId,
        businessId: updatedStore.id,
        role: 'ADMIN',
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
    }).catch(() => {});

    // Update ShopSettings
    try {
      const existingSettings = await prisma.shopSettings.findFirst();
      if (existingSettings) {
        await prisma.shopSettings.update({
          where: { id: existingSettings.id },
          data: {
            shopName: storeName,
            ownerName: ownerName || req.user.name || 'Store Owner',
            phone: phone || req.user.phone || '+91 9876543210',
            email: email || req.user.email || 'billing@bilzet.app',
            address: address || 'Main Branch',
            gstin: gstin || '33AAAAA0000A1Z5',
            state: state || 'Tamil Nadu',
          },
        });
      }
    } catch (_) {}

    const tokenPayload = {
      id: userId,
      email: req.user.email,
      role: 'ADMIN',
      businessId: updatedStore.id,
      isOwner: true,
    };
    const newToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || '7d',
    });

    const rawReferralCode = req.body.referralCode || req.body.ref || req.query?.ref;
    if (rawReferralCode) {
      try {
        const { recordAttribution } = await import('../services/caReferral.service.mjs');
        await recordAttribution({
          referralCode: rawReferralCode,
          businessId: updatedStore.id,
          ownerId: userId,
          businessName: storeName,
        });
      } catch (refErr) {
        console.warn('[registerShop] CA attribution error:', refErr.message);
      }
    }

    return sendResponse(res, 200, {
      store: updatedStore,
      token: newToken,
      alreadyExists: true,
      onboardingStatus: 'COMPLETED',
      destination: '/dashboard',
      user: {
        ...req.user,
        name: ownerName || req.user.name,
        role: 'ADMIN',
        businessId: updatedStore.id,
        isOwner: true,
      },
    }, 'Shop registered successfully! Welcome to BILZET.');
  }

  // 3. Create the business record
  const newBusiness = await prisma.business.create({
    data: {
      ownerId: userId,
      name: storeName,
      businessType: businessType ? businessType.trim() : 'RETAIL',
      phone: phone ? phone.trim() : req.user.phone || '',
      email: email ? email.trim() : req.user.email,
      address: address ? address.trim() : 'Main Branch',
      gstin: gstin ? gstin.trim() : '',
      state: state ? state.trim() : 'Tamil Nadu',
    },
  });

  // 4. Assign Admin/Owner role securely on the backend
  await prisma.user.update({
    where: { id: userId },
    data: {
      role: 'ADMIN',
      businessId: newBusiness.id,
      isOwner: true,
      name: (ownerName && ownerName.trim()) || req.user.name,
    },
  }).catch(() => {});

  // 5. Save the business membership
  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId,
        businessId: newBusiness.id,
      },
    },
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      userId,
      businessId: newBusiness.id,
      role: 'ADMIN',
      status: 'ACTIVE',
      acceptedAt: new Date(),
    },
  }).catch(() => {});

  // 6. Update or initialize ShopSettings
  try {
    const existingSettings = await prisma.shopSettings.findFirst();
    if (existingSettings) {
      await prisma.shopSettings.update({
        where: { id: existingSettings.id },
        data: {
          shopName: storeName,
          ownerName: ownerName || req.user.name || 'Store Owner',
          phone: phone || req.user.phone || '+91 9876543210',
          email: email || req.user.email || 'billing@bilzet.app',
          address: address || 'Main Branch',
          gstin: gstin || '33AAAAA0000A1Z5',
          state: state || 'Tamil Nadu',
        },
      });
    } else {
      await prisma.shopSettings.create({
        data: {
          shopName: storeName,
          ownerName: ownerName || req.user.name || 'Store Owner',
          phone: phone || req.user.phone || '+91 9876543210',
          email: email || req.user.email || 'billing@bilzet.app',
          address: address || 'Main Branch',
          gstin: gstin || '33AAAAA0000A1Z5',
          state: state || 'Tamil Nadu',
        },
      });
    }
  } catch (_) {}

  // 7. Generate fresh JWT token with updated businessId and ADMIN role
  const tokenPayload = {
    id: userId,
    email: req.user.email,
    role: 'ADMIN',
    businessId: newBusiness.id,
    isOwner: true,
  };

  const newToken = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '7d',
  });

  const rawReferralCode = req.body.referralCode || req.body.ref || req.query?.ref;
  if (rawReferralCode) {
    try {
      const { recordAttribution } = await import('../services/caReferral.service.mjs');
      await recordAttribution({
        referralCode: rawReferralCode,
        businessId: newBusiness.id,
        ownerId: userId,
        businessName: storeName,
      });
    } catch (refErr) {
      console.warn('[registerShop] CA attribution error:', refErr.message);
    }
  }

  return sendResponse(res, 201, {
    store: newBusiness,
    token: newToken,
    user: {
      ...req.user,
      name: ownerName || req.user.name,
      role: 'ADMIN',
      businessId: newBusiness.id,
      isOwner: true,
    },
    onboardingStatus: 'COMPLETED',
    destination: '/dashboard',
  }, 'Shop registered successfully! Welcome to BILZET.');
});

/**
 * Determine verified onboarding status from database memberships and ownership.
 */
export const getOnboardingStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw ApiError.unauthorized('User not found.');

  const normalizedEmail = (user.email || '').toLowerCase().trim();

  // 1. Super Admin
  if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) {
    return sendResponse(res, 200, {
      onboardingStatus: 'COMPLETED',
      destination: '/dashboard',
      role: 'SUPER_ADMIN',
      canRegisterShop: true,
      hasPendingInvitations: false,
      memberships: [],
    }, 'Super admin onboarding status resolved.');
  }

  // 2. Check owned businesses
  const owned = await prisma.business.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
  });

  if (owned.length > 0) {
    return sendResponse(res, 200, {
      onboardingStatus: 'COMPLETED',
      destination: '/dashboard',
      role: 'ADMIN',
      isOwner: true,
      businessId: user.businessId || owned[0].id,
      canRegisterShop: false,
      ownedBusinesses: owned,
      totalStores: owned.length,
    }, 'Shop owner onboarding status resolved.');
  }

  // 3. Check active business memberships
  const activeMemberships = await prisma.businessMember.findMany({
    where: { userId, status: 'ACTIVE' },
    include: {
      business: {
        select: { id: true, name: true, gstin: true, phone: true, address: true },
      },
    },
  });

  if (activeMemberships.length > 0) {
    const primary = activeMemberships[0];
    const roleUpper = String(primary.role || 'STAFF').toUpperCase();
    let dest = '/staff-dashboard';
    if (roleUpper === 'CA' || roleUpper === 'ACCOUNTANT') {
      dest = '/ca-portal';
    } else if (roleUpper === 'MANAGER' || roleUpper === 'ADMIN' || roleUpper === 'OWNER') {
      dest = '/dashboard';
    }

    return sendResponse(res, 200, {
      onboardingStatus: 'COMPLETED',
      destination: dest,
      role: primary.role,
      businessId: primary.businessId,
      canRegisterShop: false,
      memberships: activeMemberships,
      isMultiStore: activeMemberships.length > 1,
    }, 'Member onboarding status resolved.');
  }

  // 4. Check pending invitations
  const pendingInvites = await prisma.roleInvitation.findMany({
    where: {
      OR: [
        { recipientUserId: userId },
        { recipientEmail: normalizedEmail },
      ],
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    include: {
      business: { select: { id: true, name: true, gstin: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  });

  if (pendingInvites.length > 0) {
    return sendResponse(res, 200, {
      onboardingStatus: 'PENDING_INVITATION',
      destination: '/join-team',
      role: 'NONE',
      canRegisterShop: false,
      hasPendingInvitations: true,
      pendingInvitationsCount: pendingInvites.length,
      pendingInvitations: pendingInvites,
    }, 'Pending invitations found for user.');
  }

  // 5. Unassigned user
  return sendResponse(res, 200, {
    onboardingStatus: 'UNASSIGNED',
    destination: '/dashboard',
    role: 'ADMIN',
    canRegisterShop: false,
    hasPendingInvitations: false,
    pendingInvitationsCount: 0,
    memberships: [],
  }, 'User workspace ready.');
});

export default {
  getUserStores,
  switchStore,
  createStore,
  registerShop,
  getOnboardingStatus,
};
