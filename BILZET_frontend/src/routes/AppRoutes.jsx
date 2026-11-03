import { useState, useEffect, Component } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// ── Route-level Error Boundary ─────────────────────────────────────────────
// Catches render errors in any child route and shows a readable message
// instead of a blank white page. This is critical for debugging.
class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  componentDidCatch(err, info) {
    console.error("[BILZET RouteError]", err, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 32 }}>
          <div style={{ maxWidth: 520, width: "100%", background: "#fff", border: "1px solid #fca5a5", borderRadius: 14, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,.07)" }}>
            <h2 style={{ color: "#dc2626", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>⚠ Page Error</h2>
            <p style={{ color: "#475569", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              A rendering error occurred. Open <strong>DevTools → Console</strong> (F12) for the full stack trace.
            </p>
            <pre style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, fontSize: 12, color: "#7f1d1d", whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 20 }}>
              {msg}
            </pre>
            <button onClick={() => window.location.reload()} style={{ padding: "8px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Reload Page
            </button>
            <button onClick={() => { localStorage.removeItem("bilzet_access_token"); window.location.href = "/sign-in"; }} style={{ marginLeft: 10, padding: "8px 20px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Sign Out &amp; Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useAuth } from "../store/auth";
import Logo from "../components/common/Logo";
import AuthLoadingScreen from "../components/common/AuthLoadingScreen";
import Layout from "../components/layout/Layout";
import NotFound from "../pages/NotFound";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import Billing from "../pages/Billing";
import Products from "../pages/Products";
import Customers from "../pages/Customers";
import Inventory from "../pages/Inventory";
import Purchases from "../pages/Purchases";
import Suppliers from "../pages/Suppliers";
import Expenses from "../pages/Expenses";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import Admin from "../pages/Admin";
import Invoices from "../pages/Invoices";
import Quotations from "../pages/Quotations";
import Gst from "../pages/Gst";
import CaConnect from "../pages/CaConnect";
import CaPortal from "../pages/CaPortal";
import AcceptCaInvitation from "../pages/AcceptCaInvitation";
import Referral from "../pages/Referral";
import Plans from "../pages/Plans";
import Support from "../pages/Support";
import Onboarding from "../pages/Onboarding";
import RegisterShop from "../pages/RegisterShop";
import JoinTeam from "../pages/JoinTeam";
import { ClerkSsoCallback } from "../components/auth/ClerkAuth";
import { isAdminEmail, isAdminUser, isSuperAdminUser } from "../utils/security";
import { usePermissions } from "../hooks/usePermissions";
import { getWorkspaceRedirectPath } from "../utils/workspaceRouter";
import { LockedFeatureGate, isFeatureAllowed } from "../utils/featureAccess";
export { isAdminEmail, isAdminUser, isSuperAdminUser };

function checkPlanAccess(user, minPlan, featureKey) {
  if (!minPlan && !featureKey) return { allowed: true };
  if (!user) return { allowed: false, userPlan: "FREE" };
  if (user?.role === "SUPER_ADMIN" || user?.isSuperAdmin) {
    return { allowed: true };
  }

  const userPlan = (() => {
    const subTier = user?.subscription?.planTier || user?.currentPlan;
    if (subTier) return String(subTier).toUpperCase();
    try {
      const sub = JSON.parse(localStorage.getItem("bilzet_subscription_data") || "{}");
      if (sub.planTier || sub.currentPlan) return String(sub.planTier || sub.currentPlan).toUpperCase();
    } catch (_) {}
    return "FREE";
  })();

  const tierRanks = { FREE: 1, PRO: 2, PREMIUM: 3, ENTERPRISE: 4 };
  const userRank = tierRanks[userPlan] || 1;
  const requiredRank = minPlan ? (tierRanks[minPlan.toUpperCase()] || 2) : 1;

  let allowed = userRank >= requiredRank;
  if (featureKey) {
    allowed = allowed && isFeatureAllowed(featureKey, userPlan);
  }

  return { allowed, userPlan };
}

// New ERP Modules
import Warehouses from "../pages/Warehouses";
import StockTransfers from "../pages/StockTransfers";
import StaffManagement from "../pages/StaffManagement";
import OnlineOrders from "../pages/OnlineOrders";
import SmsMarketing from "../pages/SmsMarketing";
import AuditLogs from "../pages/AuditLogs";
import SalesOperations from "../pages/SalesOperations";
import StaffDashboard from "../pages/StaffDashboard";

import SuperAdminRoute from "../pages/superAdmin/SuperAdminRoute";
import SuperAdminLogin from "../pages/superAdmin/SuperAdminLogin";
import SuperAdminLayout from "../pages/superAdmin/SuperAdminLayout";
import SuperAdminDashboard from "../pages/superAdmin/SuperAdminDashboard";
import SuperAdminUsers from "../pages/superAdmin/SuperAdminUsers";
import SuperAdminSubscriptions from "../pages/superAdmin/SuperAdminSubscriptions";
import SuperAdminCustomers from "../pages/superAdmin/SuperAdminCustomers";
import SuperAdminSettings from "../pages/superAdmin/SuperAdminSettings";

import { useAuth as useClerkAuth } from "@clerk/clerk-react";

import { hasClerk } from "../config/clerk";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/sign-in" replace />;
  return <Navigate to={getWorkspaceRedirectPath(user)} replace />;
}

function ClerkProtectedWrapper({ children, roles, permission, minPlan, featureKey }) {
  const { user, loading: authLoading } = useAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const { hasPermission } = usePermissions();

  // Wait only if: auth is still loading AND we have no local user yet
  if (authLoading && !user) {
    return <AuthLoadingScreen />;
  }

  // Clerk is still loading but we already have a local user — proceed immediately
  // (local JWT auth does not require Clerk to be fully loaded)
  const effectivelySignedIn = isSignedIn || Boolean(user);

  // No session at all
  if (!effectivelySignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // Prevent null-property crashes while user profile is syncing
  if (!user) {
    return <AuthLoadingScreen />;
  }

  const isAuthorizedRole =
    !roles ||
    roles.includes(user.role) ||
    (user.isOwner && (roles.includes("ADMIN") || roles.includes("OWNER") || roles.includes("MANAGER"))) ||
    isAdminUser(user);

  if (!isAuthorizedRole && user.role !== "GUEST") {
    return <Navigate to={getWorkspaceRedirectPath(user)} replace />;
  }

  // Safety gate: Non-owners can never access /dashboard unless they have explicit reports.view permission
  if (window.location.pathname === "/dashboard" && !user.isOwner && user.role !== "SUPER_ADMIN" && !hasPermission("reports.view")) {
    return <Navigate to={getWorkspaceRedirectPath(user)} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={getWorkspaceRedirectPath(user)} replace />;
  }

  const { allowed, userPlan } = checkPlanAccess(user, minPlan, featureKey);
  if (!allowed) {
    return (
      <Layout>
        <div className="p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
          <LockedFeatureGate
            featureKey={featureKey || (minPlan === "PREMIUM" ? "ca_connect" : "online_orders")}
            currentTier={userPlan}
          />
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}

function StandardProtectedWrapper({ children, roles, permission, minPlan, featureKey }) {
  const { user, loading } = useAuth();
  const { hasPermission } = usePermissions();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) return <Navigate to="/sign-in" replace />;

  const isAuthorizedRole =
    !roles ||
    roles.includes(user.role) ||
    (user.isOwner && (roles.includes("ADMIN") || roles.includes("OWNER") || roles.includes("MANAGER"))) ||
    isAdminUser(user);

  if (!isAuthorizedRole && user.role !== "GUEST") {
    return <Navigate to={getWorkspaceRedirectPath(user)} replace />;
  }

  // Safety gate: Non-owners can never access /dashboard unless they have explicit reports.view permission
  if (window.location.pathname === "/dashboard" && !user.isOwner && user.role !== "SUPER_ADMIN" && !hasPermission("reports.view")) {
    return <Navigate to={getWorkspaceRedirectPath(user)} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={getWorkspaceRedirectPath(user)} replace />;
  }

  const { allowed, userPlan } = checkPlanAccess(user, minPlan, featureKey);
  if (!allowed) {
    return (
      <Layout>
        <div className="p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
          <LockedFeatureGate
            featureKey={featureKey || (minPlan === "PREMIUM" ? "ca_connect" : "online_orders")}
            currentTier={userPlan}
          />
        </div>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}

function AdminEmailGuard({ children }) {
  const { user } = useAuth();
  const allowed = isSuperAdminUser(user) || isAdminEmail(user?.email);

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RedirectToAcceptInvitation() {
  const location = useLocation();
  return <Navigate to={`/accept-invitation${location.search}`} replace />;
}

function CaPortalGuard() {
  return <CaPortal />;
}


function RegisterShopGuard() {
  const { user } = useAuth();
  return <Navigate to={getWorkspaceRedirectPath(user) || "/dashboard"} replace />;
}

function AuthenticatedOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/sign-in" replace />;
  return children;
}

const Protected = hasClerk ? ClerkProtectedWrapper : StandardProtectedWrapper;

export default function AppRoutes() {
  return (
    <RouteErrorBoundary>
      <Routes>
      {/* Public Authentication routes */}
      <Route path="/sign-in/*" element={<Login initialMode="login" />} />
      <Route path="/sign-in" element={<Login initialMode="login" />} />
      <Route path="/sign-up/*" element={<Signup />} />
      <Route path="/sign-up" element={<Signup />} />
      <Route path="/login" element={<Navigate to="/sign-in" replace />} />
      <Route path="/register" element={<Navigate to="/sign-up" replace />} />
      <Route path="/sso-callback" element={<ClerkSsoCallback />} />
      <Route path="/sso-callback/*" element={<ClerkSsoCallback />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/onboarding"
        element={
          <AuthenticatedOnly>
            <RegisterShopGuard />
          </AuthenticatedOnly>
        }
      />
      <Route
        path="/register-shop"
        element={
          <AuthenticatedOnly>
            <RegisterShopGuard />
          </AuthenticatedOnly>
        }
      />
      <Route
        path="/join-team"
        element={
          <AuthenticatedOnly>
            <JoinTeam />
          </AuthenticatedOnly>
        }
      />
      <Route
        path="/join-our-team"
        element={
          <AuthenticatedOnly>
            <JoinTeam />
          </AuthenticatedOnly>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/billing"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF", "CASHIER"]}>
            <Billing />
          </Protected>
        }
      />
      <Route
        path="/quotations"
        element={<Navigate to="/invoices?tab=quotations" replace />}
      />
      <Route
        path="/invoices"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF", "CASHIER"]}>
            <Invoices />
          </Protected>
        }
      />
      <Route
        path="/products"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF", "CASHIER"]}>
            <Products />
          </Protected>
        }
      />
      <Route
        path="/customers"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF", "CASHIER"]}>
            <Customers />
          </Protected>
        }
      />
      <Route
        path="/inventory"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF"]}>
            <Inventory />
          </Protected>
        }
      />
      <Route
        path="/gst"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]} minPlan="PRO" featureKey="gst_filing">
            <Gst />
          </Protected>
        }
      />
      {/* CA Invitation Acceptance Routes (Canonical path: /accept-invitation) */}
      <Route path="/ca-connect/accept-invitation" element={<RedirectToAcceptInvitation />} />
      <Route path="/ca-portal/accept-invitation" element={<RedirectToAcceptInvitation />} />
      <Route path="/accept-invitation" element={<AcceptCaInvitation />} />

      <Route
        path="/ca-connect"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]} minPlan="PREMIUM" featureKey="ca_connect">
            <CaConnect />
          </Protected>
        }
      />
      <Route
        path="/ca-portal"
        element={
          <Protected roles={["CA", "ACCOUNTANT", "SUPER_ADMIN", "ADMIN", "OWNER"]}>
            <CaPortalGuard />
          </Protected>
        }
      />
      <Route
        path="/ca-portal/:subTab"
        element={
          <Protected roles={["CA", "ACCOUNTANT", "SUPER_ADMIN", "ADMIN", "OWNER"]}>
            <CaPortalGuard />
          </Protected>
        }
      />
      <Route
        path="/ca-referral"
        element={<Navigate to="/ca-portal/referral" replace />}
      />
      <Route
        path="/exceptions"
        element={<Navigate to="/ca-portal/exceptions" replace />}
      />
      <Route
        path="/referral"
        element={
          <Protected>
            <Referral />
          </Protected>
        }
      />
      <Route
        path="/plans"
        element={
          <Protected>
            <Plans />
          </Protected>
        }
      />
      <Route
        path="/subscription"
        element={
          <Protected>
            <Plans />
          </Protected>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <Protected>
            <Plans />
          </Protected>
        }
      />
      <Route
        path="/support"
        element={
          <Protected>
            <Support />
          </Protected>
        }
      />
      <Route
        path="/purchases"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Purchases defaultTab="invoices" />
          </Protected>
        }
      />
      <Route
        path="/purchases/orders"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]} minPlan="PRO" featureKey="purchase_orders">
            <Purchases defaultTab="orders" />
          </Protected>
        }
      />
      <Route
        path="/purchases/debit-notes"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Purchases defaultTab="debitNotes" />
          </Protected>
        }
      />
      <Route
        path="/suppliers"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Suppliers />
          </Protected>
        }
      />
      <Route
        path="/expenses"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Expenses />
          </Protected>
        }
      />
      <Route
        path="/reports"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Reports />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER"]}>
            <Settings />
          </Protected>
        }
      />
      <Route
        path="/team"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/staff-management"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/team-management"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/sub-users"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/team-sub-users"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/team/users"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/team/sub-users"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/settings/team"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/settings/users"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/settings/roles"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER"]} minPlan="PREMIUM" featureKey="custom_roles">
            <Settings defaultTab="roles" />
          </Protected>
        }
      />
      <Route
        path="/roles"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER"]} minPlan="PREMIUM" featureKey="custom_roles">
            <Settings defaultTab="roles" />
          </Protected>
        }
      />

      {/* ── Inventory, Godowns & Stock Transfers ── */}
      <Route
        path="/warehouses"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF"]}>
            <Warehouses />
          </Protected>
        }
      />
      <Route
        path="/inventory/godowns"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF"]}>
            <Warehouses />
          </Protected>
        }
      />
      <Route
        path="/warehouses/transfer"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <StockTransfers />
          </Protected>
        }
      />
      <Route
        path="/inventory/stock-transfers"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <StockTransfers />
          </Protected>
        }
      />
      <Route
        path="/inventory/transfers"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <StockTransfers />
          </Protected>
        }
      />
      <Route
        path="/staff-dashboard"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF", "CASHIER"]}>
            <StaffDashboard />
          </Protected>
        }
      />
      <Route
        path="/workspace"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER", "STAFF", "CASHIER"]}>
            <StaffDashboard />
          </Protected>
        }
      />
      <Route
        path="/staff"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <StaffManagement />
          </Protected>
        }
      />
      <Route
        path="/staff/attendance"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <StaffManagement defaultTab="attendance" />
          </Protected>
        }
      />
      <Route
        path="/attendance"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"]}>
            <StaffManagement defaultTab="attendance" />
          </Protected>
        }
      />
      <Route
        path="/staff/payroll"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER"]}>
            <StaffManagement defaultTab="payroll" />
          </Protected>
        }
      />
      <Route
        path="/online-orders"
        element={
          <Protected minPlan="PRO" featureKey="online_orders">
            <OnlineOrders />
          </Protected>
        }
      />
      <Route
        path="/sms-marketing"
        element={
          <Protected minPlan="PRO" featureKey="sms_campaigns">
            <SmsMarketing />
          </Protected>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <Protected roles={["ADMIN", "SUPER_ADMIN", "OWNER"]} minPlan="PREMIUM" featureKey="audit_logs">
            <AuditLogs />
          </Protected>
        }
      />
      <Route
        path="/sales/challans"
        element={
          <Protected>
            <SalesOperations defaultTab="challans" />
          </Protected>
        }
      />
      <Route
        path="/sales/returns"
        element={
          <Protected>
            <SalesOperations defaultTab="returns" />
          </Protected>
        }
      />
      <Route
        path="/sales/payments-in"
        element={
          <Protected>
            <SalesOperations defaultTab="payments" />
          </Protected>
        }
      />
      <Route path="/sales/payments" element={<Navigate to="/sales/payments-in" replace />} />
      <Route path="/sales/ledger" element={<Navigate to="/sales/payments-in" replace />} />
      <Route path="/ledger" element={<Navigate to="/sales/payments-in" replace />} />
      <Route path="/customer-crm" element={<Navigate to="/customers" replace />} />
      <Route path="/crm" element={<Navigate to="/customers" replace />} />

      <Route
        path="/stock-transfers"
        element={
          <Protected>
            <StockTransfers />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminEmailGuard>
              <Admin />
            </AdminEmailGuard>
          </Protected>
        }
      />

      {/* ══════ Dedicated Application Super Admin Portal -> Unified into Main Admin ══════ */}
      <Route path="/app-admin/login" element={<Navigate to="/admin" replace />} />
      <Route path="/app-admin" element={<Navigate to="/admin" replace />} />
      <Route path="/app-admin/users" element={<Navigate to="/admin?tab=users" replace />} />
      <Route path="/app-admin/subscriptions" element={<Navigate to="/admin?tab=overview" replace />} />
      <Route path="/app-admin/customers" element={<Navigate to="/customers" replace />} />
      <Route path="/app-admin/referrals" element={<Navigate to="/admin?tab=referrals" replace />} />
      <Route path="/admin/referrals" element={<Navigate to="/admin?tab=referrals" replace />} />
      <Route path="/app-admin/settings" element={<Navigate to="/admin?tab=vault" replace />} />
      <Route path="/app-admin/*" element={<Navigate to="/admin" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </RouteErrorBoundary>
  );
}
