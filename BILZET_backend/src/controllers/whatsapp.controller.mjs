import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import whatsappManager, {
  sendInvoicePdfViaWhatsApp,
  getInvoiceWhatsAppMessages,
} from '../services/whatsapp.service.mjs';

export const connectWhatsApp = asyncHandler(async (req, res) => {
  const status = await whatsappManager.connect(req.whatsappBusinessId);
  return sendResponse(res, 200, status, 'WhatsApp connection initialized.');
});

export const getWhatsAppQr = asyncHandler(async (req, res) => {
  const qrPayload = await whatsappManager.getQr(req.whatsappBusinessId);
  return sendResponse(res, 200, qrPayload, 'WhatsApp QR state retrieved.');
});

export const getWhatsAppStatus = asyncHandler(async (req, res) => {
  const status = await whatsappManager.getStatus(req.whatsappBusinessId);
  return sendResponse(res, 200, status, 'WhatsApp connection status retrieved.');
});

export const refreshWhatsAppQr = asyncHandler(async (req, res) => {
  const status = await whatsappManager.refreshQr(req.whatsappBusinessId);
  return sendResponse(res, 200, status, 'WhatsApp QR refresh initiated.');
});

export const disconnectWhatsApp = asyncHandler(async (req, res) => {
  const unlink = req.body?.unlink !== false;
  const status = await whatsappManager.disconnect(req.whatsappBusinessId, { unlink });
  return sendResponse(res, 200, status, 'WhatsApp session disconnected.');
});

export const sendInvoiceWhatsApp = asyncHandler(async (req, res) => {
  const { invoiceId, customerPhone, customMessage, allowDuplicate } = req.body;
  const result = await sendInvoicePdfViaWhatsApp({
    businessId: req.whatsappBusinessId,
    invoiceId,
    customerPhone,
    customMessage,
    allowDuplicate: Boolean(allowDuplicate),
  });
  return sendResponse(res, 200, result, `Invoice ${result.invoiceNumber} sent via WhatsApp.`);
});

export const getInvoiceWhatsAppHistory = asyncHandler(async (req, res) => {
  const messages = await getInvoiceWhatsAppMessages({
    businessId: req.whatsappBusinessId,
    invoiceId: req.params.invoiceId,
  });
  return sendResponse(res, 200, { messages }, 'WhatsApp message history retrieved.');
});

export default {
  connectWhatsApp,
  getWhatsAppQr,
  getWhatsAppStatus,
  refreshWhatsAppQr,
  disconnectWhatsApp,
  sendInvoiceWhatsApp,
  getInvoiceWhatsAppHistory,
};
