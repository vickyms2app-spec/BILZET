import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { memoryStore } from '../config/resilientPrisma.mjs';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const BRANDING_DIR = path.join(UPLOAD_ROOT, 'branding');

// Ensure directories exist on startup
try {
  if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  if (!fs.existsSync(BRANDING_DIR)) fs.mkdirSync(BRANDING_DIR, { recursive: true });
} catch (e) {
  console.warn('Could not initialize uploads/branding directory:', e.message);
}

/**
 * Validate and detect image format from raw buffer using magic bytes.
 * Never trust client-provided MIME types or file extensions.
 */
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // JPEG magic bytes: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // WebP magic bytes: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'webp';
  }

  return null;
}

/**
 * Sanitize business/store ID to prevent directory traversal
 */
export function sanitizeStoreId(storeId) {
  if (!storeId || typeof storeId !== 'string') return 'default';
  const sanitized = storeId.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length > 0 ? sanitized : 'default';
}

/**
 * Get store branding metadata from disk, database, or fallback
 */
export async function getStoreBranding(storeId) {
  const safeId = sanitizeStoreId(storeId);
  const storeDir = path.join(BRANDING_DIR, safeId);
  const metaFile = path.join(storeDir, 'branding.json');

  let branding = {
    businessId: safeId,
    logoUrl: null,
    signatureUrl: null,
    showLogoOnInvoices: false,
    showSignatureOnInvoices: false,
    updatedAt: new Date().toISOString(),
  };

  // 1. Try reading store-specific branding.json file
  if (fs.existsSync(metaFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      branding = { ...branding, ...data, businessId: safeId };
    } catch (_) {}
  }

  // 2. Check database / in-memory store for any store override
  try {
    const biz = memoryStore?.business?.find((b) => b.id === safeId);
    if (biz) {
      if (biz.logoUrl !== undefined) branding.logoUrl = biz.logoUrl;
      if (biz.signatureUrl !== undefined) branding.signatureUrl = biz.signatureUrl;
      if (biz.showLogoOnInvoices !== undefined) branding.showLogoOnInvoices = biz.showLogoOnInvoices;
      if (biz.showSignatureOnInvoices !== undefined) branding.showSignatureOnInvoices = biz.showSignatureOnInvoices;
    }
  } catch (_) {}

  // Defaults: enable only if image is uploaded
  if (branding.logoUrl && branding.showLogoOnInvoices === undefined) {
    branding.showLogoOnInvoices = true;
  }
  if (branding.signatureUrl && branding.showSignatureOnInvoices === undefined) {
    branding.showSignatureOnInvoices = true;
  }

  return branding;
}

/**
 * Persist store branding metadata
 */
export async function saveStoreBranding(storeId, updates) {
  const safeId = sanitizeStoreId(storeId);
  const storeDir = path.join(BRANDING_DIR, safeId);
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  const current = await getStoreBranding(safeId);
  const updated = {
    ...current,
    ...updates,
    businessId: safeId,
    updatedAt: new Date().toISOString(),
  };

  // Write to branding.json
  const metaFile = path.join(storeDir, 'branding.json');
  fs.writeFileSync(metaFile, JSON.stringify(updated, null, 2), 'utf8');

  // Update in-memory business record
  try {
    const biz = memoryStore?.business?.find((b) => b.id === safeId);
    if (biz) {
      biz.logoUrl = updated.logoUrl;
      biz.signatureUrl = updated.signatureUrl;
      biz.showLogoOnInvoices = updated.showLogoOnInvoices;
      biz.showSignatureOnInvoices = updated.showSignatureOnInvoices;
    }
  } catch (_) {}

  // Update PostgreSQL / database business record if available
  try {
    await prisma.business.update({
      where: { id: safeId },
      data: {
        updatedAt: new Date(),
      },
    }).catch(() => {});
  } catch (_) {}

  return updated;
}

/**
 * Process secure upload of company logo or owner signature
 */
