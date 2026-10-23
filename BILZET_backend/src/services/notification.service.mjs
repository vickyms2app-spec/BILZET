import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import realtimeService from './realtime.service.mjs';

/**
 * Service for In-App Notifications and Activity Alerts
 */

/**
 * Links any pre-registration notifications that were addressed to user's email
 */
export const linkPendingNotificationsToUser = async (user) => {
  if (!user || !user.email) return;
  const normalizedEmail = user.email.toLowerCase().trim();

  try {
    await prisma.notification.updateMany({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
        userId: null,
      },
      data: {
        userId: user.id,
      },
    });
  } catch (err) {
    console.warn('[NotificationService] Error linking notifications:', err.message);
  }
};

/**
 * Create a persistent notification in the database
 */
export const createNotification = async ({
  userId = null,
  email = null,
  type = 'INVITATION',
  title,
  message,
  invitationId = null,
  data = null,
}) => {
  if (!title || !message) {
    throw ApiError.badRequest('Title and message are required for notification');
  }

  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  // If userId is missing but email matches existing user, resolve userId
  let resolvedUserId = userId;
  if (!resolvedUserId && normalizedEmail) {
    try {
      const u = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });
      if (u) resolvedUserId = u.id;
    } catch (_) {}
  }

  const notif = await prisma.notification.create({
    data: {
      userId: resolvedUserId,
      email: normalizedEmail,
      type,
      title,
      message,
      invitationId,
      data: data || {},
      isRead: false,
    },
  });

  // Broadcast realtime event if store or user connected
  if (data?.businessId) {
    try {
      realtimeService.broadcastStoreEvent(data.businessId, {
        type: 'NOTIFICATION_RECEIVED',
        notification: notif,
        targetEmail: normalizedEmail,
        targetUserId: resolvedUserId,
      });
    } catch (_) {}
  }

  return notif;
};

/**
 * Get notifications for authenticated user
 */
export const getUserNotifications = async (user, options = {}) => {
  if (!user) throw ApiError.unauthorized('Authentication required');
  const normalizedEmail = (user.email || '').toLowerCase().trim();

  // Link any unlinked notifications first
  await linkPendingNotificationsToUser(user);

  const where = {
    OR: [
      { userId: user.id },
      ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' } }] : []),
    ],
  };

  if (options.unreadOnly === true || options.unreadOnly === 'true') {
    where.isRead = false;
  }

  if (options.type) {
    where.type = options.type;
  }

  const limit = Math.min(parseInt(options.limit || '50', 10), 100);

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      ...where,
      isRead: false,
    },
  });

  return {
    notifications,
    unreadCount,
    total: notifications.length,
  };
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (user) => {
  if (!user) return 0;
  const normalizedEmail = (user.email || '').toLowerCase().trim();

  const count = await prisma.notification.count({
    where: {
      isRead: false,
      OR: [
        { userId: user.id },
        ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' } }] : []),
      ],
    },
  });

  return count;
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (user, notificationId) => {
  if (!user) throw ApiError.unauthorized('Authentication required');
  const normalizedEmail = (user.email || '').toLowerCase().trim();

  const notif = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notif) {
    throw ApiError.notFound('Notification not found');
  }

  const isOwner =
    notif.userId === user.id ||
    (notif.email && notif.email.toLowerCase() === normalizedEmail);

  if (!isOwner && user.role !== 'SUPER_ADMIN') {
    throw ApiError.forbidden('You are not authorized to modify this notification');
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated;
};

/**
 * Mark all notifications as read for current user
 */
export const markAllAsRead = async (user) => {
  if (!user) throw ApiError.unauthorized('Authentication required');
  const normalizedEmail = (user.email || '').toLowerCase().trim();

  const res = await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [
        { userId: user.id },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { updatedCount: res.count };
};

export default {
  linkPendingNotificationsToUser,
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
