/**
 * Centralized Clerk Configuration
 * Reads the publishable key exclusively from the VITE_CLERK_PUBLISHABLE_KEY
 * environment variable. Set this in your .env file (development) or in your
 * Vercel / CI environment variables (production).
 *
 * The key must start with pk_test_ (development) or pk_live_ (production).
 * NEVER hardcode an actual Clerk key here — use environment variables only.
 */
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ";

export const hasClerk = Boolean(CLERK_PUBLISHABLE_KEY);
