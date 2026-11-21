import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import qrcode from 'qrcode';
import realtimeService from './realtime.service.mjs';

/**
 * Service for Persistent Mobile-to-Desktop Barcode Scanner Pairing
 * 
 * - Generates secure 15-minute pairing tokens and QR codes for first-time handshake
 * - Persists authorized mobile devices with SHA-256 hashed revocable device tokens
 * - Multi-tenant isolation enforced on every request (scoped by businessId)
 * - Broadcasts real-time barcode scans, connection status, and revocations over SSE
 * - In-memory ring buffer for deduplication (prevents duplicate scan events)
 */

class ScannerPairingService {
  constructor() {
    this.storagePath = path.resolve(process.cwd(), 'uploads', 'paired_devices.json');
    this.devices = new Map(); // deviceId -> Device Record
    this.pairTokens = new Map(); // pairToken -> Pairing Session
    this.recentScans = new Set(); // scanId cache for deduplication
    this.MAX_RECENT_SCANS = 1000;

    this.initStorage();

    // Clean up expired pair tokens every 5 minutes
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 5 * 60 * 1000);
  }

  initStorage() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((dev) => {
            if (dev && dev.deviceId) {
              this.devices.set(dev.deviceId, dev);
            }
          });
        }
      }
    } catch (err) {
      console.warn('[ScannerPairing] Failed to load stored devices:', err.message);
    }
  }

  saveStorage() {
    try {
      const list = Array.from(this.devices.values());
      fs.writeFileSync(this.storagePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('[ScannerPairing] Failed to persist devices:', err.message);
    }
  }

  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, session] of this.pairTokens.entries()) {
      if (session.expiresAt && session.expiresAt < now) {
        this.pairTokens.delete(token);
      }
    }
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 1. Laptop initiates pairing: Generates a temporary pairToken & QR code
   */
  async createPairRequest({ businessId, userId, businessName = 'BILZET Store', origin = '' }) {
    if (!businessId) {
      throw new Error('businessId is required to generate a mobile pairing token');
    }

    const pairToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    // Normalize base URL
    let baseUrl = origin;
    if (!baseUrl) {
      baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    }
    baseUrl = baseUrl.replace(/\/+$/, '');

    const pairingUrl = `${baseUrl}/mobile-scanner?pairToken=${pairToken}&businessId=${encodeURIComponent(businessId)}`;

    // Generate high-resolution QR Code Data URL
    const qrDataUrl = await qrcode.toDataURL(pairingUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#111318',
        light: '#FFFFFF',
      },
    });

    this.pairTokens.set(pairToken, {
      pairToken,
      businessId,
      userId,
      businessName,
      expiresAt,
      createdAt: new Date().toISOString(),
      used: false,
    });

    return {
      pairToken,
      pairingUrl,
      qrDataUrl,
      expiresAt,
      businessId,
      businessName,
    };
  }

  /**
   * 2. First-time handshake: Mobile phone scans QR code and authorizes device
   */
  async verifyAndAuthorizeDevice({ pairToken, businessId, deviceInfo = {}, clientIp = '', userAgent = '' }) {
    if (!pairToken) {
      throw new Error('Pairing token is required');
    }

    const session = this.pairTokens.get(pairToken);
    if (!session) {
      throw new Error('Invalid or expired pairing code. Please scan a fresh QR code from your laptop.');
    }

    if (session.expiresAt < Date.now()) {
      this.pairTokens.delete(pairToken);
      throw new Error('Pairing code has expired. Please refresh the QR code on your laptop.');
    }

    if (session.businessId !== businessId) {
      throw new Error('Security mismatch: Target business does not match the pairing session.');
    }

    // Generate permanent, revocable device credentials
    const deviceId = `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const rawDeviceToken = `tok_${crypto.randomBytes(32).toString('hex')}`;
    const deviceTokenHash = this.hashToken(rawDeviceToken);

    // Form friendly device name
    let deviceName = deviceInfo.deviceName || '';
    if (!deviceName) {
      if (/iPhone/i.test(userAgent)) deviceName = 'Apple iPhone';
      else if (/iPad/i.test(userAgent)) deviceName = 'Apple iPad';
      else if (/Android/i.test(userAgent)) deviceName = 'Android Mobile Device';
      else if (/Mobile/i.test(userAgent)) deviceName = 'Mobile Browser Scanner';
      else deviceName = 'Remote Scanner Device';
    }

    const deviceRecord = {
      deviceId,
      deviceTokenHash,
      businessId: session.businessId,
      userId: session.userId,
      businessName: session.businessName,
      deviceName,
      platform: deviceInfo.platform || (userAgent.includes('iPhone') ? 'iOS' : 'Android'),
      status: 'ACTIVE', // 'ACTIVE' | 'REVOKED'
      pairedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      clientIp,
      userAgent: userAgent.slice(0, 200),
    };

    this.devices.set(deviceId, deviceRecord);
    this.saveStorage();

    // Mark pairToken as used (or delete)
    this.pairTokens.delete(pairToken);

    // Broadcast pairing confirmation to laptop via real-time SSE stream
    realtimeService.broadcastEvent(session.businessId, 'SCANNER_DEVICE_PAIRED', {
      deviceId,
      deviceName,
      businessId: session.businessId,
      pairedAt: deviceRecord.pairedAt,
      message: `Paired mobile scanner "${deviceName}" successfully!`,
    });

    return {
      deviceId,
      deviceToken: rawDeviceToken,
      businessId: session.businessId,
      businessName: session.businessName,
      deviceName,
      status: 'ACTIVE',
    };
  }

  /**
   * 3. Subsequent visits: Reconnects automatically using saved device credentials
   */
  async reconnectDevice({ deviceId, deviceToken, businessId, clientIp = '' }) {
    if (!deviceId || !deviceToken || !businessId) {
      throw new Error('Device credentials and business context are required for reconnection');
    }

    const device = this.devices.get(deviceId);
    if (!device) {
      const err = new Error('Device authorization record not found. Please re-pair using the QR code.');
      err.code = 'DEVICE_NOT_FOUND';
      throw err;
    }

    if (device.status === 'REVOKED') {
      const err = new Error('This device authorization has been revoked from the laptop. Please re-pair using a new QR code.');
      err.code = 'DEVICE_REVOKED';
      throw err;
    }

    if (device.businessId !== businessId) {
      const err = new Error('Access denied: Device is not authorized for this business.');
      err.code = 'BUSINESS_MISMATCH';
      throw err;
    }

    const tokenHash = this.hashToken(deviceToken);
    if (device.deviceTokenHash !== tokenHash) {
      const err = new Error('Invalid device authentication token. Please re-pair with QR code.');
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    // Update last activity
    device.lastActiveAt = new Date().toISOString();
    device.clientIp = clientIp || device.clientIp;
    this.saveStorage();

    // Notify laptop of reconnection
    realtimeService.broadcastEvent(businessId, 'SCANNER_DEVICE_CONNECTED', {
      deviceId,
      deviceName: device.deviceName,
      businessId,
      lastActiveAt: device.lastActiveAt,
      status: 'CONNECTED',
    });

    return {
      valid: true,
      deviceId,
      deviceName: device.deviceName,
      businessId: device.businessId,
      businessName: device.businessName,
      status: 'CONNECTED',
    };
  }

  /**
   * 4. Transmit Scanned Barcode from Mobile to Laptop Billing Operator
   */
  async processBarcodeScan({ deviceId, deviceToken, businessId, barcode, scanId = '', timestamp = '' }) {
    if (!deviceId || !deviceToken || !businessId || !barcode) {
      throw new Error('Incomplete scan payload');
    }

    const device = this.devices.get(deviceId);
    if (!device || device.status === 'REVOKED') {
      const err = new Error('Device is not authorized');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (device.businessId !== businessId) {
      const err = new Error('Cross-tenant scan attempt rejected');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const tokenHash = this.hashToken(deviceToken);
    if (device.deviceTokenHash !== tokenHash) {
      const err = new Error('Invalid device authentication credentials');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // Deduplication check: ignore duplicate network transmissions within 5 seconds
    const dedupKey = `${deviceId}:${scanId || barcode}:${barcode}`;
    if (this.recentScans.has(dedupKey)) {
      return { success: true, duplicate: true, barcode };
    }

    this.recentScans.add(dedupKey);
    setTimeout(() => {
      this.recentScans.delete(dedupKey);
    }, 5000);

    // Update device active timestamp
    device.lastActiveAt = new Date().toISOString();

    // Broadcast scan event to Laptop Billing Operator over SSE channel
    const eventPayload = {
      type: 'BARCODE_SCANNED',
      barcode: String(barcode).trim(),
      deviceId,
      deviceName: device.deviceName,
      scanId: scanId || `scan_${Date.now()}`,
      timestamp: timestamp || new Date().toISOString(),
      businessId,
    };

    realtimeService.broadcastEvent(businessId, 'BARCODE_SCANNED', eventPayload);

    return {
      success: true,
      barcode: eventPayload.barcode,
      deviceName: device.deviceName,
      scanId: eventPayload.scanId,
    };
  }

  /**
   * 5. Get paired devices for business (Desktop view)
   */
  async getDevicesForBusiness(businessId) {
    if (!businessId) return [];

    const result = [];
    for (const dev of this.devices.values()) {
      if (dev.businessId === businessId) {
        result.push({
          deviceId: dev.deviceId,
          deviceName: dev.deviceName,
          platform: dev.platform,
          status: dev.status,
          pairedAt: dev.pairedAt,
          lastActiveAt: dev.lastActiveAt,
        });
      }
    }

    return result.sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));
  }

  /**
   * 6. Revoke a device permanently (Desktop revocation)
   */
  async revokeDevice(businessId, deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.businessId !== businessId) {
      throw new Error('Unauthorized device operation for this business');
    }

    device.status = 'REVOKED';
    device.revokedAt = new Date().toISOString();
    this.saveStorage();

    // Broadcast revocation event so mobile and desktop disconnect immediately
    realtimeService.broadcastEvent(businessId, 'SCANNER_DEVICE_REVOKED', {
      deviceId,
      deviceName: device.deviceName,
      businessId,
      status: 'REVOKED',
    });

    return { success: true, deviceId, status: 'REVOKED' };
  }

  /**
   * 7. Disconnect active session without revoking
   */
  async disconnectDevice(businessId, deviceId) {
    const device = this.devices.get(deviceId);
    if (device && device.businessId === businessId) {
      realtimeService.broadcastEvent(businessId, 'SCANNER_DEVICE_DISCONNECTED', {
        deviceId,
        deviceName: device.deviceName,
        businessId,
        status: 'DISCONNECTED',
      });
    }
    return { success: true, deviceId, status: 'DISCONNECTED' };
  }
}

const scannerPairingService = new ScannerPairingService();
export default scannerPairingService;
