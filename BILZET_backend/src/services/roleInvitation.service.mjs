import crypto from 'crypto';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { env } from '../config/env.mjs';
import emailService from './email.service.mjs';
import notificationService from './notification.service.mjs';
import realtimeService from './realtime.service.mjs';
import * as caInvitationService from './caInvitation.service.mjs';
import { getActiveSubscription, assertCanAddSubUser } from './subscription.service.mjs';

/**
 * Service for Unified Staff, Manager, and CA Role Invitations
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ['STAFF', 'MANAGER', 'CA', 'CASHIER', 'ACCOUNTANT', 'SALES_STAFF', 'VIEWER'];

/**
 * Resolves the target business and verifies that the inviter user is an authorized Admin/Owner.
 * Supports store owners, admins, managers (via BusinessMember), and master admins.
 * Auto-resolves valid business context if client sends stale local storage ID or leaves it implicit.
 */
export const resolveAndAuthorizeBusiness = async (inviterUser, requestedBusinessId = null) => {
  if (!inviterUser) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const isSuperAdmin =
    inviterUser.role === 'SUPER_ADMIN' ||
    Boolean(inviterUser.isSuperAdmin) ||
    (inviterUser.email && inviterUser.email.toLowerCase() === 'vickyms2app@gmail.com');

  let targetBusiness = null;

  // 1. If a specific businessId was requested, check if it exists in DB
  if (requestedBusinessId) {
    targetBusiness = await prisma.business.findUnique({
      where: { id: requestedBusinessId },
    }).catch(() => null);
  }

  // 2. If requested store does not exist in DB (e.g. stale ID from offline mock/localStorage/reset DB),
  // fall back to the user's actual owned or assigned business so legitimate owners are never blocked
  if (!targetBusiness) {
    // Check if inviterUser is direct owner of a business
    targetBusiness = await prisma.business.findFirst({
      where: { ownerId: inviterUser.id },
    }).catch(() => null);

    // Or check if inviterUser has a valid businessId assigned
    if (!targetBusiness && inviterUser.businessId) {
      targetBusiness = await prisma.business.findUnique({
        where: { id: inviterUser.businessId },
      }).catch(() => null);
    }

    // Or check if inviterUser is an active admin/manager member of any business
    if (!targetBusiness) {
      const activeMember = await prisma.businessMember.findFirst({
        where: {
          userId: inviterUser.id,
          status: 'ACTIVE',
          role: { in: ['ADMIN', 'OWNER', 'MANAGER'] },
        },
        include: { business: true },
      }).catch(() => null);

      if (activeMember?.business) {
        targetBusiness = activeMember.business;
      }
    }
  }

  if (!targetBusiness) {
    throw ApiError.notFound('Target business not found.');
  }

  // 3. Multi-tenant Authorization Enforcement
  if (isSuperAdmin) {
    return targetBusiness;
  }

  // Check 1: User is owner of this business
  if (targetBusiness.ownerId === inviterUser.id) {
    return targetBusiness;
  }

  // Check 2: User is active ADMIN, OWNER, or MANAGER member in BusinessMember table
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId: inviterUser.id,
      businessId: targetBusiness.id,
      status: 'ACTIVE',
      role: { in: ['ADMIN', 'OWNER', 'MANAGER'] },
    },
  }).catch(() => null);

  if (membership) {
    return targetBusiness;
  }

  // Check 3: User is an owner or admin with matching businessId
  const isAdminOrOwner =
    inviterUser.isOwner === true ||
    inviterUser.role === 'ADMIN' ||
    inviterUser.role === 'OWNER';

  if (isAdminOrOwner && inviterUser.businessId === targetBusiness.id) {
    return targetBusiness;
  }

  // Multi-tenant isolation: unauthorized users receive 403
  throw ApiError.forbidden('Only store administrators or business owners can issue role invitations.');
};

