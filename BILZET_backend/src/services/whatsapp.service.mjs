import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import prisma, { getAuthoritativePrisma } from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { generateSaleInvoicePdfBuffer } from './invoice.service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

export const WHATSAPP_SESSIONS_DIR = path.join(backendRoot, '.whatsapp-sessions');
const QR_TTL_MS = 60_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 2000;

export const WHATSAPP_STATUS = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTING: 'CONNECTING',
  WAITING_FOR_QR: 'WAITING_FOR_QR',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  DISCONNECTED: 'DISCONNECTED',
  AUTH_FAILED: 'AUTH_FAILED',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
};

const silentLogger = pino({ level: 'silent' });

export function sanitizeBusinessId(businessId) {
  if (!businessId || typeof businessId !== 'string') {
    throw ApiError.badRequest('Valid business ID is required for WhatsApp session.');
  }
  const safe = businessId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe) {
    throw ApiError.badRequest('Invalid business ID format.');
  }
  return safe;
}

function extractPhoneFromJid(jid) {
  if (!jid || typeof jid !== 'string') return null;
  const userPart = jid.split('@')[0] || '';
  const phone = userPart.split(':')[0] || '';
  return phone ? `+${phone}` : null;
}

function ensureSessionDir(safeBusinessId, baseDir = WHATSAPP_SESSIONS_DIR) {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true, mode: 0o700 });
  }
  const dir = path.join(baseDir, safeBusinessId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

function removeSessionDir(safeBusinessId, baseDir = WHATSAPP_SESSIONS_DIR) {
  const dir = path.join(baseDir, safeBusinessId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function hasSavedCreds(safeBusinessId, baseDir = WHATSAPP_SESSIONS_DIR) {
  const credsPath = path.join(baseDir, safeBusinessId, 'creds.json');
  if (!fs.existsSync(credsPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    return Boolean(parsed && (parsed.me?.id || parsed.registered || parsed.advSecretKey));
  } catch (_) {
    return false;
  }
}

/**
 * Reusable per-business Baileys WhatsApp connection manager.
 * Guarantees isolated sockets and auth directories per businessId.
 */
export class WhatsAppConnectionManager {
  constructor({
    sessionsDir = WHATSAPP_SESSIONS_DIR,
    socketFactory = makeWASocket,
    authStateFactory = useMultiFileAuthState,
    versionFetcher = fetchLatestBaileysVersion,
    qrGenerator = QRCode.toDataURL,
    prismaClient = prisma,
    reconnectBaseDelayMs = BASE_RECONNECT_DELAY_MS,
  } = {}) {
    this.sessionsDir = sessionsDir;
    this.socketFactory = socketFactory;
    this.authStateFactory = authStateFactory;
    this.versionFetcher = versionFetcher;
    this.qrGenerator = qrGenerator;
    this.prismaClient = prismaClient;
    this.reconnectBaseDelayMs = reconnectBaseDelayMs;

    /** @type {Map<string, object>} */
    this.sessions = new Map();
    /** @type {Map<string, Promise<object>>} */
    this.initLocks = new Map();
    this.shuttingDown = false;
  }

  _getOrCreateState(safeId) {
    if (!this.sessions.has(safeId)) {
      this.sessions.set(safeId, {
        businessId: safeId,
        socket: null,
        status: WHATSAPP_STATUS.NOT_CONNECTED,
        qrDataUrl: null,
        qrExpiresAt: null,
        phoneNumber: null,
        lastError: null,
        reconnectAttempts: 0,
        reconnectTimer: null,
        manualDisconnect: false,
        lastConnectedAt: null,
      });
    }
    return this.sessions.get(safeId);
  }

  _clearReconnectTimer(state) {
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
  }

  async _syncDbSession(safeId, state) {
    if (!this.prismaClient?.whatsAppSession?.upsert) return;
    try {
      await this.prismaClient.whatsAppSession.upsert({
        where: { businessId: safeId },
        create: {
          businessId: safeId,
          connectionStatus: state.status,
          phoneNumber: state.phoneNumber,
          lastConnectedAt: state.lastConnectedAt,
        },
        update: {
          connectionStatus: state.status,
          phoneNumber: state.phoneNumber,
          lastConnectedAt: state.lastConnectedAt,
        },
      });
    } catch (_) {
      // Non-fatal if DB migration hasn't been applied yet or in unit tests
    }
  }

  _serializePublicStatus(state) {
    const now = Date.now();
    const hasValidQr = Boolean(
      state.qrDataUrl && state.qrExpiresAt && now < state.qrExpiresAt
    );
    return {
      businessId: state.businessId,
      status: state.status,
      connected: state.status === WHATSAPP_STATUS.CONNECTED,
      phoneNumber: state.phoneNumber || null,
      hasQr: hasValidQr,
      qrExpiresAt: hasValidQr ? new Date(state.qrExpiresAt).toISOString() : null,
      lastError: state.lastError || null,
      lastConnectedAt: state.lastConnectedAt
        ? new Date(state.lastConnectedAt).toISOString()
        : null,
    };
  }

  async connect(businessId) {
    const safeId = sanitizeBusinessId(businessId);

    if (this.initLocks.has(safeId)) {
      return this.initLocks.get(safeId);
    }

    const state = this._getOrCreateState(safeId);
    if (state.status === WHATSAPP_STATUS.CONNECTED && state.socket) {
      return this._serializePublicStatus(state);
    }

    const initPromise = this._initializeSocket(safeId, state).finally(() => {
      this.initLocks.delete(safeId);
    });
    this.initLocks.set(safeId, initPromise);
    return initPromise;
  }

  async _initializeSocket(safeId, state) {
    this._clearReconnectTimer(state);
    state.manualDisconnect = false;
    state.lastError = null;
    state.status = WHATSAPP_STATUS.CONNECTING;
    await this._syncDbSession(safeId, state);

    // Clean up any existing stale socket before creating a new one
    if (state.socket) {
      try {
        state.socket.ev?.removeAllListeners?.('connection.update');
        state.socket.ev?.removeAllListeners?.('creds.update');
        state.socket.end?.();
      } catch (_) {}
      state.socket = null;
    }

    const sessionDir = ensureSessionDir(safeId, this.sessionsDir);
    const { state: authState, saveCreds } = await this.authStateFactory(sessionDir);

    let version;
    try {
      const versionInfo = await this.versionFetcher();
      version = versionInfo?.version;
    } catch (_) {
      version = undefined;
    }

    const socket = this.socketFactory({
      auth: authState,
      ...(version ? { version } : {}),
      printQRInTerminal: false,
      browser: ['BILZET Billing', 'Chrome', '1.0.0'],
      logger: silentLogger,
      markOnlineOnConnect: false,
    });

    state.socket = socket;

    socket.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.warn(`[WhatsApp:${safeId}] Failed to save creds:`, err?.message);
      }
    });

    socket.ev.on('connection.update', async (update) => {
      if (state.socket !== socket) return; // Ignore events from superseded sockets
      const { connection, lastDisconnect, qr } = update || {};

      if (qr) {
        try {
          state.qrDataUrl = await this.qrGenerator(qr, {
            width: 320,
            margin: 2,
          });
          state.qrExpiresAt = Date.now() + QR_TTL_MS;
          state.status = WHATSAPP_STATUS.WAITING_FOR_QR;
          state.lastError = null;
          await this._syncDbSession(safeId, state);
        } catch (qrErr) {
          state.status = WHATSAPP_STATUS.CONNECTION_ERROR;
          state.lastError = 'Failed to render WhatsApp pairing QR code.';
          await this._syncDbSession(safeId, state);
        }
      }

      if (connection === 'open') {
        state.status = WHATSAPP_STATUS.CONNECTED;
        state.qrDataUrl = null;
        state.qrExpiresAt = null;
        state.lastError = null;
        state.reconnectAttempts = 0;
        state.lastConnectedAt = new Date();
        state.phoneNumber = extractPhoneFromJid(socket.user?.id);
        await this._syncDbSession(safeId, state);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        state.socket = null;
        state.qrDataUrl = null;
        state.qrExpiresAt = null;

        if (state.manualDisconnect || this.shuttingDown) {
          state.status = WHATSAPP_STATUS.DISCONNECTED;
          await this._syncDbSession(safeId, state);
          return;
        }

        if (isLoggedOut) {
          state.status = WHATSAPP_STATUS.AUTH_FAILED;
          state.phoneNumber = null;
          state.lastError = 'WhatsApp session was logged out or unlinked. Please scan QR again.';
          removeSessionDir(safeId, this.sessionsDir);
          await this._syncDbSession(safeId, state);
          return;
        }

        if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const attempt = state.reconnectAttempts;
          state.reconnectAttempts += 1;
          state.status = WHATSAPP_STATUS.RECONNECTING;
          state.lastError = `Connection interrupted (attempt ${state.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}). Reconnecting...`;
          await this._syncDbSession(safeId, state);

          const delay = Math.min(30_000, this.reconnectBaseDelayMs * Math.pow(2, attempt));
          state.reconnectTimer = setTimeout(() => {
            if (!this.shuttingDown && !state.manualDisconnect) {
              this.connect(safeId).catch(() => {});
            }
          }, delay);
          state.reconnectTimer.unref?.();
        } else {
          state.status = WHATSAPP_STATUS.CONNECTION_ERROR;
          state.lastError = 'Unable to reconnect to WhatsApp after multiple attempts. Please retry.';
          await this._syncDbSession(safeId, state);
        }
      }
    });

    return this._serializePublicStatus(state);
  }

  async getStatus(businessId) {
    const safeId = sanitizeBusinessId(businessId);
    const state = this._getOrCreateState(safeId);

    // Check DB metadata if in-memory status is still NOT_CONNECTED
    if (
      state.status === WHATSAPP_STATUS.NOT_CONNECTED &&
      this.prismaClient?.whatsAppSession?.findUnique
    ) {
      try {
        const dbSession = await this.prismaClient.whatsAppSession.findUnique({
          where: { businessId: safeId },
        });
        if (dbSession) {
          state.phoneNumber = dbSession.phoneNumber || state.phoneNumber;
          state.lastConnectedAt = dbSession.lastConnectedAt || state.lastConnectedAt;
          if (
            dbSession.connectionStatus === WHATSAPP_STATUS.CONNECTED &&
            !hasSavedCreds(safeId, this.sessionsDir)
          ) {
            state.status = WHATSAPP_STATUS.DISCONNECTED;
          }
        }
      } catch (_) {}
    }

    return this._serializePublicStatus(state);
  }

  async getQr(businessId) {
    const safeId = sanitizeBusinessId(businessId);
    const state = this._getOrCreateState(safeId);
    const now = Date.now();
    const isExpired = Boolean(state.qrExpiresAt && now >= state.qrExpiresAt);

    if (isExpired) {
      state.qrDataUrl = null;
      state.qrExpiresAt = null;
    }

    return {
      businessId: safeId,
      status: state.status,
      qrCode: state.qrDataUrl || null,
      expired: isExpired,
      qrExpiresAt: state.qrExpiresAt ? new Date(state.qrExpiresAt).toISOString() : null,
    };
  }

  async refreshQr(businessId) {
    const safeId = sanitizeBusinessId(businessId);
    const state = this._getOrCreateState(safeId);
    this._clearReconnectTimer(state);
    state.qrDataUrl = null;
    state.qrExpiresAt = null;
    state.reconnectAttempts = 0;

    if (state.socket) {
      try {
        state.manualDisconnect = true;
        state.socket.ev?.removeAllListeners?.('connection.update');
        state.socket.end?.();
      } catch (_) {}
      state.socket = null;
    }

    // Remove partial unauthenticated creds if not connected so Baileys issues a fresh QR
    if (state.status !== WHATSAPP_STATUS.CONNECTED) {
      removeSessionDir(safeId, this.sessionsDir);
    }

    return this.connect(safeId);
  }

  async disconnect(businessId, { unlink = true } = {}) {
    const safeId = sanitizeBusinessId(businessId);
    const state = this._getOrCreateState(safeId);
    this._clearReconnectTimer(state);
    state.manualDisconnect = true;
    state.qrDataUrl = null;
    state.qrExpiresAt = null;
    state.lastError = null;
    state.reconnectAttempts = 0;

    if (state.socket) {
      try {
        if (unlink && typeof state.socket.logout === 'function') {
          await state.socket.logout().catch(() => {});
        }
        state.socket.ev?.removeAllListeners?.('connection.update');
        state.socket.end?.();
      } catch (_) {}
      state.socket = null;
    }

    if (unlink) {
      removeSessionDir(safeId, this.sessionsDir);
      state.phoneNumber = null;
    }

    state.status = WHATSAPP_STATUS.DISCONNECTED;
    await this._syncDbSession(safeId, state);
    return this._serializePublicStatus(state);
  }

  getActiveSocket(businessId) {
    const safeId = sanitizeBusinessId(businessId);
    const state = this.sessions.get(safeId);
    if (!state || state.status !== WHATSAPP_STATUS.CONNECTED || !state.socket) {
      return null;
    }
    return state.socket;
  }

  async restorePersistedSessions() {
    if (process.env.VERCEL === '1') {
      return [];
    }
    if (!fs.existsSync(this.sessionsDir)) return [];
    const entries = fs.readdirSync(this.sessionsDir, { withFileTypes: true });
    const restored = [];
    const tasks = [];
    for (const entry of entries) {
      if (entry.isDirectory() && hasSavedCreds(entry.name, this.sessionsDir)) {
        restored.push(entry.name);
        tasks.push(this.connect(entry.name).catch(() => {}));
      }
    }
    await Promise.allSettled(tasks);
    return restored;
  }

  async shutdownAll() {
    this.shuttingDown = true;
    for (const state of this.sessions.values()) {
      this._clearReconnectTimer(state);
      if (state.socket) {
        try {
          state.socket.ev?.removeAllListeners?.('connection.update');
          state.socket.end?.();
        } catch (_) {}
        state.socket = null;
      }
    }
  }
}

