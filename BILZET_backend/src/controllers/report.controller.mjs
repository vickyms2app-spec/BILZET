import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import reportService from '../services/report.service.mjs';

export const getSalesReport = asyncHandler(async (req, res) => {
  const report = await reportService.getSalesReport(req.query);
  return sendResponse(res, 200, report, 'Sales report generated successfully');
});

export const getDailyReport = asyncHandler(async (req, res) => {
  const report = await reportService.getDailyReport(req.query);
  return sendResponse(res, 200, { report }, 'Daily sales report generated');
});

export const getMonthlyReport = asyncHandler(async (req, res) => {
  const report = await reportService.getMonthlyReport(req.query.year);
  return sendResponse(res, 200, { report }, 'Monthly sales breakdown generated');
});

export const getYearlyReport = asyncHandler(async (req, res) => {
  const report = await reportService.getYearlyReport();
  return sendResponse(res, 200, { report }, 'Yearly sales comparison generated');
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

export const getAnalyticsReport = asyncHandler(async (req, res) => {
  const report = await reportService.getAnalyticsReport();
  return sendResponse(res, 200, { report }, 'Business analytics metrics fetched');
});

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
