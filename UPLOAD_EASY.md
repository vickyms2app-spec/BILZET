# BILZET V10.4 — Easiest New Launch

1. Extract the upload ZIP.
2. Create a fresh GitHub repository (or use any static/Vercel source repository).
3. Copy **all extracted contents** into the repository root in one action.
4. Confirm the root contains `index.html`, `admin.html`, `vercel.json`, `sw.js`, `assets/`, `api/`, `lib/`, and `database/`.
5. Run `database/schema.sql` in Supabase SQL Editor.
6. Add the required environment variables in Vercel.
7. Keep Vercel Root Directory blank / repository root and deploy.

Do not create an `admin/` folder. `/admin` is rewritten to `/admin.html` by `vercel.json`.

For instant Register → Dashboard behavior, turn **Confirm email OFF** in Supabase Authentication → Email provider.
