import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import Layout from "../components/layout/Layout";
import NotFound from "../pages/NotFound";
import Login from "../pages/Login";
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
import Gst from "../pages/Gst";
import CaConnect from "../pages/CaConnect";
import CaPortal from "../pages/CaPortal";
import Referral from "../pages/Referral";
import Plans from "../pages/Plans";
import Support from "../pages/Support";
import { ClerkSsoCallback } from "../components/auth/ClerkAuth";
import { isAdminEmail, isAdminUser, isSuperAdminUser } from "../utils/security";
import { usePermissions } from "../hooks/usePermissions";
export { isAdminEmail, isAdminUser, isSuperAdminUser };

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

function AuthLoadingScreen() {
  const [showRetry, setShowRetry] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-xs animate-in fade-in">
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: "3px solid #dbeafe", borderTopColor: "#1a5cff" }}
        />
        <p className="text-sm font-semibold text-slate-800">Loading BILZET…</p>
        <p className="text-xs text-slate-400">Synchronizing session state</p>
        {showRetry && (
          <div className="mt-2 flex flex-col gap-2 w-full animate-in fade-in">
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              Retry Connection
            </button>
            <a
              href="/sign-in"
              className="text-[11px] text-slate-500 hover:text-slate-800 underline"
            >
              Return to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ClerkProtectedWrapper({ children, roles, permission }) {
  const { user, loading: authLoading } = useAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const { hasPermission } = usePermissions();

  // Do NOT redirect while Clerk is loading, or while user is signed in to Clerk and syncing with DB
  if (!isClerkLoaded || (isSignedIn && !user) || authLoading) {
    return <AuthLoadingScreen />;
  }

  // Only redirect if Clerk has finished loading AND user is not signed in
  if (!isSignedIn && !user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (roles && user && !roles.includes(user.role) && !isAdminUser(user) && !isAdminEmail(user?.email) && user.role !== "GUEST") {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function StandardProtectedWrapper({ children, roles, permission }) {
  const { user, loading } = useAuth();
  const { hasPermission } = usePermissions();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role) && !isAdminUser(user) && !isAdminEmail(user?.email) && user.role !== "GUEST") {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
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

const Protected = hasClerk ? ClerkProtectedWrapper : StandardProtectedWrapper;

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication routes */}
      <Route path="/sign-in/*" element={<Login initialMode="login" />} />
      <Route path="/sign-in" element={<Login initialMode="login" />} />
      <Route path="/sign-up/*" element={<Login initialMode="register" />} />
      <Route path="/sign-up" element={<Login initialMode="register" />} />
      <Route path="/login" element={<Navigate to="/sign-in" replace />} />
      <Route path="/register" element={<Navigate to="/sign-up" replace />} />
      <Route path="/sso-callback" element={<ClerkSsoCallback />} />
      <Route path="/sso-callback/*" element={<ClerkSsoCallback />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/billing"
        element={
          <Protected>
            <Billing />
          </Protected>
        }
      />
      <Route
        path="/invoices"
        element={
          <Protected>
            <Invoices />
          </Protected>
        }
      />
      <Route
        path="/products"
        element={
          <Protected>
            <Products />
          </Protected>
        }
      />
      <Route
        path="/customers"
        element={
          <Protected>
            <Customers />
          </Protected>
        }
      />
      <Route
        path="/inventory"
        element={
          <Protected>
            <Inventory />
          </Protected>
        }
      />
      <Route
        path="/gst"
        element={
          <Protected>
            <Gst />
          </Protected>
        }
      />
      <Route
        path="/ca-connect"
        element={
          <Protected>
            <CaConnect />
          </Protected>
        }
      />
      <Route
        path="/ca-portal"
        element={
          <Protected roles={["CA", "SUPER_ADMIN"]}>
            <CaPortal />
          </Protected>
        }
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
          <Protected>
            <Purchases defaultTab="invoices" />
          </Protected>
        }
      />
      <Route
        path="/purchases/orders"
        element={
          <Protected>
            <Purchases defaultTab="orders" />
          </Protected>
        }
      />
      <Route
        path="/purchases/debit-notes"
        element={
          <Protected>
            <Purchases defaultTab="debitNotes" />
          </Protected>
        }
      />
      <Route
        path="/suppliers"
        element={
          <Protected>
            <Suppliers />
          </Protected>
        }
      />
      <Route
        path="/expenses"
        element={
          <Protected>
            <Expenses />
          </Protected>
        }
      />
      <Route
        path="/reports"
        element={
          <Protected>
            <Reports />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected>
            <Settings />
          </Protected>
        }
      />
      <Route
        path="/team"
        element={
          <Protected>
            <Settings defaultTab="team" />
          </Protected>
        }
      />
      <Route
        path="/roles"
        element={
          <Protected>
            <Settings defaultTab="roles" />
          </Protected>
        }
      />

      {/* ── Inventory, Godowns & Stock Transfers ── */}
      <Route
        path="/warehouses"
        element={
          <Protected>
            <Warehouses />
          </Protected>
        }
      />
      <Route
        path="/inventory/godowns"
        element={
          <Protected>
            <Warehouses />
          </Protected>
        }
      />
      <Route
        path="/warehouses/transfer"
        element={
          <Protected>
            <StockTransfers />
          </Protected>
        }
      />
      <Route
        path="/inventory/stock-transfers"
        element={
          <Protected>
            <StockTransfers />
          </Protected>
        }
      />
      <Route
        path="/inventory/transfers"
        element={
          <Protected>
            <StockTransfers />
          </Protected>
        }
      />
      <Route
        path="/staff-dashboard"
        element={
          <Protected>
            <StaffDashboard />
          </Protected>
        }
      />
      <Route
        path="/workspace"
        element={
          <Protected>
            <StaffDashboard />
          </Protected>
        }
      />
      <Route
        path="/staff"
        element={
          <Protected>
            <StaffManagement />
          </Protected>
        }
      />
      <Route
        path="/staff/attendance"
        element={
          <Protected>
            <StaffManagement defaultTab="attendance" />
          </Protected>
        }
      />
      <Route
        path="/attendance"
        element={
          <Protected>
            <StaffManagement defaultTab="attendance" />
          </Protected>
        }
      />
      <Route
        path="/staff/payroll"
        element={
          <Protected>
            <StaffManagement defaultTab="payroll" />
          </Protected>
        }
      />
      <Route
        path="/online-orders"
        element={
          <Protected>
            <OnlineOrders />
          </Protected>
        }
      />
      <Route
        path="/sms-marketing"
        element={
          <Protected>
            <SmsMarketing />
          </Protected>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <Protected>
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
      <Route path="/app-admin/settings" element={<Navigate to="/admin?tab=vault" replace />} />
      <Route path="/app-admin/*" element={<Navigate to="/admin" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
