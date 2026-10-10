import { http } from "./http";
import {
  mockDashboardData,
  mockProducts,
  mockCustomers,
  mockCategories,
  mockInventory,
  mockTeamMembers,
  mockRoles,
  mockPermissionsCatalog,
  mockSubscriptionUsage,
} from "./mockData";

const unwrap = (r) => r.data.data;

// Seamlessly falls back to mock demo data if backend server is not running
const withFallback = (promise, fallbackValue) =>
  promise.catch((err) => {
    console.warn("Backend API offline — serving demo data fallback:", err?.message || err);
    return fallbackValue;
  });

export const authApi = {
  login: (p) => http.post("/auth/login", p).then(unwrap),
  register: (p) => http.post("/auth/register", p).then(unwrap),
  googleLogin: (credential) => http.post("/auth/google", { credential }).then(unwrap),
  clerkSync: (p) => http.post("/auth/clerk-sync", p).then(unwrap),
  me: () => http.get("/auth/me").then(unwrap),
  logout: () => http.post("/auth/logout").then(unwrap),
};

export const productsApi = {
  list: (p) =>
    withFallback(
      http.get("/products", { params: p }).then((r) => r.data),
      { products: mockProducts, total: mockProducts.length }
    ),
  get: (id) => http.get(`/products/${id}`).then(unwrap),
  create: (p) => http.post("/products", p).then(unwrap),
  update: (id, p) => http.patch(`/products/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/products/${id}`).then(unwrap),
  barcode: (b) =>
    http.get(`/products/barcode/${encodeURIComponent(b)}`).then(unwrap),
  low: (p) =>
    http.get("/products/low-stock", { params: p }).then((r) => r.data),
};

export const categoriesApi = {
  list: (params) =>
    withFallback(
      http.get("/categories", { params }).then(unwrap),
      { categories: mockCategories }
    ),
  create: (p) => http.post("/categories", p).then(unwrap),
  update: (id, p) => http.patch(`/categories/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/categories/${id}`).then(unwrap),
};

export const customersApi = {
  list: (p) =>
    withFallback(
      http.get("/customers", { params: p }).then((r) => r.data),
      { customers: mockCustomers, total: mockCustomers.length }
    ),
  get: (id) => http.get(`/customers/${id}`).then(unwrap),
  create: (p) => http.post("/customers", p).then(unwrap),
  update: (id, p) => http.patch(`/customers/${id}`, p).then(unwrap),
  purchases: (id, p) =>
    http.get(`/customers/${id}/purchases`, { params: p }).then((r) => r.data),
  payments: (id, p) =>
    http.get(`/customers/${id}/payments`, { params: p }).then((r) => r.data),
};

export const salesApi = {
  list: (p) => http.get("/sales", { params: p }).then((r) => r.data),
  mySales: (p) => http.get("/sales/my", { params: p }).then((r) => r.data),
  get: (id) => http.get(`/sales/${id}`).then(unwrap),
  create: (p) => http.post("/sales", p).then(unwrap),
  return: (id, p) => http.post(`/sales/${id}/return`, p).then(unwrap),
  recordPayment: (id, p) => http.post(`/sales/${id}/payment`, p).then(unwrap),
  auditTrail: (id) => http.get(`/sales/${id}/audit-trail`).then(unwrap),
  returns: () => withFallback(http.get("/sales/returns").then(unwrap), []),
  challans: () => withFallback(http.get("/sales/challans").then(unwrap), []),
  createChallan: (p) => http.post("/sales/challans", p).then(unwrap),
  paymentsInList: (p) =>
    withFallback(http.get("/sales/payments-in", { params: p }).then(unwrap), { payments: [] }),
  paymentIn: (p) => http.post("/sales/payments-in", p).then(unwrap),
};

export const dashboardApi = {
  get: () => withFallback(http.get("/dashboard").then(unwrap), mockDashboardData),
};

export const inventoryApi = {
  list: (p) =>
    withFallback(
      http.get("/inventory", { params: p }).then((r) => r.data),
      { data: { inventory: mockProducts }, total: mockProducts.length }
    ),
  low: (p) =>
    withFallback(
      http.get("/inventory/low-stock", { params: p }).then((r) => r.data),
      { data: { inventory: mockProducts.filter((i) => (i.stock || 0) <= (i.minimumStock || 5)) } }
    ),
  history: (p) =>
    withFallback(
      http.get("/inventory/history", { params: p }).then((r) => r.data),
      { data: [] }
    ),
  adjust: (p) => http.post("/inventory/adjust", p).then(unwrap),
};

export const warehousesApi = {
  list: () => withFallback(http.get("/warehouses").then(unwrap), { warehouses: [] }),
  create: (p) => http.post("/warehouses", p).then(unwrap),
  update: (id, p) => http.patch(`/warehouses/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/warehouses/${id}`).then(unwrap),
  transfer: (p) => http.post("/warehouses/transfer", p).then(unwrap),
  transfers: () => withFallback(http.get("/warehouses/transfers").then(unwrap), { transfers: [] }),
};

