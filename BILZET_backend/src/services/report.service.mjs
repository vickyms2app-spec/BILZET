import ExcelJS from 'exceljs';
import { Sale } from '../models/Sale.mjs';
import { Purchase } from '../models/Purchase.mjs';
import { Product } from '../models/Product.mjs';
import { Customer } from '../models/Customer.mjs';
import { Payment } from '../models/Payment.mjs';
import { Expense } from '../models/Expense.mjs';
import { round2 } from '../utils/calculations.mjs';

/**
 * Builds date range match object for aggregation pipelines.
 */
const buildDateFilter = (startDate, endDate, field = 'createdAt') => {
  const filter = {};
  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) filter[field].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }
  return filter;
};

/**
 * Sales Report with total bills, sales volume, discounts, taxes, and collections.
 */
export const getSalesReport = async (query = {}) => {
  const match = buildDateFilter(query.startDate, query.endDate, 'createdAt');

  if (query.customerId) match.customer = query.customerId;
  if (query.paymentMethod) match.paymentMethod = query.paymentMethod;

  const summary = await Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalSubtotal: { $sum: '$subtotal' },
        totalSales: { $sum: '$grandTotal' },
        totalDiscount: { $sum: '$discount' },
        totalGST: { $sum: '$tax' },
        totalCollected: { $sum: '$paidAmount' },
        totalPending: { $sum: '$dueAmount' }
      }
    }
  ]);

  const salesByPaymentMethod = await Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        amount: { $sum: '$grandTotal' }
      }
    }
  ]);

  const result = summary[0] || {
    totalBills: 0,
    totalSubtotal: 0,
    totalSales: 0,
    totalDiscount: 0,
    totalGST: 0,
    totalCollected: 0,
    totalPending: 0
  };

  return {
    summary: {
      totalBills: result.totalBills,
      totalSubtotal: round2(result.totalSubtotal),
      totalSales: round2(result.totalSales),
      totalDiscount: round2(result.totalDiscount),
      totalGST: round2(result.totalGST),
      totalCollected: round2(result.totalCollected),
      totalPending: round2(result.totalPending)
    },
    salesByPaymentMethod
  };
};

/**
 * Purchases Report.
 */
export const getPurchasesReport = async (query = {}) => {
  const match = buildDateFilter(query.startDate, query.endDate, 'purchaseDate');
  if (query.supplierId) match.supplier = query.supplierId;

  const summary = await Purchase.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: 1 },
        totalAmount: { $sum: '$grandTotal' },
        totalDiscount: { $sum: '$discount' },
        totalTax: { $sum: '$tax' },
        totalPaid: { $sum: '$paidAmount' },
        totalDue: { $sum: '$dueAmount' }
      }
    }
  ]);

  const res = summary[0] || {
    totalPurchases: 0,
    totalAmount: 0,
    totalDiscount: 0,
    totalTax: 0,
    totalPaid: 0,
    totalDue: 0
  };

  return {
    summary: {
      totalPurchases: res.totalPurchases,
      totalAmount: round2(res.totalAmount),
      totalDiscount: round2(res.totalDiscount),
      totalTax: round2(res.totalTax),
      totalPaid: round2(res.totalPaid),
      totalDue: round2(res.totalDue)
    }
  };
};

/**
 * Profit & Loss Report:
 * Gross Profit = Total Sales Revenue - Cost of Goods Sold (COGS) - Discounts - Returns Refund
 * Net Profit = Gross Profit - Operating Expenses
 */
