import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env.mjs';

// Route imports
import authRoutes from './routes/auth.routes.mjs';
import userRoutes from './routes/user.routes.mjs';
import productRoutes from './routes/product.routes.mjs';
import categoryRoutes from './routes/category.routes.mjs';
import customerRoutes from './routes/customer.routes.mjs';
import supplierRoutes from './routes/supplier.routes.mjs';
import purchaseRoutes from './routes/purchase.routes.mjs';
import saleRoutes from './routes/sale.routes.mjs';
import paymentRoutes from './routes/payment.routes.mjs';
import inventoryRoutes from './routes/inventory.routes.mjs';
import reportRoutes from './routes/report.routes.mjs';
import invoiceRoutes from './routes/invoice.routes.mjs';
import dashboardRoutes from './routes/dashboard.routes.mjs';
import expenseRoutes from './routes/expense.routes.mjs';
import settingsRoutes from './routes/settings.routes.mjs';
import superAdminRoutes from './routes/superAdmin.routes.mjs';
import warehouseRoutes from './routes/warehouse.routes.mjs';
import staffRoutes from './routes/staff.routes.mjs';
import onlineOrderRoutes from './routes/onlineOrder.routes.mjs';
import smsRoutes from './routes/sms.routes.mjs';
import auditRoutes from './routes/audit.routes.mjs';

// Error middlewares
import { notFoundHandler } from './middleware/notFound.middleware.mjs';
import { errorHandler } from './middleware/error.middleware.mjs';
import { sendResponse } from './utils/apiResponse.mjs';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Allow configured frontend, local dev, or any vercel.app deployment
      const isAllowed =
        !env.FRONTEND_URL ||
        origin === env.FRONTEND_URL ||
        origin.includes('localhost') ||
        origin.endsWith('.vercel.app');
      return callback(null, true);
    },
    credentials: true
  })
);

// Rate limiting (bypass in test mode)
if (env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
      errors: []
    }
  });
  app.use('/api', limiter);
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  return sendResponse(
    res,
    200,
    {
      status: 'ok',
      database: 'PostgreSQL (NeonDB)',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    'BILZET API is healthy and connected'
  );
});

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/warehouses', warehouseRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/online-orders', onlineOrderRoutes);
app.use('/api/v1/sms-campaigns', smsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/super-admin', superAdminRoutes);


// Fallback 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
