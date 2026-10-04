import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

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

// In-Memory Storage for zero-latency fallback and offline demo mode
export const memoryStore = {
  user: [
    {
      id: 'admin-01',
      name: 'Bilzet Admin',
      email: 'admin@bilzet.com',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ],
  customer: [
    {
      id: 'cust-01',
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
    }
  ],
  category: [
    { id: 'cat-01', name: 'Electronics', description: 'Electronic appliances and accessories', isActive: true, createdAt: new Date() },
    { id: 'cat-02', name: 'Groceries', description: 'Daily household groceries', isActive: true, createdAt: new Date() },
    { id: 'cat-03', name: 'Stationery', description: 'Office and school stationery', isActive: true, createdAt: new Date() },
  ],
  product: [
    {
      id: 'prod-01',
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
    }
  ],
  sale: [],
  saleItem: [],
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
    }
  ],
  expense: [],
  inventoryLog: [],
  supplier: [
    {
      id: 'sup-01',
      name: 'Apex FMCG Distributors',
      phone: '9840123456',
      email: 'sales@apexfmcg.com',
      address: 'Plot 4A, Industrial Estate, Guindy',
      gstin: '33AABCA1234A1Z5',
      balance: 15000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'sup-02',
      name: 'Bharat Packaging Solutions',
      phone: '9840987654',
      email: 'orders@bharatpack.in',
      address: '22 Ambattur Industrial Estate',
      gstin: '33BBBCB5678B1Z2',
      balance: 8400,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ],
  purchase: [],
  warehouse: [],
  staff: [],
  auditLog: [],
  payment: [],
};

function matchesWhere(item, where) {
  if (!where || Object.keys(where).length === 0) return true;

  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(value)) {
      const orMatched = value.some(subWhere => matchesWhere(item, subWhere));
      if (!orMatched) return false;
      continue;
    }
    if (key === 'AND' && Array.isArray(value)) {
      const andMatched = value.every(subWhere => matchesWhere(item, subWhere));
      if (!andMatched) return false;
      continue;
    }
    if (key === 'NOT') {
      if (matchesWhere(item, value)) return false;
      continue;
    }

    const itemVal = item[key];

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if ('equals' in value && itemVal !== value.equals) return false;
      if ('contains' in value) {
        const needle = String(value.contains).toLowerCase();
        const haystack = String(itemVal || '').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if ('in' in value && Array.isArray(value.in)) {
        if (!value.in.includes(itemVal)) return false;
      }
      if ('gte' in value && itemVal < value.gte) return false;
      if ('lte' in value && itemVal > value.lte) return false;
      if ('gt' in value && itemVal <= value.gt) return false;
      if ('lt' in value && itemVal >= value.lt) return false;
    } else {
      if (itemVal !== value) return false;
    }
  }

  return true;
}

function createModelHandler(modelName) {
  return {
    async findMany(args = {}) {
      const list = memoryStore[modelName] || [];
      let result = list.filter(item => matchesWhere(item, args.where));

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
        return result.map(item => {
          const selected = {};
          for (const k of Object.keys(args.select)) {
            if (args.select[k]) selected[k] = item[k];
          }
          return selected;
        });
      }

      return result;
    },

    async findFirst(args = {}) {
      const list = memoryStore[modelName] || [];
      return list.find(item => matchesWhere(item, args.where)) || null;
    },

    async findUnique(args = {}) {
      const list = memoryStore[modelName] || [];
      return list.find(item => matchesWhere(item, args.where)) || null;
    },

    async count(args = {}) {
      const list = memoryStore[modelName] || [];
      return list.filter(item => matchesWhere(item, args.where)).length;
    },

    async create(args = {}) {
      if (!memoryStore[modelName]) memoryStore[modelName] = [];
      const newRecord = {
        id: args.data?.id || `${modelName.slice(0, 4)}-${crypto.randomUUID().slice(0, 8)}`,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      // Keep stock aliases in sync for products
      if (modelName === 'product') {
        if (newRecord.stockQuantity !== undefined && newRecord.stock === undefined) {
          newRecord.stock = newRecord.stockQuantity;
        }
        if (newRecord.minStockAlert !== undefined && newRecord.minimumStock === undefined) {
          newRecord.minimumStock = newRecord.minStockAlert;
        }
      }
      memoryStore[modelName].unshift(newRecord);
      return newRecord;
    },

    async update(args = {}) {
      const list = memoryStore[modelName] || [];
      const index = list.findIndex(item => matchesWhere(item, args.where));
      if (index === -1) {
        return args.data;
      }
      const updated = {
        ...list[index],
        ...args.data,
        updatedAt: new Date(),
      };
      if (modelName === 'product') {
        if (updated.stockQuantity !== undefined) updated.stock = updated.stockQuantity;
        if (updated.minStockAlert !== undefined) updated.minimumStock = updated.minStockAlert;
      }
      list[index] = updated;
      return updated;
    },

    async upsert(args = {}) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      }
      return this.create({ data: args.create });
    },

    async delete(args = {}) {
      const list = memoryStore[modelName] || [];
      const index = list.findIndex(item => matchesWhere(item, args.where));
      if (index !== -1) {
        const deleted = list.splice(index, 1)[0];
        return deleted;
      }
      return null;
    },

    async deleteMany(args = {}) {
      const list = memoryStore[modelName] || [];
      const initialCount = list.length;
      memoryStore[modelName] = list.filter(item => !matchesWhere(item, args.where));
      return { count: initialCount - memoryStore[modelName].length };
    },

    async aggregate(args = {}) {
      const list = memoryStore[modelName] || [];
      const filtered = list.filter(item => matchesWhere(item, args.where));
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
    }
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
        }
      });
    }

    return Reflect.get(target, prop, receiver);
  }
});

export default resilientPrisma;
