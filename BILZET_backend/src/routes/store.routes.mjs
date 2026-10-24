import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';
import storeController from '../controllers/store.controller.mjs';

const router = Router();

router.use(authMiddleware);

// Get all stores authorized for current user
router.get('/', storeController.getUserStores);
router.get('/my', storeController.getUserStores);

// Switch active store context
router.post('/switch', storeController.switchStore);

// Create a new store / branch (Admin only, Premium feature)
router.post(
  '/',
  requirePlanTier('PREMIUM', 'Multi-store and branch management', 'stores.multi_store'),
  storeController.createStore
);

// Register a new shop during onboarding (Validates owner role and creates business)
router.post('/register-shop', storeController.registerShop);
router.post('/register', storeController.registerShop);

// Determine verified onboarding status from database
router.get('/onboarding-status', storeController.getOnboardingStatus);

export default router;
