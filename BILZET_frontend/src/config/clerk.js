/**
 * Centralized Clerk Configuration for Vite + React
 * Reads and validates the publishable key exclusively from:
 * import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
 *
 * Rules:
 * - Production: Requires a valid live publishable key starting with 'pk_live_' (>= 32 chars).
 *   Development keys ('pk_test_') are strictly forbidden in Production.
 * - Development: Accepts valid 'pk_test_' or 'pk_live_' keys (>= 32 chars).
 * - No hardcoded fallback keys. If the environment variable is missing or invalid,
 *   hasClerk is false and safe diagnostics report the exact reason without leaking secrets.
 */

// 1. Read raw environment variable
const rawKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  (typeof window !== "undefined" && window.__ENV__?.VITE_CLERK_PUBLISHABLE_KEY) ||
  "";

// 2. Sanitize key (strip accidental surrounding quotes and whitespace from copy-paste)
const sanitizedKey = String(rawKey || "").trim().replace(/^["']|["']$/g, "");

// 3. Environment detection
export const isProduction = Boolean(import.meta.env.PROD);
export const isDevelopment = !isProduction;
export const appMode = String(import.meta.env.MODE || (isProduction ? "production" : "development"));

// 4. Key format checks
export const isProductionKey = Boolean(sanitizedKey && sanitizedKey.startsWith("pk_live_"));
export const isDevelopmentKey = Boolean(sanitizedKey && sanitizedKey.startsWith("pk_test_"));
export const hasMinimumLength = Boolean(sanitizedKey && sanitizedKey.length >= 32);

// 5. Strict Environment-Aware Validation
// In Production: strictly requires pk_live_ and length >= 32.
// In Development: accepts pk_test_ or pk_live_ and length >= 32.
export const isKeyValid = Boolean(
  sanitizedKey &&
    hasMinimumLength &&
    (isProduction ? isProductionKey : (isProductionKey || isDevelopmentKey))
);

// 6. Resolved Key & Status
export const CLERK_PUBLISHABLE_KEY = isKeyValid ? sanitizedKey : "";
export const hasClerk = Boolean(isKeyValid && CLERK_PUBLISHABLE_KEY);

// 7. Safe Diagnostics (Never exposes full key or backend secret)
const determineErrorReason = () => {
  if (isKeyValid) return null;
  if (!sanitizedKey) return "Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables.";
  if (!hasMinimumLength) return `Publishable key is too short (${sanitizedKey.length} chars, minimum 32 required).`;
  if (isProduction && isDevelopmentKey) {
    return "Development key (pk_test_...) cannot be used in Production. Please configure a live key (pk_live_...) in Vercel.";
  }
  if (!isProductionKey && !isDevelopmentKey) {
    return "Invalid key prefix. Key must begin with 'pk_live_' (production) or 'pk_test_' (development).";
  }
  return "Invalid Clerk Publishable Key.";
};

export const clerkDiagnostics = Object.freeze({
  environment: isProduction ? "production" : "development",
  mode: appMode,
  hasKey: Boolean(sanitizedKey),
  keyPrefix: sanitizedKey.startsWith("pk_live_")
    ? "pk_live_"
    : sanitizedKey.startsWith("pk_test_")
    ? "pk_test_"
    : sanitizedKey
    ? "invalid_prefix"
    : "none",
  keyLength: sanitizedKey.length,
  isProductionKey,
  isDevelopmentKey,
  isKeyValid,
  hasClerk,
  errorReason: determineErrorReason(),
});

export default {
  CLERK_PUBLISHABLE_KEY,
  hasClerk,
  isKeyValid,
  isProductionKey,
  isDevelopmentKey,
  isProduction,
  isDevelopment,
  clerkDiagnostics,
};
