import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import {
  PERMISSIONS_CATALOG,
  SYSTEM_ROLE_DEFINITIONS,
} from './permissions.catalog.mjs';

let rawPrisma = null;
try {
  rawPrisma = new PrismaClient({
    log: [],
  });
} catch (err) {
  console.warn('[ResilientPrisma] Could not initialize PrismaClient; continuing with resilient in-memory storage:', err?.message);
}

let isDbAvailable = false;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 30000;

// Non-blocking probe to test if PostgreSQL is listening
export async function checkDbConnection() {
  if (!rawPrisma || typeof rawPrisma.$queryRaw !== 'function') {
    isDbAvailable = false;
    return false;
  }
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

// Seed realistic sales, purchases, and payments
const seedTransactions = (() => {
  const now = new Date();
  const sales = [];
  const saleItems = [];
  const payments = [];
  const purchases = [];
  const purchaseItems = [];
  const expenses = [];

  const dailyPattern = [
    { daysAgo: 6, sales: [22300], purchases: [10500] },
    { daysAgo: 5, sales: [17900], purchases: [7800] },
    { daysAgo: 4, sales: [24800], purchases: [11400] },
    { daysAgo: 3, sales: [19400], purchases: [6200] },
    { daysAgo: 2, sales: [21500, 9800], purchases: [9500] },
    { daysAgo: 1, sales: [18200, 8400], purchases: [12000] },
    { daysAgo: 0, sales: [12500, 9450, 6500], purchases: [8400] },
  ];

  const stores = ['busi-01', 'busi-02'];
  stores.forEach((bizId) => {
    dailyPattern.forEach((dp, idx) => {
      const d = new Date(now.getTime() - dp.daysAgo * 86400000);
      dp.sales.forEach((amt, sIdx) => {
        const isCredit = dp.daysAgo === 0 && sIdx === 2;
        const paid = isCredit ? 0 : amt;
        const saleId = `sale-${bizId}-${idx}-${sIdx}`;
        sales.push({
          id: saleId,
          invoiceNumber: `INV-${bizId.toUpperCase()}-${idx * 10 + sIdx + 1}`,
          businessId: bizId,
          customerId: isCredit ? 'cust-01' : sIdx % 2 === 0 ? 'cust-01' : 'cust-02',
          subtotal: Math.round(amt / 1.18),
          taxTotal: amt - Math.round(amt / 1.18),
          grandTotal: amt,
          paidAmount: paid,
          paymentStatus: isCredit ? 'UNPAID' : 'PAID',
          paymentMethod: isCredit ? 'CREDIT' : sIdx % 2 === 0 ? 'UPI' : 'CASH',
          status: 'COMPLETED',
          dueDate: isCredit ? new Date(now.getTime() + 7 * 86400000) : null,
          createdAt: d,
          updatedAt: d,
        });
        saleItems.push({
          id: `si-${bizId}-${idx}-${sIdx}`,
          saleId,
          productId: 'prod-01',
          name: 'Basmati Rice Premium 5kg',
          sku: 'PBR-5KG',
          quantity: Math.max(1, Math.round(amt / 1500)),
          price: 1500,
          total: amt,
        });
        if (paid > 0) {
          payments.push({
            id: `pay-${bizId}-${idx}-${sIdx}`,
            saleId,
            customerId: sIdx % 2 === 0 ? 'cust-01' : 'cust-02',
            amount: paid,
            method: sIdx % 2 === 0 ? 'UPI' : 'CASH',
            createdAt: d,
          });
        }
      });

      dp.purchases.forEach((pAmt, pIdx) => {
        const purId = `pur-${bizId}-${idx}-${pIdx}`;
        purchases.push({
          id: purId,
          invoiceNumber: `PUR-${bizId.toUpperCase()}-${idx * 10 + pIdx + 1}`,
          supplierId: pIdx % 2 === 0 ? 'sup-01' : 'sup-02',
          businessId: bizId,
          subtotal: Math.round(pAmt / 1.12),
          taxTotal: pAmt - Math.round(pAmt / 1.12),
          grandTotal: pAmt,
          paidAmount: pAmt,
          paymentStatus: 'PAID',
          createdAt: d,
          updatedAt: d,
        });
        purchaseItems.push({
          id: `pi-${bizId}-${idx}-${pIdx}`,
          purchaseId: purId,
          productId: 'prod-02',
          quantity: 50,
          price: 45,
          total: pAmt,
        });
      });

      expenses.push({
        id: `exp-${bizId}-${idx}`,
        businessId: bizId,
        category: 'Store Utility & Operations',
        amount: 1200,
        date: d,
        createdAt: d,
        updatedAt: d,
      });
    });

    // Additional 3 weeks of earlier history for "This Month" and "This Year"
    for (let w = 1; w <= 3; w++) {
      const d = new Date(now.getTime() - (w * 7 + 3) * 86400000);
      const sAmt = 26000 + w * 2500;
      const pAmt = 11000 + w * 1200;
      const sId = `sale-w-${bizId}-${w}`;
      sales.push({
        id: sId,
        invoiceNumber: `INV-${bizId.toUpperCase()}-W0${w}`,
        businessId: bizId,
        customerId: 'cust-02',
        subtotal: Math.round(sAmt / 1.18),
        taxTotal: sAmt - Math.round(sAmt / 1.18),
        grandTotal: sAmt,
        paidAmount: sAmt,
        paymentStatus: 'PAID',
        paymentMethod: 'UPI',
        status: 'COMPLETED',
        createdAt: d,
        updatedAt: d,
      });
      purchases.push({
        id: `pur-w-${bizId}-${w}`,
        invoiceNumber: `PUR-${bizId.toUpperCase()}-W0${w}`,
        supplierId: 'sup-01',
        businessId: bizId,
        subtotal: Math.round(pAmt / 1.12),
        taxTotal: pAmt - Math.round(pAmt / 1.12),
        grandTotal: pAmt,
        paidAmount: pAmt,
        paymentStatus: 'PAID',
        createdAt: d,
        updatedAt: d,
      });
    }
  });

  return { sales, saleItems, payments, purchases, purchaseItems, expenses };
})();

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
  // No subscriptions in the fallback memory store — all users start on FREE by default.
  // Paid subscriptions are only created after verified payment via upgradeSubscription().
  subscription: [],
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
    { id: 'cat-01', businessId: 'busi-01', name: 'Electronics', description: 'Electronic appliances and accessories', defaultGstRate: 18, isActive: true, createdAt: new Date() },
    { id: 'cat-02', businessId: 'busi-01', name: 'Groceries', description: 'Daily household groceries', defaultGstRate: 5, isActive: true, createdAt: new Date() },
    { id: 'cat-03', businessId: 'busi-01', name: 'Stationery', description: 'Office and school stationery', defaultGstRate: 12, isActive: true, createdAt: new Date() },
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
    {
      id: 'prod-low-01',
      businessId: 'busi-01',
      name: 'Basmati Rice Premium 5kg',
      sku: 'PRD-001',
      barcode: '8901000000001',
      sellingPrice: 480,
      purchasePrice: 380,
      stock: 4,
      minimumStock: 15,
      unit: 'PACKET',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-low-02',
      businessId: 'busi-01',
      name: 'Sunflower Cooking Oil 1L',
      sku: 'PRD-002',
      barcode: '8901000000002',
      sellingPrice: 145,
      purchasePrice: 110,
      stock: 2,
      minimumStock: 20,
      unit: 'BOTTLE',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-low-03',
      businessId: 'busi-01',
      name: 'Tata Salt Crystals 1kg',
      sku: 'PRD-003',
      barcode: '8901000000003',
      sellingPrice: 28,
      purchasePrice: 20,
      stock: 6,
      minimumStock: 25,
      unit: 'PACKET',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prod-low-04',
      businessId: 'busi-01',
      name: 'Aashirvaad Whole Wheat Atta 10kg',
      sku: 'PRD-004',
      barcode: '8901000000004',
      sellingPrice: 420,
      purchasePrice: 350,
      stock: 3,
      minimumStock: 12,
      unit: 'BAG',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  sale: seedTransactions.sales,
  saleItem: seedTransactions.saleItems,
  payment: seedTransactions.payments,
  salesReturn: [],
  salesReturnItem: [],
  quotation: [
    {
      id: 'quo-01',
      quotationNumber: 'QUO-2026-0001',
      businessId: 'busi-01',
      customerId: 'cust-01',
      customerName: 'Ramesh Hardware',
      customerPhone: '9876543210',
      status: 'ACCEPTED',
      quotationDate: new Date(Date.now() - 3 * 86400000),
      expiryDate: new Date(Date.now() + 12 * 86400000),
      subtotal: 7497,
      discountTotal: 0,
      taxTotal: 1349.46,
      grandTotal: 8846.46,
      notes: 'Standard trade quote valid for 15 days.',
      terms: 'Payment 100% on delivery. Delivery within 2 days of invoice confirmation.',
      convertedToInvoiceId: 'sale-0-0',
      convertedAt: new Date(Date.now() - 1 * 86400000),
      createdAt: new Date(Date.now() - 3 * 86400000),
      updatedAt: new Date(Date.now() - 1 * 86400000),
    },
    {
      id: 'quo-02',
      quotationNumber: 'QUO-2026-0002',
      businessId: 'busi-01',
      customerId: 'cust-02',
      customerName: 'Priya Supermarket',
      customerPhone: '9876543211',
      status: 'SENT',
      quotationDate: new Date(Date.now() - 1 * 86400000),
      expiryDate: new Date(Date.now() + 14 * 86400000),
      subtotal: 4250,
      discountTotal: 250,
      taxTotal: 480,
      grandTotal: 4480,
      notes: 'Wholesale order quotation. Ready for invoice conversion upon acceptance.',
      terms: 'Subject to store terms and conditions.',
      convertedToInvoiceId: null,
      createdAt: new Date(Date.now() - 1 * 86400000),
      updatedAt: new Date(Date.now() - 1 * 86400000),
    },
  ],
  quotationItem: [
    {
      id: 'qi-01-1',
      quotationId: 'quo-01',
      productId: 'prod-01',
      name: 'Wireless Barcode Scanner',
      sku: 'WBS-2026',
      unit: 'PIECE',
      quantity: 3,
      rate: 2499,
      discount: 0,
      gstRate: 18,
      taxableAmount: 7497,
      taxAmount: 1349.46,
      total: 8846.46,
      isTaxInclusive: false,
    },
    {
      id: 'qi-02-1',
      quotationId: 'quo-02',
      productId: 'prod-02',
      name: 'Thermal Billing Rolls (80mm x 50m)',
      sku: 'TBR-8050',
      unit: 'ROLL',
      quantity: 50,
      rate: 85,
      discount: 250,
      gstRate: 12,
      taxableAmount: 4000,
      taxAmount: 480,
      total: 4480,
      isTaxInclusive: false,
    },
  ],
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
  expense: seedTransactions.expenses,
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
  purchase: seedTransactions.purchases,
  purchaseOrder: [],
  debitNote: [],
  purchaseReturn: [],
  purchaseItem: seedTransactions.purchaseItems,
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
  caInvitation: [],
  auditTask: [],
  auditDiscrepancy: [],
  auditDocument: [],
  periodClosing: [],
  caException: [
    {
      id: 'exc-b2b-01',
      businessId: 'busi-01',
      category: 'GST_MISMATCH',
      exceptionType: 'RATE_MISMATCH',
      title: 'GST Rate Variance on B2B Invoice #INV-2026-B2B01',
      description: 'HSN 8471 line items billed at 12% instead of statutory 18% GST slab. Variance of ₹1,440.00 between billed GST and schedule rate.',
      referenceNumber: 'INV-2026-B2B01',
      invoiceId: 'inv-b2b-01',
      invoiceDate: new Date('2026-10-14T10:30:00Z'),
      customerType: 'B2B',
      customerName: 'Apex Enterprise Solutions Pvt Ltd',
      customerGstin: '33AAACA1234A1Z5',
      placeOfSupply: 'Tamil Nadu (33)',
      amount: 26880,
      gstAmount: 2880,
      taxableAmount: 24000,
      expectedGst: 4320,
      differenceAmount: -1440,
      cgst: 1440,
      sgst: 1440,
      igst: 0,
      portalCgst: 2160,
      portalSgst: 2160,
      portalIgst: 0,
      portalTaxable: 24000,
      sezTaxTreatment: null,
      status: 'OPEN',
      severity: 'HIGH',
      sourceType: 'SALES_INVOICE',
      sourceId: 'inv-b2b-01',
      reviewNotes: [],
      history: [
        {
          timestamp: new Date('2026-10-14T10:35:00Z'),
          action: 'EXCEPTION_DETECTED',
          actor: 'System Audit Engine',
          note: 'Variance detected between line rate 12% and master HSN 8471 rate 18%',
        },
      ],
      documents: [
        {
          id: 'doc-01',
          name: 'Invoice_INV-2026-B2B01.pdf',
          fileUrl: '/uploads/invoices/INV-2026-B2B01.pdf',
          type: 'INVOICE',
        },
      ],
      createdAt: new Date('2026-10-14T10:35:00Z'),
      updatedAt: new Date('2026-10-14T10:35:00Z'),
    },
    {
      id: 'exc-b2c-02',
      businessId: 'busi-01',
      category: 'RETURNS_CREDIT_NOTE',
      exceptionType: 'EXCESS_RETURN',
      title: 'Excess Return Refund on Consumer Invoice #INV-2026-B2C04',
      description: 'Refund credit note amount ₹4,800.00 exceeds original unreturned invoice balance of ₹3,600.00 for counter buyer.',
      referenceNumber: 'INV-2026-B2C04',
      invoiceId: 'inv-b2c-04',
      invoiceDate: new Date('2026-10-15T14:15:00Z'),
      customerType: 'B2C',
      customerName: 'Walk-in Retail Consumer',
      customerGstin: null,
      placeOfSupply: 'Tamil Nadu (33)',
      amount: 4800,
      gstAmount: 732.2,
      taxableAmount: 4067.8,
      expectedGst: 549.15,
      differenceAmount: 183.05,
      cgst: 366.1,
      sgst: 366.1,
      igst: 0,
      portalCgst: 274.58,
      portalSgst: 274.58,
      portalIgst: 0,
      portalTaxable: 3050.85,
      sezTaxTreatment: null,
      status: 'IN_REVIEW',
      severity: 'URGENT',
      sourceType: 'SALES_RETURN',
      sourceId: 'ret-b2c-04',
      reviewNotes: [
        {
          id: 'rn-01',
          author: 'Karthik CA',
          role: 'CA',
          timestamp: new Date('2026-10-16T11:00:00Z'),
          note: 'Requested store cashier to verify return inspection slip and restocking receipt.',
        },
      ],
      history: [
        {
          timestamp: new Date('2026-10-15T14:20:00Z'),
          action: 'EXCEPTION_DETECTED',
          actor: 'System Audit Engine',
          note: 'Return amount exceeds original invoice balance',
        },
        {
          timestamp: new Date('2026-10-16T11:00:00Z'),
          action: 'STATUS_UPDATED',
          actor: 'Karthik CA',
          previousStatus: 'OPEN',
          newStatus: 'IN_REVIEW',
          note: 'Marked under active review',
        },
      ],
      documents: [],
      createdAt: new Date('2026-10-15T14:20:00Z'),
      updatedAt: new Date('2026-10-16T11:00:00Z'),
    },
    {
      id: 'exc-sez-03',
      businessId: 'busi-01',
      category: 'GST_MISMATCH',
      exceptionType: 'SEZ_TAX_TREATMENT_MISMATCH',
      title: 'Improper CGST/SGST Charged on SEZ Developer Supply #INV-2026-SEZ02',
      description: 'Special Economic Zone supply billed with domestic CGST+SGST (₹18,000.00) instead of Zero-rated LUT/Bond or IGST under IGST Act Section 7(5)(b).',
      referenceNumber: 'INV-2026-SEZ02',
      invoiceId: 'inv-sez-02',
      invoiceDate: new Date('2026-10-16T09:45:00Z'),
      customerType: 'SEZ',
      customerName: 'ELCOT SEZ Tech Developers Ltd',
      customerGstin: '33AAACE9876E1Z2',
      placeOfSupply: 'Tamil Nadu (33) [SEZ Unit]',
      amount: 118000,
      gstAmount: 18000,
      taxableAmount: 100000,
      expectedGst: 0,
      differenceAmount: 18000,
      cgst: 9000,
      sgst: 9000,
      igst: 0,
      portalCgst: 0,
      portalSgst: 0,
      portalIgst: 0,
      portalTaxable: 100000,
      sezTaxTreatment: 'WITHOUT_PAYMENT_UNDER_LUT',
      status: 'OPEN',
      severity: 'HIGH',
      sourceType: 'SALES_INVOICE',
      sourceId: 'inv-sez-02',
      reviewNotes: [],
      history: [
        {
          timestamp: new Date('2026-10-16T09:50:00Z'),
          action: 'EXCEPTION_DETECTED',
          actor: 'System Audit Engine',
          note: 'SEZ Developer billed with Intra-State CGST/SGST; requires LUT zero-rating or IGST treatment.',
        },
      ],
      documents: [
        {
          id: 'doc-sez-01',
          name: 'SEZ_Registration_Certificate.pdf',
          fileUrl: '/uploads/documents/SEZ_Cert_ELCOT.pdf',
          type: 'SEZ_REGISTRATION',
        },
      ],
      createdAt: new Date('2026-10-16T09:50:00Z'),
      updatedAt: new Date('2026-10-16T09:50:00Z'),
    },
    {
      id: 'exc-unc-04',
      businessId: 'busi-01',
      category: 'MISSING_INVOICE',
      exceptionType: 'UNCLASSIFIED_CUSTOMER',
      title: 'High-Value Commercial Sale Lacking Recipient GSTIN: Invoice #INV-2026-UNC03',
      description: 'Invoice value ₹78,500.00 exceeds statutory ₹50,000 threshold for unregistered trade customer Metro Commercial. Requires CA classification review.',
      referenceNumber: 'INV-2026-UNC03',
      invoiceId: 'inv-unc-03',
      invoiceDate: new Date('2026-10-16T16:20:00Z'),
      customerType: 'UNCLASSIFIED',
      customerName: 'Metro Commercial Traders',
      customerGstin: null,
      placeOfSupply: 'Tamil Nadu (33)',
      amount: 78500,
      gstAmount: 11974.58,
      taxableAmount: 66525.42,
      expectedGst: 11974.58,
      differenceAmount: 0,
      cgst: 5987.29,
      sgst: 5987.29,
      igst: 0,
      portalCgst: 5987.29,
      portalSgst: 5987.29,
      portalIgst: 0,
      portalTaxable: 66525.42,
      sezTaxTreatment: null,
      status: 'OPEN',
      severity: 'MEDIUM',
      sourceType: 'SALES_INVOICE',
      sourceId: 'inv-unc-03',
      reviewNotes: [],
      history: [
        {
          timestamp: new Date('2026-10-16T16:25:00Z'),
          action: 'EXCEPTION_DETECTED',
          actor: 'System Audit Engine',
          note: 'Flagged for CA review: High-value supply without recipient tax classification',
        },
      ],
      documents: [],
      createdAt: new Date('2026-10-16T16:25:00Z'),
      updatedAt: new Date('2026-10-16T16:25:00Z'),
    },
    {
      id: 'exc-doc-05',
      businessId: 'busi-01',
      category: 'PENDING_DOCUMENT',
      exceptionType: 'MISSING_PURCHASE_BILL',
      title: 'Missing Supplier Tax Invoice for Purchase Voucher #PUR-2026-088',
      description: 'Input Tax Credit of ₹6,750.00 claimed on inward supply from Sun Polymers without uploaded supplier tax invoice voucher.',
      referenceNumber: 'PUR-2026-088',
      invoiceId: 'pur-088',
      invoiceDate: new Date('2026-10-17T08:30:00Z'),
      customerType: 'B2B',
      customerName: 'Sun Polymers Distribution',
      customerGstin: '33AAACS5555S1Z8',
      placeOfSupply: 'Tamil Nadu (33)',
      amount: 44250,
      gstAmount: 6750,
      taxableAmount: 37500,
      expectedGst: 6750,
      differenceAmount: 0,
      cgst: 3375,
      sgst: 3375,
      igst: 0,
      portalCgst: 3375,
      portalSgst: 3375,
      portalIgst: 0,
      portalTaxable: 37500,
      sezTaxTreatment: null,
      status: 'OPEN',
      severity: 'HIGH',
      sourceType: 'PURCHASE',
      sourceId: 'pur-088',
      reviewNotes: [],
      history: [
        {
          timestamp: new Date('2026-10-17T08:35:00Z'),
          action: 'EXCEPTION_DETECTED',
          actor: 'System Audit Engine',
          note: 'Input Tax Credit voucher without supporting documentary evidence',
        },
      ],
      documents: [],
      createdAt: new Date('2026-10-17T08:35:00Z'),
      updatedAt: new Date('2026-10-17T08:35:00Z'),
    },
  ],
  billCreditBalance: [],
  billCreditLedger: [],
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

  if (modelName === 'quotation') {
    if (include.customer) {
      clone.customer = memoryStore.customer?.find((c) => c.id === clone.customerId) || null;
    }
    if (include.items) {
      const qItems = (memoryStore.quotationItem || []).filter((qi) => qi.quotationId === clone.id);
      clone.items = qItems.length > 0 ? qItems : (clone.items || []);
    }
    if (include.business) {
      clone.business = memoryStore.business?.find((b) => b.id === clone.businessId) || null;
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

  if (modelName === 'caInvitation') {
    if (include.business) {
      const b = (memoryStore.business || []).find((bus) => bus.id === clone.businessId);
      clone.business = b ? applySelect('business', b, include.business.select || include.business) : null;
    }
    if (include.inviter) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.inviterId);
      clone.inviter = u ? applySelect('user', u, include.inviter.select || include.inviter) : null;
    }
    if (include.caUser) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.caUserId);
      clone.caUser = u ? applySelect('user', u, include.caUser.select || include.caUser) : null;
    }
  }

  if (modelName === 'caStoreAccess') {
    if (include.business) {
      const b = (memoryStore.business || []).find((bus) => bus.id === clone.businessId);
      clone.business = b ? applySelect('business', b, include.business.select || include.business) : null;
    }
    if (include.caUser) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.caUserId);
      clone.caUser = u ? applySelect('user', u, include.caUser.select || include.caUser) : null;
    }
  }

  if (modelName === 'subscription') {
    if (include.user) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.userId);
      clone.user = u ? applySelect('user', u, include.user.select || include.user) : null;
    }
    if (include.business) {
      const b = (memoryStore.business || []).find((bus) => bus.id === clone.businessId || bus.ownerId === clone.userId);
      clone.business = b ? applySelect('business', b, include.business.select || include.business) : null;
    }
  }

  if (modelName === 'roleInvitation') {
    if (include.business) {
      const b = (memoryStore.business || []).find((bus) => bus.id === clone.businessId);
      clone.business = b ? applySelect('business', b, include.business.select || include.business) : null;
    }
    if (include.inviter) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.inviterId);
      clone.inviter = u ? applySelect('user', u, include.inviter.select || include.inviter) : null;
    }
    if (include.recipientUser) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.recipientUserId);
      clone.recipientUser = u ? applySelect('user', u, include.recipientUser.select || include.recipientUser) : null;
    }
  }

  if (modelName === 'businessMember') {
    if (include.business) {
      const b = (memoryStore.business || []).find((bus) => bus.id === clone.businessId);
      clone.business = b ? applySelect('business', b, include.business.select || include.business) : null;
    }
    if (include.user) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.userId);
      clone.user = u ? applySelect('user', u, include.user.select || include.user) : null;
    }
  }

  if (modelName === 'notification') {
    if (include.user) {
      const u = (memoryStore.user || []).find((usr) => usr.id === clone.userId);
      clone.user = u ? applySelect('user', u, include.user.select || include.user) : null;
    }
    if (include.invitation) {
      const inv = (memoryStore.roleInvitation || []).find((i) => i.id === clone.invitationId);
      clone.invitation = inv || null;
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

function createModelHandler(rawModelName) {
  const modelName = rawModelName === 'caExceptions' ? 'caException' : rawModelName;
  if (!memoryStore[modelName]) {
    memoryStore[modelName] = [];
  }
  return {
    async findMany(args = {}) {
      const list = memoryStore[modelName] || [];
      let result = list.filter((item) => matchesWhere(item, args.where));

      if (args.orderBy) {
        const orderKey = Object.keys(args.orderBy)[0];
        const dir = args.orderBy[orderKey] === 'asc' ? 1 : -1;
        result.sort((a, b) => {
          const valA = a[orderKey] instanceof Date ? a[orderKey].getTime() : a[orderKey];
          const valB = b[orderKey] instanceof Date ? b[orderKey].getTime() : b[orderKey];
          if (valA < valB) return -1 * dir;
          if (valA > valB) return 1 * dir;
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
      let filtered = list.filter((it) => matchesWhere(it, args.where));
      if (args.orderBy) {
        const orderKey = Object.keys(args.orderBy)[0];
        const dir = args.orderBy[orderKey] === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
          const valA = a[orderKey] instanceof Date ? a[orderKey].getTime() : a[orderKey];
          const valB = b[orderKey] instanceof Date ? b[orderKey].getTime() : b[orderKey];
          if (valA < valB) return -1 * dir;
          if (valA > valB) return 1 * dir;
          return 0;
        });
      }
      const item = filtered[0] || null;
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

      // Enforce unique constraints on unique model fields (Prisma P2002 parity)
      const uniqueFieldsMap = {
        product: ['sku', 'barcode'],
        user: ['email', 'googleId'],
        sale: ['invoiceNumber'],
        quotation: ['quotationNumber'],
        warehouse: ['code'],
        stockTransfer: ['transferNumber'],
      };
      const uniqueFields = uniqueFieldsMap[modelName];
      if (uniqueFields) {
        for (const uf of uniqueFields) {
          const val = args.data?.[uf];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const exists = memoryStore[modelName].some((item) =>
              String(item[uf] || '').toLowerCase() === String(val).toLowerCase()
            );
            if (exists) {
              const err = new Error(`Unique constraint failed on the fields: (\`${uf}\`)`);
              err.code = 'P2002';
              err.meta = { target: [uf] };
              throw err;
            }
          }
        }
      }

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

      // New users start on the FREE plan. No subscription record is auto-created here.
      // Paid subscriptions are only activated after verified payment via upgradeSubscription().
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
const prismaTarget = rawPrisma || {};
export const resilientPrisma = new Proxy(prismaTarget, {
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
      const rawModel = rawPrisma ? rawPrisma[prop] : null;
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
