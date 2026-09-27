import { http } from "./http";
import {
  mockDashboardData,
  mockProducts,
  mockCustomers,
  mockCategories,
  mockInventory,
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
  list: () =>
    withFallback(
      http.get("/categories").then(unwrap),
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
};
export const salesApi = {
  list: (p) => http.get("/sales", { params: p }).then((r) => r.data),
  get: (id) => http.get(`/sales/${id}`).then(unwrap),
  create: (p) => http.post("/sales", p).then(unwrap),
  returns: (id, p) => http.post(`/sales/${id}/return`, p).then(unwrap),
};
export const dashboardApi = {
  get: () => withFallback(http.get("/dashboard").then(unwrap), mockDashboardData),
};
export const inventoryApi = {
  list: (p) =>
    withFallback(
      http.get("/inventory", { params: p }).then((r) => r.data),
      { data: { inventory: mockInventory }, total: mockInventory.length }
    ),
  low: (p) =>
    withFallback(
      http.get("/inventory/low-stock", { params: p }).then((r) => r.data),
      { data: { inventory: mockInventory.filter((i) => i.stock <= i.minimumStock) } }
    ),
  history: (p) =>
    withFallback(
      http.get("/inventory/history", { params: p }).then((r) => r.data),
      { data: [] }
    ),
  adjust: (p) => http.post("/inventory/adjust", p).then(unwrap),
};
export const suppliersApi = {
  list: (p) => http.get("/suppliers", { params: p }).then((r) => r.data),
  create: (p) => http.post("/suppliers", p).then(unwrap),
  update: (id, p) => http.patch(`/suppliers/${id}`, p).then(unwrap),
  get: (id) => http.get(`/suppliers/${id}`).then(unwrap),
};
export const purchasesApi = {
  list: (p) => http.get("/purchases", { params: p }).then((r) => r.data),
  get: (id) => http.get(`/purchases/${id}`).then(unwrap),
  create: (p) => http.post("/purchases", p).then(unwrap),
};
export const expensesApi = {
  list: (p) => http.get("/expenses", { params: p }).then((r) => r.data),
  create: (p) => http.post("/expenses", p).then(unwrap),
  update: (id, p) => http.patch(`/expenses/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/expenses/${id}`).then(unwrap),
};
export const reportsApi = {
  sales: (p) => http.get("/reports/sales", { params: p }).then(unwrap),
  profit: (p) => http.get("/reports/profit", { params: p }).then(unwrap),
  inventory: () => http.get("/reports/inventory").then(unwrap),
  gst: (p) => http.get("/reports/gst", { params: p }).then(unwrap),
  payments: (p) => http.get("/reports/payments", { params: p }).then(unwrap),
};
export const settingsApi = {
  get: () =>
    withFallback(http.get("/settings/shop").then(unwrap), {
      shopName: "Garden Greens Mart",
      ownerName: "demo",
      phone: "+91 9876543210",
      email: "billing@gardengreens.com",
      address: "123 Commercial Plaza, Main Market, Chennai",
      gstin: "33AAAAA0000A1Z5",
      state: "Tamil Nadu",
      stateCode: "33",
      invoicePrefix: "INV-",
      paperSize: "A4",
      terms: "Thank you for your business. Goods once sold cannot be returned.",
    }),
  update: (p) => http.patch("/settings/shop", p).then(unwrap),
};
export const usersApi = {
  list: () => http.get("/users").then(unwrap),
  update: (id, p) => http.patch(`/users/${id}`, p).then(unwrap),
  remove: (id) => http.delete(`/users/${id}`).then(unwrap),
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
