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

const isLocalhost =
  typeof window !== "undefined" &&
  Boolean(window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1" || window.location?.hostname === "");

// Validate Clerk publishable key structure: non-empty, matching expected prefix and containing payload
export const isKeyValid =
  Boolean(sanitizedKey) &&
  (isProductionKey || isDevelopmentKey) &&
  sanitizedKey.slice(8).trim().length > 0;

export const hasClerk =
  isKeyValid &&
  (!isProd || isProductionKey || isLocalhost);

export const CLERK_PUBLISHABLE_KEY =
  hasClerk ? sanitizedKey : "";

export const CLERK_SIGN_IN_URL =
  import.meta.env.VITE_CLERK_SIGN_IN_URL || "/sign-in";

export const CLERK_SIGN_UP_URL =
  import.meta.env.VITE_CLERK_SIGN_UP_URL || "/sign-up";

export const CLERK_SIGN_IN_FALLBACK_REDIRECT_URL =
  import.meta.env.VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || "/dashboard";

export const CLERK_SIGN_UP_FALLBACK_REDIRECT_URL =
  import.meta.env.VITE_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || "/dashboard";

export const CLERK_SIGN_IN_FORCE_REDIRECT_URL =
  import.meta.env.VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL || "/dashboard";

export const CLERK_SIGN_UP_FORCE_REDIRECT_URL =
  import.meta.env.VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL || "/dashboard";

export const clerkDiagnostics = {
  environment: isProd ? (isLocalhost ? "development" : "production") : "development",
  keyExists: Boolean(sanitizedKey),
  keyPrefix: isProductionKey
    ? "pk_live_"
    : isDevelopmentKey
    ? "pk_test_"
    : sanitizedKey
    ? sanitizedKey.substring(0, 8)
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
