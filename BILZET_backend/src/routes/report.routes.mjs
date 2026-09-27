import { Router } from 'express';
import reportController from '../controllers/report.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';
import { ROLES } from '../utils/constants.mjs';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.MANAGER));

// Analytics Reports
router.get('/sales', reportController.getSalesReport);
router.get('/purchases', reportController.getPurchasesReport);
router.get('/profit', reportController.getProfitReport);
router.get('/inventory', reportController.getInventoryReport);
router.get('/gst', reportController.getGstReport);
router.get('/payments', reportController.getPaymentsReport);

// Excel Exports
router.get('/sales/export', reportController.exportSales);
router.get('/products/export', reportController.exportProducts);
router.get('/inventory/export', reportController.exportInventory);
router.get('/customers/export', reportController.exportCustomers);

export default router;
