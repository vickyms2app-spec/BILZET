import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import realtimeController from '../controllers/realtime.controller.mjs';

const router = Router();

// Real-time synchronization routes require user authentication (Bearer or ?token=)
router.use(authMiddleware);

// Server-Sent Events (SSE) Stream
router.get('/stream', realtimeController.subscribeStream);

// State reconciliation and health check
router.get('/reconcile', realtimeController.getReconciliationState);
router.get('/ping', realtimeController.ping);
router.post('/ping', realtimeController.ping);

export default router;