const verifyInviterAuthorization = async (inviterUser, businessId) => {
  return await resolveAndAuthorizeBusiness(inviterUser, businessId);
};

/**
 * 1. Admin creates a role invitation
 */
export const createInvitation = async (inviterUser, businessId, data = {}) => {
  const business = await resolveAndAuthorizeBusiness(inviterUser, businessId);
  const resolvedBusinessId = business.id;

  const rawEmail = String(data.email || data.recipientEmail || '').trim().toLowerCase();
  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    throw ApiError.badRequest('A valid email address is required for invitation.');
  }

  const rawRole = String(data.role || 'STAFF').trim().toUpperCase();
  if (!ALLOWED_ROLES.includes(rawRole)) {
    throw ApiError.badRequest(`Invalid role '${rawRole}'. Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
  }

  // Prevent self-invitation
  if (inviterUser.email && inviterUser.email.toLowerCase() === rawEmail) {
    throw ApiError.badRequest('You cannot invite your own account to this store.');
  }

  // Enforce Subscription Entitlement:
  // - Inviting a CA requires an active PREMIUM subscription
  // - Inviting Team Members requires available sub-user seat allowance (Free plan allows 0 sub-users)
  if (inviterUser.role !== 'SUPER_ADMIN' && !inviterUser.isSuperAdmin) {
    if (rawRole === 'CA') {
      const subInfo = await getActiveSubscription(resolvedBusinessId, inviterUser.id);
      if (!subInfo.isActive || subInfo.planTier !== 'PREMIUM') {
        const error = ApiError.forbidden('CA Connect and inviting Chartered Accountants requires an active Premium subscription.');
        error.code = 'PREMIUM_PLAN_REQUIRED';
        throw error;
      }
    } else {
      await assertCanAddSubUser(resolvedBusinessId, inviterUser.id);
    }
  }

  // Check if user is already an active member of this store with the same or higher role
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: rawEmail, mode: 'insensitive' } },
  });

  if (existingUser) {
    const existingMembership = await prisma.businessMember.findFirst({
      where: {
        userId: existingUser.id,
        businessId: resolvedBusinessId,
        status: 'ACTIVE',
      },
    });

    if (existingMembership) {
      throw ApiError.conflict(
        `User ${rawEmail} is already an active member (${existingMembership.role}) of ${business.name}.`
      );
    }
  }

  // Check for existing pending invitation for this email & business
  const existingInvite = await prisma.roleInvitation.findFirst({
    where: {
      businessId: resolvedBusinessId,
      recipientEmail: rawEmail,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw ApiError.conflict(
      `An active invitation is already pending for ${rawEmail} in ${business.name}. You can resend or revoke it.`
    );
  }

  // Generate cryptographically secure single-use token and SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresInDays = parseInt(data.expiresInDays || '7', 10);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  // Create Invitation Record
  const invitation = await prisma.roleInvitation.create({
    data: {
      businessId: resolvedBusinessId,
      inviterId: inviterUser.id,
      recipientEmail: rawEmail,
      recipientUserId: existingUser?.id || null,
      name: data.name ? String(data.name).trim() : null,
      role: rawRole,
      department: data.department ? String(data.department).trim() : null,
      designation: data.designation ? String(data.designation).trim() : null,
      permissions: data.permissions || [],
      message: data.message ? String(data.message).trim() : null,
      tokenHash,
      status: 'PENDING',
      deliveryStatus: 'PENDING',
      expiresAt,
    },
  });

  // Construct Invitation Acceptance Link
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${frontendUrl}/accept-invitation?token=${rawToken}`;

  // 1. Create In-App Notification (Guaranteed delivery inside website)
  const notification = await notificationService.createNotification({
    userId: existingUser?.id || null,
    email: rawEmail,
    type: 'INVITATION',
    title: `Role Invitation from ${business.name}`,
    message: `${inviterUser.name || 'Admin'} invited you to join ${business.name} as ${rawRole}.`,
    invitationId: invitation.id,
    data: {
      invitationId: invitation.id,
      businessId: business.id,
      businessName: business.name,
      role: rawRole,
      department: invitation.department,
      token: rawToken,
      expiresAt,
    },
  });

  // 2. Attempt Email Dispatch if email provider is configured
  let emailSent = false;
  let deliveryStatus = 'PENDING';
  let deliveryError = null;

  if (emailService.isEmailConfigured()) {
    try {
      if (rawRole === 'CA') {
        await emailService.sendCaInvitationEmail({
          to: rawEmail,
          name: invitation.name || 'Chartered Accountant',
          businessName: business.name,
          businessGstin: business.gstin,
          inviteLink,
          expiresAt,
          message: invitation.message,
          permissions: Array.isArray(invitation.permissions) ? invitation.permissions : [],
        });
      } else {
        await emailService.sendRoleInvitationEmail({
          to: rawEmail,
          name: invitation.name,
          businessName: business.name,
          role: rawRole,
          inviterName: inviterUser.name || 'Store Administrator',
          inviteLink,
          expiresAt,
          message: invitation.message,
        });
      }
      emailSent = true;
      deliveryStatus = 'DELIVERED';
    } catch (err) {
      console.warn('[RoleInvitation] Email dispatch failure:', err.message);
      deliveryStatus = 'FAILED';
      deliveryError = err.message;
    }
  } else {
    deliveryStatus = 'SKIPPED';
    deliveryError = 'Email provider (SMTP) not configured. In-app notification created.';
  }

  // Update delivery status on record
  const updatedInvitation = await prisma.roleInvitation.update({
    where: { id: invitation.id },
    data: {
      deliveryStatus,
      deliveryError,
    },
    include: {
      business: { select: { id: true, name: true, gstin: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  });

  // Real-time broadcast
  try {
    realtimeService.broadcastStoreEvent(resolvedBusinessId, {
      type: 'INVITATION_CREATED',
      invitationId: invitation.id,
      recipientEmail: rawEmail,
      role: rawRole,
    });
  } catch (_) {}

  return {
    invitation: {
      ...updatedInvitation,
      rawToken,
    },
    inviteLink,
    emailSent,
    deliveryStatus,
    inAppNotificationCreated: Boolean(notification),
    warning: !emailSent ? 'Email provider not configured. Invitee can view and accept invitation in-app after registering.' : undefined,
  };
};

/**
 * 2. Get Invitations for a Business (Admin View)
 */
export const getBusinessInvitations = async (inviterUser, businessId, query = {}) => {
  const business = await resolveAndAuthorizeBusiness(inviterUser, businessId);
  const resolvedBusinessId = business.id;

  const where = { businessId: resolvedBusinessId };
  if (query.status && query.status !== 'ALL') {
    where.status = query.status.toUpperCase();
  }

  const invitations = await prisma.roleInvitation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      inviter: { select: { id: true, name: true, email: true } },
      recipientUser: { select: { id: true, name: true, email: true } },
    },
  });

  // Check and auto-flag expired records
  const now = new Date();
  const processed = invitations.map((inv) => {
    if (inv.status === 'PENDING' && new Date(inv.expiresAt) < now) {
      return { ...inv, status: 'EXPIRED' };
    }
    return inv;
  });

  return { invitations: processed };
};

/**
 * 3. Get Invitations for Current Authenticated User (Invitee View)
 */
export const getMyInvitations = async (user) => {
  if (!user) return { invitations: [] };
  const normalizedEmail = (user.email || '').toLowerCase().trim();

  try {
    const orConditions = [];
    if (user.id) {
      orConditions.push({ recipientUserId: user.id });
    }
    if (normalizedEmail) {
      orConditions.push({ recipientEmail: { equals: normalizedEmail, mode: 'insensitive' } });
    }

    if (orConditions.length === 0) {
      return { invitations: [] };
    }

    // 1. Find all pending role invitations addressed to user's email or userId
    const invitations = await prisma.roleInvitation.findMany({
      where: {
        OR: orConditions,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        business: { select: { id: true, name: true, gstin: true, phone: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    for (const inv of (invitations || [])) {
      if (!inv.business && inv.businessId) {
        inv.business = await prisma.business.findUnique({
          where: { id: inv.businessId },
          select: { id: true, name: true, gstin: true, phone: true },
        }).catch(() => null);
      }
    }

    // 2. Also query pending Chartered Accountant (CA) invitations
    let formattedCaList = [];
    try {
      const caOrConditions = [];
      if (user.id) {
        caOrConditions.push({ caUserId: user.id });
      }
      if (normalizedEmail) {
        caOrConditions.push({ email: { equals: normalizedEmail, mode: 'insensitive' } });
      }

      if (caOrConditions.length > 0) {
        const caInvitations = await prisma.caInvitation.findMany({
          where: {
            OR: caOrConditions,
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
          include: {
            business: { select: { id: true, name: true, gstin: true, phone: true } },
            inviter: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        }).catch(() => []);

        formattedCaList = (caInvitations || []).map((ca) => ({
          id: ca.id,
          businessId: ca.businessId,
          business: ca.business,
          inviter: ca.inviter,
          recipientEmail: ca.email,
          role: 'CA',
          designation: 'Chartered Accountant',
          department: 'Audit & Compliance',
          permissions: ca.permissions,
          message: ca.message,
          status: ca.status,
          createdAt: ca.createdAt,
          expiresAt: ca.expiresAt,
          token: ca.id,
          isCa: true,
        }));
      }
    } catch (err) {
      console.warn('[RoleInvitation] CA invitations fetch fallback:', err?.message);
    }

    const allInvitations = [...(invitations || []), ...(formattedCaList || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return { invitations: allInvitations };
  } catch (err) {
    console.warn('[RoleInvitation.getMyInvitations error]:', err?.message);
    return { invitations: [] };
  }
};

/**
 * 4. Verify Invitation Token (Safe inspection)
 */
export const verifyInvitationToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    throw ApiError.badRequest('Valid token parameter is required.');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  const invitation = await prisma.roleInvitation.findUnique({
    where: { tokenHash },
    include: {
      business: { select: { id: true, name: true, gstin: true, phone: true, state: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  });

  if (!invitation) {
    throw ApiError.notFound('Invitation not found or invalid token.');
  }

  if (!invitation.business && invitation.businessId) {
    invitation.business = await prisma.business.findUnique({
      where: { id: invitation.businessId },
      select: { id: true, name: true, gstin: true, phone: true, state: true },
    });
  }

  const now = new Date();
  const isExpired = new Date(invitation.expiresAt) < now;

  if (isExpired && invitation.status === 'PENDING') {
    await prisma.roleInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    }).catch(() => {});
  }

  return {
    valid: invitation.status === 'PENDING' && !isExpired,
    invitation: {
      id: invitation.id,
      email: invitation.recipientEmail,
      name: invitation.name,
      role: invitation.role,
      department: invitation.department,
      designation: invitation.designation,
      status: isExpired && invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status,
      expiresAt: invitation.expiresAt,
      business: invitation.business,
      inviter: invitation.inviter,
      permissions: invitation.permissions,
    },
  };
};

/**
 * 5. Accept Invitation (Assigns role and business membership)
 */
export const acceptInvitation = async (user, rawToken) => {
  if (!user) throw ApiError.unauthorized('Authentication required.');
  if (!rawToken) throw ApiError.badRequest('Invitation token is required.');

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  let invitation = await prisma.roleInvitation.findUnique({
    where: { tokenHash },
    include: { business: true },
  });

  if (!invitation) {
    const userEmail = (user.email || '').toLowerCase().trim();
    invitation = await prisma.roleInvitation.findFirst({
      where: {
        id: rawToken.trim(),
        OR: [
          { recipientUserId: user.id },
          { recipientEmail: userEmail },
        ],
      },
      include: { business: true },
    });
  }

  if (!invitation) {
    // Check if this token corresponds to a CA invitation
    try {
      const caResult = await caInvitationService.acceptInvitation(user, rawToken);
      if (caResult && caResult.success) {
        return {
          success: true,
          message: caResult.message,
          role: 'CA',
          businessId: caResult.storeId,
          businessName: caResult.storeName,
          isCa: true,
        };
      }
    } catch (caErr) {
      if (caErr?.status !== 404 && caErr?.statusCode !== 404) {
        throw caErr;
      }
    }
  }

  if (!invitation) {
    throw ApiError.notFound('Invitation not found or invalid token.');
  }

  if (!invitation.business && invitation.businessId) {
    invitation.business = await prisma.business.findUnique({
      where: { id: invitation.businessId },
    });
  }

  if (invitation.status === 'ACCEPTED') {
    throw ApiError.badRequest('This invitation has already been accepted.');
  }

  if (invitation.status === 'REVOKED') {
    throw ApiError.badRequest('This invitation has been revoked by the store administrator.');
  }

  if (invitation.status === 'REJECTED') {
    throw ApiError.badRequest('This invitation was previously declined.');
  }

  const now = new Date();
  if (new Date(invitation.expiresAt) < now) {
    await prisma.roleInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw ApiError.badRequest('This invitation has expired. Please ask the administrator to resend it.');
  }

  // Enforce identity verification: logged-in user email must match recipient email
  const userEmail = (user.email || '').toLowerCase().trim();
  const inviteEmail = (invitation.recipientEmail || '').toLowerCase().trim();

  if (userEmail !== inviteEmail) {
    throw ApiError.forbidden(
      `Access denied: You are signed in as ${userEmail}, but this invitation was intended for ${inviteEmail}. Please sign in with the invited email.`
    );
  }

  // Execute acceptance in transactional safety
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create or update BusinessMember record
    const member = await tx.businessMember.upsert({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId: invitation.businessId,
        },
      },
      update: {
        role: invitation.role,
        department: invitation.department,
        designation: invitation.designation,
        permissions: invitation.permissions,
        status: 'ACTIVE',
        acceptedAt: now,
      },
      create: {
        userId: user.id,
        businessId: invitation.businessId,
        role: invitation.role,
        department: invitation.department,
        designation: invitation.designation,
        permissions: invitation.permissions,
        status: 'ACTIVE',
        invitedBy: invitation.inviterId,
        acceptedAt: now,
      },
    });

    // 2. If role is CA: Also grant CA store access
    if (invitation.role === 'CA' || invitation.role === 'ACCOUNTANT') {
      await tx.caStoreAccess.upsert({
        where: {
          caUserId_businessId: {
            caUserId: user.id,
            businessId: invitation.businessId,
          },
        },
        update: {
          status: 'ACTIVE',
          permissions: invitation.permissions || [
            'sales_audit',
            'purchase_audit',
            'tax_audit',
            'reconciliation',
            'reports',
            'tasks',
            'discrepancies',
            'documents',
          ],
        },
        create: {
          caUserId: user.id,
          businessId: invitation.businessId,
          status: 'ACTIVE',
          role: 'CA',
          assignedById: invitation.inviterId,
          permissions: invitation.permissions || [
            'sales_audit',
            'purchase_audit',
            'tax_audit',
            'reconciliation',
            'reports',
            'tasks',
            'discrepancies',
            'documents',
          ],
        },
      });
    }

    // 3. If role is STAFF or MANAGER: ensure Staff record exists for attendance and shifts
    if (invitation.role === 'STAFF' || invitation.role === 'MANAGER' || invitation.role === 'CASHIER') {
      const existingStaff = await tx.staff.findFirst({
        where: { userId: user.id, businessId: invitation.businessId },
      });

      if (!existingStaff) {
        await tx.staff.create({
          data: {
            staffId: `STF-${Date.now().toString().slice(-6)}`,
            userId: user.id,
            businessId: invitation.businessId,
            name: user.name || user.email.split('@')[0],
            email: user.email,
            role: invitation.designation || (invitation.role === 'MANAGER' ? 'Manager' : 'Staff'),
            department: invitation.department || 'Operations',
            status: 'ACTIVE',
          },
        });
      } else {
        await tx.staff.update({
          where: { id: existingStaff.id },
          data: {
            status: 'ACTIVE',
            role: invitation.designation || (invitation.role === 'MANAGER' ? 'Manager' : 'Staff'),
            department: invitation.department || existingStaff.department,
          },
        });
      }
    }

    // 4. Update user's active businessId and role if user had NONE or no business
    const userUpdateData = {};
    if (!user.businessId || user.role === 'NONE' || user.role === 'VIEWER') {
      userUpdateData.businessId = invitation.businessId;
      userUpdateData.role = invitation.role;
    }
    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    // 5. Mark invitation as ACCEPTED
    const updatedInvitation = await tx.roleInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
        recipientUserId: user.id,
      },
    });

    // 6. Mark user's invitation notification as read
    await tx.notification.updateMany({
      where: {
        invitationId: invitation.id,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    // 7. Notify inviter admin
    await tx.notification.create({
      data: {
        userId: invitation.inviterId,
        type: 'INVITATION_ACCEPTED',
        title: `${user.name || user.email} joined ${invitation.business.name}`,
        message: `${user.name || user.email} accepted your invitation as ${invitation.role}.`,
        data: {
          businessId: invitation.businessId,
          businessName: invitation.business.name,
          role: invitation.role,
          memberId: member.id,
        },
      },
    });

    return { member, invitation: updatedInvitation };
  });

  // Broadcast realtime event
  try {
    realtimeService.broadcastStoreEvent(invitation.businessId, {
      type: 'INVITATION_ACCEPTED',
      businessId: invitation.businessId,
      userId: user.id,
      role: invitation.role,
    });
  } catch (_) {}

  return {
    success: true,
    message: `Invitation accepted! You are now a member of ${invitation.business.name}.`,
    role: invitation.role,
    businessId: invitation.businessId,
    businessName: invitation.business.name,
    member: result.member,
  };
};

/**
 * 6. Reject Invitation
 */
export const rejectInvitation = async (user, rawToken, reason = null) => {
  if (!user) throw ApiError.unauthorized('Authentication required.');
  if (!rawToken) throw ApiError.badRequest('Invitation token is required.');

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  let invitation = await prisma.roleInvitation.findUnique({
    where: { tokenHash },
    include: { business: true },
  });

  if (!invitation) {
    const userEmail = (user.email || '').toLowerCase().trim();
    invitation = await prisma.roleInvitation.findFirst({
      where: {
        id: rawToken.trim(),
        OR: [
          { recipientUserId: user.id },
          { recipientEmail: userEmail },
        ],
      },
      include: { business: true },
    });
  }

  if (!invitation) {
    try {
      const caDeclined = await caInvitationService.declineInvitation(user, rawToken, reason);
      if (caDeclined && caDeclined.success) {
        return {
          success: true,
          message: 'Invitation declined.',
        };
      }
    } catch (caErr) {
      if (caErr?.status !== 404 && caErr?.statusCode !== 404) {
        throw caErr;
      }
    }
  }

  if (!invitation) {
    throw ApiError.notFound('Invitation not found or invalid token.');
  }

  if (!invitation.business && invitation.businessId) {
    invitation.business = await prisma.business.findUnique({
      where: { id: invitation.businessId },
    });
  }

  if (invitation.status !== 'PENDING') {
    throw ApiError.badRequest(`Cannot decline invitation with status '${invitation.status}'.`);
  }

  const userEmail = (user.email || '').toLowerCase().trim();
  const inviteEmail = (invitation.recipientEmail || '').toLowerCase().trim();

  if (userEmail !== inviteEmail) {
    throw ApiError.forbidden('You are not authorized to decline this invitation.');
  }

  const now = new Date();

  await prisma.roleInvitation.update({
    where: { id: invitation.id },
    data: {
      status: 'REJECTED',
      rejectedAt: now,
      recipientUserId: user.id,
    },
  });

  // Mark notification as read
  await prisma.notification.updateMany({
    where: { invitationId: invitation.id },
    data: { isRead: true, readAt: now },
  });

  // Notify inviter admin
  await prisma.notification.create({
    data: {
      userId: invitation.inviterId,
      type: 'INVITATION_REJECTED',
      title: `${user.name || user.email} declined your invitation`,
      message: `${user.name || user.email} declined the invitation to join ${invitation.business.name}.${reason ? ` Reason: "${reason}"` : ''}`,
      data: {
        businessId: invitation.businessId,
        recipientEmail: inviteEmail,
        reason,
      },
    },
  });

  return {
    success: true,
    message: 'Invitation declined.',
  };
};

/**
 * 7. Resend Invitation
 */
export const resendInvitation = async (inviterUser, invitationId) => {
  const invitation = await prisma.roleInvitation.findUnique({
    where: { id: invitationId },
    include: { business: true },
  });

  if (!invitation) throw ApiError.notFound('Invitation not found.');
  await verifyInviterAuthorization(inviterUser, invitation.businessId);

  if (invitation.status === 'ACCEPTED') {
    throw ApiError.badRequest('This invitation has already been accepted.');
  }

  // Generate fresh token and extend expiry
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updated = await prisma.roleInvitation.update({
    where: { id: invitationId },
    data: {
      tokenHash,
      status: 'PENDING',
      expiresAt,
    },
  });

  const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${frontendUrl}/accept-invitation?token=${rawToken}`;

  // Create notification
  await notificationService.createNotification({
    email: invitation.recipientEmail,
    type: 'INVITATION',
    title: `Invitation Refreshed: ${invitation.business.name}`,
    message: `${inviterUser.name || 'Admin'} resent your invitation to join as ${invitation.role}.`,
    invitationId: invitation.id,
    data: {
      invitationId: invitation.id,
      businessId: invitation.businessId,
      businessName: invitation.business.name,
      role: invitation.role,
      token: rawToken,
      expiresAt,
    },
  });

  let emailSent = false;
  if (emailService.isEmailConfigured()) {
    try {
      await emailService.sendRoleInvitationEmail({
        to: invitation.recipientEmail,
        name: invitation.name,
        businessName: invitation.business.name,
        role: invitation.role,
        inviterName: inviterUser.name || 'Store Administrator',
        inviteLink,
        expiresAt,
        message: invitation.message,
      });
      emailSent = true;
    } catch (_) {}
  }

  return {
    invitation: updated,
    inviteLink,
    emailSent,
  };
};

/**
 * 8. Revoke Invitation
 */
export const revokeInvitation = async (inviterUser, invitationId) => {
  const invitation = await prisma.roleInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) throw ApiError.notFound('Invitation not found.');
  await verifyInviterAuthorization(inviterUser, invitation.businessId);

  if (invitation.status === 'ACCEPTED') {
    throw ApiError.badRequest('Cannot revoke an already accepted invitation. Please remove the member from active members list instead.');
  }

  const updated = await prisma.roleInvitation.update({
    where: { id: invitationId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
    },
  });

  return { invitation: updated };
};

export default {
  createInvitation,
  getBusinessInvitations,
  getMyInvitations,
  verifyInvitationToken,
  acceptInvitation,
  rejectInvitation,
  resendInvitation,
  revokeInvitation,
};