export const whatsappManager = new WhatsAppConnectionManager();

const activeSendLocks = new Set();
const DUPLICATE_WINDOW_MS = 60_000;

/**
 * Normalizes Indian (10-digit / 0-prefixed / +91) and international phone numbers
 * into E.164 format and WhatsApp JID.
 */
export function normalizeWhatsAppPhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw ApiError.badRequest('Customer WhatsApp phone number is required.');
  }

  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  let digits = '';
  if (cleaned.startsWith('+')) {
    digits = cleaned.slice(1);
  } else if (/^0[6-9]\d{9}$/.test(cleaned)) {
    digits = `91${cleaned.slice(1)}`;
  } else if (/^[6-9]\d{9}$/.test(cleaned)) {
    digits = `91${cleaned}`;
  } else {
    digits = cleaned;
  }

  if (!/^\d{8,15}$/.test(digits)) {
    throw ApiError.badRequest(
      'Invalid WhatsApp phone number. Enter a 10-digit Indian mobile number or international number with country code.'
    );
  }

  return {
    e164: `+${digits}`,
    digits,
    jid: `${digits}@s.whatsapp.net`,
  };
}

/**
 * Generates the authoritative invoice PDF buffer for the authenticated business
 * and sends it via the business's active Baileys WhatsApp socket.
 */
