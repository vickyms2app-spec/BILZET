import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import prisma from '../config/prisma.mjs';
import { round2 } from '../utils/calculations.mjs';
import dateUtils, { DEFAULT_TIMEZONE } from '../utils/dateUtils.mjs';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const businessId =
    req.headers['x-business-id'] ||
    req.query.businessId ||
    req.query.storeId ||
    req.user?.businessId ||
    null;

  const baseStoreFilter = businessId ? { businessId } : {};

  // 1. Resolve Timezone
  const timezone = req.query.timezone || req.headers['x-timezone'] || DEFAULT_TIMEZONE;

  // 2. Resolve Active Range (today | yesterday | week | month | year | custom)
  let rangeKey = req.query.range ? String(req.query.range).trim() : null;
  const targetDateStr = req.query.date ? String(req.query.date).trim() : null;

  if (targetDateStr && !rangeKey) {
    const todayStr = dateUtils.getCurrentDateInTimezone(timezone);
    rangeKey = targetDateStr === todayStr ? 'today' : 'custom';
  } else if (!rangeKey) {
    rangeKey = 'today';
  }

  // Active range boundaries (Authoritative UTC boundaries matching IST)
  const rangeWindow = dateUtils.getRangeWindow(rangeKey, timezone, {
    startDate: targetDateStr || req.query.startDate,
    endDate: targetDateStr || req.query.endDate,
  });

  // Dedicated Today window (always computed for real-time daily metrics)
  const todayWindow = dateUtils.getRangeWindow('today', timezone);
  const secondsUntilClosing = dateUtils.getSecondsUntilNextBusinessDay(timezone);
  const businessDate = dateUtils.getCurrentDateInTimezone(timezone);

  // Month and FY windows for high-level benchmarks
  const monthWindow = dateUtils.getRangeWindow('month', timezone);
  const yearWindow = dateUtils.getRangeWindow('year', timezone);
  const sevenDaysWindow = dateUtils.getRangeWindow('week', timezone);

  // 3. Multi-Tenant Parallel Queries
  const [
    // Active Range Sales Aggregate
    rangeSalesAgg,
    // Active Range Invoices Status Breakdown
    rangePaidSalesAgg,
    rangeUnpaidSalesAgg,
    // Today Sales Aggregate (Strictly for today's daily counter)
    todaySalesAgg,
    // Month & Year Sales
    monthSalesAgg,
    yearSalesAgg,
    // Active Range Expenses
    rangeExpensesAgg,
    // Today Expenses
    todayExpensesAgg,
    // Active Range Purchases
    rangePurchasesAgg,
    // Today Purchases
    todayPurchasesAgg,
    // Customer Dues / Receivables
    pendingPaymentsAgg,
    // Catalog & Inventory Counters
    totalProducts,
    allActiveProducts,
    totalCustomers,
    totalSuppliers,
    // Recent 10 sales
    recentSales,
    // Range Payments by Tender Method
    rangePaymentsByMethod,
  ] = await Promise.all([
    // Range Sales
    prisma.sale.aggregate({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc },
      },
      _sum: { grandTotal: true, paidAmount: true },
      _count: { id: true },
    }),

    // Range Paid Sales Count
    prisma.sale.count({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc },
        paymentStatus: 'PAID',
      },
    }),

    // Range Unpaid / Partial Sales Count
    prisma.sale.count({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc },
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID', 'PARTIAL'] },
      },
    }),

    // Today Sales
    prisma.sale.aggregate({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: todayWindow.startUtc, lte: todayWindow.endUtc },
      },
      _sum: { grandTotal: true, paidAmount: true },
      _count: { id: true },
    }),

    // Month Sales
    prisma.sale.aggregate({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: monthWindow.startUtc, lte: monthWindow.endUtc },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Year Sales
    prisma.sale.aggregate({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: yearWindow.startUtc, lte: yearWindow.endUtc },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Range Expenses
    prisma.expense.aggregate({
      where: {
        ...baseStoreFilter,
        date: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc },
      },
      _sum: { amount: true },
    }),

    // Today Expenses
    prisma.expense.aggregate({
      where: {
        ...baseStoreFilter,
        date: { gte: todayWindow.startUtc, lte: todayWindow.endUtc },
      },
      _sum: { amount: true },
    }),

    // Range Purchases
    prisma.purchase.aggregate({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc },
      },
      _sum: { grandTotal: true, paidAmount: true },
      _count: { id: true },
    }),

    // Today Purchases
    prisma.purchase.aggregate({
      where: {
        ...baseStoreFilter,
        createdAt: { gte: todayWindow.startUtc, lte: todayWindow.endUtc },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),

    // Customer dues for store
    prisma.customer.aggregate({
      where: baseStoreFilter,
      _sum: { balance: true },
    }),

    // Total products
    prisma.product.count({ where: { isActive: true } }),

    // All active products to calculate inventory valuation & low stock
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        minimumStock: true,
        unit: true,
        sellingPrice: true,
        purchasePrice: true,
      },
      orderBy: { stock: 'asc' },
    }),

    // Total customers for store
    prisma.customer.count({ where: { ...baseStoreFilter, isActive: true } }),

    // Total suppliers
    prisma.supplier.count({ where: { isActive: true } }),

    // Recent 10 sales for store
    prisma.sale.findMany({
      where: baseStoreFilter,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    }),

    // Real payment method breakdown for selected range
    prisma.payment.groupBy({
      by: ['method'],
      where: {
        createdAt: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc },
        ...(businessId ? { sale: { businessId } } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  // 4. Calculate Inventory Valuation & Low Stock
  let inventoryValuation = 0;
  let lowStockCount = 0;
  const lowStockProductsList = [];

  for (const p of allActiveProducts) {
    const qty = Number(p.stock || 0);
    const unitCost = Number(p.purchasePrice || p.sellingPrice || 0);
    if (qty > 0) inventoryValuation += qty * unitCost;

    const minStock = Number(p.minimumStock ?? 5);
    if (qty <= minStock) {
      lowStockCount++;
      if (lowStockProductsList.length < 5) {
        lowStockProductsList.push({ ...p, _id: p.id });
      }
    }
  }

  // 5. Calculate Cost of Goods Sold & Profit for Range and Today
  const [rangeSaleItems, todaySaleItems] = await Promise.all([
    prisma.saleItem.findMany({
      where: {
        sale: {
          ...baseStoreFilter,
          createdAt: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc },
        },
      },
      include: { product: { select: { purchasePrice: true } } },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: {
          ...baseStoreFilter,
          createdAt: { gte: todayWindow.startUtc, lte: todayWindow.endUtc },
        },
      },
      include: { product: { select: { purchasePrice: true } } },
    }),
  ]);

  let rangeCogs = 0;
  for (const item of rangeSaleItems) {
    const costPrice = item.product ? Number(item.product.purchasePrice) : 0;
    rangeCogs += costPrice * Number(item.quantity || 1);
  }

  let todayCogs = 0;
  for (const item of todaySaleItems) {
    const costPrice = item.product ? Number(item.product.purchasePrice) : 0;
    todayCogs += costPrice * Number(item.quantity || 1);
  }

  // Numeric Metrics
  const rangeSales = round2(Number(rangeSalesAgg._sum.grandTotal || 0));
  const rangeRevenue = round2(Number(rangeSalesAgg._sum.paidAmount || 0));
  const rangeBills = rangeSalesAgg._count.id || 0;
  const rangeExpenses = round2(Number(rangeExpensesAgg._sum.amount || 0));
  const rangePurchases = round2(Number(rangePurchasesAgg._sum.grandTotal || 0));
  const rangePurchasesCount = rangePurchasesAgg._count.id || 0;
  const rangeProfit = round2(rangeSales - rangeCogs - rangeExpenses);

  const todaySales = round2(Number(todaySalesAgg._sum.grandTotal || 0));
  const todayRevenue = round2(Number(todaySalesAgg._sum.paidAmount || 0));
  const todayBills = todaySalesAgg._count.id || 0;
  const todayExpenses = round2(Number(todayExpensesAgg._sum.amount || 0));
  const todayPurchases = round2(Number(todayPurchasesAgg._sum.grandTotal || 0));
  const todayPurchasesCount = todayPurchasesAgg._count.id || 0;
  const todayProfit = round2(todaySales - todayCogs - todayExpenses);

  const monthRevenue = round2(Number(monthSalesAgg._sum.grandTotal || 0));
  const monthBills = monthSalesAgg._count.id || 0;
  const yearRevenue = round2(Number(yearSalesAgg._sum.grandTotal || 0));
  const yearBills = yearSalesAgg._count.id || 0;

  const pendingPayments = round2(Number(pendingPaymentsAgg._sum.balance || 0));

  // 6. Dynamic Trend Generation (Day/Hourly or Past 7 Days)
  const pastSevenDaysSales = await prisma.sale.findMany({
    where: { ...baseStoreFilter, createdAt: { gte: sevenDaysWindow.startUtc, lte: todayWindow.endUtc } },
    select: { grandTotal: true, createdAt: true, paidAmount: true },
  });

  const pastSevenDaysExpenses = await prisma.expense.findMany({
    where: { ...baseStoreFilter, date: { gte: sevenDaysWindow.startUtc, lte: todayWindow.endUtc } },
    select: { amount: true, date: true },
  });

  // Trend: Past 7 Days
  const trend7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayWindow.endUtc.getTime() - i * 86400000);
    const dayStr = dateUtils.getCurrentDateInTimezone(timezone, d);
    const dayBounds = dateUtils.getBusinessDayRange(dayStr, timezone);
    const dayLabel = i === 0 ? 'Today' : new Date(dayBounds.startOfDay).toLocaleDateString('en-US', { weekday: 'short', timeZone: timezone });

    const daySales = pastSevenDaysSales
      .filter((s) => s.createdAt >= dayBounds.startOfDay && s.createdAt <= dayBounds.endOfDay)
      .reduce((acc, s) => acc + Number(s.grandTotal || 0), 0);

    const dayCollections = pastSevenDaysSales
      .filter((s) => s.createdAt >= dayBounds.startOfDay && s.createdAt <= dayBounds.endOfDay)
      .reduce((acc, s) => acc + Number(s.paidAmount || 0), 0);

    const dayExpenses = pastSevenDaysExpenses
      .filter((e) => e.date >= dayBounds.startOfDay && e.date <= dayBounds.endOfDay)
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);

    trend7Days.push({
      label: dayLabel,
      date: dayStr,
      sales: round2(daySales),
      collections: round2(dayCollections),
      expenses: round2(dayExpenses),
    });
  }

  // Trend: Hourly (for Today/Yesterday)
  const rangeSalesList = await prisma.sale.findMany({
    where: { ...baseStoreFilter, createdAt: { gte: rangeWindow.startUtc, lte: rangeWindow.endUtc } },
    select: { grandTotal: true, paidAmount: true, createdAt: true },
  });

  const hourlySlots = [
    { label: '9 AM', hourStart: 9, hourEnd: 11 },
    { label: '11 AM', hourStart: 11, hourEnd: 13 },
    { label: '1 PM', hourStart: 13, hourEnd: 15 },
    { label: '3 PM', hourStart: 15, hourEnd: 17 },
    { label: '5 PM', hourStart: 17, hourEnd: 19 },
    { label: '7 PM', hourStart: 19, hourEnd: 21 },
    { label: '9 PM', hourStart: 21, hourEnd: 24 },
  ];

  const trendHourly = hourlySlots.map((slot) => {
    let sales = 0;
    let collections = 0;
    for (const s of rangeSalesList) {
      const parts = dateUtils.getDateTimePartsInTimezone(timezone, new Date(s.createdAt));
      if (parts.hour >= slot.hourStart && parts.hour < slot.hourEnd) {
        sales += Number(s.grandTotal || 0);
        collections += Number(s.paidAmount || 0);
      }
    }
    return {
      label: slot.label,
      sales: round2(sales),
      collections: round2(collections),
      expenses: 0,
    };
  });

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

  // Tender method summary
  const paymentMethodSummary = rangePaymentsByMethod.map((row) => ({
    method: row.method,
    amount: round2(Number(row._sum.amount || 0)),
    count: row._count.id || 0,
  }));

  // Realized rate
  const realizedPercentage = rangeSales > 0 ? round2((rangeRevenue / rangeSales) * 100) : 0;
  const profitMarginPercentage = rangeSales > 0 ? round2((rangeProfit / rangeSales) * 100) : 0;
  const averageOrderValue = rangeBills > 0 ? round2(rangeSales / rangeBills) : 0;

  // Build authoritative response
  const dashboardData = {
    // Range-aware primary metrics
    range: rangeWindow,
    rangeSales,
    rangeRevenue,
    rangeBills,
    rangePaidBills: rangePaidSalesAgg,
    rangeUnpaidBills: rangeUnpaidSalesAgg,
    rangeExpenses,
    rangePurchases,
    rangePurchasesCount,
    rangeProfit,
    realizedPercentage,
    profitMarginPercentage,
    averageOrderValue,

    // Today's dedicated daily metrics (resets to 0 at 00:00 IST without record deletion)
    todaySales,
    todayRevenue,
    todayBills,
    todayProfit,
    todayExpenses,
    todayPurchases,
    todayPurchasesCount,

    // Historical Reference Metrics
    monthSales: monthRevenue,
    monthBills,
    yearSales: yearRevenue,
    yearBills,
    totalSales: yearRevenue,

    // Ledger & Balance
    pendingPayments,
    totalProducts,
    lowStockProducts: lowStockCount,
    inventoryValuation: round2(inventoryValuation),
    totalCustomers,
    totalSuppliers,

    // Chart & Trend Data
    chartData: rangeKey === 'today' || rangeKey === 'yesterday' ? trendHourly : trend7Days,
    trendData: {
      '7days': trend7Days,
      'today': trendHourly,
      'yesterday': trendHourly,
    },

    // Collections & Tenders
    paymentMethodSummary,
    topSellingProducts,
    recentSales: recentSales.map((s) => ({
      ...s,
      _id: s.id,
      grandTotal: Number(s.grandTotal),
      paidAmount: Number(s.paidAmount),
    })),
    lowStockProductsList,

    // Authoritative Timezone & Reset Metadata
    businessTimezone: timezone,
    businessDate,
    secondsUntilClosing,
    currentServerTimeIso: new Date().toISOString(),
  };

  return sendResponse(res, 200, dashboardData, 'Dashboard statistics fetched successfully');
});

export default {
  getDashboardStats,
};
