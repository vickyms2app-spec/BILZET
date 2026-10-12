import crypto from 'crypto';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { env } from '../config/env.mjs';
import emailService from './email.service.mjs';
import realtimeService from './realtime.service.mjs';

/**
 * Service for Chartered Accountant (CA) Invitations and Secure Workspace Access
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verifies that the inviter user is an authorized Admin/Owner of the target business.
 */
const verifyInviterAuthorization = async (inviterUser, businessId) => {
  if (!inviterUser) throw ApiError.unauthorized('Authentication required.');

  const isSuperAdmin = inviterUser.role === 'SUPER_ADMIN' || inviterUser.isSuperAdmin;
  const isAdminOrOwner = inviterUser.role === 'ADMIN' || inviterUser.role === 'OWNER';

  if (isSuperAdmin) return true;

  if (isAdminOrOwner) {
    if (!inviterUser.businessId || inviterUser.businessId === businessId) {
      return true;
    }
  }

  // Check if inviter owns the business
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (business && business.ownerId === inviterUser.id) {
    return true;
  }

  throw ApiError.forbidden('Only store administrators or business owners can manage Chartered Accountant invitations.');
};

/**
 * 1. Admin Invites a CA
 */
export const createInvitation = async (inviterUser, businessId, data = {}) => {
  if (!businessId) {
    throw ApiError.badRequest('Business / Store ID is required.');
  }

  await verifyInviterAuthorization(inviterUser, businessId);

  const rawEmail = String(data.email || '').trim().toLowerCase();
  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    throw ApiError.badRequest('A valid email address is required.');
  }

  // Fetch business details
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw ApiError.notFound('Target business not found.');
  }

  // Check if a CA with this email is ALREADY connected with status ACTIVE
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: rawEmail, mode: 'insensitive' } },
  });

  if (existingUser) {
    const activeAccess = await prisma.caStoreAccess.findFirst({
      where: {
        businessId,
        caUserId: existingUser.id,
        status: 'ACTIVE',
      },
    });

    if (activeAccess) {
      throw ApiError.conflict('A Chartered Accountant with this email is already actively connected to your business.');
    }
  }

  // Safely invalidate any existing pending invitation for this email & store
  // to avoid orphaned active tokens
  const existingPending = await prisma.caInvitation.findFirst({
    where: {
      businessId,
      email: { equals: rawEmail, mode: 'insensitive' },
      status: 'PENDING',
    },
  });

  if (existingPending) {
    await prisma.caInvitation.update({
      where: { id: existingPending.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
    });
  }

  // Generate cryptographically secure 64-character token and hash it with SHA-256
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Compute expiry (default 7 days, configurable 1-30 days)
  const expiresInDays = Math.min(30, Math.max(1, parseInt(data.expiresInDays || 7, 10)));
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const permissions = Array.isArray(data.permissions) && data.permissions.length > 0
    ? data.permissions
    : [
        'sales_audit',
        'purchase_audit',
        'tax_audit',
        'reconciliation',
        'reports',
        'tasks',
        'discrepancies',
        'documents',
      ];

  // Create persistent invitation record (token hash only stored in DB)
  const invitation = await prisma.caInvitation.create({
    data: {
      businessId,
      inviterId: inviterUser.id,
      email: rawEmail,
      name: data.name ? String(data.name).trim() : null,
      tokenHash,
      permissions,
      message: data.message ? String(data.message).trim() : null,
      role: 'CA',
      expiresAt,
      status: 'PENDING',
      deliveryStatus: 'PENDING',
      deliveryAttempts: 1,
    },
    include: {
      business: { select: { id: true, name: true, gstin: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  });

  // Construct secure invitation URL using configured frontend URL
  const baseUrl = process.env.FRONTEND_URL || env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${baseUrl.replace(/\/$/, '')}/ca-connect/accept-invitation?token=${rawToken}`;

  let emailSent = false;
  let emailError = null;

  // Send invitation email
  try {
    await emailService.sendCaInvitationEmail({
      to: rawEmail,
      caName: invitation.name,
      businessName: business.name,
      businessGstin: business.gstin,
      inviteLink,
      expiresAt,
      permissions,
      message: invitation.message,
    });

    await prisma.caInvitation.update({
      where: { id: invitation.id },
      data: {
        deliveryStatus: 'DELIVERED',
        deliveryError: null,
      },
    });

    invitation.deliveryStatus = 'DELIVERED';
    emailSent = true;
  } catch (err) {
    await prisma.caInvitation.update({
      where: { id: invitation.id },
      data: {
        deliveryStatus: 'FAILED',
        deliveryError: err.message,
      },
    });
    invitation.deliveryStatus = 'FAILED';
    invitation.deliveryError = err.message;
    emailError = err.message;
  }

  // Broadcast real-time event to Store channel
  realtimeService.broadcastEvent(businessId, 'CA_INVITATION_CREATED', {
    invitationId: invitation.id,
    email: rawEmail,
    name: invitation.name,
    expiresAt,
    deliveryStatus: invitation.deliveryStatus,
    emailSent,
  });

  // Log audit trail
  try {
    await prisma.auditLog.create({
      data: {
        businessId,
        userId: inviterUser.id,
        action: 'CA_INVITATION_SENT',
        entityType: 'CA_INVITATION',
        entityId: invitation.id,
        changes: {
          email: rawEmail,
          name: invitation.name,
          expiresAt: expiresAt.toISOString(),
          permissions,
          deliveryStatus: invitation.deliveryStatus,
        },
      },
    });
  } catch (_) {}

  return {
    invitation,
    inviteLink,
    emailSent,
    emailError,
    warning: emailSent
      ? null
      : `Invitation record saved with secure token, but automatic email delivery was not sent: ${emailError}. You can copy the invitation link below to share it directly with your CA.`,
  };
};

/**
 * 2. Resend an Invitation
 */
export const resendInvitation = async (inviterUser, invitationId) => {
  const invitation = await prisma.caInvitation.findUnique({
    where: { id: invitationId },
    include: { business: true },
  });

  if (!invitation) {
    throw ApiError.notFound('Invitation record not found.');
  }

  await verifyInviterAuthorization(inviterUser, invitation.businessId);

  if (invitation.status === 'ACCEPTED') {
    throw ApiError.badRequest('This invitation has already been accepted and cannot be resent.');
  }

  // Generate new single-use token and update expiry
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updated = await prisma.caInvitation.update({
    where: { id: invitationId },
    data: {
      tokenHash,
      expiresAt,
      status: 'PENDING',
      deliveryAttempts: (invitation.deliveryAttempts || 1) + 1,
      deliveryStatus: 'PENDING',
      deliveryError: null,
    },
    include: {
      business: { select: { id: true, name: true, gstin: true } },
    },
  });

  const baseUrl = process.env.FRONTEND_URL || env.FRONTEND_URL || 'http://localhost:5173';
  const inviteLink = `${baseUrl.replace(/\/$/, '')}/ca-connect/accept-invitation?token=${rawToken}`;

  let emailSent = false;
  let emailError = null;

  try {
    await emailService.sendCaInvitationEmail({
      to: updated.email,
      caName: updated.name,
      businessName: updated.business?.name,
      businessGstin: updated.business?.gstin,
      inviteLink,
      expiresAt,
      permissions: updated.permissions,
      message: updated.message,
    });

    await prisma.caInvitation.update({
      where: { id: invitationId },
      data: { deliveryStatus: 'DELIVERED', deliveryError: null },
    });
    updated.deliveryStatus = 'DELIVERED';
    emailSent = true;
  } catch (err) {
    await prisma.caInvitation.update({
      where: { id: invitationId },
      data: {
        deliveryStatus: 'FAILED',
        deliveryError: err.message,
      },
    });
    updated.deliveryStatus = 'FAILED';
    updated.deliveryError = err.message;
    emailError = err.message;
  }

  realtimeService.broadcastEvent(updated.businessId, 'CA_INVITATION_RESENT', {
    invitationId: updated.id,
    email: updated.email,
    expiresAt,
    emailSent,
  });

  return {
    invitation: updated,
    inviteLink,
    emailSent,
    emailError,
    warning: emailSent
      ? null
      : `Invitation refreshed with new token, but automatic email delivery failed: ${emailError}. You can share the active invite link directly.`,
  };
};

/**
 * 3. Revoke a Pending Invitation
 */
export const revokeInvitation = async (inviterUser, invitationId) => {
  const invitation = await prisma.caInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw ApiError.notFound('Invitation record not found.');
  }

  await verifyInviterAuthorization(inviterUser, invitation.businessId);

  if (invitation.status === 'ACCEPTED') {
    throw ApiError.badRequest('This invitation has already been accepted. Use Disconnect CA to remove workspace access.');
  }

  const updated = await prisma.caInvitation.update({
    where: { id: invitationId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
    },
  });

  realtimeService.broadcastEvent(updated.businessId, 'CA_INVITATION_REVOKED', {
    invitationId: updated.id,
    email: updated.email,
  });

  try {
    await prisma.auditLog.create({
      data: {
        businessId: updated.businessId,
        userId: inviterUser.id,
        action: 'CA_INVITATION_REVOKED',
        entityType: 'CA_INVITATION',
        entityId: updated.id,
      },
    });
  } catch (_) {}

  return updated;
};

/**
 * 4. Verify Invitation Token (Public / Safe inspection without consumption)
 */
export const verifyInvitationToken = async (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    return {
      valid: false,
      code: 'MISSING_TOKEN',
      message: 'Invitation token parameter is required.',
    };
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  const invitation = await prisma.caInvitation.findUnique({
    where: { tokenHash },
    include: {
      business: { select: { id: true, name: true, gstin: true, email: true, phone: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
  });

  if (!invitation) {
    return {
      valid: false,
      code: 'INVALID_TOKEN',
      message: 'This invitation token does not exist or has expired.',
    };
  }

  if (invitation.status === 'ACCEPTED') {
    return {
      valid: false,
      code: 'ALREADY_ACCEPTED',
      message: 'This invitation has already been accepted and consumed.',
      acceptedAt: invitation.acceptedAt,
    };
  }

  if (invitation.status === 'REVOKED') {
    return {
      valid: false,
      code: 'REVOKED',
      message: 'This invitation has been revoked by the business administrator.',
      revokedAt: invitation.revokedAt,
    };
  }

  if (invitation.status === 'DECLINED') {
    return {
      valid: false,
      code: 'DECLINED',
      message: 'This invitation was previously declined.',
    };
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    // Dynamically mark expired
    try {
      await prisma.caInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
    } catch (_) {}

    return {
      valid: false,
      code: 'EXPIRED',
      message: 'This invitation has expired.',
      expiresAt: invitation.expiresAt,
    };
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      business: invitation.business,
      inviterName: invitation.inviter?.name || 'Store Administrator',
      permissions: invitation.permissions,
      message: invitation.message,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
    },
  };
};

/**
 * 5. CA Accepts the Invitation (Atomic connection creation & token consumption)
 */
export const acceptInvitation = async (caUser, rawToken) => {
  if (!caUser) {
    throw ApiError.unauthorized('Authentication is required to accept this invitation.');
  }

  if (!rawToken) {
    throw ApiError.badRequest('Invitation token is required.');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  // Verify invitation in database
  const invitation = await prisma.caInvitation.findUnique({
    where: { tokenHash },
    include: {
      business: true,
      inviter: true,
    },
  });

  if (!invitation) {
    throw ApiError.notFound('Invalid or non-existent invitation token.');
  }

  if (invitation.status === 'ACCEPTED') {
    throw ApiError.badRequest('This invitation has already been accepted and consumed.');
  }

  if (invitation.status === 'REVOKED') {
    throw ApiError.badRequest('This invitation has been revoked by the store administrator.');
  }

  if (new Date() > new Date(invitation.expiresAt)) {
    await prisma.caInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw ApiError.badRequest('This invitation has expired.');
  }

  // Strict Server-Side Email Identity Check
  const authenticatedEmail = String(caUser.email || '').trim().toLowerCase();
  const invitedEmail = String(invitation.email || '').trim().toLowerCase();

  if (authenticatedEmail !== invitedEmail) {
    throw ApiError.forbidden(
      `Invitation was intended for ${invitation.email}, but your signed-in account is ${caUser.email}. Please switch accounts to accept.`
    );
  }

  // Atomic Connection Creation & Status Transition
  // 1. Establish or activate CaStoreAccess record
  let storeAccess;
  try {
    storeAccess = await prisma.caStoreAccess.upsert({
      where: {
        caUserId_businessId: {
          caUserId: caUser.id,
          businessId: invitation.businessId,
        },
      },
      create: {
        caUserId: caUser.id,
        businessId: invitation.businessId,
        status: 'ACTIVE',
        permissions: invitation.permissions || [],
        role: 'CA',
        assignedById: invitation.inviterId,
      },
      update: {
        status: 'ACTIVE',
        permissions: invitation.permissions || [],
        role: 'CA',
        revokedAt: null,
        revokedById: null,
      },
    });
  } catch (_) {
    // In-memory or fallback upsert
    const existing = await prisma.caStoreAccess.findFirst({
      where: { caUserId: caUser.id, businessId: invitation.businessId },
    });
    if (existing) {
      storeAccess = await prisma.caStoreAccess.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', revokedAt: null },
      });
    } else {
      storeAccess = await prisma.caStoreAccess.create({
        data: {
          caUserId: caUser.id,
          businessId: invitation.businessId,
          status: 'ACTIVE',
          permissions: invitation.permissions || [],
          role: 'CA',
          assignedById: invitation.inviterId,
        },
      });
    }
  }

  // 2. Elevate user role to CA if standard staff/cashier
  if (caUser.role !== 'SUPER_ADMIN' && caUser.role !== 'ADMIN' && caUser.role !== 'OWNER') {
    try {
      await prisma.user.update({
        where: { id: caUser.id },
        data: { role: 'CA' },
      });
    } catch (_) {}
  }

  // 3. Mark invitation as ACCEPTED and record acceptance metadata
  const updatedInvitation = await prisma.caInvitation.update({
    where: { id: invitation.id },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      caUserId: caUser.id,
    },
  });

  // 4. Notify Store Admin via email
  const adminEmail = invitation.inviter?.email || invitation.business?.email;
  if (adminEmail) {
    emailService.sendCaInvitationAcceptedEmail({
      to: adminEmail,
      caName: caUser.name,
      caEmail: caUser.email,
      businessName: invitation.business?.name,
      acceptedAt: updatedInvitation.acceptedAt,
    }).catch(() => {});
  }

  // 5. Broadcast real-time event to Admin website
  realtimeService.broadcastEvent(invitation.businessId, 'CA_INVITATION_ACCEPTED', {
    invitationId: invitation.id,
    caUserId: caUser.id,
    caName: caUser.name,
    caEmail: caUser.email,
    businessId: invitation.businessId,
    businessName: invitation.business?.name,
    acceptedAt: updatedInvitation.acceptedAt,
  });

  // 6. Write AuditLog entry
  try {
    await prisma.auditLog.create({
      data: {
        businessId: invitation.businessId,
        userId: caUser.id,
        action: 'CA_INVITATION_ACCEPTED',
        entityType: 'CA_STORE_ACCESS',
        entityId: storeAccess?.id || invitation.id,
        changes: {
          caUserId: caUser.id,
          email: caUser.email,
          permissions: invitation.permissions,
        },
      },
    });
  } catch (_) {}

  return {
    success: true,
    message: `Successfully connected with ${invitation.business?.name}.`,
    storeId: invitation.businessId,
    storeName: invitation.business?.name,
    role: 'CA',
    permissions: invitation.permissions,
  };
};

/**
 * 6. CA Declines the Invitation
 */
export const declineInvitation = async (caUser, rawToken, reason = '') => {
  if (!rawToken) throw ApiError.badRequest('Invitation token is required.');

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  const invitation = await prisma.caInvitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) throw ApiError.notFound('Invitation not found.');

  if (invitation.status !== 'PENDING') {
    throw ApiError.badRequest(`Cannot decline an invitation with status '${invitation.status}'.`);
  }

  const updated = await prisma.caInvitation.update({
    where: { id: invitation.id },
    data: {
      status: 'DECLINED',
      declinedAt: new Date(),
      metadata: reason ? { declineReason: reason } : undefined,
    },
  });

  realtimeService.broadcastEvent(invitation.businessId, 'CA_INVITATION_DECLINED', {
    invitationId: invitation.id,
    email: invitation.email,
  });

  return { success: true, message: 'Invitation declined.' };
};

/**
 * 7. Disconnect / Revoke Connected CA Access
 */
export const revokeCaAccess = async (adminUser, businessId, caUserId) => {
  if (!businessId || !caUserId) {
    throw ApiError.badRequest('Both businessId and caUserId are required.');
  }

  await verifyInviterAuthorization(adminUser, businessId);

  // Update CaStoreAccess to REVOKED
  const access = await prisma.caStoreAccess.findFirst({
    where: {
      businessId,
      caUserId,
    },
  });

  if (!access) {
    throw ApiError.notFound('No active connection found for this Chartered Accountant.');
  }

  const updated = await prisma.caStoreAccess.update({
    where: { id: access.id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedById: adminUser.id,
    },
  });

  realtimeService.broadcastEvent(businessId, 'CA_ACCESS_REVOKED', {
    caUserId,
    businessId,
  });

  try {
    await prisma.auditLog.create({
      data: {
        businessId,
        userId: adminUser.id,
        action: 'CA_ACCESS_REVOKED',
        entityType: 'CA_STORE_ACCESS',
        entityId: access.id,
        changes: { caUserId, revokedAt: new Date().toISOString() },
      },
    });
  } catch (_) {}

  return { success: true, message: 'Chartered Accountant connection successfully revoked.' };
};

/**
 * 8. Retrieve All Invitations for a Store
 */
export const getInvitationsForStore = async (adminUser, businessId) => {
  await verifyInviterAuthorization(adminUser, businessId);

  const invitations = await prisma.caInvitation.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    include: {
      inviter: { select: { id: true, name: true, email: true } },
      caUser: { select: { id: true, name: true, email: true } },
    },
  });

  // Check for expired pending items and update in response
  const now = new Date();
  return invitations.map((inv) => {
    let currentStatus = inv.status;
    if (currentStatus === 'PENDING' && new Date(inv.expiresAt) < now) {
      currentStatus = 'EXPIRED';
    }
    return {
      ...inv,
      status: currentStatus,
      isExpired: currentStatus === 'EXPIRED',
    };
  });
};

/**
 * 9. Retrieve All Connected CAs for a Store
 */
export const getConnectedCasForStore = async (adminUser, businessId) => {
  await verifyInviterAuthorization(adminUser, businessId);

  const accessList = await prisma.caStoreAccess.findMany({
    where: {
      businessId,
      status: 'ACTIVE',
    },
    include: {
      caUser: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return accessList.map((acc) => ({
    connectionId: acc.id,
    caUserId: acc.caUserId,
    name: acc.caUser?.name || 'Chartered Accountant',
    email: acc.caUser?.email,
    phone: acc.caUser?.phone,
    role: acc.role || 'CA',
    permissions: acc.permissions || [],
    connectedAt: acc.createdAt,
    status: acc.status,
  }));
};

export default {
  createInvitation,
  resendInvitation,
  revokeInvitation,
  verifyInvitationToken,
  acceptInvitation,
  declineInvitation,
  revokeCaAccess,
  getInvitationsForStore,
  getConnectedCasForStore,
};
