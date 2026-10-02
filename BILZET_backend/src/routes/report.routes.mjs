import { Router } from 'express';
import reportController from '../controllers/report.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/sales', reportController.getSalesReport);
router.get('/sales/daily', reportController.getDailyReport);
router.get('/sales/monthly', reportController.getMonthlyReport);
router.get('/sales/yearly', reportController.getYearlyReport);

router.get('/profit', reportController.getProfitReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/gst', reportController.getGstReport);
router.get('/analytics', reportController.getAnalyticsReport);

export default router;
