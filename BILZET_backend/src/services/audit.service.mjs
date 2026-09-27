import { AuditLog } from '../models/AuditLog.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

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
  getAuditLogs
};
