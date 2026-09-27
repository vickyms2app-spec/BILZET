# Bilzet Shop Billing & Inventory Management System (Backend)

A production-ready REST API backend for a high-performance **Shop Billing and Inventory Management System** built with **Node.js, Express.js, MongoDB, Mongoose, and ES Modules (.mjs)**.

Engineered to power retail point-of-sale (POS) environments, enterprise inventory tracking, GST-compliant invoicing, customer credit management, automated stock ledgers, analytics dashboards, and Excel/PDF generation.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Architecture & Design Principles](#architecture--design-principles)
5. [Project Structure](#project-structure)
6. [Installation & Setup](#installation--setup)
7. [Environment Variables](#environment-variables)
8. [Database Seeding & Test Credentials](#database-seeding--test-credentials)
9. [Running the Application](#running-the-application)
10. [Automated Testing](#automated-testing)
11. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
12. [Financial Accuracy & Billing Workflow](#financial-accuracy--billing-workflow)
13. [Transaction Management & ACID Safety](#transaction-management--acid-safety)
14. [Complete API Endpoint Reference](#complete-api-endpoint-reference)
15. [Sample Requests & Responses](#sample-requests--responses)
16. [Production Deployment Notes](#production-deployment-notes)

---

## Project Overview

In traditional point-of-sale systems, financial discrepancies, stock drift, and race conditions frequently compromise business operations. This backend resolves these challenges by enforcing:
- **Zero-Trust Frontend Financials**: Item pricing, tax rates, GST breakdowns, discounts, and order totals are calculated exclusively on the server from authoritative product records.
- **Strict Stock Ledgers**: Product stock is never changed silently. Every single stock movement (Purchase, Sale, Return, Adjustment, Damage) generates an immutable `StockTransaction` audit trail.
- **Transaction Safety**: Atomic MongoDB transactions guarantee that multi-document updates (Sale + Stock decrement + Customer credit + Payment creation + Audit log) either complete entirely or rollback on any error.
- **Clean ES Module Architecture**: Modular separation across Configuration, Models, Validators (Zod), Middlewares, Services (Business Logic), and thin Controllers.

---

## Key Features

- **Authentication & RBAC**: JWT Access & Refresh token rotation, bcrypt password hashing, account deactivation checks, and role enforcement (`ADMIN`, `MANAGER`, `CASHIER`).
- **Product & Category Management**: SKU and Barcode indexing, low-stock threshold alerting, soft deletion protecting historical invoices, and automatic barcode image generation (`bwip-js`).
- **Billing & POS Checkout**: High-precision monetary arithmetic (rounding to 2 decimals), instantaneous item snapshot retention, discount and GST computation, and partial/credit sales.
- **Customer Credit Management**: Real-time credit balance tracking, configurable credit limits, credit sale validation, and dedicated credit payment collection endpoints.
- **Supplier & Purchase Management**: Vendor catalog management, purchase order recording, automated stock replenishment, and accounts payable ledger.
- **Sales Returns**: Full and partial return processing, stock restoration, refund recording, and customer credit offsetting.
- **Invoices**:
  - Unique sequential invoice numbering (`INV-YYYY-XXXXXX`).
  - Professional A4 PDF generation via `PDFKit` with store details, GST breakdowns, and dynamic UPI QR code.
- **QR Codes & Barcodes**: Dynamic QR codes (`qrcode`) with UPI deep links (`upi://pay?pa=...`) and Code128 barcodes (`bwip-js`).
- **Real-Time Analytics & Dashboard**: Today's sales, gross profit, net profit, operational expenses, pending credit receivables, top-selling items, and 7-day sales charts via MongoDB aggregation pipelines.
- **Reports & Excel Exports**: Filterable reports for Sales, Purchases, P&L (Gross vs. Net Profit), GST / Tax breakup (CGST/SGST), and styled `.xlsx` file exports via `ExcelJS`.
- **System Audit Logging**: Non-repudiation tracking for logins, sales, returns, purchases, adjustments, and settings changes.

---

## Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **Node.js (v18+)** | High-performance JavaScript runtime |
| **Express.js (v4.21+)** | Web API application framework |
| **MongoDB & Mongoose (v8.13+)** | Document database with schema enforcement, indexes, and sessions |
| **ES Modules (`.mjs`)** | Clean native JavaScript module syntax |
| **JWT (`jsonwebtoken`)** | Stateless, tamper-proof user authentication |
| **bcryptjs** | Adaptive salted password hashing |
| **Zod** | Schema-first request body, query, and parameter validation |
| **PDFKit** | Vector-based PDF invoice document generation |
| **ExcelJS** | Spreadsheet workbook generation with styled tables and headers |
| **bwip-js** | Barcode generation (Code128, EAN13) |
| **QRCode** | QR code generation for UPI payment strings |
| **Helmet & CORS** | HTTP security headers and Cross-Origin Resource Sharing |
| **express-rate-limit** | IP-level DDoS and brute-force mitigation |
| **Nodemon** | Auto-reloading developer daemon |

---

## Architecture & Design Principles

```
                             React / Vite Frontend
                                      │
                                      ▼ HTTP REST (JSON)
                            Express Application
             ┌────────────────────────┼────────────────────────┐
             ▼                        ▼                        ▼
       Helmet / CORS             Rate Limiter            Body Parser
                                      │
                                      ▼
                            API Router (/api/v1/...)
                                      │
                                      ▼
                           Auth Middleware (JWT)
                                      │
                                      ▼
                            Role Middleware (RBAC)
                                      │
                                      ▼
                         Zod Validation Middleware
                                      │
                                      ▼
                            Thin Controllers
                         (HTTP mapping & status)
                                      │
                                      ▼
                          Comprehensive Services
                     (Domain Logic & Financial Rules)
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
              withTransaction()             External Generators
             (ACID Multi-Doc Tx)            (PDFKit, ExcelJS,
           - Sale / Stock / Ledger           QRCode, bwip-js)
                      │
                      ▼
               Mongoose Models
             (Indexes & Validation)
                      │
                      ▼
                   MongoDB
```

---

## Project Structure

```
shop-billing-backend/
├── src/
│   ├── config/
│   │   ├── db.mjs                    # Database connection & replica detection
│   │   └── env.mjs                   # Zod-validated environment config
│   ├── controllers/
│   │   ├── auth.controller.mjs       # Auth endpoints (login, register, me)
│   │   ├── user.controller.mjs       # Staff user management (Admin)
│   │   ├── product.controller.mjs    # Product catalog & barcodes
│   │   ├── category.controller.mjs   # Product category CRUD
│   │   ├── customer.controller.mjs   # Customer directory & credit history
│   │   ├── supplier.controller.mjs   # Supplier directory & trade history
│   │   ├── purchase.controller.mjs   # Vendor purchase orders
│   │   ├── sale.controller.mjs       # Billing checkout & returns
│   │   ├── payment.controller.mjs    # Credit collection & payments
│   │   ├── inventory.controller.mjs  # Stock levels & manual adjustments
│   │   ├── report.controller.mjs     # Analytics & Excel download handlers
│   │   ├── invoice.controller.mjs    # PDF invoice generation
│   │   ├── dashboard.controller.mjs  # Aggregated KPI metrics
│   │   ├── expense.controller.mjs    # Operational expenses
│   │   └── settings.controller.mjs   # Store metadata & tax settings
│   ├── models/
│   │   ├── User.mjs                  # Staff accounts & roles
│   │   ├── Product.mjs               # Inventory items with prices & stock
│   │   ├── Category.mjs              # Taxonomy categories
│   │   ├── Customer.mjs              # Customer ledger & credit limits
│   │   ├── Supplier.mjs              # Vendor ledger & balances
│   │   ├── Purchase.mjs              # Inbound purchase orders
│   │   ├── Sale.mjs                  # Outbound sales & snapshot items
│   │   ├── Payment.mjs               # Payment transactions
│   │   ├── StockTransaction.mjs      # Immutable inventory audit log
│   │   ├── Expense.mjs               # Store operating expenses
│   │   ├── AuditLog.mjs              # Security & operational audit trail
│   │   └── ShopSettings.mjs          # Store identity & invoice configuration
│   ├── routes/
│   │   ├── auth.routes.mjs
│   │   ├── user.routes.mjs
│   │   ├── product.routes.mjs
│   │   ├── category.routes.mjs
│   │   ├── customer.routes.mjs
│   │   ├── supplier.routes.mjs
│   │   ├── purchase.routes.mjs
│   │   ├── sale.routes.mjs
│   │   ├── payment.routes.mjs
│   │   ├── inventory.routes.mjs
│   │   ├── report.routes.mjs
│   │   ├── invoice.routes.mjs
│   │   ├── dashboard.routes.mjs
│   │   ├── expense.routes.mjs
│   │   └── settings.routes.mjs
│   ├── services/
│   │   ├── auth.service.mjs          # Token issuance & password hashing
│   │   ├── billing.service.mjs       # Billing engine & return processor
│   │   ├── inventory.service.mjs     # Stock movements & adjustment logic
│   │   ├── payment.service.mjs       # Credit receivables collection
│   │   ├── purchase.service.mjs      # Inbound procurement & stock receipt
│   │   ├── invoice.service.mjs       # PDF invoice assembler
│   │   ├── report.service.mjs        # Analytics aggregations & Excel builder
│   │   └── audit.service.mjs         # Audit log retriever
│   ├── middleware/
│   │   ├── auth.middleware.mjs       # JWT validation & user attachment
│   │   ├── role.middleware.mjs       # Role-based authorization
│   │   ├── validate.middleware.mjs   # Zod request validator
│   │   ├── error.middleware.mjs      # Central error formatter
│   │   ├── notFound.middleware.mjs   # 404 handler
│   │   └── audit.middleware.mjs      # Audit recording helper
│   ├── validators/
│   │   ├── auth.validator.mjs
│   │   ├── product.validator.mjs
│   │   ├── category.validator.mjs
│   │   ├── customer.validator.mjs
│   │   ├── supplier.validator.mjs
│   │   ├── purchase.validator.mjs
│   │   ├── sale.validator.mjs
│   │   ├── payment.validator.mjs
│   │   ├── inventory.validator.mjs
│   │   ├── expense.validator.mjs
│   │   └── settings.validator.mjs
│   ├── utils/
│   │   ├── ApiError.mjs              # Custom error class with HTTP status codes
│   │   ├── asyncHandler.mjs          # Async controller wrapper
│   │   ├── apiResponse.mjs           # Consistent response envelope
│   │   ├── calculations.mjs          # High-precision financial arithmetic
│   │   ├── constants.mjs             # Enums & constants
│   │   ├── generateBarcode.mjs       # bwip-js barcode image generator
│   │   ├── generateInvoiceNumber.mjs # Atomic sequential numbering
│   │   ├── generateQRCode.mjs        # UPI & verification QR codes
│   │   ├── pagination.mjs            # Pagination & sorting parser
│   │   └── transaction.mjs           # Universal transaction coordinator
│   ├── templates/
│   │   └── invoice.template.mjs      # Professional A4 PDF layout
│   ├── seed.mjs                      # Development seed script
│   ├── app.mjs                       # Express app configuration
│   └── server.mjs                    # Server startup & graceful shutdown
├── tests/
│   └── api.test.mjs                  # Comprehensive integration test suite
├── uploads/                          # Static assets and uploads
├── .env.example                      # Sample configuration
├── .gitignore
├── package.json
└── README.md
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (`node -v`)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster (`mongod --version`)
- **npm**: v9.0.0 or higher (`npm -v`)

### Steps
1. Clone the repository or navigate to the directory:
   ```bash
   cd BILZET_backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Verify MongoDB is running:
   ```bash
   mongosh --eval "db.runCommand({ ping: 1 })"
   ```

---

## Environment Variables

Create `.env` based on `.env.example`:

```env
NODE_ENV=development
PORT=5000

# MongoDB Connection String
MONGODB_URI=mongodb://127.0.0.1:27017/shop_billing

# Security Secrets (Must be at least 32 characters in production)
JWT_SECRET=super_secret_jwt_key_billing_system_secure_random_2026_dev
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=super_refresh_jwt_key_billing_system_secure_random_2026_dev
JWT_REFRESH_EXPIRES_IN=30d

# Frontend CORS Origin
FRONTEND_URL=http://localhost:5173

# Store Identity & Tax Settings
SHOP_NAME=Bilzet Retail Mart
SHOP_PHONE=+91 9876543210
SHOP_EMAIL=contact@bilzet.com
SHOP_ADDRESS=123 Commercial Plaza, Main Market
SHOP_GSTIN=29ABCDE1234F1Z5
SHOP_STATE=Karnataka
SHOP_STATE_CODE=29
```

---

## Database Seeding & Test Credentials

Populate the database with default staff roles, initial inventory, categories, customers, suppliers, and settings:

```bash
npm run seed
```

> [!WARNING]
> The seeded accounts are for **development and testing only**. Change default passwords before deploying to production.

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@shop.com` | `Admin@12345` | Full system access (Users, Settings, Deletions) |
| **MANAGER** | `manager@shop.com` | `Manager@12345` | Products, Stock, Purchasing, Sales, Returns, Reports |
| **CASHIER** | `cashier@shop.com` | `Cashier@12345` | Checkout, Customers, View Products, Print Invoices |

---

## Running the Application

### Development Mode (with Hot Reloading)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Health Check
Verify the server is running:
```bash
curl http://localhost:5000/api/v1/health
```
Expected output:
```json
{
  "success": true,
  "message": "API is running",
  "data": {
    "database": "connected",
    "timestamp": "2026-09-23T23:00:00.000Z",
    "uptime": 12.4
  }
}
```

---

## Automated Testing

The backend includes a comprehensive integration test suite running on Node's native test runner (`node:test`):

```bash
npm test
```

### Test Coverage Highlights
- Staff authentication & token issuance
- Role-based authorization & permission boundary tests
- Product CRUD, search, and barcode PNG rendering
- Vendor purchase order flow & stock increase
- Sales checkout & server-side financial calculations
- Insufficient stock rejection
- Credit limit enforcement & credit receivables collection
- Partial and full sale returns with stock restoration
- PDF invoice generation verification
- Excel report download verification
- Real-time dashboard KPI aggregations
- **Transaction rollback verification** (ensuring failed sales do not leave orphaned stock changes or customer credit)

---

## Role-Based Access Control (RBAC)

| Resource / Endpoint | ADMIN | MANAGER | CASHIER |
| :--- | :---: | :---: | :---: |
| **User Management** (`/users`) | Yes | No | No |
| **Shop Settings Update** (`/settings/shop`) | Yes | No | No |
| **Product Create / Edit / Delete** | Yes | Yes | No |
| **Product View / Search / Barcode** | Yes | Yes | Yes |
| **Category Management** | Yes | Yes | Read Only |
| **Customer Create / View** | Yes | Yes | Yes |
| **Customer Credit View / Payment** | Yes | Yes | Yes |
| **Supplier & Purchase Orders** | Yes | Yes | No |
| **Create Sales (Checkout)** | Yes | Yes | Yes |
| **Process Sale Return** | Yes | Yes | No |
| **Generate & Print PDF Invoices** | Yes | Yes | Yes |
| **Inventory Adjustments & History** | Yes | Yes | No |
| **Dashboard KPIs & Charts** | Yes | Yes | No |
| **Analytics Reports & Excel Export**| Yes | Yes | No |
| **Operating Expenses** | Yes | Yes | No |

---

## Financial Accuracy & Billing Workflow

### Step-by-Step Checkout Process
1. **Request Intake**: Frontend sends an array of `{ productId, quantity, discount? }`, customer identifier, and payment details.
2. **Server-Side Validation**:
   - Fetches product documents directly from MongoDB.
   - Validates that products are active and stock is sufficient.
3. **Price & Tax Calculations**:
   - Item Base Amount = `Quantity * UnitPrice`
   - Item Discounted Base = `Item Base Amount - Item Discount`
   - GST Amount = `(Item Discounted Base * Product GST Rate) / 100`
   - Item Total = `Item Discounted Base + GST Amount`
   - Subtotal = `Sum of Item Base Amounts`
   - Grand Total = `Subtotal - Total Discounts + Total GST`
4. **Credit Validation**:
   - If `Paid Amount < Grand Total`, remaining balance becomes `dueAmount`.
   - Requires a valid registered customer.
   - Rejects if `Customer Current Credit + Due Amount > Customer Credit Limit`.
5. **Item Snapshot Creation**: Complete snapshot (`name, sku, barcode, unitPrice, purchasePrice, gstRate, discount, tax, total`) is frozen in the sale document so that future price updates never alter historical bills.
6. **Atomic Execution**: Inside a transaction:
   - Sale document created with unique sequential invoice number.
   - Product stock decremented.
   - `StockTransaction` logged with type `SALE`.
   - `Payment` document created.
   - Customer credit balance incremented by `dueAmount`.
   - `AuditLog` entry recorded.

---

## Transaction Management & ACID Safety

Multi-document transactions are handled via the `withTransaction` utility (`src/utils/transaction.mjs`):
- **Replica Set Deployments (Production / MongoDB Atlas)**: Uses native `session.startTransaction()` with automatic rollback on error.
- **Standalone Development Deployments**: Intelligently executes sequential operations with consistent rollback guards when running in single-node dev environments without `--replSet`.

---

## Complete API Endpoint Reference

### Authentication (`/api/v1/auth`)
- `POST /register` - Register a staff account
- `POST /login` - Authenticate and obtain JWT access & refresh tokens
- `POST /refresh` - Refresh access token using refresh token
- `POST /logout` - Invalidate refresh token (Auth required)
- `GET  /me` - Get current user profile (Auth required)

### Users (`/api/v1/users`) [ADMIN]
- `GET    /` - List users with pagination and search
- `GET    /:id` - Get user details
- `PATCH  /:id` - Update user role, status, or details
- `DELETE /:id` - Soft deactivate user

### Products (`/api/v1/products`)
- `GET    /` - List products with pagination, search, category & price filters
- `GET    /low-stock` - Get products where stock <= minimumStock
- `GET    /barcode/:barcode` - Quick lookup by barcode string
- `GET    /:id` - Get product details
- `GET    /:id/barcode` - Download/render PNG barcode image
- `POST   /` - Create new product (ADMIN, MANAGER)
- `PATCH  /:id` - Update product details (ADMIN, MANAGER)
- `DELETE /:id` - Soft delete if historical sales exist, else delete (ADMIN, MANAGER)

### Categories (`/api/v1/categories`)
- `GET    /` - List categories
- `GET    /:id` - Get category by ID
- `POST   /` - Create category (ADMIN, MANAGER)
- `PATCH  /:id` - Update category (ADMIN, MANAGER)
- `DELETE /:id` - Delete category (ADMIN, MANAGER)

### Customers (`/api/v1/customers`)
- `GET    /` - List customers with search by name or phone
- `GET    /:id` - Get customer profile
- `POST   /` - Register new customer
- `PATCH  /:id` - Update customer details and credit limit
- `GET    /:id/purchases` - Customer purchase invoice history
- `GET    /:id/payments` - Customer payment collection history
- `GET    /:id/credit` - Customer current credit and available limit

### Suppliers (`/api/v1/suppliers`) [ADMIN, MANAGER]
- `GET    /` - List suppliers
- `GET    /:id` - Get supplier details
- `POST   /` - Create supplier
- `PATCH  /:id` - Update supplier
- `GET    /:id/purchases` - Supplier purchase order history
- `GET    /:id/payments` - Supplier payment history

### Purchases (`/api/v1/purchases`) [ADMIN, MANAGER]
- `GET    /` - List purchase orders
- `GET    /:id` - Get purchase details
- `POST   /` - Create purchase order (increases stock, creates stock tx, updates balance)

### Sales & Billing (`/api/v1/sales`)
- `POST   /` - Checkout and create sale invoice
- `GET    /` - List sales invoices with date range, customer, and status filters
- `GET    /:id` - Get detailed invoice snapshot
- `POST   /:id/return` - Process partial or full return (ADMIN, MANAGER)

### Payments (`/api/v1/payments`)
- `GET    /` - List all payment transactions
- `POST   /` - Collect customer credit payment
- `POST   /supplier` - Record payment to vendor (ADMIN, MANAGER)

### Inventory (`/api/v1/inventory`) [ADMIN, MANAGER]
- `GET    /` - Inventory stock overview
- `GET    /low-stock` - Low stock alerts
- `GET    /history` - Global stock transaction audit history
- `GET    /:productId/history` - Stock ledger for specific product
- `POST   /adjust` - Manual stock adjustment (DAMAGE, ADJUSTMENT) with mandatory reason

### Invoices (`/api/v1/invoices`)
- `GET    /:saleId/pdf` - Stream professional A4 PDF invoice

### Dashboard (`/api/v1/dashboard`) [ADMIN, MANAGER]
- `GET    /` - Real-time stats, revenue, profit, low stock alerts, top sellers, 7-day chart

### Reports & Exports (`/api/v1/reports`) [ADMIN, MANAGER]
- `GET    /sales` - Sales volume, tax, discounts, collection summary
- `GET    /purchases` - Purchase procurement summary
- `GET    /profit` - Gross Profit, Operating Expenses, Net Profit & Margins
- `GET    /gst` - Taxable values, CGST, SGST, IGST breakdown by rate
- `GET    /inventory` - Inventory valuation at cost vs. selling price
- `GET    /payments` - Payments collection by method
- `GET    /sales/export` - Download Sales Report Excel (.xlsx)
- `GET    /products/export` - Download Product Catalog Excel (.xlsx)
- `GET    /inventory/export` - Download Inventory Valuation Excel (.xlsx)
- `GET    /customers/export` - Download Customer Directory Excel (.xlsx)

### Expenses (`/api/v1/expenses`) [ADMIN, MANAGER]
- `GET    /` - List operating expenses
- `POST   /` - Record expense (rent, electricity, salary, etc.)
- `GET    /:id` - Get expense by ID
- `PATCH  /:id` - Update expense
- `DELETE /:id` - Delete expense (ADMIN only)

### Settings (`/api/v1/settings`)
- `GET    /shop` - Get store metadata & invoice settings
- `PATCH  /shop` - Update store metadata (ADMIN only)

---

## Sample Requests & Responses

### 1. Checkout a Sale (`POST /api/v1/sales`)

#### Request:
```bash
POST /api/v1/sales
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "customerId": "651234567890abcdef123456",
  "items": [
    {
      "productId": "651234567890abcdef123477",
      "quantity": 2,
      "discount": 0
    }
  ],
  "discount": 50,
  "paymentMethod": "cash",
  "paidAmount": 500,
  "notes": "Express checkout"
}
```

#### Response:
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "sale": {
      "invoiceNumber": "INV-2026-000001",
      "customer": "651234567890abcdef123456",
      "items": [
        {
          "productId": "651234567890abcdef123477",
          "name": "Basmati Rice Premium 5kg",
          "sku": "RICE-BAS-5KG",
          "barcode": "890123456001",
          "quantity": 2,
          "unitPrice": 550,
          "purchasePrice": 420,
          "gstRate": 5,
          "discount": 0,
          "tax": 55,
          "total": 1155,
          "returnedQuantity": 0
        }
      ],
      "subtotal": 1100,
      "discount": 50,
      "tax": 55,
      "grandTotal": 1105,
      "paidAmount": 500,
      "dueAmount": 605,
      "paymentMethod": "cash",
      "paymentStatus": "PARTIAL",
      "status": "COMPLETED"
    }
  }
}
```

---

## Production Deployment Notes

1. **MongoDB Replica Set**:
   Ensure MongoDB runs with replication enabled (`--replSet`) in production or use MongoDB Atlas. This unlocks full multi-document ACID transactions with automatic rollback.
2. **Secrets & Keys**:
   Generate cryptographically secure 64-character hex strings for `JWT_SECRET` and `JWT_REFRESH_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **Environment Mode**:
   Set `NODE_ENV=production`. In production mode:
   - Internal stack traces are suppressed from error responses.
   - Rate limiting is actively enforced (1000 requests / 15 minutes per IP).
4. **Process Management**:
   Deploy using a process manager like **PM2**:
   ```bash
   pm2 start src/server.mjs --name "bilzet-backend" -i max
   ```
5. **Reverse Proxy & SSL**:
   Run Express behind **Nginx** or **Caddy** with SSL/TLS certificates configured (e.g. Let's Encrypt).