export async function processBrandingUpload({ storeId, type, fileData, user }) {
  if (!['logo', 'signature'].includes(type)) {
    throw ApiError.badRequest("Invalid branding type. Must be 'logo' or 'signature'.");
  }

  if (!fileData || typeof fileData !== 'string') {
    throw ApiError.badRequest('File data is required. Provide a valid image file.');
  }

  // Parse Base64 payload (handles data URLs like "data:image/png;base64,...")
  let base64Content = fileData;
  if (fileData.includes(',')) {
    base64Content = fileData.split(',')[1];
  }

  const buffer = Buffer.from(base64Content, 'base64');

  // File size limit: 2MB (2 * 1024 * 1024 bytes)
  const MAX_SIZE = 2 * 1024 * 1024;
  if (buffer.length > MAX_SIZE) {
    throw ApiError.badRequest(
      `File size exceeds 2MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)}MB). Please upload an image under 2MB.`
    );
  }

  if (buffer.length < 32) {
    throw ApiError.badRequest('Uploaded image file is empty or corrupted.');
  }

  // Verify actual image content using magic bytes
  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    throw ApiError.badRequest('Invalid or unsupported image file. Only genuine PNG, JPG/JPEG, or WebP files are accepted.');
  }

  // Signature specifics: must be PNG (transparency) or JPG/JPEG. WebP not supported for signature.
  if (type === 'signature' && detectedType === 'webp') {
    throw ApiError.badRequest(
      'Owner signature must be a PNG image with transparency or a JPG/JPEG image. WebP is not supported for signatures.'
    );
  }

  const safeStoreId = sanitizeStoreId(storeId);
  const storeDir = path.join(BRANDING_DIR, safeStoreId);
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  const ext = detectedType === 'jpeg' ? 'jpg' : detectedType;
  const uniqueToken = crypto.randomBytes(8).toString('hex');
  const fileName = `${type}_${Date.now()}_${uniqueToken}.${ext}`;
  const filePath = path.join(storeDir, fileName);

  // Write file securely
  await fs.promises.writeFile(filePath, buffer);

  // Clean up any old file of the same type for this store
  const currentBranding = await getStoreBranding(safeStoreId);
  const oldUrl = type === 'logo' ? currentBranding.logoUrl : currentBranding.signatureUrl;
  if (oldUrl && typeof oldUrl === 'string') {
    try {
      const oldFilename = path.basename(oldUrl);
      const oldPath = path.join(storeDir, oldFilename);
      if (fs.existsSync(oldPath) && oldFilename !== fileName) {
        fs.unlinkSync(oldPath);
      }
    } catch (_) {}
  }

  // Public asset URL served by backend endpoint
  const assetUrl = `/api/v1/settings/branding/file/${safeStoreId}/${fileName}`;

  const updates = {};
  if (type === 'logo') {
    updates.logoUrl = assetUrl;
    updates.showLogoOnInvoices = true; // Auto-enable when uploaded
  } else {
    updates.signatureUrl = assetUrl;
    updates.showSignatureOnInvoices = true; // Auto-enable when uploaded
  }

  const updatedBranding = await saveStoreBranding(safeStoreId, updates);

  return {
    success: true,
    type,
    fileName,
    url: assetUrl,
    branding: updatedBranding,
    message: `${type === 'logo' ? 'Company logo' : "Owner's signature"} uploaded successfully.`,
  };
}

/**
 * Remove an uploaded logo or signature
 */
export async function removeBrandingFile({ storeId, type }) {
  if (!['logo', 'signature'].includes(type)) {
    throw ApiError.badRequest("Invalid branding type. Must be 'logo' or 'signature'.");
  }

  const safeStoreId = sanitizeStoreId(storeId);
  const storeDir = path.join(BRANDING_DIR, safeStoreId);
  const currentBranding = await getStoreBranding(safeStoreId);

  const targetUrl = type === 'logo' ? currentBranding.logoUrl : currentBranding.signatureUrl;

  if (targetUrl) {
    try {
      const filename = path.basename(targetUrl);
      const filePath = path.join(storeDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (_) {}
  }

  const updates = {};
  if (type === 'logo') {
    updates.logoUrl = null;
    updates.showLogoOnInvoices = false;
  } else {
    updates.signatureUrl = null;
    updates.showSignatureOnInvoices = false;
  }

  const updatedBranding = await saveStoreBranding(safeStoreId, updates);

  return {
    success: true,
    type,
    branding: updatedBranding,
    message: `${type === 'logo' ? 'Company logo' : "Owner's signature"} removed successfully.`,
  };
}

export default {
  detectImageType,
  sanitizeStoreId,
  getStoreBranding,
  saveStoreBranding,
  processBrandingUpload,
  removeBrandingFile,
  BRANDING_DIR,
};
