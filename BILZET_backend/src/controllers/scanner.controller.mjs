import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import scannerPairingService from '../services/scannerPairing.service.mjs';

/**
 * Controller for Mobile-to-Desktop Persistent Barcode Scanner Pairing
 */

export const createPairRequest = asyncHandler(async (req, res) => {
  const businessId =
    req.headers['x-business-id'] ||
    req.headers['x-store-id'] ||
    req.user?.businessId ||
    req.user?.id;

  if (!businessId) {
    throw ApiError.badRequest('Target businessId is required for mobile scanner pairing');
  }

  const businessName =
    req.user?.storeName ||
    req.user?.businessName ||
    'BILZET Retail POS';

  const origin = req.headers.origin || req.headers.referer || '';

  const result = await scannerPairingService.createPairRequest({
    businessId,
    userId: req.user.id,
    businessName,
    origin,
  });

  return sendResponse(res, 201, result, 'Pairing QR session created successfully');
});

export const verifyPair = asyncHandler(async (req, res) => {
  const { pairToken, businessId, deviceInfo } = req.body;

  if (!pairToken || !businessId) {
    throw ApiError.badRequest('pairToken and businessId are required');
  }

  const clientIp = req.ip || req.connection?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  const authData = await scannerPairingService.verifyAndAuthorizeDevice({
    pairToken,
    businessId,
    deviceInfo,
    clientIp,
    userAgent,
  });

  return sendResponse(res, 200, authData, 'Device authorized successfully');
});

export const reconnect = asyncHandler(async (req, res) => {
  const { deviceId, deviceToken, businessId } = req.body;

  if (!deviceId || !deviceToken || !businessId) {
    throw ApiError.badRequest('deviceId, deviceToken, and businessId are required');
  }

  const clientIp = req.ip || req.connection?.remoteAddress || '';

  try {
    const session = await scannerPairingService.reconnectDevice({
      deviceId,
      deviceToken,
      businessId,
      clientIp,
    });

    return sendResponse(res, 200, session, 'Device reconnected successfully');
  } catch (err) {
    if (err.code === 'DEVICE_REVOKED') {
      throw ApiError.unauthorized('Device authorization revoked. Please scan a new QR code.');
    }
    if (err.code === 'DEVICE_NOT_FOUND' || err.code === 'INVALID_TOKEN') {
      throw ApiError.unauthorized('Invalid or expired device credentials. Please re-pair with QR code.');
    }
    throw ApiError.forbidden(err.message || 'Reconnection failed');
  }
});

export const sendScan = asyncHandler(async (req, res) => {
  const { deviceId, deviceToken, businessId, barcode, scanId, timestamp } = req.body;

  if (!deviceId || !deviceToken || !businessId || !barcode) {
    throw ApiError.badRequest('Missing scan parameters');
  }

  try {
    const scanResult = await scannerPairingService.processBarcodeScan({
      deviceId,
      deviceToken,
      businessId,
      barcode,
      scanId,
      timestamp,
    });

    return sendResponse(res, 200, scanResult, 'Barcode transmitted to desktop billing');
  } catch (err) {
    if (err.code === 'UNAUTHORIZED') {
      throw ApiError.unauthorized(err.message || 'Device unauthorized');
    }
    if (err.code === 'FORBIDDEN') {
      throw ApiError.forbidden(err.message || 'Tenant access forbidden');
    }
    throw ApiError.badRequest(err.message || 'Barcode transmission failed');
  }
});

export const getDevices = asyncHandler(async (req, res) => {
  const businessId =
    req.headers['x-business-id'] ||
    req.headers['x-store-id'] ||
    req.user?.businessId ||
    req.user?.id;

  if (!businessId) {
    throw ApiError.badRequest('businessId is required');
  }

  const devices = await scannerPairingService.getDevicesForBusiness(businessId);
  return sendResponse(res, 200, { devices }, 'Paired devices retrieved successfully');
});

export const revokeDevice = asyncHandler(async (req, res) => {
  const businessId =
    req.headers['x-business-id'] ||
    req.headers['x-store-id'] ||
    req.user?.businessId ||
    req.user?.id;

  const { deviceId } = req.params;

  if (!businessId || !deviceId) {
    throw ApiError.badRequest('businessId and deviceId are required');
  }

  const result = await scannerPairingService.revokeDevice(businessId, deviceId);
  return sendResponse(res, 200, result, 'Device authorization revoked permanently');
});

export const disconnectDevice = asyncHandler(async (req, res) => {
  const { businessId, deviceId } = req.body;
  if (!businessId || !deviceId) {
    throw ApiError.badRequest('businessId and deviceId are required');
  }

  const result = await scannerPairingService.disconnectDevice(businessId, deviceId);
  return sendResponse(res, 200, result, 'Device disconnected');
});

export default {
  createPairRequest,
  verifyPair,
  reconnect,
  sendScan,
  getDevices,
  revokeDevice,
  disconnectDevice,
};
