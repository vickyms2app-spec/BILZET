# ⚡ BILZET — Single Vercel Deployment Plan (Full-Stack Monorepo)

Deploy your **entire application** (React Vite Frontend + Node.js Express Backend API + NeonDB PostgreSQL) **in a single Vercel project** on a unified domain with zero external server dependencies (no Render, no Railway).

---

## 🌟 Why This Single Vercel Setup is Superior

1. **Same-Origin (No CORS Issues)**: Both the React Frontend and Express Backend run on the exact same domain (`https://your-bilzet.vercel.app`). API requests go directly to `/api/v1/...` without needing CORS preflight checks.
2. **Zero Inactivity Sleep**: Unlike Render free tier which sleeps after 15 minutes of inactivity, Vercel Serverless wakes instantly on demand.
3. **1-Click Deployment**: Single GitHub repository import on Vercel builds both the frontend static assets and serverless API endpoints together.
4. **100% Free**: Operates fully within Vercel's generous free tier and NeonDB's free serverless PostgreSQL.

---

## 🏗️ Architecture Under the Hood

```
your-bilzet.vercel.app
│
├── /api/*               ──▶  Vercel Serverless Function (api/index.mjs ➜ Express App)
│                              └── NeonDB PostgreSQL (via Prisma Client)
│
├── /assets/*            ──▶  Vercel Global Edge CDN (Vite static assets, 1yr cache)
│
└── /* (all UI routes)   ──▶  Vite React SPA (index.html / React Router)
```

---

## 📁 Pre-Configured Files (Ready in Codebase)

1. ✅ **`api/index.mjs`**: Entry point that wraps the Express application as a Vercel Serverless Function.
2. ✅ **`vercel.json`**: Root configuration orchestrating:
   - Routing `/api/(.*)` to `/api/index.mjs`.
   - Routing all page routes to `/index.html`.
3. ✅ **Root `package.json`**: Root build scripts and serverless dependencies.
4. ✅ **`BILZET_frontend/src/api/http.js`**: Automatically uses relative `/api/v1` in production with zero configuration.
5. ✅ **`BILZET_backend/prisma/schema.prisma`**: Configured with `binaryTargets = ["native", "rhel-openssl-3.0.x"]` for Vercel's AWS Lambda runtime.
6. ✅ **`BILZET_backend/src/config/prisma.mjs`**: Prisma client singleton with `globalThis` caching to prevent serverless connection exhaustion.

---

## 🚀 Step-by-Step Vercel Deployment (Only 3 Minutes)

### Step 1: Commit and Push Your Code to GitHub
```bash
git add .
git commit -m "feat: configure all-in-one single vercel fullstack deployment"
git push origin main
```

---

### Step 2: Import Project in Vercel
1. Log in to [vercel.com](https://vercel.com) using your GitHub account.
2. Click **"Add New..."** → **"Project"**.
3. Locate your repository (`BILZET-main`) and click **"Import"**.

---

### Step 3: Configure Project Settings on Vercel
In the Vercel project configuration screen:

* **Framework Preset**: Select **"Other"** (or keep default).
* **Root Directory**: Leave it as **`./`** (the repository root).
* **Build Command**: Keep default (`npm run build`).
* **Output Directory**: Keep default (`BILZET_frontend/dist`).

---

### Step 4: Add Environment Variables in Vercel
Expand the **"Environment Variables"** tab and add the following keys from your `.env`:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...` | Your NeonDB PostgreSQL connection string |
| `JWT_SECRET` | `bilzet_super_secure_jwt_secret_key_32chars!` | Secret for authentication tokens (32+ chars) |
| `JWT_REFRESH_SECRET` | `bilzet_super_secure_refresh_secret_key_32chars!` | Secret for refresh tokens (32+ chars) |
| `NODE_ENV` | `production` | Production environment flag |

*(Note: `VITE_API_URL` is optional because the frontend automatically defaults to `/api/v1` on the same domain in production!)*

---

### Step 5: Click "Deploy" 🎉
1. Click **"Deploy"**.
2. Vercel will:
   - Install dependencies.
   - Run `npx prisma generate` for your NeonDB PostgreSQL database.
   - Build the optimized Vite React frontend into `BILZET_frontend/dist`.
   - Bundle the Express backend into `api/index.mjs`.
3. Within ~60 seconds, your site will be live at `https://your-bilzet-name.vercel.app`!

---

## 🔍 How to Test Your Live Deployment
Once deployed:
1. **Health Check**: Open `https://your-project.vercel.app/api/v1/health`
   - You should see: `{"success": true, "message": "BILZET API is running with NeonDB PostgreSQL"}`
2. **Login / Dashboard**: Open `https://your-project.vercel.app/login`
   - Sign in with your admin credentials.
3. **POS & Invoices**: Create an invoice or add a customer — the API and database will process your transaction instantaneously!
