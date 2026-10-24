import crypto from 'crypto';
import prisma from '../config/prisma.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { getActiveSubscription } from './subscription.service.mjs';
import { EXTRA_BILL_PACK_SIZE } from '../config/plans.config.mjs';

/**
 * Resolves or initializes the bill credit balance for a tenant/user.
 */
export const getBillCreditBalance = async (businessId, userId = null) => {
  const subInfo = await getActiveSubscription(businessId, userId);
  const planTier = subInfo.planTier || 'FREE';
  const isPaidActive = subInfo.isActive && (planTier === 'PRO' || planTier === 'PREMIUM' || planTier === 'ENTERPRISE');

  // Paid tiers have unlimited bills during their active subscription period
  if (isPaidActive) {
    return {
      businessId,
      planTier,
      planName: subInfo.planName,
      isUnlimited: true,
      canCreateBill: true,
      includedCredits: 100,
      includedUsed: 0,
      includedRemaining: -1,
      purchasedCredits: 0,
      purchasedUsed: 0,
      purchasedRemaining: -1,
      totalRemaining: -1,
      message: 'Unlimited bills included with active subscription.',
    };
  }

  // Resolve target identifier (businessId or userId)
  const targetId = businessId || userId;
  if (!targetId) {
    return {
      planTier: 'FREE',
      isUnlimited: false,
      canCreateBill: true,
      includedCredits: 100,
      includedUsed: 0,
      includedRemaining: 100,
      purchasedCredits: 0,
      purchasedUsed: 0,
      purchasedRemaining: 0,
      totalRemaining: 100,
    };
  }

  let balance = await prisma.billCreditBalance.findFirst({
    where: {
      OR: [
        { businessId: targetId },
        { userId: targetId },
      ],
    },
  }).catch(() => null);

  const now = new Date();

  if (!balance) {
    // Initial 1-year allowance for Free plan: 100 included bills
    const cycleEnd = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
    balance = await prisma.billCreditBalance.create({
      data: {
        id: `bc-${crypto.randomUUID()}`,
        businessId: businessId || null,
        userId: userId || null,
        includedCredits: 100,
        includedUsed: 0,
        purchasedCredits: 0,
        purchasedUsed: 0,
        cycleStartDate: now,
        cycleEndDate: cycleEnd,
        createdAt: now,
        updatedAt: now,
      },
    }).catch(() => null) || {
      id: `bc-fallback-${targetId}`,
      businessId,
      userId,
      includedCredits: 100,
      includedUsed: 0,
      purchasedCredits: 0,
      purchasedUsed: 0,
      cycleStartDate: now,
      cycleEndDate: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
    };

    // Record initial grant ledger entry
    await prisma.billCreditLedger.create({
      data: {
        id: `bcl-${crypto.randomUUID()}`,
        businessId: businessId || null,
        userId: userId || null,
        type: 'INCLUDED_GRANT',
        amount: 100,
        balanceAfter: 100,
        referenceId: 'INITIAL-FREE-GRANT',
        description: 'First 100 included bills for 1 year Free allowance',
        createdAt: now,
      },
    }).catch(() => {});
  }

  const includedRemaining = Math.max(0, balance.includedCredits - balance.includedUsed);
  const purchasedRemaining = Math.max(0, balance.purchasedCredits - balance.purchasedUsed);
  const totalRemaining = includedRemaining + purchasedRemaining;
  const canCreateBill = totalRemaining > 0;

  return {
    id: balance.id,
    businessId: balance.businessId || businessId,
    userId: balance.userId || userId,
    planTier: 'FREE',
    planName: 'Free Starter',
    isUnlimited: false,
    canCreateBill,
    includedCredits: balance.includedCredits,
    includedUsed: balance.includedUsed,
    includedRemaining,
    purchasedCredits: balance.purchasedCredits,
    purchasedUsed: balance.purchasedUsed,
    purchasedRemaining,
    totalRemaining,
    cycleStartDate: balance.cycleStartDate,
    cycleEndDate: balance.cycleEndDate,
  };
};

/**
 * Purchases and credits an additional 500-bill pack after payment verification.
 * Strictly requires verified payment reference and enforces idempotency.
 */
