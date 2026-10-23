import notificationService from '../services/notification.service.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { asyncHandler } from '../utils/asyncHandler.mjs';

/**
 * Controller for In-App Notifications
 */

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user, req.query);
  return sendResponse(res, 200, result, 'Notifications fetched successfully.');
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user);
  return sendResponse(res, 200, { unreadCount: count }, 'Unread count fetched.');
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) throw ApiError.badRequest('Notification ID is required.');
  const result = await notificationService.markAsRead(req.user, id);
  return sendResponse(res, 200, result, 'Notification marked as read.');
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user);
  return sendResponse(res, 200, result, 'All notifications marked as read.');
});

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
