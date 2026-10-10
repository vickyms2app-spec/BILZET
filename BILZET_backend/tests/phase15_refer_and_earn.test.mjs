import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import { getReferralCodeForUser } from '../src/services/referral.service.mjs';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

const generateToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET || 'secret', { expiresIn: '1d' });
};

describe('PHASE 15: REFER & EARN VERIFICATION', () => {
  const referrerBizId = 'biz-p15-referrer';
  const referrerOwnerId = 'user-p15-referrer';

  const refereeBizId = 'biz-p15-referee';
  const refereeOwnerId = 'user-p15-referee';

  const storeBBizId = 'biz-p15-isolated';
  const storeBOwnerId = 'user-p15-isolated';

  let referrerToken;
  let refereeToken;
  let storeBToken;
  let referrerCode;

  before(async () => {
    // 1. Setup Referrer (Free Plan Starter)
    await prisma.business.create({
      data: { id: referrerBizId, name: 'Referrer Retail Mart', ownerId: referrerOwnerId },
    });
    await prisma.user.create({
      data: {
        id: referrerOwnerId,
        email: 'referrer.owner@bilzet.test',
        role: 'ADMIN',
        businessId: referrerBizId,
        isOwner: true,
        isActive: true,
      },
    });
    await prisma.subscription.create({
      data: {
        id: 'sub-p15-referrer',
        userId: referrerOwnerId,
        businessId: referrerBizId,
        planTier: 'FREE',
        planName: 'Free Starter',
        status: 'ACTIVE',
      },
    });

    referrerCode = getReferralCodeForUser({ id: referrerOwnerId, email: 'referrer.owner@bilzet.test' });

    // 2. Setup Referee
    await prisma.business.create({
      data: { id: refereeBizId, name: 'Referee New Enterprise', ownerId: refereeOwnerId },
    });
    await prisma.user.create({
      data: {
        id: refereeOwnerId,
        email: 'referee.owner@bilzet.test',
        role: 'ADMIN',
        businessId: refereeBizId,
        isOwner: true,
        isActive: true,
      },
    });

    // 3. Setup Store B for Isolation Testing
    await prisma.business.create({
      data: { id: storeBBizId, name: 'Isolated Store B', ownerId: storeBOwnerId },
    });
    await prisma.user.create({
      data: {
        id: storeBOwnerId,
        email: 'isolated.owner@bilzet.test',
        role: 'ADMIN',
        businessId: storeBBizId,
        isOwner: true,
        isActive: true,
      },
    });

    referrerToken = generateToken({
      id: referrerOwnerId,
      email: 'referrer.owner@bilzet.test',
      role: 'ADMIN',
      businessId: referrerBizId,
      isOwner: true,
      isActive: true,
    });

    refereeToken = generateToken({
      id: refereeOwnerId,
      email: 'referee.owner@bilzet.test',
      role: 'ADMIN',
      businessId: refereeBizId,
      isOwner: true,
      isActive: true,
    });

    storeBToken = generateToken({
      id: storeBOwnerId,
      email: 'isolated.owner@bilzet.test',
      role: 'ADMIN',
      businessId: storeBBizId,
      isOwner: true,
      isActive: true,
    });
  });

  // ──────────────────────────────────────────────────────────
  // 1. REFERRAL CODE & LINK GENERATION
  // ──────────────────────────────────────────────────────────
  describe('1. Referral Code and Link Generation', () => {
    test('User receives deterministic referral code and link matching user ID', async () => {
      const res = await fetch(`${baseUrl}/referral/info`, {
        headers: { Authorization: `Bearer ${referrerToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.referralCode, referrerCode);
      assert.ok(json.data.referralLink.includes(referrerCode));
      assert.equal(json.data.rewardTerms.refereeDiscountPercent, 10);
      assert.equal(json.data.rewardTerms.referrerBonusMonths, 1);
    });

    test('Validates referral code via public validation endpoint', async () => {
      const res = await fetch(`${baseUrl}/referral/validate?code=${referrerCode}`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.valid, true);
      assert.equal(json.data.discountPercent, 10);
      assert.equal(json.data.code, referrerCode);
    });

    test('Rejects invalid or non-existent referral code', async () => {
      const res = await fetch(`${baseUrl}/referral/validate?code=NONEXISTENT999`);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.data.valid, false);
      assert.match(json.message, /Invalid or unrecognized/i);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. REFERRAL ATTRIBUTION & FRAUD PREVENTION
  // ──────────────────────────────────────────────────────────
  describe('2. Referral Attribution and Tracking Rules', () => {
    test('Prevents self-referral (referrer cannot use their own code)', async () => {
      const res = await fetch(`${baseUrl}/referral/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${referrerToken}`,
        },
        body: JSON.stringify({ code: referrerCode }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /own referral code/i);
    });

    test('Referee successfully applies referral code with status PENDING (no premature reward)', async () => {
      const res = await fetch(`${baseUrl}/referral/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refereeToken}`,
        },
        body: JSON.stringify({ code: referrerCode }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.applied, true);
      assert.equal(json.data.discountPercent, 10);
      assert.equal(json.data.referral.status, 'PENDING');
    });

    test('Prevents duplicate referral (referee cannot be referred twice)', async () => {
      const res = await fetch(`${baseUrl}/referral/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refereeToken}`,
        },
        body: JSON.stringify({ code: referrerCode }),
      });
      // Should succeed idempotently without creating duplicate rows
      assert.equal(res.status, 200);

      const allRefs = await prisma.referral.findMany({
        where: { refereeId: refereeOwnerId },
      });
      assert.equal(allRefs.length, 1, 'Only one referral attribution record must exist');
    });

    test('Referrer info reflects 1 pending referral and 0 completed rewards before upgrade', async () => {
      const res = await fetch(`${baseUrl}/referral/info`, {
        headers: { Authorization: `Bearer ${referrerToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.stats.totalReferrals, 1);
      assert.equal(json.data.stats.pendingReferrals, 1);
      assert.equal(json.data.stats.completedReferrals, 0);
      assert.equal(json.data.stats.bonusMonthsEarned, 0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. REWARD ACCURACY & IDEMPOTENT UPGRADE FULFILLMENT
  // ──────────────────────────────────────────────────────────
  describe('3. Reward Fulfillment on Paid Subscription Upgrade', () => {
    test('Referee upgrading to PRO triggers referral reward (1 bonus month / 30 days for referrer)', async () => {
      const upgradeRes = await fetch(`${baseUrl}/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refereeToken}`,
        },
        body: JSON.stringify({
          planTier: 'PRO',
          billingCycle: 'ANNUAL',
          amount: 1999,
          paymentReference: 'PAY-P15-REF-01',
        }),
      });
      assert.equal(upgradeRes.status, 200);

      // Verify referral status transitioned to REWARDED
      const updatedRef = await prisma.referral.findFirst({
        where: { refereeId: refereeOwnerId },
      });
      assert.equal(updatedRef.status, 'REWARDED');
      assert.ok(updatedRef.rewardedAt);

      // Verify referrer received 1 bonus month
      const refInfoRes = await fetch(`${baseUrl}/referral/info`, {
        headers: { Authorization: `Bearer ${referrerToken}` },
      });
      const refInfo = await refInfoRes.json();
      assert.equal(refInfo.data.stats.completedReferrals, 1);
      assert.equal(refInfo.data.stats.bonusMonthsEarned, 1);
      assert.equal(refInfo.data.stats.bonusDaysEarned, 30);
    });

    test('Repeated upgrade requests do not grant duplicate bonus credits (Idempotency check)', async () => {
      const repeatRes = await fetch(`${baseUrl}/subscription/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refereeToken}`,
        },
        body: JSON.stringify({
          planTier: 'PREMIUM',
          billingCycle: 'ANNUAL',
          amount: 4999,
          paymentReference: 'PAY-P15-REF-02',
        }),
      });
      assert.equal(repeatRes.status, 200);

      // Referrer bonus months should STILL be exactly 1, not 2
      const refInfoRes = await fetch(`${baseUrl}/referral/info`, {
        headers: { Authorization: `Bearer ${referrerToken}` },
      });
      const refInfo = await refInfoRes.json();
      assert.equal(refInfo.data.stats.completedReferrals, 1);
      assert.equal(refInfo.data.stats.bonusMonthsEarned, 1);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. SUBSCRIPTION COMPATIBILITY & STORE ISOLATION
  // ──────────────────────────────────────────────────────────
  describe('4. Subscription Compatibility, Security & Privacy', () => {
    test('Free plan users can access Refer & Earn without paywall restrictions', async () => {
      const res = await fetch(`${baseUrl}/referral/info`, {
        headers: { Authorization: `Bearer ${referrerToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.referralCode);
    });

    test('Store B cannot see Referrer A referral history or statistics (Data Isolation)', async () => {
      const res = await fetch(`${baseUrl}/referral/info`, {
        headers: { Authorization: `Bearer ${storeBToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.stats.totalReferrals, 0);
      assert.equal(json.data.referrals.length, 0);
    });

    test('Referee emails are masked to protect user privacy', async () => {
      const res = await fetch(`${baseUrl}/referral/info`, {
        headers: { Authorization: `Bearer ${referrerToken}` },
      });
      const json = await res.json();
      const referee = json.data.referrals[0];
      assert.ok(referee.refereeEmail.includes('***'));
    });

    test('Unauthorized access without token returns 401', async () => {
      const res = await fetch(`${baseUrl}/referral/info`);
      assert.equal(res.status, 401);
    });

    test('Historical referral records remain intact in database', async () => {
      const records = await prisma.referral.findMany({
        where: { referrerId: referrerOwnerId },
      });
      assert.equal(records.length, 1);
      assert.equal(records[0].status, 'REWARDED');
    });
  });
});
