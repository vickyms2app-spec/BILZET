import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import realtimeService from './realtime.service.mjs';

/**
 * Service for Active Business Members Management
 */

const verifyAdminAccess = async (user, businessId) => {
  if (!user) throw ApiError.unauthorized('Authentication required.');

  if (user.role === 'SUPER_ADMIN' || user.isSuperAdmin) return true;

  if ((user.role === 'ADMIN' || user.role === 'OWNER') && user.businessId === businessId) {
    return true;
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business && business.ownerId === user.id) return true;

  const membership = await prisma.businessMember.findFirst({
    where: {
      userId: user.id,
      businessId,
      status: 'ACTIVE',
      role: 'ADMIN',
    },
  });

  if (membership) return true;

  throw ApiError.forbidden('Only store administrators can manage business members.');
};

export const getBusinessMembers = async (user, businessId) => {
  if (!businessId) throw ApiError.badRequest('businessId is required.');
  await verifyAdminAccess(user, businessId);

  const members = await prisma.businessMember.findMany({
    where: { businessId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          avatar: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { members };
};

export const updateMemberRole = async (user, businessId, memberId, updateData = {}) => {
  if (!businessId) throw ApiError.badRequest('businessId is required.');
  await verifyAdminAccess(user, businessId);

  const member = await prisma.businessMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member || member.businessId !== businessId) {
    throw ApiError.notFound('Member not found in this business.');
  }

  // Prevent demoting or modifying store owner
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business && business.ownerId === member.userId) {
    throw ApiError.forbidden('Cannot modify role or status of the primary store owner.');
  }

  const data = {};
  if (updateData.role) {
    data.role = updateData.role.toUpperCase();
  }
  if (updateData.department !== undefined) {
    data.department = updateData.department;
  }
  if (updateData.designation !== undefined) {
    data.designation = updateData.designation;
  }
  if (updateData.status) {
    data.status = updateData.status.toUpperCase();
  }

  const updatedMember = await prisma.businessMember.update({
    where: { id: memberId },
    data,
    include: { user: true },
  });

  // If role changed and user has this as active business, sync User.role
  if (updateData.role && member.user.businessId === businessId) {
    await prisma.user.update({
      where: { id: member.userId },
      data: { role: updateData.role.toUpperCase() },
    }).catch(() => {});
  }

  return { member: updatedMember };
};

export const removeMember = async (user, businessId, memberId) => {
  if (!businessId) throw ApiError.badRequest('businessId is required.');
  await verifyAdminAccess(user, businessId);

  const member = await prisma.businessMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });

  if (!member || member.businessId !== businessId) {
    throw ApiError.notFound('Member not found in this business.');
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business && business.ownerId === member.userId) {
    throw ApiError.forbidden('Cannot remove the primary store owner from their business.');
  }

  // Deactivate membership (preserves historical activity, audit records, and invoices)
  await prisma.businessMember.delete({
    where: { id: memberId },
  });

  // If CA, revoke caStoreAccess
  await prisma.caStoreAccess.deleteMany({
    where: {
      caUserId: member.userId,
      businessId,
    },
  }).catch(() => {});

  // If user has this as current businessId, reset it
  if (member.user.businessId === businessId) {
    const otherMembership = await prisma.businessMember.findFirst({
      where: { userId: member.userId, status: 'ACTIVE' },
    });
    await prisma.user.update({
      where: { id: member.userId },
      data: {
        businessId: otherMembership ? otherMembership.businessId : null,
        role: otherMembership ? otherMembership.role : 'NONE',
      },
    }).catch(() => {});
  }

  // Broadcast realtime update
  try {
    realtimeService.broadcastStoreEvent(businessId, {
      type: 'MEMBER_REMOVED',
      businessId,
      userId: member.userId,
    });
  } catch (_) {}

  return { success: true, message: 'Member access removed from business.' };
};

export default {
  getBusinessMembers,
  updateMemberRole,
  removeMember,
};
