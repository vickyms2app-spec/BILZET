import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import reportService from '../services/report.service.mjs';

export const getSalesReport = asyncHandler(async (req, res) => {
  const report = await reportService.getSalesReport(req.query);
  return sendResponse(res, 200, report, 'Sales report generated successfully');
});

export const getPurchasesReport = asyncHandler(async (req, res) => {
  const report = await reportService.getPurchasesReport(req.query);
  return sendResponse(res, 200, report, 'Purchases report generated successfully');
});

export const getProfitReport = asyncHandler(async (req, res) => {
  const report = await reportService.getProfitReport(req.query);
  return sendResponse(res, 200, report, 'Profit and loss report generated successfully');
});

export const getInventoryReport = asyncHandler(async (req, res) => {
  const report = await reportService.getInventoryReport();
  return sendResponse(res, 200, report, 'Inventory valuation report generated successfully');
});

export const getGstReport = asyncHandler(async (req, res) => {
  const report = await reportService.getGstReport(req.query);
  return sendResponse(res, 200, report, 'GST report generated successfully');
});

export const getPaymentsReport = asyncHandler(async (req, res) => {
  const report = await reportService.getPaymentsReport(req.query);
  return sendResponse(res, 200, report, 'Payments report generated successfully');
});

export const exportSales = asyncHandler(async (req, res) => {
  const workbook = await reportService.exportSalesToExcel(req.query);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
  await workbook.xlsx.write(res);
  return res.end();
});

export const exportProducts = asyncHandler(async (req, res) => {
  const workbook = await reportService.exportProductsToExcel();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="products-catalogue.xlsx"');
  await workbook.xlsx.write(res);
  return res.end();
});

export const exportInventory = asyncHandler(async (req, res) => {
  const workbook = await reportService.exportInventoryToExcel();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.xlsx"');
  await workbook.xlsx.write(res);
  return res.end();
});

export const exportCustomers = asyncHandler(async (req, res) => {
  const workbook = await reportService.exportCustomersToExcel();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="customers-report.xlsx"');
  await workbook.xlsx.write(res);
  return res.end();
});

export default {
  getSalesReport,
  getPurchasesReport,
  getProfitReport,
  getInventoryReport,
  getGstReport,
  getPaymentsReport,
  exportSales,
  exportProducts,
  exportInventory,
  exportCustomers
};
