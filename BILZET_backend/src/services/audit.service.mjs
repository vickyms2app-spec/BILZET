import prisma from '../config/prisma.mjs';
import { AuditLog } from '../models/AuditLog.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

/**
 * Records a history entry ONLY when a user successfully creates or adds a record.
 * Deduplicates by (action, entity, entityId) to prevent duplicate history on retries.
 */
export const recordCreationHistory = async ({
  prismaClient = prisma,
  userId = null,
  businessId = null,
  action,
  entity,
  entityId,
  details = {},
}) => {
  if (!action || !entity || !entityId) {
    return null;
  }

  try {
    const existing = await prismaClient.auditLog.findFirst({
      where: {
        action,
        entity,
        entityId: String(entityId),
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    return await prismaClient.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: String(entityId),
        changes: {
          eventType: action,
          businessId: businessId || null,
          ...details,
          recordedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.warn('[AuditService] recordCreationHistory notice:', err?.message);
    return null;
  }
};

export const getAuditLogs = async (query = {}) => {
  const { page, limit, skip, sort } = getPaginationParams(query);
  const filter = {};

  if (query.action) filter.action = query.action;
  if (query.entity) filter.entity = query.entity;
  if (query.userId) filter.user = query.userId;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email role')
      .exec(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    meta: buildPaginationMeta(total, page, limit)
  };
};

export default {
  getAuditLogs,
  recordCreationHistory,
};
