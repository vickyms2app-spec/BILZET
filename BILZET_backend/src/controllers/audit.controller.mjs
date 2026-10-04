import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';
import prisma from '../config/prisma.mjs';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const where = {};

  if (req.query.action) where.action = { contains: req.query.action, mode: 'insensitive' };
  if (req.query.entity) where.entity = { contains: req.query.entity, mode: 'insensitive' };
  if (req.query.search) {
    where.OR = [
      { action: { contains: req.query.search, mode: 'insensitive' } },
      { entity: { contains: req.query.search, mode: 'insensitive' } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return sendResponse(
    res,
    200,
    { logs },
    'Audit logs fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export default {
  getAuditLogs,
};