export const getProfitReport = async (query = {}) => {
  const match = buildDateFilter(query.startDate, query.endDate, 'createdAt');
  const expenseMatch = buildDateFilter(query.startDate, query.endDate, 'date');

  // 1. Calculate sales revenue, total discount, COGS, and returns
  const salesAggregate = await Sale.aggregate([
    { $match: match },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              revenue: { $sum: '$grandTotal' },
              totalDiscount: { $sum: '$discount' }
            }
          }
        ],
        cogs: [
          { $unwind: '$items' },
          {
            $project: {
              netQuantity: {
                $subtract: ['$items.quantity', { $ifNull: ['$items.returnedQuantity', 0] }]
              },
              purchasePrice: '$items.purchasePrice'
            }
          },
          {
            $group: {
              _id: null,
              totalCOGS: { $sum: { $multiply: ['$netQuantity', '$purchasePrice'] } }
            }
          }
        ],
        returns: [
          { $unwind: { path: '$returns', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              totalRefunds: { $sum: '$returns.refundAmount' }
            }
          }
        ]
      }
    }
  ]);

  // 2. Fetch Operating Expenses
  const expensesAggregate = await Expense.aggregate([
    { $match: expenseMatch },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: '$amount' }
      }
    }
  ]);

  const salesData = salesAggregate[0] || {};
  const revenue = round2(salesData.overall?.[0]?.revenue || 0);
  const totalCOGS = round2(salesData.cogs?.[0]?.totalCOGS || 0);
  const totalRefunds = round2(salesData.returns?.[0]?.totalRefunds || 0);
  const totalExpenses = round2(expensesAggregate[0]?.totalExpenses || 0);

  // Net Sales Revenue = Revenue - Returns
  const netSalesRevenue = round2(revenue - totalRefunds);
  // Gross Profit = Net Sales Revenue - COGS
  const grossProfit = round2(netSalesRevenue - totalCOGS);
  // Net Profit = Gross Profit - Expenses
  const netProfit = round2(grossProfit - totalExpenses);

  return {
    revenue,
    returns: totalRefunds,
    netRevenue: netSalesRevenue,
    cogs: totalCOGS,
    grossProfit,
    operatingExpenses: totalExpenses,
    netProfit,
    marginPercentage: netSalesRevenue > 0 ? round2((netProfit / netSalesRevenue) * 100) : 0
  };
};

/**
 * GST / Tax Report.
 */
export const getGstReport = async (query = {}) => {
  const match = buildDateFilter(query.startDate, query.endDate, 'createdAt');

  const gstBreakdown = await Sale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.gstRate',
        taxableValue: {
          $sum: {
            $subtract: [
              { $multiply: ['$items.quantity', '$items.unitPrice'] },
              '$items.discount'
            ]
          }
        },
        taxAmount: { $sum: '$items.tax' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  let totalTaxableValue = 0;
  let totalTaxAmount = 0;

  const rates = gstBreakdown.map((item) => {
    const taxable = round2(item.taxableValue);
    const tax = round2(item.taxAmount);
    totalTaxableValue = round2(totalTaxableValue + taxable);
    totalTaxAmount = round2(totalTaxAmount + tax);

    return {
      gstRate: item._id,
      taxableValue: taxable,
      taxAmount: tax,
      cgst: round2(tax / 2),
      sgst: round2(tax / 2)
    };
  });

  return {
    totalTaxableValue,
    totalTaxAmount,
    totalCgst: round2(totalTaxAmount / 2),
    totalSgst: round2(totalTaxAmount / 2),
    breakdownByRate: rates
  };
};

/**
 * Inventory Valuation Report.
 */
export const getInventoryReport = async () => {
  const result = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStockUnits: { $sum: '$stock' },
        valuationAtCost: { $sum: { $multiply: ['$stock', '$purchasePrice'] } },
        valuationAtSellingPrice: { $sum: { $multiply: ['$stock', '$sellingPrice'] } }
      }
    }
  ]);

  const summary = result[0] || {
    totalProducts: 0,
    totalStockUnits: 0,
    valuationAtCost: 0,
    valuationAtSellingPrice: 0
  };

  return {
    totalProducts: summary.totalProducts,
    totalStockUnits: summary.totalStockUnits,
    valuationAtCost: round2(summary.valuationAtCost),
    valuationAtSellingPrice: round2(summary.valuationAtSellingPrice),
    potentialProfit: round2(summary.valuationAtSellingPrice - summary.valuationAtCost)
  };
};

/**
 * Payment collection report.
 */
export const getPaymentsReport = async (query = {}) => {
  const match = buildDateFilter(query.startDate, query.endDate, 'paymentDate');
  if (query.method) match.method = query.method;
  if (query.type) match.type = query.type;

  const breakdown = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$method',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const totalCollected = breakdown.reduce((acc, curr) => round2(acc + curr.totalAmount), 0);

  return {
    totalCollected,
    methods: breakdown.map((b) => ({
      method: b._id,
      count: b.count,
      totalAmount: round2(b.totalAmount)
    }))
  };
};

