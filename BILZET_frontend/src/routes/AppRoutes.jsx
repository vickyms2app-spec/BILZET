import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import Layout from "../components/layout/Layout";
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
import Referral from "../pages/Referral";
import Plans from "../pages/Plans";
import Support from "../pages/Support";
import { ClerkSsoCallback } from "../components/auth/ClerkAuth";

// New ERP Modules
import Warehouses from "../pages/Warehouses";
import StockTransfers from "../pages/StockTransfers";
import StaffManagement from "../pages/StaffManagement";
import OnlineOrders from "../pages/OnlineOrders";
import SmsMarketing from "../pages/SmsMarketing";
import AuditLogs from "../pages/AuditLogs";
import SalesOperations from "../pages/SalesOperations";

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

function ClerkProtectedWrapper({ children, roles }) {
  const { user, loading: authLoading } = useAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();

  // Do NOT redirect while Clerk is loading, or while user is signed in to Clerk and syncing with DB
  if (!isClerkLoaded || (isSignedIn && !user) || authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{ border: "3px solid #dbeafe", borderTopColor: "#1a5cff" }}
          />
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>Loading BILZET…</p>
        </div>
      </div>
    );
  }

  // Only redirect if Clerk has finished loading AND user is not signed in
  if (!isSignedIn && !user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (roles && user && !roles.includes(user.role) && user.role !== "GUEST") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function StandardProtectedWrapper({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{ border: "3px solid #dbeafe", borderTopColor: "#1a5cff" }}
          />
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>Loading BILZET…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role) && user.role !== "GUEST") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Layout>{children}</Layout>;
}

import { isAdminEmail, isAdminUser } from "../utils/security";
export { isAdminEmail, isAdminUser };

function AdminEmailGuard({ children }) {
  const { user } = useAuth();
  const allowed = isAdminUser(user) || isAdminEmail(user?.email);

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
        path="/staff"
        element={
          <Protected>
            <StaffManagement />
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
          <Protected roles={["ADMIN", "SUPERADMIN"]}>
            <AdminEmailGuard>
              <Admin />
            </AdminEmailGuard>
          </Protected>
        }
      />

      {/* ══════ Dedicated Application Super Admin Portal ══════ */}
      <Route path="/app-admin/login" element={<SuperAdminLogin />} />
      <Route
        path="/app-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout>
              <SuperAdminDashboard />
            </SuperAdminLayout>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/app-admin/users"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout>
              <SuperAdminUsers />
            </SuperAdminLayout>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/app-admin/subscriptions"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout>
              <SuperAdminSubscriptions />
            </SuperAdminLayout>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/app-admin/customers"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout>
              <SuperAdminCustomers />
            </SuperAdminLayout>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/app-admin/settings"
        element={
          <SuperAdminRoute>
            <SuperAdminLayout>
              <SuperAdminSettings />
            </SuperAdminLayout>
          </SuperAdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
