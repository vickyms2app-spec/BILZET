import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import prisma from '../config/prisma.mjs';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return sendResponse(res, 200, { logs }, 'Audit logs fetched successfully');
});

export default {
  getAuditLogs,
};
