import prisma from '../config/prisma.mjs';

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

export const getSalesReport = async (query = {}, businessId = null) => {
  const where = {};
  const effectiveBusinessId = query.businessId || businessId;
  if (effectiveBusinessId) where.businessId = effectiveBusinessId;
  if (query.customerId) where.customerId = query.customerId;
  if (query.warehouseId) where.warehouseId = query.warehouseId;
  if (query.from || query.startDate) {
    where.createdAt = {
      gte: new Date(query.from || query.startDate),
      ...(query.to || query.endDate ? { lte: new Date(query.to || query.endDate) } : {}),
    };
  }

  const [sales, returns] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: true,
      },
    }),
    prisma.salesReturn.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let totalSales = 0;
  let totalPaid = 0;
  let totalDiscounts = 0;
  let totalTaxes = 0;

  sales.forEach((s) => {
    totalSales += Number(s.grandTotal);
    totalPaid += Number(s.paidAmount);
    totalDiscounts += Number(s.discountTotal);
    totalTaxes += Number(s.taxTotal);
  });

  const totalReturns = returns.reduce((acc, r) => acc + Number(r.totalAmount), 0);
  const netSales = Math.max(0, round2(totalSales - totalReturns));
  const totalPending = Math.max(0, round2(totalSales - totalPaid));

  return {
    totalRevenue: round2(totalSales),
    totalSales: round2(totalSales),
    netSales,
    totalReturns: round2(totalReturns),
    totalCollected: round2(totalPaid),
    totalPending,
    totalInvoices: sales.length,
    totalDiscounts: round2(totalDiscounts),
    totalGST: round2(totalTaxes),
    sales,
  };
};

export const getDailyReport = async (query = {}, businessId = null) => {
  const where = {};
  const effectiveBusinessId = query.businessId || businessId;
  if (effectiveBusinessId) where.businessId = effectiveBusinessId;
  if (query.from || query.startDate) {
    where.createdAt = {
      gte: new Date(query.from || query.startDate),
      ...(query.to || query.endDate ? { lte: new Date(query.to || query.endDate) } : {}),
    };
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // Group by date (YYYY-MM-DD)
  const map = new Map();
  sales.forEach((s) => {
    const d = s.createdAt.toISOString().split('T')[0];
    if (!map.has(d)) {
      map.set(d, {
        date: d,
        invoicesCount: 0,
        totalSales: 0,
        paidAmount: 0,
        pendingAmount: 0,
        netSales: 0,
      });
    }
    const row = map.get(d);
    row.invoicesCount += 1;
    row.totalSales = round2(row.totalSales + Number(s.grandTotal));
    row.paidAmount = round2(row.paidAmount + Number(s.paidAmount));
    row.pendingAmount = Math.max(0, round2(row.totalSales - row.paidAmount));
    row.netSales = row.totalSales;
  });

  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
};

export const getMonthlyReport = async (year = new Date().getFullYear(), businessId = null) => {
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
  const where = {
    createdAt: {
      gte: startOfYear,
      lte: endOfYear,
    },
  };
  if (businessId) where.businessId = businessId;

  const sales = await prisma.sale.findMany({
    where,
  });

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const breakdown = months.map((m, idx) => ({
    month: m,
    monthNumber: idx + 1,
    orders: 0,
    totalSales: 0,
    netSales: 0,
  }));

  sales.forEach((s) => {
    const mIdx = s.createdAt.getMonth();
    breakdown[mIdx].orders += 1;
    breakdown[mIdx].totalSales = round2(breakdown[mIdx].totalSales + Number(s.grandTotal));
    breakdown[mIdx].netSales = breakdown[mIdx].totalSales;
  });

  return breakdown;
};

export const getYearlyReport = async (businessId = null) => {
  const where = {};
  if (businessId) where.businessId = businessId;

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const map = new Map();
  sales.forEach((s) => {
    const yr = s.createdAt.getFullYear().toString();
    if (!map.has(yr)) {
      map.set(yr, {
        year: yr,
        totalSales: 0,
        orders: 0,
        netRevenue: 0,
      });
    }
    const item = map.get(yr);
    item.orders += 1;
    item.totalSales = round2(item.totalSales + Number(s.grandTotal));
    item.netRevenue = item.totalSales;
  });

  return Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
};

export const getProfitReport = async (query = {}, businessId = null) => {
  const where = {};
  const effectiveBusinessId = query.businessId || businessId;
  if (effectiveBusinessId) where.businessId = effectiveBusinessId;
  if (query.from || query.startDate) {
    where.createdAt = {
      gte: new Date(query.from || query.startDate),
      ...(query.to || query.endDate ? { lte: new Date(query.to || query.endDate) } : {}),
    };
  }

  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({ where, include: { items: true } }),
    prisma.purchase.findMany({ where, include: { items: true } }),
  ]);

  let totalSales = 0;
  let totalCost = 0;

  sales.forEach((s) => {
    totalSales += Number(s.grandTotal);
  });

  purchases.forEach((p) => {
    totalCost += Number(p.grandTotal);
  });

  const netProfit = round2(totalSales - totalCost);
  const margin = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;

  return {
    totalRevenue: round2(totalSales),
    totalCost: round2(totalCost),
    netProfit,
    profitMargin: margin,
  };
};