export async function sendInvoicePdfViaWhatsApp({
  businessId,
  invoiceId,
  customerPhone,
  customMessage,
  allowDuplicate = false,
  manager = whatsappManager,
  pdfBufferGenerator = generateSaleInvoicePdfBuffer,
  prismaClient = null,
}) {
  const safeBusinessId = sanitizeBusinessId(businessId);
  if (!invoiceId || typeof invoiceId !== 'string' || !invoiceId.trim()) {
    throw ApiError.badRequest('Valid invoiceId is required.');
  }
  const cleanInvoiceId = invoiceId.trim();
  const normalizedPhone = normalizeWhatsAppPhoneNumber(customerPhone);

  const socket = manager.getActiveSocket(safeBusinessId);
  if (!socket) {
    throw ApiError.badRequest(
      'WhatsApp is not connected for this business. Please scan the QR code to connect first.'
    );
  }

  const db = prismaClient || getAuthoritativePrisma();

  const sale = await db.sale.findUnique({
    where: { id: cleanInvoiceId },
    include: {
      business: { select: { id: true, name: true } },
    },
  });

  if (!sale) {
    throw ApiError.notFound('Invoice not found.');
  }

  if (!sale.businessId || sale.businessId !== safeBusinessId) {
    throw ApiError.forbidden('Access denied: invoice does not belong to your active business.');
  }

  const lockKey = `${safeBusinessId}:${cleanInvoiceId}:${normalizedPhone.e164}`;
  if (activeSendLocks.has(lockKey)) {
    throw ApiError.conflict('This invoice is already being sent to this recipient. Please wait.');
  }

  // Prevent accidental duplicate sends within short window unless explicitly retried/allowed
  if (!allowDuplicate && db.whatsAppMessage?.findFirst) {
    try {
      const recentCutoff = new Date(Date.now() - DUPLICATE_WINDOW_MS);
      const recentSent = await db.whatsAppMessage.findFirst({
        where: {
          businessId: safeBusinessId,
          invoiceId: cleanInvoiceId,
          customerPhone: normalizedPhone.e164,
          messageStatus: { in: ['SENDING', 'SENT'] },
          createdAt: { gte: recentCutoff },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recentSent) {
        throw ApiError.conflict(
          `Invoice ${sale.invoiceNumber} was already sent to ${normalizedPhone.e164} moments ago.`
        );
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  }

  activeSendLocks.add(lockKey);
  let messageRecord = null;

  try {
    if (db.whatsAppMessage?.create) {
      try {
        messageRecord = await db.whatsAppMessage.create({
          data: {
            businessId: safeBusinessId,
            invoiceId: cleanInvoiceId,
            customerPhone: normalizedPhone.e164,
            messageType: 'INVOICE_PDF',
            messageStatus: 'SENDING',
          },
        });
      } catch (_) {}
    }

    const pdfBuffer = await pdfBufferGenerator(cleanInvoiceId, safeBusinessId);
    const safeInvoiceNo = String(sale.invoiceNumber || `INV-${cleanInvoiceId}`).replace(
      /[^a-zA-Z0-9_-]/g,
      '-'
    );
    const fileName = `${safeInvoiceNo}.pdf`;
    const businessName = sale.business?.name || 'BILZET';
    const grandTotalFormatted = Number(sale.grandTotal || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const caption =
      typeof customMessage === 'string' && customMessage.trim()
        ? customMessage.trim()
        : `Hello,\n\nYour invoice from ${businessName} is ready.\n\nInvoice Number: ${sale.invoiceNumber}\nAmount: ₹${grandTotalFormatted}\n\nPlease find your invoice attached.\n\nThank you!\n\n${businessName}`;

    const sentResult = await socket.sendMessage(normalizedPhone.jid, {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName,
      caption,
    });

    const externalMessageId = sentResult?.key?.id || null;

    if (messageRecord?.id && db.whatsAppMessage?.update) {
      try {
        messageRecord = await db.whatsAppMessage.update({
          where: { id: messageRecord.id },
          data: {
            messageStatus: 'SENT',
            externalMessageId,
            errorMessage: null,
          },
        });
      } catch (_) {}
    }

    return {
      sent: true,
      messageId: messageRecord?.id || null,
      externalMessageId,
      invoiceId: cleanInvoiceId,
      invoiceNumber: sale.invoiceNumber,
      customerPhone: normalizedPhone.e164,
      fileName,
      messageStatus: 'SENT',
      note: 'Submitted to WhatsApp session. Delivery depends on recipient connectivity.',
    };
  } catch (err) {
    const errMsg = err?.message || 'Failed to send invoice via WhatsApp.';
    if (messageRecord?.id && db.whatsAppMessage?.update) {
      try {
        await db.whatsAppMessage.update({
          where: { id: messageRecord.id },
          data: {
            messageStatus: 'FAILED',
            errorMessage: errMsg.slice(0, 500),
          },
        });
      } catch (_) {}
    }
    if (err instanceof ApiError) throw err;
    throw ApiError.internal(`WhatsApp delivery failed: ${errMsg}`);
  } finally {
    activeSendLocks.delete(lockKey);
  }
}

export async function getInvoiceWhatsAppMessages({
  businessId,
  invoiceId,
  prismaClient = null,
}) {
  const safeBusinessId = sanitizeBusinessId(businessId);
  if (!invoiceId || typeof invoiceId !== 'string' || !invoiceId.trim()) {
    throw ApiError.badRequest('Valid invoiceId is required.');
  }

  const db = prismaClient || getAuthoritativePrisma();
  const sale = await db.sale.findUnique({
    where: { id: invoiceId.trim() },
    select: { id: true, businessId: true, invoiceNumber: true },
  });

  if (!sale) {
    throw ApiError.notFound('Invoice not found.');
  }
  if (sale.businessId !== safeBusinessId) {
    throw ApiError.forbidden('Access denied: invoice does not belong to your active business.');
  }

  if (!db.whatsAppMessage?.findMany) return [];

  return db.whatsAppMessage.findMany({
    where: {
      businessId: safeBusinessId,
      invoiceId: sale.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });
}

export default whatsappManager;
