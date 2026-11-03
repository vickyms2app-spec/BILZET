/**
 * Centralized Role-Based Workspace Routing Utility
 * Maps verified user roles to their authorized destination workspace.
 *
 * Routing Rules:
 * - Owner / Admin / Super Admin → Owner Dashboard (/dashboard)
 * - Manager → Manager Dashboard (/dashboard)
 * - Cashier → Cashier Dashboard & POS (/billing)
 * - Staff (all staff roles) → Staff Workspace (/staff-dashboard)
 * - CA / Accountant → CA Portal (/ca-portal)
 * - Unassigned / Pending Invitation → Team Onboarding (/join-team)
 */
export function getWorkspaceRedirectPath(user) {
  if (!user) return "/sign-in";

  const role = String(user.role || "").toUpperCase();

  // 1. Users with no role or no business yet → send to team invitation redemption
  if (
    role === "NONE" ||
    role === "UNASSIGNED" ||
    role === "" ||
    (!user.businessId && !user.isOwner && !user.isSuperAdmin && role !== "CA" && role !== "ACCOUNTANT")
  ) {
    return "/join-team";
  }

  // 2. Strict Role-to-Workspace Mapping (never send unauthorized roles to /dashboard)
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
      return "/dashboard";

    default: {
      // 3. Dynamic / Custom Roles created in backend
      if (
        user.onboarding?.destination &&
        user.onboarding.destination !== "/onboarding" &&
        user.onboarding.destination !== "/dashboard"
      ) {
        return user.onboarding.destination;
      }

      // Check granular permissions for custom roles
      const perms = user.effectivePermissions || {};
      if (perms["billing.create"] || perms["billing.view"]) {
        return "/billing";
      }
      if (perms["reports.view"] || perms["settings.view"]) {
        return "/dashboard";
      }
      return "/staff-dashboard";
    }
  }
}

export default getWorkspaceRedirectPath;