/**
 * Excel Exports using ExcelJS.
 */
export const exportSalesToExcel = async (query = {}) => {
  const match = buildDateFilter(query.startDate, query.endDate, 'createdAt');
  const sales = await Sale.find(match)
    .populate('customer', 'name phone')
    .populate('cashier', 'name')
    .sort({ createdAt: -1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sales Report');

  sheet.columns = [
    { header: 'Invoice No', key: 'invoiceNumber', width: 18 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Customer', key: 'customer', width: 22 },
    { header: 'Subtotal (₹)', key: 'subtotal', width: 14 },
    { header: 'Discount (₹)', key: 'discount', width: 14 },
    { header: 'GST (₹)', key: 'tax', width: 14 },
    { header: 'Grand Total (₹)', key: 'grandTotal', width: 16 },
    { header: 'Paid (₹)', key: 'paidAmount', width: 14 },
    { header: 'Due (₹)', key: 'dueAmount', width: 14 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Cashier', key: 'cashier', width: 16 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };

  sales.forEach((s) => {
    sheet.addRow({
      invoiceNumber: s.invoiceNumber,
      date: new Date(s.createdAt).toISOString().split('T')[0],
      customer: s.customer ? `${s.customer.name} (${s.customer.phone})` : 'Walk-in',
      subtotal: s.subtotal,
      discount: s.discount,
      tax: s.tax,
      grandTotal: s.grandTotal,
      paidAmount: s.paidAmount,
      dueAmount: s.dueAmount,
      paymentMethod: s.paymentMethod.toUpperCase(),
      status: s.status,
      cashier: s.cashier?.name || 'N/A'
    });
  });

  return workbook;
};

export const exportProductsToExcel = async () => {
  const products = await Product.find().populate('category', 'name').sort({ name: 1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Products');

  sheet.columns = [
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Product Name', key: 'name', width: 30 },
    { header: 'Barcode', key: 'barcode', width: 18 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Brand', key: 'brand', width: 18 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Cost Price (₹)', key: 'purchasePrice', width: 14 },
    { header: 'Selling Price (₹)', key: 'sellingPrice', width: 14 },
    { header: 'GST %', key: 'gstRate', width: 10 },
    { header: 'Current Stock', key: 'stock', width: 14 },
    { header: 'Min Stock Alert', key: 'minimumStock', width: 14 },
    { header: 'Status', key: 'isActive', width: 12 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } };

  products.forEach((p) => {
    sheet.addRow({
      sku: p.sku,
      name: p.name,
      barcode: p.barcode || 'N/A',
      category: p.category?.name || 'Uncategorized',
      brand: p.brand || '',
      unit: p.unit,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      gstRate: `${p.gstRate}%`,
      stock: p.stock,
      minimumStock: p.minimumStock,
      isActive: p.isActive ? 'ACTIVE' : 'INACTIVE'
    });
  });

  return workbook;
};

export const exportInventoryToExcel = async () => {
  return await exportProductsToExcel();
};

export const exportCustomersToExcel = async () => {
  const customers = await Customer.find().sort({ name: 1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');

  sheet.columns = [
    { header: 'Customer Name', key: 'name', width: 25 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'GSTIN', key: 'gstin', width: 18 },
    { header: 'Credit Limit (₹)', key: 'creditLimit', width: 16 },
    { header: 'Outstanding Credit (₹)', key: 'currentCredit', width: 20 },
    { header: 'Status', key: 'isActive', width: 12 }
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF234E52' } };

  customers.forEach((c) => {
    sheet.addRow({
      name: c.name,
      phone: c.phone,
      email: c.email || 'N/A',
      address: c.address || 'N/A',
      gstin: c.gstin || 'N/A',
      creditLimit: c.creditLimit,
      currentCredit: c.currentCredit,
      isActive: c.isActive ? 'ACTIVE' : 'INACTIVE'
    });
  });

  return workbook;
};

export default {
  getSalesReport,
  getPurchasesReport,
  getProfitReport,
  getGstReport,
  getInventoryReport,
  getPaymentsReport,
  exportSalesToExcel,
  exportProductsToExcel,
  exportInventoryToExcel,
  exportCustomersToExcel
};
