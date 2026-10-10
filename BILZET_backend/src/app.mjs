import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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
import roleRoutes from './routes/role.routes.mjs';
import subscriptionRoutes from './routes/subscription.routes.mjs';
import caConnectRoutes from './routes/caConnect.routes.mjs';
import storeRoutes from './routes/store.routes.mjs';
import referralRoutes from './routes/referral.routes.mjs';
import caPortalRoutes from './routes/caPortal.routes.mjs';

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
      return callback(null, isAllowed);
    },
    credentials: true
  })
);

// Rate limiting (bypass in test mode)
if (env.NODE_ENV !== 'test') {
  // Global limiter — broad protection
  const globalLimiter = rateLimit({
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
  app.use('/api', globalLimiter);

  // Strict auth limiter — brute-force protection
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      errors: []
    }
  });
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);
  app.use('/api/v1/auth/google', authLimiter);
}

import { clerkMiddleware } from '@clerk/express';

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Clerk Authentication Middleware (verifies Clerk tokens & populates req.auth)
if (env.CLERK_SECRET_KEY) {
  app.use(
    clerkMiddleware({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    })
  );
}

// Root Landing & API Status Endpoint
app.get(['/', '/api', '/api/v1'], (req, res) => {
  const isHtml = req.accepts(['html', 'json']) === 'html';
  const webAppUrl = env.FRONTEND_URL || 'http://localhost:5173';

  if (isHtml) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BILZET — Backend API Service</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }
          .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 1.25rem;
            max-width: 580px;
            width: 100%;
            padding: 2.25rem;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34d399;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.35rem 0.85rem;
            border-radius: 9999px;
            margin-bottom: 1.25rem;
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
          }
          h1 {
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.025em;
            margin-bottom: 0.5rem;
          }
          p {
            font-size: 0.875rem;
            color: #94a3b8;
            line-height: 1.6;
            margin-bottom: 1.75rem;
          }
          .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background: #2563eb;
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
            padding: 0.75rem 1.5rem;
            border-radius: 0.75rem;
            text-decoration: none;
            transition: all 0.15s ease;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          }
          .btn-primary:hover {
            background: #1d4ed8;
          }
          .links {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid #334155;
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            font-size: 0.8rem;
          }
          .links a {
            color: #60a5fa;
            text-decoration: none;
          }
          .links a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <span class="dot"></span>
            REST API Online · Port 5000
          </div>
          <h1>BILZET Retail &amp; POS Backend</h1>
          <p>
            You are viewing the backend API server. To access the user interface (Billing, POS, Products, Customers, and Invoices), open the web application at port 5173.
          </p>
          <a href="${webAppUrl}" class="btn-primary">
            Open BILZET Web Application &rarr;
          </a>
          <div class="links">
            <a href="/api/v1/health">&bull; Health Status</a>
            <a href="/api/v1/customers">&bull; Customers API</a>
            <a href="/api/v1/products">&bull; Products API</a>
            <a href="/api/v1/sales">&bull; Sales API</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  return sendResponse(
    res,
    200,
    {
      name: 'BILZET Retail & POS Backend API',
      status: 'online',
      version: '1.0.0',
      webAppUrl,
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        customers: '/api/v1/customers',
        products: '/api/v1/products',
        sales: '/api/v1/sales',
        inventory: '/api/v1/inventory',
      },
    },
    'BILZET API server is online and operational'
  );
});

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
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', roleRoutes);
app.use(['/api/v1/subscription', '/api/v1/subscriptions'], subscriptionRoutes);
app.use('/api/v1/ca-connect', caConnectRoutes);
app.use('/api/v1/ca-portal', caPortalRoutes);
app.use(['/api/v1/referral', '/api/v1/referrals'], referralRoutes);
app.use('/api/v1/super-admin', superAdminRoutes);


// Fallback 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
