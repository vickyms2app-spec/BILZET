import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import prisma from '../config/prisma.mjs';
import { round2 } from '../utils/calculations.mjs';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const businessId =
    req.user?.role === 'SUPER_ADMIN'
      ? (req.query.storeId || req.user?.businessId || null)
      : (req.user?.businessId || null);

  const baseStoreFilter = businessId ? { businessId } : {};

  // Support date-specific queries or default to store current day
  const targetDateStr = req.query.date ? String(req.query.date).trim() : null;
  let startOfTargetDay;
  let endOfTargetDay;

  if (targetDateStr) {
    const d = new Date(targetDateStr);
    startOfTargetDay = new Date(d);
    startOfTargetDay.setHours(0, 0, 0, 0);
    endOfTargetDay = new Date(d);
    endOfTargetDay.setHours(23, 59, 59, 999);
  } else {
    startOfTargetDay = new Date();
    startOfTargetDay.setHours(0, 0, 0, 0);
    endOfTargetDay = new Date();
    endOfTargetDay.setHours(23, 59, 59, 999);
  }

  const sevenDaysAgo = new Date(startOfTargetDay);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(startOfTargetDay.getFullYear(), startOfTargetDay.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(startOfTargetDay.getFullYear(), startOfTargetDay.getMonth() + 1, 0, 23, 59, 59, 999);

  const startOfYear = new Date(startOfTargetDay.getFullYear(), 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(startOfTargetDay.getFullYear(), 11, 31, 23, 59, 59, 999);

  // 1. Parallel queries with Prisma (enforcing multi-tenant store isolation)
  const [
    todaySalesAgg,
    monthSalesAgg,
    yearSalesAgg,
    todayExpensesAgg,
    pendingPaymentsAgg,
    totalProducts,
    allActiveProducts,
    totalCustomers,
    totalSuppliers,
    recentSales,
    todayPaymentsByMethod,
  ] = await Promise.all([
    // Sales for target day
    prisma.sale.aggregate({
      where: { ...baseStoreFilter, createdAt: { gte: startOfTargetDay, lte: endOfTargetDay } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Sales month-to-date
    prisma.sale.aggregate({
      where: { ...baseStoreFilter, createdAt: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Sales year-to-date
    prisma.sale.aggregate({
      where: { ...baseStoreFilter, createdAt: { gte: startOfYear, lte: endOfYear } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Expenses for target day
    prisma.expense.aggregate({
      where: { date: { gte: startOfTargetDay, lte: endOfTargetDay } },
      _sum: { amount: true },
    }),

    // Customer dues for store
    prisma.customer.aggregate({
      where: baseStoreFilter,
      _sum: { balance: true },
    }),

    // Total products
    prisma.product.count({ where: { isActive: true } }),

    // All active products to calculate low stock
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, stock: true, minimumStock: true, unit: true },
      orderBy: { stock: 'asc' },
    }),

    // Total customers for store
    prisma.customer.count({ where: { ...baseStoreFilter, isActive: true } }),

    // Total suppliers
    prisma.supplier.count({ where: { isActive: true } }),

    // Recent 5 sales for store
    prisma.sale.findMany({
      where: baseStoreFilter,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),

    // Real payment method breakdown for target day from actual payment records
    prisma.payment.groupBy({
      by: ['method'],
      where: {
        createdAt: { gte: startOfTargetDay, lte: endOfTargetDay },
        ...(businessId ? { sale: { businessId } } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const todayRevenue = round2(Number(todaySalesAgg._sum.grandTotal || 0));
  const todayBills = todaySalesAgg._count.id || 0;
  const monthRevenue = round2(Number(monthSalesAgg._sum.grandTotal || 0));
  const monthBills = monthSalesAgg._count.id || 0;
  const yearRevenue = round2(Number(yearSalesAgg._sum.grandTotal || 0));
  const yearBills = yearSalesAgg._count.id || 0;
  const todayExpenses = round2(Number(todayExpensesAgg._sum.amount || 0));
  const pendingPayments = round2(Number(pendingPaymentsAgg._sum.balance || 0));

  const lowStockProductsList = allActiveProducts
    .filter((p) => p.stock <= p.minimumStock)
    .slice(0, 5)
    .map((p) => ({ ...p, _id: p.id }));

  const lowStockProducts = allActiveProducts.filter((p) => p.stock <= p.minimumStock).length;

  // 7-day sales breakdown for store
  const pastSevenDaysSales = await prisma.sale.findMany({
    where: { ...baseStoreFilter, createdAt: { gte: sevenDaysAgo, lte: endOfTargetDay } },
    select: { grandTotal: true, createdAt: true },
  });

  const salesMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfTargetDay);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    salesMap[key] = { date: key, sales: 0, bills: 0 };
  }

  for (const s of pastSevenDaysSales) {
    const key = new Date(s.createdAt).toISOString().split('T')[0];
    if (salesMap[key]) {
      salesMap[key].sales += Number(s.grandTotal);
      salesMap[key].bills += 1;
    }
  }

  const salesByDay = Object.values(salesMap);

  // Top selling products for store
  const topSaleItems = await prisma.saleItem.groupBy({
    by: ['productId', 'name', 'sku'],
    where: businessId ? { sale: { businessId } } : {},
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });

  const topSellingProducts = topSaleItems.map((item) => ({
    productId: item.productId,
    name: item.name,
    sku: item.sku,
    totalSold: item._sum.quantity || 0,
    revenue: round2(Number(item._sum.total || 0)),
  }));

  // Calculate target day's real profit: revenue - cost of goods sold - expenses
  const todaySaleItems = await prisma.saleItem.findMany({
    where: { sale: { ...baseStoreFilter, createdAt: { gte: startOfTargetDay, lte: endOfTargetDay } } },
    include: { product: { select: { purchasePrice: true } } },
  });

  let todayCostOfGoods = 0;
  for (const item of todaySaleItems) {
    const costPrice = item.product ? Number(item.product.purchasePrice) : 0;
    todayCostOfGoods += costPrice * item.quantity;
  }
  const todayProfit = round2(todayRevenue - todayCostOfGoods - todayExpenses);

  // Build real payment method summary from actual payment records
  const paymentMethodSummary = todayPaymentsByMethod.map((row) => ({
    method: row.method,
    amount: round2(Number(row._sum.amount || 0)),
    count: row._count.id || 0,
  }));

  const dashboardData = {
    todaySales: todayRevenue,
    todayBills,
    monthSales: monthRevenue,
    monthBills,
    yearSales: yearRevenue,
    yearBills,
    totalSales: yearRevenue,
    todayProfit,
    todayExpenses,
    pendingPayments,
    totalProducts,
    lowStockProducts,
    totalCustomers,
    totalSuppliers,
    salesByDay,
    topSellingProducts,
    recentSales: recentSales.map((s) => ({
      ...s,
      _id: s.id,
      grandTotal: Number(s.grandTotal),
      paidAmount: Number(s.paidAmount),
    })),
    lowStockProductsList,
    paymentMethodSummary,
    targetDate: targetDateStr || new Date().toISOString().split('T')[0],
  };

  return sendResponse(res, 200, dashboardData, 'Dashboard statistics fetched successfully');
});

export default {
  getDashboardStats,
};
