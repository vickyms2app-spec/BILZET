import { useAuth } from "../store/auth";
import { isAdminEmail, isAdminUser, isSuperAdminUser } from "../utils/security";

/**
 * Hook to evaluate granular permissions for the current user.
 */
export function usePermissions() {
  const { user } = useAuth();

  const isSuperAdmin = isSuperAdminUser(user);
  const isOwner = Boolean(user?.isOwner) || user?.role === "ADMIN" || isSuperAdmin;

  /**
   * Evaluates if the current user possesses the given permission key.
   * @param {string} permissionKey e.g. "billing.create", "inventory.adjust"
   * @returns {boolean}
   */
  const hasPermission = (permissionKey) => {
    if (!user) return false;

    // Platform Super Admin and Business Owner always have unrestricted access
    if (isSuperAdmin || isOwner) {
      return true;
    }

    // Guest Mode: Allow standard retail cashier actions for evaluation
    if (user.role === "GUEST") {
      const guestPerms = [
        "billing.view",
        "billing.create",
        "billing.print",
        "inventory.view",
        "customers.view",
        "customers.create",
        "reports.view",
        "reports.sales",
      ];
      return guestPerms.includes(permissionKey);
    }

    // Check user's effective permissions map
    if (user.effectivePermissions && typeof user.effectivePermissions === "object") {
      if (user.effectivePermissions[permissionKey] !== undefined) {
        return Boolean(user.effectivePermissions[permissionKey]);
      }
    }

    // Fallback: Check standard role conventions if permissions object is not yet loaded
    const role = String(user.role || "").toUpperCase();
    if (role === "ADMIN") return true;

    if (role === "MANAGER") {
      return !permissionKey.startsWith("subscription.") && !permissionKey.startsWith("team.manage");
    }

    if (role === "STAFF") {
      const staffPerms = [
        "billing.view",
        "billing.create",
        "billing.print",
        "inventory.view",
        "customers.view",
        "customers.create",
        "sales_ops.challan",
        "attendance.view_self",
        "attendance.check_in",
        "attendance.check_out",
      ];
      return staffPerms.includes(permissionKey);
    }

    if (role === "CASHIER" || role === "SALES_STAFF") {
      const cashierPerms = [
        "billing.view",
        "billing.create",
        "billing.print",
        "inventory.view",
        "customers.view",
        "customers.create",
        "sales_ops.challan",
        "sales_ops.payment",
        "attendance.view_self",
        "attendance.check_in",
        "attendance.check_out",
      ];
      return cashierPerms.includes(permissionKey);
    }

    if (role === "INVENTORY_STAFF") {
      return permissionKey.startsWith("inventory.") || permissionKey.startsWith("purchases.");
    }

    if (role === "HR_MANAGER") {
      return permissionKey.startsWith("staff.");
    }

    if (role === "VIEWER") {
      return permissionKey.endsWith(".view") || permissionKey === "billing.print";
    }

    return false;
  };

  const hasAnyPermission = (...keys) => {
    if (!keys || keys.length === 0) return true;
    return keys.some((k) => hasPermission(k));
  };

  const hasAllPermissions = (...keys) => {
    if (!keys || keys.length === 0) return true;
    return keys.every((k) => hasPermission(k));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isSuperAdmin,
    role: user?.role,
    user,
  };
}

/**
 * Reusable component wrapper to conditionally render UI elements based on permissions.
 */
export function RequirePermission({ permission, any = [], all = [], fallback = null, children }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let allowed = true;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (any && any.length > 0) {
    allowed = hasAnyPermission(...any);
  } else if (all && all.length > 0) {
    allowed = hasAllPermissions(...all);
  }

  if (!allowed) {
    return fallback;
  }

  return children;
}

export default usePermissions;
