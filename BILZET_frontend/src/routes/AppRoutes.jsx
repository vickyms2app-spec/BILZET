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
import SuperAdminRoute from "../pages/superAdmin/SuperAdminRoute";
import SuperAdminLogin from "../pages/superAdmin/SuperAdminLogin";
import SuperAdminLayout from "../pages/superAdmin/SuperAdminLayout";
import SuperAdminDashboard from "../pages/superAdmin/SuperAdminDashboard";
import SuperAdminUsers from "../pages/superAdmin/SuperAdminUsers";
import SuperAdminSubscriptions from "../pages/superAdmin/SuperAdminSubscriptions";
import SuperAdminCustomers from "../pages/superAdmin/SuperAdminCustomers";
import SuperAdminSettings from "../pages/superAdmin/SuperAdminSettings";

const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{ border: "3px solid #dbeafe", borderTopColor: "#1a5cff" }}
          />
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>Loading BILZET…</p>
        </div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role) && user.role !== "GUEST")
    return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login initialMode="login" />} />
      <Route path="/register" element={<Login initialMode="register" />} />
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
            <Purchases />
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
        path="/admin"
        element={
          <Protected roles={["ADMIN"]}>
            <Admin />
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
