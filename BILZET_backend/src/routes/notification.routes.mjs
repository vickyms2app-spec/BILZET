import { Router } from 'express';
import { authMiddleware, softAuthMiddleware } from '../middleware/auth.middleware.mjs';
import * as notificationController from '../controllers/notification.controller.mjs';

const router = Router();

// Read routes: gracefully serve empty notifications/zero count if unauthenticated or transitioning
router.get('/', softAuthMiddleware, notificationController.getNotifications);
router.get('/unread-count', softAuthMiddleware, notificationController.getUnreadCount);

// Modification routes: strictly require authentication
router.patch('/mark-all-read', authMiddleware, notificationController.markAllAsRead);
router.post('/mark-all-read', authMiddleware, notificationController.markAllAsRead);
router.patch('/:id/read', authMiddleware, notificationController.markAsRead);

export default router;
