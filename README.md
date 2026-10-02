# BILZET — Next-Gen Shop Billing, POS & GST Suite

A state-of-the-art, creative, and illustrative Billing, POS, Inventory, and GST Compliance Web Application for modern retail and wholesale businesses.

Built with **React 18**, **Vite**, **Tailwind CSS v4**, **Framer Motion**, and **Lucide Icons**, integrated with a production-ready **Node.js + Express + MongoDB** backend.

---

## 🌟 Key Features & New Updates

### 🚀 Streamlined Navigation Architecture & Dedicated Operations
- **Single Page Responsibility**: Every module has one clear navigation destination and zero duplicate cross-navigation buttons.
- **Dedicated Stock Transfers (`/warehouses/transfer`)**: Full multi-warehouse transfer operations with live history and transfer dialogs.
- **Godowns & Warehouses (`/warehouses`)**: Dedicated warehouse & physical location management with instant stock lookup.
- **Clerk Authentication**: Seamless, official social and email authentication with session protection.

### 1. 📊 Creative & Illustrative Dashboard (`/dashboard`)
- **4 Top KPI Cards**: Net Sales, Amount Collected, Outstanding Customer Dues, and Net GST/Tax with glowing gradient orbs and colored accent top lines.
- **GST Readiness Tracker**: Live **100/100** compliance score with instant access to the GST review center.
- **Quick Action Bar**: 1-click access to *Create Bill*, *Inventory*, *Invoice Design*, and *Collections*.
- **Recent Documents**: Live document stream with instant empty-state guidance.
- **System Status Badge**: Real-time network and pending transaction synchronization indicator.

### 2. 🧾 Fast 3-Step Billing & Live Invoice Studio (`/billing`)
- **Step 1 — Customer Profile**: Customer search/auto-fill, 10-digit mobile validation, sale types (B2C, B2B, SEZ), and collapsible GST & address details with Tamil Nadu default preset.
- **Step 2 — Dynamic Items & Stock**: Inventory selector, instant quantity & price calculations, custom line item additions, and real-time inventory count.
- **Step 3 — Express Payment**: 1-click quick settlement buttons:
  - `✓ Cash Paid`
  - `✓ UPI Paid`
  - `↗ Request UPI`
  - `🕒 Pay Later / Credit`
- **Side-by-Side Live Tax Invoice Preview**:
  - Branded header with logo placeholder
  - Bill To & Document details (Date, Sale Type, Place of Supply)
  - Dynamic itemized breakdown (HSN/SAC, Qty, Rate, GST %, Total)
  - Real-time tax breakdown (Subtotal, IGST/CGST/SGST, Grand Total, Received, Balance Due)
  - Custom business terms & print/save actions.

### 3. 📦 Stock & Inventory Control (`/inventory`)
- **Summary Metrics**: Total unit count, low-stock alerts, and automated warehouse valuation.
- **Visual Stock Bars**: Real-time color-coded stock level meters (Green = healthy, Red = low stock threshold alert).
- **Category Tabs**: Filter by *Grains*, *Dairy*, *Cooking Oils*, *Beverages*, *Snacks*, and more.
- **Interactive Stock Adjustment Modal**: Rapidly increment stock deliveries or deduct damaged items without manual database edits.

### 4. 👥 Customer Ledger & Directory (`/customers`)
- **Customer Cards & Ledger**: Complete profiles with phone, email, and order counts.
- **Balance Tracking**: Outstanding debt vs. settled status pills.
- **Add Customer Modal**: Create new customer profiles on the fly with custom credit limits.

### 5. 📑 Invoices & Bill Management (`/invoices`)
- Complete historical invoice register with payment status tags (`COMPLETED`, `PENDING`).
- Search by customer name, mobile, or invoice number.
- Instant invoice reprint and inspection.