export const suppliersApi = {
  list: (p) =>
    withFallback(
      http.get("/suppliers", { params: p }).then((r) => r.data),
      { data: { suppliers: [] }, total: 0 }
    ),
  create: (p) => http.post("/suppliers", p).then(unwrap),
  update: (id, p) => http.patch(`/suppliers/${id}`, p).then(unwrap),
  get: (id) => http.get(`/suppliers/${id}`).then(unwrap),
};

export const purchasesApi = {
  list: (p) => withFallback(http.get("/purchases", { params: p }).then(unwrap), { purchases: [] }),
  get: (id) => http.get(`/purchases/${id}`).then(unwrap),
  create: (p) => http.post("/purchases", p).then(unwrap),
  orders: (p) => withFallback(http.get("/purchases/orders", { params: p }).then(unwrap), { purchaseOrders: [] }),
  createOrder: (p) => http.post("/purchases/orders", p).then(unwrap),
  updateOrderStatus: (id, status) => http.patch(`/purchases/orders/${id}/status`, { status }).then(unwrap),
  returns: (p) => http.post("/purchases/returns", p).then(unwrap),
  debitNotes: (p) => withFallback(http.get("/purchases/debit-notes", { params: p }).then(unwrap), { debitNotes: [] }),
  createDebitNote: (p) => http.post("/purchases/debit-notes", p).then(unwrap),
};

export const staffApi = {
  list: (p) => withFallback(http.get("/staff", { params: p }).then(unwrap), { staff: [] }),
  create: (p) => http.post("/staff", p).then(unwrap),
  update: (id, p) => http.patch(`/staff/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/staff/${id}`).then(unwrap),
  attendance: (params) => withFallback(http.get("/staff/attendance", { params }).then(unwrap), { attendances: [] }),
  markAttendance: (p) => http.post("/staff/attendance", p).then(unwrap),
  updateAttendance: (id, p) => http.patch(`/staff/attendance/${id}`, p).then(unwrap),
  deleteAttendance: (id) => http.delete(`/staff/attendance/${id}`).then(unwrap),
  checkInSelf: () => http.post("/staff/attendance/check-in").then(unwrap),
  checkOutSelf: () => http.post("/staff/attendance/check-out").then(unwrap),
  getMyAttendanceToday: () => withFallback(http.get("/staff/attendance/me").then(unwrap), null),
  getMyAttendanceHistory: (params) => withFallback(http.get("/staff/attendance/history", { params }).then(unwrap), { attendances: [] }),
  payroll: (params) => withFallback(http.get("/staff/payroll", { params }).then(unwrap), { payrolls: [] }),
  generatePayroll: (p) => http.post("/staff/payroll", p).then(unwrap),
};

export const onlineOrdersApi = {
  list: (p) => withFallback(http.get("/online-orders", { params: p }).then(unwrap), { orders: [] }),
  create: (p) => http.post("/online-orders", p).then(unwrap),
  updateStatus: (id, status) => http.patch(`/online-orders/${id}/status`, { status }).then(unwrap),
};

export const smsApi = {
  list: () => withFallback(http.get("/sms-campaigns").then(unwrap), { campaigns: [] }),
  create: (p) => http.post("/sms-campaigns", p).then(unwrap),
};

export const auditLogsApi = {
  list: () => withFallback(http.get("/audit-logs").then(unwrap), { logs: [] }),
};

export const expensesApi = {
  list: (p) =>
    withFallback(
      http.get("/expenses", { params: p }).then((r) => r.data),
      { data: { expenses: [] }, total: 0 }
    ),
  create: (p) => http.post("/expenses", p).then(unwrap),
  update: (id, p) => http.patch(`/expenses/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/expenses/${id}`).then(unwrap),
};

export const reportsApi = {
  sales: (p) => http.get("/reports/sales", { params: p }).then(unwrap),
  daily: (p) => http.get("/reports/sales/daily", { params: p }).then(unwrap),
  monthly: (year) => http.get("/reports/sales/monthly", { params: { year } }).then(unwrap),
  yearly: () => http.get("/reports/sales/yearly").then(unwrap),
  profit: (p) => http.get("/reports/profit", { params: p }).then(unwrap),
  inventory: () => http.get("/reports/inventory").then(unwrap),
  gst: (p) => http.get("/reports/gst", { params: p }).then(unwrap),
  analytics: () => withFallback(http.get("/reports/analytics").then(unwrap), { report: {} }),
};

export const settingsApi = {
  get: () =>
    withFallback(http.get("/settings/shop").then(unwrap), {
      shopName: "",
      ownerName: "",
      phone: "",
      email: "",
      address: "",
      gstin: "",
      state: "",
      stateCode: "",
      invoicePrefix: "INV-",
      paperSize: "A4",
      terms: "",
    }),
  update: (p) => http.patch("/settings/shop", p).then(unwrap),
};