export const getInventoryReport = async () => {
  const products = await prisma.product.findMany({
    include: { category: true },
  });

  let totalValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    const qty = p.stock || 0;
    const cost = Number(p.purchasePrice || p.sellingPrice || 0);
    totalValuation += qty * cost;
    if (qty <= 0) outOfStockCount += 1;
    else if (qty <= (p.minimumStock || 5)) lowStockCount += 1;
  });

  return {
    totalProducts: products.length,
    totalValuation: round2(totalValuation),
    lowStockCount,
    outOfStockCount,
  };
};

export const getGstReport = async (query = {}, businessId = null) => {
  const where = {};
  const effectiveBusinessId = query.businessId || businessId;
  if (effectiveBusinessId) {
    where.businessId = effectiveBusinessId;
  }
  if (query.from || query.startDate) {
    where.createdAt = {
      gte: new Date(query.from || query.startDate),
      ...(query.to || query.endDate ? { lte: new Date(query.to || query.endDate) } : {}),
    };
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { customer: true, items: true },
  });

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalGst = 0;

  sales.forEach((s) => {
    const tax = Number(s.taxTotal);
    totalGst += tax;
    totalCgst += tax / 2;
    totalSgst += tax / 2;
    totalTaxable += Number(s.subtotal);
  });

  return {
    totalTaxable: round2(totalTaxable),
    totalCgst: round2(totalCgst),
    totalSgst: round2(totalSgst),
    totalGst: round2(totalGst),
    invoices: sales,
  };
};

export const getAnalyticsReport = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalSalesAgg,
    todaySalesAgg,
    monthSalesAgg,
    totalPurchasesAgg,
    customerCount,
    supplierCount,
    productCount,
    lowStockProducts,
    pendingSales,
    pendingPurchases,
    onlineOrdersCount,
  ] = await Promise.all([
    prisma.sale.aggregate({ _sum: { grandTotal: true } }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { grandTotal: true },
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { grandTotal: true },
    }),
    prisma.purchase.aggregate({ _sum: { grandTotal: true } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { stock: { lte: 5 }, isActive: true } }),
    prisma.sale.findMany({ where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } } }),
    prisma.purchase.findMany({ where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } } }),
    prisma.onlineOrder.count(),
  ]);

  const receivables = pendingSales.reduce((acc, s) => acc + (Number(s.grandTotal) - Number(s.paidAmount)), 0);
  const payables = pendingPurchases.reduce((acc, p) => acc + (Number(p.grandTotal) - Number(p.paidAmount)), 0);

  return {
    totalSales: round2(totalSalesAgg._sum.grandTotal || 0),
    todaySales: round2(todaySalesAgg._sum.grandTotal || 0),
    monthlySales: round2(monthSalesAgg._sum.grandTotal || 0),
    totalPurchases: round2(totalPurchasesAgg._sum.grandTotal || 0),
    totalCustomers: customerCount,
    totalSuppliers: supplierCount,
    totalProducts: productCount,
    lowStock: lowStockProducts,
    pendingPayments: pendingSales.length + pendingPurchases.length,
    outstandingReceivables: round2(receivables),
    outstandingPayables: round2(payables),
    onlineOrders: onlineOrdersCount,
  };
};

export default {
  getSalesReport,
  getDailyReport,
  getMonthlyReport,
  getYearlyReport,
  getProfitReport,
  getInventoryReport,
  getGstReport,
  getAnalyticsReport,
};
