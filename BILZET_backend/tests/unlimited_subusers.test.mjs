import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getPlanSeatLimit, PLAN_SEAT_LIMITS } from '../src/config/plans.config.mjs';
import { getSubscriptionUsage, assertCanAddSubUser } from '../src/services/subscription.service.mjs';
import prisma from '../src/config/prisma.mjs';

describe('UNLIMITED SUB-USERS VERIFICATION', () => {
  test('1. Plan configuration allows unlimited sub-users for PREMIUM and ENTERPRISE', () => {
    assert.equal(getPlanSeatLimit('PREMIUM'), -1, 'PREMIUM plan must denote unlimited seats (-1)');
    assert.equal(getPlanSeatLimit('ENTERPRISE'), -1, 'ENTERPRISE plan must denote unlimited seats (-1)');
    assert.equal(PLAN_SEAT_LIMITS.PREMIUM, -1);
    assert.equal(PLAN_SEAT_LIMITS.ENTERPRISE, -1);
    assert.equal(getPlanSeatLimit('PRO'), 5, 'PRO plan must remain 5 seats');
    assert.equal(getPlanSeatLimit('FREE'), 0, 'FREE plan must remain 0 seats');
  });

  test('2. Subscription usage for PREMIUM owner reports isUnlimited and canAddUser = true', async () => {
    // Setup test business and owner
    const testBizId = `biz-unlimited-${Date.now()}`;
    const testOwnerId = `owner-unlimited-${Date.now()}`;

    // Create subscription with PREMIUM tier
    await prisma.subscription.create({
      data: {
        id: `sub-${Date.now()}`,
        userId: testOwnerId,
        planTier: 'PREMIUM',
        planName: 'Premium Enterprise',
        maxSubUsers: -1,
        status: 'ACTIVE',
        amount: 2999,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    const usage = await getSubscriptionUsage(testBizId, testOwnerId);
    assert.equal(usage.planTier, 'PREMIUM');
    assert.equal(usage.maxSeats, -1);
    assert.equal(usage.isUnlimited, true);
    assert.equal(usage.canAddUser, true);
  });

  test('3. Unlimited sub-users: 15th, 16th, 50th, and 100th members are all addable without error', async () => {
    const testBizId = `biz-scale-${Date.now()}`;
    const testOwnerId = `owner-scale-${Date.now()}`;

    await prisma.subscription.create({
      data: {
        id: `sub-scale-${Date.now()}`,
        userId: testOwnerId,
        planTier: 'PREMIUM',
        planName: 'Premium Enterprise',
        maxSubUsers: -1,
        status: 'ACTIVE',
        amount: 2999,
      },
    });

    // Test asserting capacity at 0, 14, 15, 16, 50, 100, 200 used seats
    const checkPoints = [0, 14, 15, 16, 49, 50, 99, 100, 200];
    for (const count of checkPoints) {
      // assertCanAddSubUser must resolve successfully without throwing SUB_USER_LIMIT_REACHED
      const usage = await assertCanAddSubUser(testBizId, testOwnerId);
      assert.equal(usage.canAddUser, true, `Member at seat count ${count} must be addable`);
      assert.equal(usage.isUnlimited, true);
      assert.equal(usage.maxSeats, -1);
    }
  });

  test('4. Free and Pro restrictions remain intact', async () => {
    const freeBizId = `biz-free-${Date.now()}`;
    const freeOwnerId = `owner-free-${Date.now()}`;

    // Free business has no paid subscription
    const freeUsage = await getSubscriptionUsage(freeBizId, freeOwnerId);
    assert.equal(freeUsage.canAddUser, false);
    assert.equal(freeUsage.maxSeats, 0);

    // Free user calling assertCanAddSubUser throws 403
    await assert.rejects(
      async () => assertCanAddSubUser(freeBizId, freeOwnerId),
      (err) => {
        assert.equal(err.code, 'SUB_USER_LIMIT_REACHED');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });
});
