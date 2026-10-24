import { Router } from 'express';
import reportController from '../controllers/report.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePermission } from '../middleware/permission.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/sales', requirePermission('reports.sales'), reportController.getSalesReport);
router.get('/sales/daily', requirePermission('reports.sales'), reportController.getDailyReport);
router.get('/sales/monthly', requirePermission('reports.sales'), reportController.getMonthlyReport);
router.get('/sales/yearly', requirePermission('reports.sales'), reportController.getYearlyReport);

router.get('/profit', requirePlanTier('PRO', 'Profit & Loss reports'), requirePermission('reports.profit_loss'), reportController.getProfitReport);
router.get('/inventory', requirePermission('reports.inventory'), reportController.getInventoryReport);
router.get('/gst', requirePlanTier('PRO', 'GST reports and filing'), requirePermission('gst.view'), reportController.getGstReport);
router.get('/analytics', requirePlanTier('PRO', 'Advanced Analytics'), requirePermission('reports.view'), reportController.getAnalyticsReport);

export default router;
