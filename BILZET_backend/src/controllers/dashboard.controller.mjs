import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import prisma from '../config/prisma.mjs';
import { round2 } from '../utils/calculations.mjs';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // 1. Parallel queries with Prisma
  const [
    todaySalesAgg,
    todayExpensesAgg,
    pendingPaymentsAgg,
    totalProducts,
    allActiveProducts,
    totalCustomers,
    totalSuppliers,
    recentSales,
    todayPaymentsByMethod,
  ] = await Promise.all([
    // Sales today
    prisma.sale.aggregate({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Expenses today
    prisma.expense.aggregate({
      where: { date: { gte: startOfToday, lte: endOfToday } },
      _sum: { amount: true },
    }),

    // Customer dues
    prisma.customer.aggregate({
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

    // Total customers
    prisma.customer.count({ where: { isActive: true } }),

    // Total suppliers
    prisma.supplier.count({ where: { isActive: true } }),

    // Recent 5 sales
    prisma.sale.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),

    // Real payment method breakdown for today from actual payment records
    prisma.payment.groupBy({
      by: ['method'],
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  const todayRevenue = round2(Number(todaySalesAgg._sum.grandTotal || 0));
  const todayBills = todaySalesAgg._count.id || 0;
  const todayExpenses = round2(Number(todayExpensesAgg._sum.amount || 0));
  const pendingPayments = round2(Number(pendingPaymentsAgg._sum.balance || 0));

  const lowStockProductsList = allActiveProducts
    .filter((p) => p.stock <= p.minimumStock)
    .slice(0, 5)
    .map((p) => ({ ...p, _id: p.id }));

  const lowStockProducts = allActiveProducts.filter((p) => p.stock <= p.minimumStock).length;

  // 7-day sales breakdown
  const pastSevenDaysSales = await prisma.sale.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { grandTotal: true, createdAt: true },
  });

  const salesMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
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

  // Top selling products
  const topSaleItems = await prisma.saleItem.groupBy({
    by: ['productId', 'name', 'sku'],
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

  // Calculate today's real profit: revenue - cost of goods sold - expenses
  const todaySaleItems = await prisma.saleItem.findMany({
    where: { sale: { createdAt: { gte: startOfToday, lte: endOfToday } } },
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
  };

  return sendResponse(res, 200, dashboardData, 'Dashboard statistics fetched successfully');
});

export default {
  getDashboardStats,
};
