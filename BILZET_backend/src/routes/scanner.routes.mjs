import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import scannerController from '../controllers/scanner.controller.mjs';

const router = Router();

// Mobile Endpoints (Authenticated via PairToken or DeviceToken)
router.post('/pair-verify', scannerController.verifyPair);
router.post('/reconnect', scannerController.reconnect);
router.post('/scan', scannerController.sendScan);
router.post('/disconnect', scannerController.disconnectDevice);

// Laptop Endpoints (Authenticated via Desktop User Session)
router.post('/pair-request', authMiddleware, scannerController.createPairRequest);
router.get('/devices', authMiddleware, scannerController.getDevices);
router.delete('/devices/:deviceId', authMiddleware, scannerController.revokeDevice);

export default router;
