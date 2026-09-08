# BILZET V10.4 — New Launch

1. Create a fresh GitHub repository or upload these extracted files to the repository root. Do not upload the outer ZIP folder as Vercel Root Directory.
2. In Supabase SQL Editor, run `database/schema.sql`.
3. In Supabase Authentication → Email provider, turn **Confirm email OFF** if you want registration to enter BILZET immediately.
4. In Vercel add: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.
5. Vercel Root Directory: repository root / blank. Deploy.
6. Test in an Incognito window: open `/` → Login/Register must be visible. Register/login → dashboard. Refresh → Login screen again. `/admin` must open only the admin portal.

V10.4 does not restore browser auth sessions automatically. This is intentional to eliminate stale/demo auto-login.
