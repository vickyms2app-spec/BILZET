/**
 * Centralized Clerk Configuration
 * Ensures a reliable publishable key is always present across local development,
 * CI/CD environments, and production deployments.
 */
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_dW5pdGVkLWJlZGJ1Zy03NTkzLmNsZXJrLmFjY291bnRzLmRldiQ";

export const hasClerk = Boolean(CLERK_PUBLISHABLE_KEY);
