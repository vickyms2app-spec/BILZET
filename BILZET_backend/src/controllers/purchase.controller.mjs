import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import purchaseService from '../services/purchase.service.mjs';

export const createPurchase = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase(req.body, req.user, { req });
  return sendResponse(res, 201, { purchase }, 'Purchase order created successfully');
});

export const getPurchases = asyncHandler(async (req, res) => {
  const { purchases, meta } = await purchaseService.getPurchases(req.query);
  return sendResponse(res, 200, { purchases }, 'Purchases fetched successfully', meta);
});

export const getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.getPurchaseById(req.params.id);
  return sendResponse(res, 200, { purchase }, 'Purchase fetched successfully');
});

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await purchaseService.createPurchaseOrder(req.body);
  return sendResponse(res, 201, { purchaseOrder: po }, 'Purchase order issued successfully');
});

export const getPurchaseOrders = asyncHandler(async (req, res) => {
  const purchaseOrders = await purchaseService.getPurchaseOrders(req.query);
  return sendResponse(res, 200, { purchaseOrders }, 'Purchase orders fetched successfully');
});

export const updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
  const updated = await purchaseService.updatePurchaseOrderStatus(req.params.id, req.body.status);
  return sendResponse(res, 200, { purchaseOrder: updated }, 'Purchase order status updated');
});

export const createPurchaseReturn = asyncHandler(async (req, res) => {
  const ret = await purchaseService.createPurchaseReturn(req.body);
  return sendResponse(res, 201, { purchaseReturn: ret }, 'Purchase return recorded and stock adjusted');
});

export const createDebitNote = asyncHandler(async (req, res) => {
  const dn = await purchaseService.createDebitNote(req.body);
  return sendResponse(res, 201, { debitNote: dn }, 'Debit note created successfully');
});

export const getDebitNotes = asyncHandler(async (req, res) => {
  const debitNotes = await purchaseService.getDebitNotes(req.query);
  return sendResponse(res, 200, { debitNotes }, 'Debit notes fetched successfully');
});

export default {
  createPurchase,
  getPurchases,
  getPurchaseById,
  createPurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrderStatus,
  createPurchaseReturn,
  createDebitNote,
  getDebitNotes,
};
