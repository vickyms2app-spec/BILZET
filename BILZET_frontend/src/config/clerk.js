/**
 * Centralized Clerk Configuration for Vite + React
 * Reads the publishable key exclusively from the VITE_CLERK_PUBLISHABLE_KEY
 * environment variable.
 *
 * In production: Requires a valid pk_live_... key configured in Vercel.
 * In development: Accepts pk_test_... from .env (with local fallback).
 */

const rawKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  (typeof window !== "undefined" && window.__ENV__?.VITE_CLERK_PUBLISHABLE_KEY) ||
  "";

// Sanitize key (strip accidental surrounding quotes or whitespace from copy-paste in Vercel UI)
const sanitizedKey = String(rawKey || "").trim().replace(/^["']|["']$/g, "");

// Determine environment
const isProd = Boolean(import.meta.env.PROD);
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.endsWith(".local"));

// Default fallback for local development only
const DEV_FALLBACK_KEY = "pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ";

// Key resolution: use sanitized key, or dev fallback only in local development
export const CLERK_PUBLISHABLE_KEY =
  sanitizedKey || (!isProd && isLocalhost ? DEV_FALLBACK_KEY : "");

export const isProductionKey = Boolean(
  CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith("pk_live_")
);

export const isDevelopmentKey = Boolean(
  CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith("pk_test_")
);

export const isKeyValid = Boolean(
  CLERK_PUBLISHABLE_KEY &&
    (isProductionKey || isDevelopmentKey) &&
    CLERK_PUBLISHABLE_KEY.length >= 32
);

// hasClerk is true when a valid key is configured
export const hasClerk = Boolean(isKeyValid);

export default {
  CLERK_PUBLISHABLE_KEY,
  hasClerk,
  isKeyValid,
  isProductionKey,
  isDevelopmentKey,
};
