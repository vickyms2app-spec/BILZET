# BILZET V10.4 — Final Login Fix

Production-ready BILZET web application with normal business billing, dedicated pharmacy workspace, admin portal, bill quotas, subscriptions, GST-ready drafts and offline billing queue.

## Authentication rule

V10.4 intentionally requires Login/Register every time the page is opened or refreshed. Supabase browser sessions are kept in memory only (`persistSession:false`). Old BILZET auth tokens and old offline-verified login markers are cleared at startup. This prevents demo/old/stale sessions from opening the dashboard automatically.

After a successful login, if the internet drops while the page stays open, billing can continue locally and supported records queue for sync. If the page is refreshed while offline, internet is required to login again.

## Production routes

- `/` — user Login/Register and application
- `/admin` — separate admin portal

## Required Vercel environment variables

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Never expose service-role/admin secrets in frontend files.

## Supabase setup

Run `database/schema.sql` in the Supabase SQL Editor. For Register → immediate dashboard behavior, turn **Confirm email OFF** under Supabase Authentication → Email provider. If Confirm email is ON, registration succeeds but the user must confirm email before login.
