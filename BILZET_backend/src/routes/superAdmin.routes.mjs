import { Router } from 'express';
import superAdminController from '../controllers/superAdmin.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { superAdminMiddleware } from '../middleware/superAdmin.middleware.mjs';

const router = Router();

// Strictly protect all super admin routes with both JWT auth and superAdmin check
router.use(authMiddleware);
router.use(superAdminMiddleware);

// Overview stats
router.get('/overview', superAdminController.getOverviewStats);

// User management
router.get('/users', superAdminController.getUsers);
router.patch('/users/:id/status', superAdminController.updateUserStatus);
router.post('/users/:id/reset-password', superAdminController.resetUserPassword);

// Subscription management
router.get('/subscriptions', superAdminController.getSubscriptions);
router.patch('/subscriptions/:id', superAdminController.updateSubscription);

// Global customer directory
router.get('/customers', superAdminController.getAllCustomers);

// Global platform configuration (announcements, maintenance)
router.get('/config', superAdminController.getAppConfig);
router.patch('/config', superAdminController.updateAppConfig);

export default router;