### 6. 🏛️ GST & Compliance Center (`/gst`)
- **GSTR-1 Draft Pack**: B2B, B2C, and credit notes formatted for portal upload.
- **GSTR-3B Summary**: Net outward tax payable and ITC summaries.
- **HSN / SAC Summary**: HSN-wise rate brackets and tax breakdowns.

### 7. 🤝 CA Connect (`/ca-connect`)
- Direct collaboration hub for Chartered Accountants and tax consultants.
- Instant invitation workflow to grant read-only export permissions.

### 8. 🎁 Refer & Earn (`/referral`)
- Personalized merchant referral code generator (`BZW9O7GO`).
- 1-click copy functionality and subscription reward tracking.

### 9. 💳 Plans & Payments (`/plans`)
- **Free Tier (`₹0/yr`)**: 100 included bills, A4/A5 print, 3 invoice templates, GST preview.
- **Pro Tier (`₹1,499/yr`)**: Unlimited bills, 8 templates, 10 color themes, thermal 80mm printing, watermark removed, UPI QR, WhatsApp PDF share, GSTR-1 draft pack, and CA Connect.
- **Premium Tier (`₹2,999/yr`)**: Unlimited bills, all premium templates, thermal 58mm, debit/credit notes, advanced GST classifications, and partner controls.

### 10. ⚙️ Invoice & Store Customizer (`/settings`)
- Custom shop name, contact information, and address.
- GSTIN and default state tax codes.
- Print format selector: **A4 Standard**, **A5 Compact**, and **80mm Thermal (POS)**.
- Custom terms and footer disclaimer settings.

### 11. 🛡️ Built-in Offline & Guest Demo Mode
- **Zero Network Errors**: Seamless fallback to realistic demo data whenever the backend or MongoDB is offline.
- **Skip Login**: Instant guest access (`role: GUEST`) to test and evaluate the entire UI without database setup.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Core** | React 18, Vite |
| **Styling & Design** | Tailwind CSS v4, Custom CSS Design Tokens, Glassmorphism |
| **Icons & Visuals** | Lucide React, CSS Orbs & Gradients |
| **Charts & Graphs** | Recharts (Area charts, bar charts, trend lines) |
| **State & HTTP** | Zustand, Axios (with automatic demo fallback interceptor) |
| **Routing** | React Router v6 |
| **Backend (Optional)** | Node.js, Express, MongoDB (Mongoose), JWT Auth |

---

## 🚀 Getting Started

### 1. Run the Frontend (UI Demo Mode)
The frontend runs standalone with full mock data even without starting the backend:

```bash
cd BILZET_frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:5173`**.
Click **"Skip Login"** to enter the dashboard immediately!

---

### 2. Run the Full Stack Backend (Optional)
If you want to connect live database records with MongoDB:

1. Ensure **MongoDB** is running locally on port `27017`.
2. Configure environment:
   ```bash
   cd BILZET_backend
   copy .env.example .env
   ```
3. Start backend:
   ```bash
   npm install
   npm run dev
   ```
4. Backend API will listen on `http://localhost:5000/api/v1`.

---

## 📁 Project Structure

```
BILZET/
├── BILZET_frontend/
│   ├── src/
│   │   ├── api/             # Axios client, endpoints, and mockData fallback
│   │   ├── components/      # Layout (sidebar, header, footer) and UI atoms
│   │   ├── pages/           # All application views:
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Billing.jsx
│   │   │   ├── Invoices.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Gst.jsx
│   │   │   ├── CaConnect.jsx
│   │   │   ├── Referral.jsx
│   │   │   ├── Plans.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Support.jsx
│   │   │   └── Login.jsx
│   │   ├── routes/          # AppRoutes.jsx route definitions
│   │   ├── store/           # Zustand auth store
│   │   └── index.css        # Tailwind v4 theme and styling rules
│   └── package.json
└── BILZET_backend/
    ├── src/                 # Express controllers, models, routes, and services
    └── package.json
```

---

## 📜 License
Copyright © 2026 Garden Greens Private Limited. All rights reserved.
