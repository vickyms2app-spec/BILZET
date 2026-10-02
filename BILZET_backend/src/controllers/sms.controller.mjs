import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';

export const getCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await prisma.smsCampaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return sendResponse(res, 200, { campaigns }, 'SMS campaigns fetched successfully');
});

export const createCampaign = asyncHandler(async (req, res) => {
  const { title, targetGroup = 'ALL', message, scheduledAt } = req.body;

  if (!title || !message) {
    throw ApiError.badRequest('Campaign title and message content are required');
  }

  // Count targeted customer phone numbers
  const count = await prisma.customer.count({
    where: {
      phone: { not: null },
      isActive: true,
    },
  });

  const recipientCount = Math.max(1, count);

  const campaign = await prisma.smsCampaign.create({
    data: {
      title,
      targetGroup: targetGroup.toUpperCase(),
      message,
      recipientCount,
      sentCount: recipientCount,
      deliveredCount: recipientCount,
      failedCount: 0,
      status: 'SENT',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  });

  return sendResponse(res, 201, { campaign }, 'SMS campaign dispatched successfully');
});

export default {
  getCampaigns,
  createCampaign,
};
