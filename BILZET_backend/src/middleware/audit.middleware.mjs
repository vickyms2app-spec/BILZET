import { AuditLog } from '../models/AuditLog.mjs';

/**
 * Helper to log audit events from controllers or services.
 */
export const recordAudit = async ({
  req = null,
  user = null,
  action,
  entity,
  entityId = null,
  description,
  metadata = {}
}) => {
  try {
    const userId = user?._id || req?.user?._id || null;
    const ipAddress =
      req?.headers['x-forwarded-for']?.split(',')[0] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers['user-agent'] || '';

    await AuditLog.create({
      user: userId,
      action,
      entity,
      entityId,
      description,
      ipAddress,
      userAgent,
      metadata
    });
  } catch (error) {
    // Audit logging failure should not crash main business flow, but should be logged
    console.error('[AuditLog] Failed to record audit log:', error.message);
  }
};

export default recordAudit;
