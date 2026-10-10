import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  PERMISSIONS_CATALOG,
  SYSTEM_ROLE_DEFINITIONS,
} from './permissions.catalog.mjs';

const rawPrisma = new PrismaClient({
  log: [],
});

let isDbAvailable = false;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 30000;

// Non-blocking probe to test if PostgreSQL is listening
export async function checkDbConnection() {
  const now = Date.now();
  if (now - lastDbCheck < DB_CHECK_INTERVAL && !isDbAvailable) {
    return false;
  }
  lastDbCheck = now;
  try {
    const probePromise = rawPrisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB probe timeout')), 800)
    );
    await Promise.race([probePromise, timeoutPromise]);
    isDbAvailable = true;
    return true;
  } catch (err) {
    isDbAvailable = false;
    return false;
  }
}

checkDbConnection().catch(() => {});

// Seed helpers for in-memory collections
const initialPermissions = PERMISSIONS_CATALOG.map((p) => ({
  id: p.id,
  key: p.key,
  module: p.module,
  action: p.action,
  description: p.description,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

const permKeyToId = new Map(initialPermissions.map((p) => [p.key, p.id]));

const initialRoles = SYSTEM_ROLE_DEFINITIONS.map((r) => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description,
  isSystem: true,
  businessId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

const initialRolePermissions = [];
let rpCounter = 1;
for (const r of SYSTEM_ROLE_DEFINITIONS) {
  for (const pKey of r.permissions) {
    const permId = permKeyToId.get(pKey);
    if (permId) {
      initialRolePermissions.push({
        id: `rp-${rpCounter++}`,
        roleId: r.id,
        permissionId: permId,
        createdAt: new Date(),
      });
    }
  }
}

// In-Memory Storage for zero-latency fallback and offline demo mode
export const memoryStore = {
  business: [
    {
      id: 'busi-01',
      name: 'Bilzet Retail Mart',
      ownerId: 'admin-01',
      email: 'admin@bilzet.com',
      phone: '+91 88254 54486',
      gstin: '33AAAAA0000A1Z5',
      address: 'Shop 12, Market Rd',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'busi-02',
      name: 'Bilzet Electronics & Gadgets',
      ownerId: 'admin-01',
      email: 'electronics@bilzet.com',
      phone: '+91 94432 10987',
      gstin: '33BBBBB1111B2Z6',
      address: '45 Anna Salai, North Branch',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  user: [
    {
      id: 'admin-01',
      name: 'Bilzet Admin',
      email: 'admin@bilzet.com',
      role: 'ADMIN',
      appRoleId: 'role-admin',
      businessId: 'busi-01',
      isOwner: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  appRole: initialRoles,
  permission: initialPermissions,
  rolePermission: initialRolePermissions,
  userPermission: [],
  subscription: [
    {
      id: 'sub-01',
      userId: 'admin-01',
      planTier: 'PRO',
      planName: 'Pro Plan',
      maxSubUsers: 5,
      status: 'ACTIVE',
      amount: 1999,
      interval: 'MONTHLY',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  customer: [
    {
      id: 'cust-01',
      businessId: 'busi-01',
      name: 'Ramesh Hardware',
      phone: '9876543210',
      email: 'ramesh@example.com',
      address: 'Shop 12, Market Rd',
      gstin: '33AAAAA0000A1Z5',
      state: 'Tamil Nadu',
      creditLimit: 50000,
      balance: 12500,
      isActive: true,
      totalOrders: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cust-02',
      businessId: 'busi-01',
      name: 'Priya Supermarket',
      phone: '9876543211',
      email: 'priya@example.com',
      address: '45 Anna Nagar',
      gstin: '33BBBBB1111B1Z6',
      state: 'Tamil Nadu',
      creditLimit: 100000,
      balance: 45000,
      isActive: true,
      totalOrders: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  category: [
    { id: 'cat-01', businessId: 'busi-01', name: 'Electronics', description: 'Electronic appliances and accessories', isActive: true, createdAt: new Date() },
    { id: 'cat-02', businessId: 'busi-01', name: 'Groceries', description: 'Daily household groceries', isActive: true, createdAt: new Date() },
    { id: 'cat-03', businessId: 'busi-01', name: 'Stationery', description: 'Office and school stationery', isActive: true, createdAt: new Date() },
  ],
  product: [
    {
      id: 'prod-01',
      businessId: 'busi-01',
      name: 'Wireless Barcode Scanner',
      sku: 'WBS-2026',
      barcode: '8901234567890',
      brand: 'Bilzet Pro',
      categoryId: 'cat-01',
      sellingPrice: 2499,
      purchasePrice: 1650,
      gstRate: 18,
      stockQuantity: 42,
      stock: 42,
      minStockAlert: 10,
      minimumStock: 10,
      unit: 'PIECE',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-02',
      businessId: 'busi-01',
      name: 'Thermal Billing Rolls (80mm x 50m)',
      sku: 'TBR-8050',
      barcode: '8901234567891',
      brand: 'Bilzet Supplies',
      categoryId: 'cat-03',
      sellingPrice: 85,
      purchasePrice: 45,
      gstRate: 12,
      stockQuantity: 180,
      stock: 180,
      minStockAlert: 30,
      minimumStock: 30,
      unit: 'ROLL',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-03',
      businessId: 'busi-01',
      name: 'Premium Basmati Rice (5kg)',
      sku: 'PBR-5KG',
      barcode: '8901234567892',
      brand: 'Royal Heritage',
      categoryId: 'cat-02',
      sellingPrice: 580,
      purchasePrice: 460,
      gstRate: 5,
      stockQuantity: 75,
      stock: 75,
      minStockAlert: 15,
      minimumStock: 15,
      unit: 'PACKET',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  sale: [],
  saleItem: [],
  payment: [],
  salesReturn: [],
  salesReturnItem: [],
  shopSettings: [
    {
      id: 'shop-01',
      shopName: 'Bilzet Retail Mart',
      ownerName: 'Karthi Kevan',
      phone: '+91 88254 54486',
      email: 'contact@bilzet.com',
      address: '123 Commercial Plaza, Main Market',
      gstin: '33AAAAA0000A1Z5',
      state: 'Tamil Nadu',
      stateCode: '33',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  expense: [],
  inventoryLog: [],
  supplier: [
    {
      id: 'sup-01',
      name: 'Raj Kumar',
      companyName: 'ABC Furniture Pvt Ltd',
      phone: '9840123456',
      email: 'raj@abcfurniture.com',
      address: 'Plot 4A, Industrial Estate, Guindy',
      gstin: '33AABCA1234A1Z5',
      balance: 15000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'sup-02',
      name: 'Suresh Patel',
      companyName: 'Bharat Packaging Solutions',
      phone: '9840987654',
      email: 'orders@bharatpack.in',
      address: '22 Ambattur Industrial Estate',
      gstin: '33BBBCB5678B1Z2',
      balance: 8400,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  purchase: [],
  purchaseOrder: [],
  debitNote: [],
  purchaseReturn: [],
  purchaseItem: [],
  warehouse: [
    {
      id: 'wh-01',
      businessId: 'busi-01',
      name: 'Main Central Godown',
      code: 'WH-MAIN',
      address: '12 Industrial Area, Guindy',
      manager: 'Ramesh Kumar',
      contactPerson: 'Ramesh Kumar',
      phone: '9840123456',
      capacity: 10000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'wh-02',
      businessId: 'busi-01',
      name: 'Retail Storage Hub #1',
      code: 'WH-RET-01',
      address: 'Shop 12 Basement, Market Rd',
      manager: 'Suresh Patel',
      contactPerson: 'Suresh Patel',
      phone: '9840987654',
      capacity: 3000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'wh-03',
      businessId: 'busi-02',
      name: 'North Logistics Hub',
      code: 'WH-NORTH',
      address: '45 Anna Salai Logistics Park',
      manager: 'Venkatesh',
      contactPerson: 'Venkatesh',
      phone: '9443210987',
      capacity: 8000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  warehouseStock: [
    {
      id: 'ws-01',
      warehouseId: 'wh-01',
      productId: 'prod-01',
      quantity: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ws-02',
      warehouseId: 'wh-01',
      productId: 'prod-02',
      quantity: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ws-03',
      warehouseId: 'wh-02',
      productId: 'prod-03',
      quantity: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  stockTransfer: [],
  staff: [
    {
      id: 'emp-01',
      staffId: 'EMP-001',
      name: 'Kavitha Raman',
      role: 'Manager',
      department: 'Operations',
      phone: '9840112233',
      email: 'kavitha@bilzet.com',
      salary: 35000,
      businessId: 'busi-01',
      status: 'ACTIVE',
      joiningDate: new Date('2025-01-15'),
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date(),
    },
    {
      id: 'emp-02',
      staffId: 'EMP-002',
      name: 'Dinesh Kumar',
      role: 'Cashier',
      department: 'Billing',
      phone: '9840223344',
      email: 'dinesh@bilzet.com',
      salary: 22000,
      businessId: 'busi-01',
      status: 'ACTIVE',
      joiningDate: new Date('2025-03-01'),
      createdAt: new Date('2025-03-01'),
      updatedAt: new Date(),
    },
    {
      id: 'emp-03',
      staffId: 'EMP-003',
      name: 'Meena Sundaram',
      role: 'Staff',
      department: 'Inventory',
      phone: '9840334455',
      email: 'meena@bilzet.com',
      salary: 20000,
      businessId: 'busi-01',
      status: 'ACTIVE',
      joiningDate: new Date('2025-06-10'),
      createdAt: new Date('2025-06-10'),
      updatedAt: new Date(),
    },
    {
      id: 'emp-04',
      staffId: 'EMP-004',
      name: 'Raghav Sharma',
      role: 'Staff',
      department: 'Logistics',
      phone: '9840445566',
      email: 'raghav@bilzet.com',
      salary: 21000,
      businessId: 'busi-02',
      status: 'ACTIVE',
      joiningDate: new Date('2025-07-20'),
      createdAt: new Date('2025-07-20'),
      updatedAt: new Date(),
    },
  ],
  staffAttendance: [
    {
      id: 'att-01',
      staffId: 'emp-02',
      businessId: 'busi-01',
      date: new Date(),
      status: 'PRESENT',
      hours: 8.0,
      checkIn: new Date(),
      notes: 'Morning shift',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  staffPayroll: [
    {
      id: 'pay-01',
      staffId: 'emp-02',
      businessId: 'busi-01',
      month: 9,
      year: 2026,
      basicSalary: 22000,
      allowances: 1000,
      deductions: 500,
      netSalary: 22500,
      paymentStatus: 'PAID',
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  auditLog: [],
  payment: [],
  caStoreAccess: [],
};

function matchesWhere(item, where) {
  if (!where || Object.keys(where).length === 0) return true;

  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(value)) {
      const orMatched = value.some((subWhere) => matchesWhere(item, subWhere));
      if (!orMatched) return false;
      continue;
    }
    if (key === 'AND' && Array.isArray(value)) {
      const andMatched = value.every((subWhere) => matchesWhere(item, subWhere));
      if (!andMatched) return false;
      continue;
    }
    if (key === 'NOT') {
      if (matchesWhere(item, value)) return false;
      continue;
    }

    // Compound unique keys like roleId_permissionId: { roleId, permissionId }
    if (key.includes('_') && typeof value === 'object' && value !== null && !(value instanceof Date)) {
      const parts = key.split('_');
      if (parts.length > 1 && parts.every((p) => p in value)) {
        const compoundMatch = parts.every((p) => item[p] === value[p]);
        if (!compoundMatch) return false;
        continue;
      }
    }

    // Direct null or undefined match
    if (value === null) {
      if (item[key] !== null && item[key] !== undefined) return false;
      continue;
    }

    if (key === 'businessId' && typeof value === 'string') {
      if (item.businessId === value) continue;
      if (!item.businessId && (value === 'busi-01' || value === 'busi-default')) continue;
      return false;
    }

    const itemVal = item[key];

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if ('equals' in value) {
        if (value.equals === null) {
          if (itemVal !== null && itemVal !== undefined) return false;
        } else if (itemVal !== value.equals) {
          return false;
        }
      }
      if ('contains' in value) {
        const needle = String(value.contains).toLowerCase();
        const haystack = String(itemVal || '').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if ('in' in value && Array.isArray(value.in)) {
        if (!value.in.includes(itemVal)) return false;
      }
      if ('not' in value) {
        if (value.not === null) {
          if (itemVal === null || itemVal === undefined) return false;
        } else if (itemVal === value.not) {
          return false;
        }
      }
      if ('notIn' in value && Array.isArray(value.notIn)) {
        if (value.notIn.includes(itemVal)) return false;
      }
      if ('gte' in value) {
        const a = itemVal instanceof Date ? itemVal.getTime() : (value.gte instanceof Date ? new Date(itemVal).getTime() : itemVal);
        const b = value.gte instanceof Date ? value.gte.getTime() : (itemVal instanceof Date ? new Date(value.gte).getTime() : value.gte);
        if (a < b) return false;
      }
      if ('lte' in value) {
        const a = itemVal instanceof Date ? itemVal.getTime() : (value.lte instanceof Date ? new Date(itemVal).getTime() : itemVal);
        const b = value.lte instanceof Date ? value.lte.getTime() : (itemVal instanceof Date ? new Date(value.lte).getTime() : value.lte);
        if (a > b) return false;
      }
      if ('gt' in value) {
        const a = itemVal instanceof Date ? itemVal.getTime() : (value.gt instanceof Date ? new Date(itemVal).getTime() : itemVal);
        const b = value.gt instanceof Date ? value.gt.getTime() : (itemVal instanceof Date ? new Date(value.gt).getTime() : value.gt);
        if (a <= b) return false;
      }
      if ('lt' in value) {
        const a = itemVal instanceof Date ? itemVal.getTime() : (value.lt instanceof Date ? new Date(itemVal).getTime() : itemVal);
        const b = value.lt instanceof Date ? value.lt.getTime() : (itemVal instanceof Date ? new Date(value.lt).getTime() : value.lt);
        if (a >= b) return false;
      }
    } else {
      if (itemVal !== value) return false;
    }
  }

  return true;
}

function resolveIncludes(modelName, item, include) {
  if (!item || !include || typeof include !== 'object') return item;
  const clone = { ...item };

  if (modelName === 'user') {
    if (include.appRole) {
      const role = memoryStore.appRole?.find((r) => r.id === clone.appRoleId) || null;
      if (role && typeof include.appRole === 'object' && include.appRole.include) {
        clone.appRole = resolveIncludes('appRole', role, include.appRole.include);
      } else {
        clone.appRole = role;
      }
    }
    if (include.permissionOverrides) {
      const overrides = (memoryStore.userPermission || []).filter((up) => up.userId === clone.id);
      if (typeof include.permissionOverrides === 'object' && include.permissionOverrides.include) {
        clone.permissionOverrides = overrides.map((up) =>
          resolveIncludes('userPermission', up, include.permissionOverrides.include)
        );
      } else {
        clone.permissionOverrides = overrides;
      }
    }
    if (include.business) {
      clone.business = memoryStore.business?.find((b) => b.id === clone.businessId) || null;
    }
    if (include.subscriptions) {
      let subs = (memoryStore.subscription || []).filter((s) => s.userId === clone.id);
      if (include.subscriptions.where) {
        subs = subs.filter((s) => matchesWhere(s, include.subscriptions.where));
      }
      if (include.subscriptions.take) {
        subs = subs.slice(0, include.subscriptions.take);
      }
      clone.subscriptions = subs;
    }
    if (include.attendances) {
      let atts = (memoryStore.staffAttendance || []).filter((a) => a.userId === clone.id);
      if (include.attendances.where) {
        atts = atts.filter((a) => matchesWhere(a, include.attendances.where));
      }
      clone.attendances = atts;
    }
    if (include.staffRecord) {
      clone.staffRecord = memoryStore.staff?.find((s) => s.userId === clone.id) || null;
    }
    if (include._count) {
      clone._count = clone._count || {};
      if (include._count.select?.permissionOverrides) {
        clone._count.permissionOverrides = (memoryStore.userPermission || []).filter(
          (up) => up.userId === clone.id
        ).length;
      }
    }
  }

  if (modelName === 'staff') {
    if (include.attendances) {
      let atts = (memoryStore.staffAttendance || []).filter((a) => a.staffId === clone.id);
      if (include.attendances.where) {
        atts = atts.filter((a) => matchesWhere(a, include.attendances.where));
      }
      if (include.attendances.take) {
        atts = atts.slice(0, include.attendances.take);
      }
      clone.attendances = atts;
    }
    if (include.user) {
      clone.user = memoryStore.user?.find((u) => u.id === clone.userId) || null;
    }
    if (include.business) {
      clone.business = memoryStore.business?.find((b) => b.id === clone.businessId) || null;
    }
  }

  if (modelName === 'staffAttendance') {
    if (include.staff) {
      clone.staff = memoryStore.staff?.find((s) => s.id === clone.staffId) || null;
    }
    if (include.user) {
      clone.user = memoryStore.user?.find((u) => u.id === clone.userId) || null;
    }
    if (include.business) {
      clone.business = memoryStore.business?.find((b) => b.id === clone.businessId) || null;
    }
  }

  if (modelName === 'appRole') {
    if (include.permissions) {
      const rps = (memoryStore.rolePermission || []).filter((rp) => rp.roleId === clone.id);
      if (typeof include.permissions === 'object' && include.permissions.include) {
        clone.permissions = rps.map((rp) =>
          resolveIncludes('rolePermission', rp, include.permissions.include)
        );
      } else {
        clone.permissions = rps;
      }
    }
    if (include.users) {
      clone.users = (memoryStore.user || []).filter((u) => u.appRoleId === clone.id);
    }
    if (include._count) {
      clone._count = clone._count || {};
      if (include._count.select?.users) {
        clone._count.users = (memoryStore.user || []).filter((u) => u.appRoleId === clone.id).length;
      }
    }
  }

  if (modelName === 'rolePermission') {
    if (include.permission) {
      clone.permission = memoryStore.permission?.find((p) => p.id === clone.permissionId) || null;
    }
    if (include.role) {
      clone.role = memoryStore.appRole?.find((r) => r.id === clone.roleId) || null;
    }
  }

  if (modelName === 'userPermission') {
    if (include.permission) {
      clone.permission = memoryStore.permission?.find((p) => p.id === clone.permissionId) || null;
    }
    if (include.user) {
      clone.user = memoryStore.user?.find((u) => u.id === clone.userId) || null;
    }
  }

  if (modelName === 'business') {
    if (include.owner) {
      const owner = memoryStore.user?.find((u) => u.id === clone.ownerId) || null;
      if (owner && typeof include.owner === 'object' && include.owner.include) {
        clone.owner = resolveIncludes('user', owner, include.owner.include);
      } else {
        clone.owner = owner;
      }
    }
    if (include.members || include.users) {
      clone.members = (memoryStore.user || []).filter((u) => u.businessId === clone.id);
    }
    if (include.staffMembers) {
      clone.staffMembers = (memoryStore.staff || []).filter((s) => s.businessId === clone.id);
    }
    if (include.attendances) {
      clone.attendances = (memoryStore.staffAttendance || []).filter((a) => a.businessId === clone.id);
    }
    if (include.roles) {
      clone.roles = (memoryStore.appRole || []).filter((r) => r.businessId === clone.id);
    }
  }

  if (modelName === 'category') {
    if (include._count) {
      clone._count = clone._count || {};
      if (include._count.select?.products) {
        clone._count.products = (memoryStore.product || []).filter(
          (p) => (p.categoryId === clone.id || p.categoryId === clone._id) && p.isActive !== false
        ).length;
      }
    }
  }

  if (modelName === 'product') {
    if (include.category) {
      clone.category = memoryStore.category?.find((c) => c.id === clone.categoryId) || null;
    }
  }

  if (modelName === 'sale') {
    if (include.customer) {
      clone.customer = memoryStore.customer?.find((c) => c.id === clone.customerId) || null;
    }
    if (include.items) {
      clone.items = (memoryStore.saleItem || []).filter((si) => si.saleId === clone.id);
    }
    if (include.payments) {
      clone.payments = (memoryStore.payment || []).filter((p) => p.saleId === clone.id);
    }
    if (include.returns) {
      let rets = (memoryStore.salesReturn || []).filter((r) => r.saleId === clone.id);
      if (typeof include.returns === 'object' && include.returns.include) {
        rets = rets.map((r) => resolveIncludes('salesReturn', r, include.returns.include));
      }
      clone.returns = rets;
    }
    if (include.auditLogs) {
      let logs = (memoryStore.auditLog || []).filter((l) => l.entityId === clone.id);
      if (typeof include.auditLogs === 'object' && include.auditLogs.include) {
        logs = logs.map((l) => resolveIncludes('auditLog', l, include.auditLogs.include));
      }
      clone.auditLogs = logs;
    }
    if (include.createdBy) {
      const u = memoryStore.user?.find((usr) => usr.id === clone.createdById) || null;
      if (u && typeof include.createdBy === 'object' && include.createdBy.select) {
        clone.createdBy = applySelect('user', u, include.createdBy.select);
      } else {
        clone.createdBy = u;
      }
    }
    if (include.business) {
      clone.business = memoryStore.business?.find((b) => b.id === clone.businessId) || null;
    }
  }

  if (modelName === 'salesReturn') {
    if (include.items) {
      clone.items = (memoryStore.salesReturnItem || []).filter((sri) => sri.salesReturnId === clone.id || sri.returnId === clone.id);
    }
    if (include.sale) {
      const sl = memoryStore.sale?.find((s) => s.id === clone.saleId) || null;
      if (sl && typeof include.sale === 'object' && include.sale.include) {
        clone.sale = resolveIncludes('sale', sl, include.sale.include);
      } else {
        clone.sale = sl;
      }
    }
    if (include.customer) {
      clone.customer = memoryStore.customer?.find((c) => c.id === clone.customerId) || null;
    }
  }

  if (modelName === 'auditLog') {
    if (include.user) {
      clone.user = memoryStore.user?.find((u) => u.id === clone.userId) || null;
    }
  }

  if (modelName === 'purchase') {
    if (include.supplier) {
      clone.supplier = memoryStore.supplier?.find((s) => s.id === clone.supplierId) || null;
    }
    if (include.items) {
      clone.items = (memoryStore.purchaseItem || []).filter((pi) => pi.purchaseId === clone.id);
    }
  }

  if (modelName === 'purchaseOrder') {
    if (include.supplier) {
      clone.supplier = memoryStore.supplier?.find((s) => s.id === clone.supplierId) || null;
    }
  }

  if (modelName === 'debitNote') {
    if (include.supplier) {
      clone.supplier = memoryStore.supplier?.find((s) => s.id === clone.supplierId) || null;
    }
    if (include.purchase) {
      clone.purchase = memoryStore.purchase?.find((p) => p.invoiceNumber === clone.referenceInvoice || p.id === clone.purchaseId) || null;
    }
  }

  if (modelName === 'warehouse') {
    if (include.stocks) {
      const whStocks = (memoryStore.warehouseStock || []).filter((ws) => ws.warehouseId === clone.id);
      if (typeof include.stocks === 'object' && include.stocks.include) {
        clone.stocks = whStocks.map((ws) => resolveIncludes('warehouseStock', ws, include.stocks.include));
      } else {
        clone.stocks = whStocks;
      }
    }
  }

  if (modelName === 'warehouseStock') {
    if (include.product) {
      const prod = (memoryStore.product || []).find((p) => p.id === clone.productId);
      if (prod && typeof include.product === 'object' && include.product.select) {
        clone.product = applySelect('product', prod, include.product.select);
      } else {
        clone.product = prod || null;
      }
    }
  }

  if (modelName === 'stockTransfer') {
    if (include.product) {
      const p = (memoryStore.product || []).find((pr) => pr.id === clone.productId);
      clone.product = p ? applySelect('product', p, include.product.select || include.product) : null;
    }
    if (include.fromWarehouse) {
      const wh = (memoryStore.warehouse || []).find((w) => w.id === clone.fromWarehouseId);
      clone.fromWarehouse = wh ? applySelect('warehouse', wh, include.fromWarehouse.select || include.fromWarehouse) : null;
    }
    if (include.toWarehouse) {
      const wh = (memoryStore.warehouse || []).find((w) => w.id === clone.toWarehouseId);
      clone.toWarehouse = wh ? applySelect('warehouse', wh, include.toWarehouse.select || include.toWarehouse) : null;
    }
  }

  return clone;
}

function applySelect(modelName, item, select) {
  if (!item || !select) return item;
  const resolved = resolveIncludes(modelName, item, select);
  const result = {};

  for (const [key, value] of Object.entries(select)) {
    if (value === true) {
      result[key] = resolved[key];
    } else if (typeof value === 'object' && value !== null) {
      if (key === '_count' && resolved._count) {
        result._count = resolved._count;
      } else if (resolved[key] && typeof resolved[key] === 'object' && !Array.isArray(resolved[key])) {
        const targetModel = key === 'appRole' ? 'appRole' : key;
        result[key] = applySelect(targetModel, resolved[key], value.select || value);
      } else {
        result[key] = resolved[key];
      }
    }
  }

  return result;
}

function createModelHandler(modelName) {
  return {
    async findMany(args = {}) {
      const list = memoryStore[modelName] || [];
      let result = list.filter((item) => matchesWhere(item, args.where));

      if (args.orderBy) {
        const orderKey = Object.keys(args.orderBy)[0];
        const dir = args.orderBy[orderKey] === 'asc' ? 1 : -1;
        result.sort((a, b) => {
          if (a[orderKey] < b[orderKey]) return -1 * dir;
          if (a[orderKey] > b[orderKey]) return 1 * dir;
          return 0;
        });
      }

      const skip = args.skip || 0;
      const take = args.take !== undefined ? args.take : result.length;
      result = result.slice(skip, skip + take);

      if (args.select) {
        return result.map((item) => applySelect(modelName, item, args.select));
      }

      if (args.include) {
        return result.map((item) => resolveIncludes(modelName, item, args.include));
      }

      return result.map((item) => ({ ...item }));
    },

    async findFirst(args = {}) {
      const list = memoryStore[modelName] || [];
      const item = list.find((it) => matchesWhere(it, args.where)) || null;
      if (!item) return null;
      if (args.select) return applySelect(modelName, item, args.select);
      if (args.include) return resolveIncludes(modelName, item, args.include);
      return { ...item };
    },

    async findUnique(args = {}) {
      const list = memoryStore[modelName] || [];
      const item = list.find((it) => matchesWhere(it, args.where)) || null;
      if (!item) return null;
      if (args.select) return applySelect(modelName, item, args.select);
      if (args.include) return resolveIncludes(modelName, item, args.include);
      return { ...item };
    },

    async count(args = {}) {
      const list = memoryStore[modelName] || [];
      return list.filter((item) => matchesWhere(item, args.where)).length;
    },

    async create(args = {}) {
      if (!memoryStore[modelName]) memoryStore[modelName] = [];
      const newRecord = {
        id: args.data?.id || `${modelName.slice(0, 4)}-${crypto.randomUUID().slice(0, 8)}`,
        isActive: args.data?.isActive !== undefined ? args.data.isActive : true,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // Keep stock aliases in sync for products
      if (modelName === 'product') {
        if (newRecord.isActive === undefined) {
          newRecord.isActive = true;
        }
        if (newRecord.stock !== undefined) {
          newRecord.stock = Number(newRecord.stock);
          newRecord.stockQuantity = Number(newRecord.stock);
        } else if (newRecord.stockQuantity !== undefined) {
          newRecord.stock = Number(newRecord.stockQuantity);
          newRecord.stockQuantity = Number(newRecord.stockQuantity);
        }
        if (newRecord.minimumStock !== undefined) {
          newRecord.minimumStock = Number(newRecord.minimumStock);
          newRecord.minStockAlert = Number(newRecord.minimumStock);
        } else if (newRecord.minStockAlert !== undefined) {
          newRecord.minimumStock = Number(newRecord.minStockAlert);
          newRecord.minStockAlert = Number(newRecord.minStockAlert);
        }
      }

      // Handle nested items creation for sale records
      if (modelName === 'sale' && args.data?.items?.create) {
        if (!memoryStore.saleItem) memoryStore.saleItem = [];
        const itemsToCreate = Array.isArray(args.data.items.create)
          ? args.data.items.create
          : [args.data.items.create];
        const createdSaleItems = itemsToCreate.map((item) => {
          const sItem = {
            id: item.id || `si-${crypto.randomUUID().slice(0, 8)}`,
            saleId: newRecord.id,
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          memoryStore.saleItem.push(sItem);
          return sItem;
        });
        newRecord.items = createdSaleItems;
      }

      // Handle nested items creation for salesReturn records
      if (modelName === 'salesReturn' && args.data?.items?.create) {
        if (!memoryStore.salesReturnItem) memoryStore.salesReturnItem = [];
        const itemsToCreate = Array.isArray(args.data.items.create)
          ? args.data.items.create
          : [args.data.items.create];
        const createdReturnItems = itemsToCreate.map((item) => {
          const rItem = {
            id: item.id || `sri-${crypto.randomUUID().slice(0, 8)}`,
            salesReturnId: newRecord.id,
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          memoryStore.salesReturnItem.push(rItem);
          return rItem;
        });
        newRecord.items = createdReturnItems;
      }

      memoryStore[modelName].unshift(newRecord);
      if (args.select) return applySelect(modelName, newRecord, args.select);
      if (args.include) return resolveIncludes(modelName, newRecord, args.include);
      return { ...newRecord };
    },

    async createMany(args = {}) {
      if (!memoryStore[modelName]) memoryStore[modelName] = [];
      const items = Array.isArray(args.data) ? args.data : [args.data];
      let count = 0;
      for (const d of items) {
        const newRecord = {
          id: d.id || `${modelName.slice(0, 4)}-${crypto.randomUUID().slice(0, 8)}`,
          ...d,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryStore[modelName].push(newRecord);
        count++;
      }
      return { count };
    },

    async update(args = {}) {
      const list = memoryStore[modelName] || [];
      const index = list.findIndex((item) => matchesWhere(item, args.where));
      if (index === -1) {
        return args.data;
      }
      const updated = {
        ...list[index],
        ...args.data,
        updatedAt: new Date(),
      };
      for (const [key, val] of Object.entries(args.data || {})) {
        if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
          if ('increment' in val) {
            updated[key] = (Number(list[index][key]) || 0) + Number(val.increment);
          } else if ('decrement' in val) {
            updated[key] = Math.max(0, (Number(list[index][key]) || 0) - Number(val.decrement));
          }
        }
      }
      if (modelName === 'product') {
        if (args.data?.stock !== undefined) {
          updated.stock = Number(args.data.stock);
          updated.stockQuantity = Number(args.data.stock);
        } else if (args.data?.stockQuantity !== undefined) {
          updated.stock = Number(args.data.stockQuantity);
          updated.stockQuantity = Number(args.data.stockQuantity);
        }

        if (args.data?.minimumStock !== undefined) {
          updated.minimumStock = Number(args.data.minimumStock);
          updated.minStockAlert = Number(args.data.minimumStock);
        } else if (args.data?.minStockAlert !== undefined) {
          updated.minimumStock = Number(args.data.minStockAlert);
          updated.minStockAlert = Number(args.data.minStockAlert);
        }
      }
      list[index] = updated;
      if (args.select) return applySelect(modelName, updated, args.select);
      if (args.include) return resolveIncludes(modelName, updated, args.include);
      return { ...updated };
    },

    async updateMany(args = {}) {
      const list = memoryStore[modelName] || [];
      let count = 0;
      for (let i = 0; i < list.length; i++) {
        if (matchesWhere(list[i], args.where)) {
          list[i] = {
            ...list[i],
            ...args.data,
            updatedAt: new Date(),
          };
          count++;
        }
      }
      return { count };
    },

    async upsert(args = {}) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) {
        return this.update({
          where: args.where,
          data: args.update,
          select: args.select,
          include: args.include,
        });
      }
      return this.create({
        data: args.create,
        select: args.select,
        include: args.include,
      });
    },

    async delete(args = {}) {
      const list = memoryStore[modelName] || [];
      const index = list.findIndex((item) => matchesWhere(item, args.where));
      if (index !== -1) {
        const deleted = list.splice(index, 1)[0];
        return deleted;
      }
      return null;
    },

    async deleteMany(args = {}) {
      const list = memoryStore[modelName] || [];
      const initialCount = list.length;
      memoryStore[modelName] = list.filter((item) => !matchesWhere(item, args.where));
      return { count: initialCount - memoryStore[modelName].length };
    },

    async aggregate(args = {}) {
      const list = memoryStore[modelName] || [];
      const filtered = list.filter((item) => matchesWhere(item, args.where));
      const res = { _count: { id: filtered.length } };
      if (args._sum) {
        res._sum = {};
        for (const k of Object.keys(args._sum)) {
          res._sum[k] = filtered.reduce((acc, curr) => acc + (Number(curr[k]) || 0), 0);
        }
      }
      return res;
    },

    async groupBy() {
      return [];
    },
  };
}

// Resilient Prisma Proxy
export const resilientPrisma = new Proxy(rawPrisma, {
  get(target, prop, receiver) {
    if (prop === '$transaction') {
      return async (arg) => {
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        if (typeof arg === 'function') {
          return arg(resilientPrisma);
        }
        return [];
      };
    }
    if (prop === '$queryRaw' || prop === '$executeRaw') {
      return async () => [];
    }
    if (prop === '$connect' || prop === '$disconnect') {
      return async () => {};
    }
    if (prop === 'isDbAvailable') {
      return isDbAvailable;
    }

    // Intercept model calls
    if (typeof prop === 'string' && !prop.startsWith('$')) {
      const rawModel = target[prop];
      const fallbackModel = createModelHandler(prop);

      return new Proxy(rawModel || {}, {
        get(mTarget, mProp) {
          return async (...args) => {
            // If DB is known to be available, try Prisma first with a fast safety timeout
            if (isDbAvailable && rawModel && typeof rawModel[mProp] === 'function') {
              try {
                const callPromise = rawModel[mProp](...args);
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Prisma query timeout')), 3000)
                );
                return await Promise.race([callPromise, timeoutPromise]);
              } catch (err) {
                // If DB connection dropped, switch to in-memory mode
                if (err.message?.includes("Can't reach database server") || err.message?.includes('timeout')) {
                  isDbAvailable = false;
                  lastDbCheck = Date.now();
                }
              }
            }

            // High-performance instant in-memory fallback
            if (fallbackModel && typeof fallbackModel[mProp] === 'function') {
              return fallbackModel[mProp](...args);
            }

            return null;
          };
        },
      });
    }

    return Reflect.get(target, prop, receiver);
  },
});

export default resilientPrisma;
