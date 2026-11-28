import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.mjs';
import { requireAnyPermission } from '../middleware/permission.middleware.mjs';
import { validate } from '../middleware/validate.middleware.mjs';
import {
  requireWhatsAppBusinessContext,
  whatsappConnectLimiter,
  whatsappSendLimiter,
  sendInvoiceWhatsAppSchema,
  disconnectWhatsAppSchema,
} from '../middleware/whatsapp.middleware.mjs';
import whatsappController from '../controllers/whatsapp.controller.mjs';

const router = Router();

router.use(authMiddleware);
router.use(requireWhatsAppBusinessContext);

router.post(
  '/connect',
  requireAnyPermission('billing.create', 'billing.view', 'settings.manage'),
  whatsappConnectLimiter,
  whatsappController.connectWhatsApp
);

router.get(
  '/qr',
  requireAnyPermission('billing.view', 'billing.create'),
  whatsappController.getWhatsAppQr
);

router.get(
  '/status',
  requireAnyPermission('billing.view', 'billing.create'),
  whatsappController.getWhatsAppStatus
);

router.post(
  '/refresh-qr',
  requireAnyPermission('billing.create', 'settings.manage'),
  whatsappConnectLimiter,
  whatsappController.refreshWhatsAppQr
);

router.post(
  '/disconnect',
  requireAnyPermission('billing.create', 'settings.manage'),
  validate(disconnectWhatsAppSchema),
  whatsappController.disconnectWhatsApp
);

router.post(
  '/send-invoice',
  requireAnyPermission('billing.create', 'billing.view'),
  whatsappSendLimiter,
  validate(sendInvoiceWhatsAppSchema),
  whatsappController.sendInvoiceWhatsApp
);

router.get(
  '/messages/:invoiceId',
  requireAnyPermission('billing.view', 'billing.create'),
  whatsappController.getInvoiceWhatsAppHistory
);

export default router;
