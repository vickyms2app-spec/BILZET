import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import storeController from '../controllers/store.controller.mjs';

const router = Router();

router.use(authMiddleware);

// Get all stores authorized for current user
router.get('/', storeController.getUserStores);
router.get('/my', storeController.getUserStores);

// Switch active store context
router.post('/switch', storeController.switchStore);

// Create a new store / branch (Admin only)
router.post('/', storeController.createStore);

export default router;
