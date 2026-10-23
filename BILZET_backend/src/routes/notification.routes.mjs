import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import * as notificationController from '../controllers/notification.controller.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/mark-all-read', notificationController.markAllAsRead);
router.post('/mark-all-read', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

export default router;
