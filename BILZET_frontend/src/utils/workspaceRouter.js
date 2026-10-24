/**
 * Centralized Role-Based Workspace Routing Utility
 * Maps verified user roles to their authorized destination workspace.
 */
export function getWorkspaceRedirectPath(user) {
  if (!user) return "/sign-in";

  if (user.onboarding?.destination && user.onboarding.destination !== "/onboarding") {
    return user.onboarding.destination;
  }

  const role = String(user.role || "").toUpperCase();

  switch (role) {
    case "CA":
    case "ACCOUNTANT":
      return "/ca-portal";
    case "CASHIER":
      return "/billing";
    case "STAFF":
    case "SALES_STAFF":
    case "INVENTORY_STAFF":
    case "PURCHASE_STAFF":
    case "SALES_EXECUTIVE":
    case "WAREHOUSE_STAFF":
      return "/staff-dashboard";
    case "MANAGER":
    case "ADMIN":
    case "SUPER_ADMIN":
    case "OWNER":
    default:
      return "/dashboard";
  }
}

export default getWorkspaceRedirectPath;
