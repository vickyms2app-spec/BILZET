/**
 * Centralized Role-Based Workspace Routing Utility
 * Maps verified user roles to their authorized destination workspace.
 */
export function getWorkspaceRedirectPath(user) {
  if (!user) return "/sign-in";

  if (user.onboarding?.destination) {
    return user.onboarding.destination;
  }

  const role = String(user.role || "").toUpperCase();

  // Users without an active business role must go to onboarding
  if (role === "NONE" || role === "UNASSIGNED") {
    return "/onboarding";
  }

  // If user is not super admin and has no businessId and no active business memberships, forward to onboarding
  const isSuperAdmin = role === "SUPER_ADMIN" || Boolean(user.isSuperAdmin) || user.email === "vickyms2app@gmail.com";
  if (!isSuperAdmin && !user.businessId && !user.isOwner && (!user.businessMemberships || user.businessMemberships.length === 0)) {
    return "/onboarding";
  }

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
      return "/dashboard";
    case "ADMIN":
    case "SUPER_ADMIN":
    case "OWNER":
      return "/dashboard";
    default:
      return "/onboarding";
  }
}

export default getWorkspaceRedirectPath;
