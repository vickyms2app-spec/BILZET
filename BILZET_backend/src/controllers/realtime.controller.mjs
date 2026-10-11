import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import realtimeService from '../services/realtime.service.mjs';
import caPortalService from '../services/caPortal.service.mjs';

/**
 * Controller for Real-Time SSE Streams and Reconciliation
 */

export const subscribeStream = asyncHandler(async (req, res) => {
  const businessId =
    req.query.businessId ||
    req.headers['x-business-id'] ||
    req.headers['x-store-id'] ||
    req.user.businessId;

  if (!businessId) {
    throw ApiError.badRequest('Target businessId is required for real-time synchronization');
  }

  // 1. Enforce Multi-Tenant Access Control & Client Isolation (Req 7)
  const isSuperAdmin = req.user.role === 'SUPER_ADMIN' || req.user.isSuperAdmin;
  const isCA = req.user.role === 'CA';
  const isStoreAdminOrOwner = req.user.role === 'ADMIN' || req.user.role === 'OWNER';

  if (!isSuperAdmin) {
    if (isCA) {
      // CA must be explicitly authorized for this businessId
      await caPortalService.verifyCAStoreAccess(req.user, businessId);
    } else if (req.user.businessId !== businessId) {
      if (isStoreAdminOrOwner && !req.user.businessId) {
        // Allowed if owner without locked businessId
      } else {
        throw ApiError.forbidden(`Access denied: You are not authorized to subscribe to real-time events for store '${businessId}'`);
      }
    }
  }

  // 2. Setup Server-Sent Events (SSE) Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  if (res.flushHeaders) {
    res.flushHeaders();
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const clientObj = {
    id: clientId,
    res,
    userId: req.user.id,
    businessId,
    role: req.user.role,
    isCA,
    connectedAt: new Date().toISOString(),
  };

  // 3. Send Initial Handshake Event
  const handshakePayload = {
    type: 'CONNECTED',
    clientId,
    businessId,
    userId: req.user.id,
    connectedAt: clientObj.connectedAt,
    activeSubscribers: realtimeService.getConnectionCount(businessId) + 1,
    message: 'Real-time synchronization established with BILZET Core',
  };

  res.write(`event: CONNECTED\ndata: ${JSON.stringify(handshakePayload)}\n\n`);

  // 4. Replay Missed Events if client provided Last-Event-ID (Req 6 & 8)
  const lastEventId = req.headers['last-event-id'] || req.query.lastEventId || null;
  const sinceTimestamp = req.query.since || null;

  if (lastEventId || sinceTimestamp) {
    const missedEvents = realtimeService.getMissedEvents(businessId, lastEventId, sinceTimestamp);
    for (const evt of missedEvents) {
      res.write(`id: ${evt.eventId}\nevent: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`);
    }
  }

  // 5. Register with Realtime Engine
  realtimeService.addClient(businessId, clientObj);
});

export const getReconciliationState = asyncHandler(async (req, res) => {
  const businessId =
    req.query.businessId ||
    req.headers['x-business-id'] ||
    req.headers['x-store-id'] ||
    req.user.businessId;

  if (!businessId) {
    throw ApiError.badRequest('businessId is required for reconciliation');
  }

  // Access validation
  const isSuperAdmin = req.user.role === 'SUPER_ADMIN' || req.user.isSuperAdmin;
  const isCA = req.user.role === 'CA';

  if (!isSuperAdmin) {
    if (isCA) {
      await caPortalService.verifyCAStoreAccess(req.user, businessId);
    } else if (req.user.businessId !== businessId) {
      throw ApiError.forbidden('Unauthorized access to store state');
    }
  }

  const state = await realtimeService.getReconciliationState(businessId);
  return sendResponse(res, 200, state, 'Reconciliation state calculated successfully');
});

export const ping = asyncHandler(async (req, res) => {
  const businessId = req.query.businessId || req.user?.businessId || 'default';
  const subscribers = realtimeService.getConnectionCount(businessId);
  return sendResponse(res, 200, {
    status: 'ONLINE',
    subscribers,
    timestamp: new Date().toISOString(),
  }, 'Real-time service online');
});

export default {
  subscribeStream,
  getReconciliationState,
  ping,
};
