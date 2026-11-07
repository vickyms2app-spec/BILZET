/**
 * BILZET Centralized Clerk Configuration
 * React + Vite
 */

const isProd = import.meta.env.PROD;

const rawKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

const sanitizedKey = String(rawKey)
  .trim()
  .replace(/^["']|["']$/g, "")
  .trim();

export const isProductionKey =
  sanitizedKey.startsWith("pk_live_");

export const isDevelopmentKey =
  sanitizedKey.startsWith("pk_test_");

export const isKeyValid =
  sanitizedKey.length >= 32 &&
  (isProductionKey || isDevelopmentKey);

export const hasClerk =
  isKeyValid &&
  (!isProd || isProductionKey);

export const CLERK_PUBLISHABLE_KEY =
  hasClerk ? sanitizedKey : "";

export const clerkDiagnostics = {
  environment: isProd ? "production" : "development",
  keyExists: Boolean(sanitizedKey),
  keyPrefix: sanitizedKey
    ? sanitizedKey.substring(0, 7)
    : "none",
  keyLength: sanitizedKey.length,
  isProductionKey,
  isDevelopmentKey,
  isKeyValid,
  hasClerk,
};

if (import.meta.env.DEV) {
  console.info("[BILZET Clerk Diagnostics]", {
    environment: clerkDiagnostics.environment,
    keyExists: clerkDiagnostics.keyExists,
    keyPrefix: clerkDiagnostics.keyPrefix,
    keyLength: clerkDiagnostics.keyLength,
    isKeyValid: clerkDiagnostics.isKeyValid,
    hasClerk: clerkDiagnostics.hasClerk,
  });
}

export default {
  CLERK_PUBLISHABLE_KEY,
  hasClerk,
  isKeyValid,
  isProductionKey,
  isDevelopmentKey,
  clerkDiagnostics,
};