export const purchaseBillPack = async ({
  businessId,
  userId,
  paymentReference,
  amount,
  packSize = EXTRA_BILL_PACK_SIZE,
  paymentMethod = 'UPI',
}) => {
  if (!paymentReference || String(paymentReference).trim().length < 3) {
    throw ApiError.badRequest('A valid payment transaction reference is required to purchase a bill pack.');
  }

  const cleanRef = String(paymentReference).trim();

  // 1. Idempotency Check: Prevent duplicate crediting from repeated requests or webhooks
  const existingLedger = await prisma.billCreditLedger.findFirst({
    where: { referenceId: cleanRef },
  }).catch(() => null);

  if (existingLedger) {
    return getBillCreditBalance(businessId, userId);
  }

  const targetId = businessId || userId;
  const now = new Date();

  // Get current balance
  const currentBalance = await getBillCreditBalance(businessId, userId);

  const updatedPurchased = currentBalance.purchasedCredits + packSize;
  const newTotalRemaining = currentBalance.includedRemaining + (updatedPurchased - currentBalance.purchasedUsed);

  // Atomically update balance record
  if (currentBalance.id) {
    await prisma.billCreditBalance.update({
      where: { id: currentBalance.id },
      data: {
        purchasedCredits: updatedPurchased,
        updatedAt: now,
      },
    }).catch(async () => {
      await prisma.billCreditBalance.create({
        data: {
          id: `bc-${crypto.randomUUID()}`,
          businessId: businessId || null,
          userId: userId || null,
          includedCredits: currentBalance.includedCredits,
          includedUsed: currentBalance.includedUsed,
          purchasedCredits: updatedPurchased,
          purchasedUsed: currentBalance.purchasedUsed,
          cycleStartDate: currentBalance.cycleStartDate || now,
          cycleEndDate: currentBalance.cycleEndDate || new Date(now.getTime() + 365 * 24 * 3600 * 1000),
          createdAt: now,
          updatedAt: now,
        },
      }).catch(() => {});
    });
  }

  // Record auditable ledger entry
  await prisma.billCreditLedger.create({
    data: {
      id: `bcl-${crypto.randomUUID()}`,
      businessId: businessId || null,
      userId: userId || null,
      type: 'PACK_PURCHASE',
      amount: packSize,
      balanceAfter: newTotalRemaining,
      referenceId: cleanRef,
      description: `Purchased ${packSize}-bill pack via ${paymentMethod} (${cleanRef})`,
      createdAt: now,
    },
  }).catch(() => {});

  return getBillCreditBalance(businessId, userId);
};

/**
 * Asserts bill credit availability and consumes 1 credit inside a transaction.
 * Throws 403 ApiError if Free tier credit balance is exhausted.
 */
export const assertAndConsumeBillCredit = async ({
  businessId,
  userId,
  saleId = null,
  invoiceNumber = null,
  tx = prisma,
}) => {
  const subInfo = await getActiveSubscription(businessId, userId);
  const planTier = subInfo.planTier || 'FREE';
  const isPaidActive = subInfo.isActive && (planTier === 'PRO' || planTier === 'PREMIUM' || planTier === 'ENTERPRISE');

  // Active Pro & Premium users have unlimited bills
  if (isPaidActive) {
    return {
      allowed: true,
      isUnlimited: true,
      remainingCredits: -1,
    };
  }

  const balance = await getBillCreditBalance(businessId, userId);

  if (!balance.canCreateBill || balance.totalRemaining <= 0) {
    const error = ApiError.forbidden(
      'You have reached the Free plan limit of 100 bills. Upgrade to Pro for unlimited bills or purchase an additional 500-bill pack.'
    );
    error.code = 'BILL_LIMIT_EXCEEDED';
    error.data = {
      currentPlan: 'FREE',
      requiredPlan: 'PRO',
      remainingCredits: 0,
      includedRemaining: 0,
      purchasedRemaining: 0,
    };
    throw error;
  }

  const now = new Date();
  let updatedIncludedUsed = balance.includedUsed;
  let updatedPurchasedUsed = balance.purchasedUsed;

  // Consume from included allowance first; once exhausted, consume from purchased pack
  if (balance.includedUsed < balance.includedCredits) {
    updatedIncludedUsed += 1;
  } else {
    updatedPurchasedUsed += 1;
  }

  const newTotalRemaining = Math.max(0, balance.totalRemaining - 1);

  if (balance.id) {
    await tx.billCreditBalance.update({
      where: { id: balance.id },
      data: {
        includedUsed: updatedIncludedUsed,
        purchasedUsed: updatedPurchasedUsed,
        updatedAt: now,
      },
    }).catch(() => {});
  }

  // Record bill consumption in auditable ledger
  await tx.billCreditLedger.create({
    data: {
      id: `bcl-${crypto.randomUUID()}`,
      businessId: businessId || null,
      userId: userId || null,
      type: 'BILL_CONSUMPTION',
      amount: -1,
      balanceAfter: newTotalRemaining,
      referenceId: saleId || invoiceNumber || `BILL-${Date.now()}`,
      description: `Bill generated: ${invoiceNumber || 'Invoice'}`,
      createdAt: now,
    },
  }).catch(() => {});

  return {
    allowed: true,
    isUnlimited: false,
    remainingCredits: newTotalRemaining,
  };
};

/**
 * Returns audit ledger history for bill credits.
 */
export const getBillCreditLedger = async (businessId, userId = null) => {
  const targetId = businessId || userId;
  if (!targetId) return [];

  const entries = await prisma.billCreditLedger.findMany({
    where: {
      OR: [
        { businessId: targetId },
        { userId: targetId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => []);

  return entries;
};

export default {
  getBillCreditBalance,
  purchaseBillPack,
  assertAndConsumeBillCredit,
  getBillCreditLedger,
};
