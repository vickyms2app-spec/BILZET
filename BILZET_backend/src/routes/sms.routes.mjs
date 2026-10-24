import { Router } from 'express';
import smsController from '../controllers/sms.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requirePlanTier } from '../middleware/plan.middleware.mjs';

const router = Router();

router.use(authMiddleware);
router.use(requirePlanTier('PRO', 'SMS Marketing & Campaigns'));

router.get('/status', smsController.getProviderStatus);
router.post('/send-test', smsController.sendTestSms);
router.get('/', smsController.getCampaigns);
router.post('/', smsController.createCampaign);

export default router;
