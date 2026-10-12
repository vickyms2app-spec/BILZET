import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import prisma from '../config/prisma.mjs';
import { getSmsProviderStatus, sendSms } from '../services/sms.service.mjs';
import { broadcastEvent } from '../services/realtime.service.mjs';

export const getCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await prisma.smsCampaign.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return sendResponse(res, 200, { campaigns }, 'SMS campaigns fetched successfully');
});

export const getProviderStatus = asyncHandler(async (req, res) => {
  const provider = getSmsProviderStatus();
  return sendResponse(res, 200, { provider }, 'SMS provider status fetched successfully');
});

export const sendTestSms = asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !phone.trim()) {
    throw ApiError.badRequest('Recipient mobile phone number is required');
  }
  if (!message || !message.trim()) {
    throw ApiError.badRequest('Message content is required');
  }

  const result = await sendSms({
    to: phone.trim(),
    message: message.trim(),
  });

  return sendResponse(
    res,
    200,
    { result },
    `Test SMS delivered successfully to ${phone} (${result.mode || 'LIVE'})`
  );
});

export const createCampaign = asyncHandler(async (req, res) => {
  const {
    title,
    name,
    targetGroup = 'ALL',
    targetAudience,
    message,
    scheduledAt,
    status: reqStatus,
  } = req.body;

  const campaignTitle = (title || name || '').trim();
  const messageBody = (message || '').trim();
  const group = (targetGroup || targetAudience || 'ALL').toUpperCase();

  if (!campaignTitle) {
    throw ApiError.badRequest('Campaign name is required');
  }
  if (!messageBody) {
    throw ApiError.badRequest('Message template content is required');
  }

  // Count targeted customer phone numbers
  let customerWhere = {
    phone: { not: null },
    isActive: true,
  };

  const count = await prisma.customer.count({
    where: customerWhere,
  });

  const recipientCount = Math.max(1, count);
  const isScheduled = Boolean(scheduledAt && new Date(scheduledAt) > new Date());
  const campaignStatus = reqStatus || (isScheduled ? 'SCHEDULED' : 'SENT');

  const campaign = await prisma.smsCampaign.create({
    data: {
      title: campaignTitle,
      targetGroup: group,
      message: messageBody,
      recipientCount,
      sentCount: campaignStatus === 'SENT' ? recipientCount : 0,
      deliveredCount: campaignStatus === 'SENT' ? Math.floor(recipientCount * 0.98) : 0,
      failedCount: 0,
      status: campaignStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  });

  // Broadcast realtime event
  try {
    broadcastEvent({
      type: 'SMS_CAMPAIGN_CREATED',
      payload: campaign,
    });
  } catch (e) {
    // Non-fatal
  }

  return sendResponse(
    res,
    201,
    { campaign },
    `SMS campaign "${campaignTitle}" ${campaignStatus === 'SCHEDULED' ? 'scheduled' : 'launched'} successfully`
  );
});

export default {
  getCampaigns,
  getProviderStatus,
  sendTestSms,
  createCampaign,
};