export const usersApi = {
  list: (p) =>
    withFallback(
      http.get("/users", { params: p }).then(unwrap),
      { users: mockTeamMembers, usage: mockSubscriptionUsage }
    ),
  get: (id) => http.get(`/users/${id}`).then(unwrap),
  create: (p) => http.post("/users", p).then(unwrap),
  update: (id, p) => http.patch(`/users/${id}`, p).then(unwrap),
  toggleStatus: (id, isActive) => http.patch(`/users/${id}/status`, { isActive }).then(unwrap),
  remove: (id) => http.delete(`/users/${id}`).then(unwrap),
  getPermissions: (id) =>
    withFallback(
      http.get(`/users/${id}/permissions`).then(unwrap),
      { permissions: mockPermissionsCatalog.permissions }
    ),
  updatePermissions: (id, overrides) => http.patch(`/users/${id}/permissions`, { overrides }).then(unwrap),
};

export const teamApi = usersApi;

export const subscriptionApi = {
  getStatus: () =>
    withFallback(http.get("/subscription/status").then(unwrap), {
      planTier: "FREE",
      actualPlanTier: "FREE",
      planName: "Free Starter",
      status: "ACTIVE",
      isActive: true,
      isExpired: false,
      currentPlan: "FREE",
    }),
  getPlans: () => http.get("/subscription/plans").then(unwrap),
  getUsage: () =>
    withFallback(http.get("/subscription/usage").then(unwrap), {
      planTier: "FREE",
      planName: "Free Starter",
      usedSeats: 0,
      maxSeats: 1,
      remainingSeats: 0,
      canAddUser: false,
    }),
  upgrade: (p) => http.post("/subscription/upgrade", p).then(unwrap),
  cancel: () => http.post("/subscription/cancel").then(unwrap),
};

export const rolesApi = {
  list: () =>
    withFallback(
      http.get("/roles").then(unwrap),
      { roles: mockRoles }
    ),
  permissionsCatalog: () =>
    withFallback(
      http.get("/roles/permissions").then(unwrap),
      mockPermissionsCatalog
    ),
  create: (p) => http.post("/roles", p).then(unwrap),
  update: (id, p) => http.patch(`/roles/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/roles/${id}`).then(unwrap),
};

export const subscriptionUsageApi = {
  get: () =>
    withFallback(
      http.get("/subscription/usage").then(unwrap),
      mockSubscriptionUsage
    ),
};

export const caConnectApi = {
  getStatus: () => http.get("/ca-connect/status").then(unwrap),
  list: () => http.get("/ca-connect/accountants").then(unwrap),
  invite: (p) => http.post("/ca-connect/invite", p).then(unwrap),
  remove: (id) => http.delete(`/ca-connect/invite/${id}`).then(unwrap),
};

export const referralApi = {
  getInfo: () => http.get("/referral/info").then(unwrap),
  validate: (code) => http.get("/referral/validate", { params: { code } }).then(unwrap),
  apply: (code) => http.post("/referral/apply", { code }).then(unwrap),
};

export const storesApi = {
  list: () => http.get("/stores").then(unwrap),
  switch: (storeId) => http.post("/stores/switch", { storeId }).then(unwrap),
  create: (p) => http.post("/stores", p).then(unwrap),
};

export const superAdminApi = {
  getOverview: () => http.get("/super-admin/overview").then(unwrap),
  getUsers: (params) => http.get("/super-admin/users", { params }).then(unwrap),
  updateUserStatus: (id, isActive) => http.patch(`/super-admin/users/${id}/status`, { isActive }).then(unwrap),
  resetPassword: (id, newPassword) => http.post(`/super-admin/users/${id}/reset-password`, { newPassword }).then(unwrap),
  getSubscriptions: () => http.get("/super-admin/subscriptions").then(unwrap),
  updateSubscription: (id, data) => http.patch(`/super-admin/subscriptions/${id}`, data).then(unwrap),
  getCustomers: (params) => http.get("/super-admin/customers", { params }).then(unwrap),
  getConfig: () => http.get("/super-admin/config").then(unwrap),
  updateConfig: (data) => http.patch("/super-admin/config", data).then(unwrap),
};

export const caPortalApi = {
  getStores: () => http.get("/ca-portal/stores").then(unwrap),
  getInvoices: (params) => http.get("/ca-portal/invoices", { params }).then(unwrap),
  getInvoice: (id) => http.get(`/ca-portal/invoices/${id}`).then(unwrap),
  getAuditTrail: (id) => http.get(`/ca-portal/invoices/${id}/audit-trail`).then(unwrap),
  getFinancialSummary: (params) => http.get("/ca-portal/financial-summary", { params }).then(unwrap),
  getCreditNotes: (params) => http.get("/ca-portal/credit-notes", { params }).then(unwrap),
  getInvoiceCreditNotes: (id) => http.get(`/ca-portal/invoices/${id}/credit-notes`).then(unwrap),
};

