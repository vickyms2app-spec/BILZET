import { Router } from 'express';
import smsController from '../controllers/sms.controller.mjs';
import { authMiddleware } from '../middleware/auth.middleware.mjs';

const router = Router();

router.use(authMiddleware);

router.get('/', smsController.getCampaigns);
router.post('/', smsController.createCampaign);

export default router;
