import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';
import * as caReferralService from '../src/services/caReferral.service.mjs';
import * as subscriptionService from '../src/services/subscription.service.mjs';

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

const makeRequest = async (path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
};

describe('CA-ONLY REFER & EARN: COMPREHENSIVE E2E VERIFICATION', () => {
  const caUserId = `ca-user-test-${Date.now()}`;
  const nonCaUserId = `merchant-user-test-${Date.now()}`;
  const staffUserId = `staff-user-test-${Date.now()}`;
  const superAdminId = `super-admin-test-${Date.now()}`;

  const referredShopOwnerId = `ref-shop-owner-${Date.now()}`;
  const referredShopBizId = `ref-shop-biz-${Date.now()}`;

  let caToken;
  let nonCaToken;
  let staffToken;
  let superAdminToken;
  let caReferralCode;

  before(async () => {
    // 1. Create Verified CA User
    await prisma.user.create({
      data: {
        id: caUserId,
        email: `ca.${caUserId}@bilzet.test`,
        name: 'Chartered Accountant Tester',
        role: 'CA',
        isActive: true,
        isVerified: true,
      },
    });

    // 2. Create Regular Merchant User (Role: ADMIN / OWNER)
    await prisma.user.create({
      data: {
        id: nonCaUserId,
        email: `merchant.${nonCaUserId}@bilzet.test`,
        name: 'Regular Store Owner',
        role: 'ADMIN',
        isOwner: true,
        isActive: true,
      },
    });

    // 3. Create Staff User
    await prisma.user.create({
      data: {
        id: staffUserId,
        email: `staff.${staffUserId}@bilzet.test`,
        name: 'Staff Cashier',
        role: 'STAFF',
        isActive: true,
      },
    });

    // 4. Create Super Admin User
    await prisma.user.create({
      data: {
        id: superAdminId,
        email: 'vickyms2app@gmail.com', // Recognized platform master email
        name: 'Platform Master Admin',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        isActive: true,
      },
    });

    // 5. Create Referred Business Owner and Shop
    await prisma.user.create({
      data: {
        id: referredShopOwnerId,
        email: `store.owner.${referredShopOwnerId}@bilzet.test`,
        name: 'Prospective Store Client',
        role: 'ADMIN',
        isOwner: true,
        isActive: true,
      },
    });

    await prisma.business.create({
      data: {
        id: referredShopBizId,
        name: 'Prospective Client Mart',
        ownerId: referredShopOwnerId,
      },
    });

    // Generate JWT tokens
    caToken = generateToken({ id: caUserId, email: `ca.${caUserId}@bilzet.test`, role: 'CA' });
    nonCaToken = generateToken({ id: nonCaUserId, email: `merchant.${nonCaUserId}@bilzet.test`, role: 'ADMIN', isOwner: true });
    staffToken = generateToken({ id: staffUserId, email: `staff.${staffUserId}@bilzet.test`, role: 'STAFF' });
    superAdminToken = generateToken({ id: superAdminId, email: 'vickyms2app@gmail.com', role: 'SUPER_ADMIN' });
  });

  /* -------------------------------------------------------------
     TEST SUITE 1: AUTHORIZATION & ACCESS CONTROL
     ------------------------------------------------------------- */
  describe('1. Role & CA-Only Authorization Enforcement', () => {
    test('Verified CA can access the CA referral dashboard', async () => {
      const res = await makeRequest('/ca-referral/dashboard', {
        headers: { Authorization: `Bearer ${caToken}` },
      });

      assert.equal(res.status, 200, 'CA should receive 200 OK');
      assert.equal(res.data?.success, true);
      assert.ok(res.data?.data?.profile?.referralCode, 'Referral code must be generated');
      caReferralCode = res.data.data.profile.referralCode;
      assert.match(caReferralCode, /^CA-[A-Z0-9]+$/, 'Referral code format should be CA-XXXXXX');
    });

    test('Regular merchant (ADMIN/OWNER) is forbidden from CA referral dashboard', async () => {
      const res = await makeRequest('/ca-referral/dashboard', {
        headers: { Authorization: `Bearer ${nonCaToken}` },
      });

      assert.equal(res.status, 403, 'Non-CA should receive 403 Forbidden');
    });

    test('Staff member is forbidden from CA referral dashboard', async () => {
      const res = await makeRequest('/ca-referral/dashboard', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });

      assert.equal(res.status, 403, 'Staff user should receive 403 Forbidden');
    });

    test('Unauthenticated request is rejected with 401', async () => {
      const res = await makeRequest('/ca-referral/dashboard');
      assert.equal(res.status, 401, 'Unauthenticated caller must receive 401');
    });

    test('Non-admin users cannot access admin referral endpoints', async () => {
      const res = await makeRequest('/ca-referral/admin/referrals', {
        headers: { Authorization: `Bearer ${caToken}` },
      });
      assert.equal(res.status, 403, 'CA cannot access super admin endpoints');
    });

    test('Super admin can access admin referral endpoints', async () => {
      const res = await makeRequest('/ca-referral/admin/referrals', {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(res.status, 200, 'Super admin should receive 200 OK');
      assert.equal(res.data?.success, true);
    });
  });

  /* -------------------------------------------------------------
     TEST SUITE 2: REFERRAL CODE VALIDATION & ATTRIBUTION
     ------------------------------------------------------------- */
  describe('2. Unique Referral Tracking & Attribution', () => {
    test('Public validation endpoint validates active CA referral code', async () => {
      const res = await makeRequest(`/ca-referral/validate/${caReferralCode}`);
      if (res.status !== 200) {
        console.log('DEBUG validate failure:', res.status, res.data, 'caReferralCode:', caReferralCode);
      }
      assert.equal(res.status, 200);
      assert.equal(res.data?.data?.valid, true);
      assert.equal(res.data?.data?.referralCode, caReferralCode);
    });

    test('Public validation rejects bogus referral code', async () => {
      const res = await makeRequest('/ca-referral/validate/INVALID-CODE-999');
      assert.equal(res.data?.data?.valid, false);
    });

    test('Attribution is recorded upon shop registration with status REGISTERED (No coins awarded)', async () => {
      const attribution = await caReferralService.recordAttribution({
        referralCode: caReferralCode,
        businessId: referredShopBizId,
        ownerId: referredShopOwnerId,
        businessName: 'Prospective Client Mart',
      });

      assert.ok(attribution, 'Attribution should be recorded');
      assert.equal(attribution.status, 'REGISTERED', 'Attribution must be in REGISTERED state');
      assert.equal(attribution.caUserId, caUserId);

      // Verify CA dashboard shows pending referral and 0 coins
      const dashboard = await caReferralService.getCaDashboard(caUserId);
      assert.equal(dashboard.profile.availableCoins, 0, 'No coins should be awarded on registration alone');
      assert.equal(dashboard.stats.totalReferrals, 1);
      assert.equal(dashboard.stats.pendingReferrals, 1);
      assert.equal(dashboard.stats.eligibleReferrals, 0);
    });

    test('Self-referral is rejected (CA cannot refer their own store)', async () => {
      const selfBizId = `ca-self-biz-${Date.now()}`;
      await prisma.business.create({
        data: { id: selfBizId, name: 'CA Owned Store', ownerId: caUserId },
      });

      const selfAttribution = await caReferralService.recordAttribution({
        referralCode: caReferralCode,
        businessId: selfBizId,
        ownerId: caUserId,
        businessName: 'CA Owned Store',
      });

      assert.equal(selfAttribution, null, 'Self referral attribution must be rejected');
    });

    test('Prevent duplicate attribution: a business cannot be attributed twice', async () => {
      const duplicateAttempt = await caReferralService.recordAttribution({
        referralCode: caReferralCode,
        businessId: referredShopBizId,
        ownerId: referredShopOwnerId,
        businessName: 'Duplicate Attempt Store',
      });

      assert.equal(duplicateAttempt.status, 'REGISTERED', 'Should return existing attribution without duplicating');
    });
  });

  /* -------------------------------------------------------------
     TEST SUITE 3: PAYMENT QUALIFICATION & REWARD ISSUANCE
     ------------------------------------------------------------- */
  describe('3. Reward Qualification on First Paid Subscription Payment', () => {
    test('FREE tier activation does not award coins', async () => {
      const result = await caReferralService.processFirstPaymentReward({
        businessId: referredShopBizId,
        ownerId: referredShopOwnerId,
        planTier: 'FREE',
        paymentReference: 'FREE-UPGRADE',
      });

      assert.equal(result.qualified, false, 'Free tier must not qualify for reward');

      const dashboard = await caReferralService.getCaDashboard(caUserId);
      assert.equal(dashboard.profile.availableCoins, 0);
    });

    test('First successful PRO subscription payment awards exactly 100 coins (₹100)', async () => {
      const payRef = `UTR-${Date.now()}-SUB`;

      // Trigger subscription activation with payment verification
      await subscriptionService.upgradeSubscription({
        businessId: referredShopBizId,
        userId: referredShopOwnerId,
        planTier: 'PRO',
        billingCycle: 'ANNUAL',
        amount: 3999,
        paymentReference: payRef,
      });

      // Verify CA received exactly 100 coins
      const dashboard = await caReferralService.getCaDashboard(caUserId);
      assert.equal(dashboard.profile.availableCoins, 100, 'CA should receive exactly 100 coins');
      assert.equal(dashboard.profile.rupeeEquivalent, 100, '100 coins must equal ₹100');
      assert.equal(dashboard.profile.totalCoinsEarned, 100);
      assert.equal(dashboard.stats.eligibleReferrals, 1);
      assert.equal(dashboard.stats.pendingReferrals, 0);

      // Verify authoritative ledger entry created
      const ledgerEntries = await prisma.caRewardLedger.findMany({
        where: { caUserId },
      });
      assert.equal(ledgerEntries.length, 1);
      assert.equal(ledgerEntries[0].coins, 100);
      assert.equal(ledgerEntries[0].entryType, 'REWARD_CREDIT');
      assert.equal(ledgerEntries[0].status, 'COMPLETED');
    });

    test('Duplicate payment webhook / retry is idempotent and does NOT duplicate coins', async () => {
      // Re-run same qualification event
      const secondCall = await caReferralService.processFirstPaymentReward({
        businessId: referredShopBizId,
        ownerId: referredShopOwnerId,
        planTier: 'PRO',
        paymentReference: 'DUPLICATE-EVENT-REF',
      });

      assert.equal(secondCall.qualified, false, 'Repeat reward attempt must be rejected');

      // Verify balance remains exactly 100 coins
      const dashboard = await caReferralService.getCaDashboard(caUserId);
      assert.equal(dashboard.profile.availableCoins, 100, 'Coins must not be duplicated');

      const ledgerEntries = await prisma.caRewardLedger.findMany({
        where: { caUserId },
      });
      assert.equal(ledgerEntries.length, 1, 'Only one ledger entry must exist');
    });

    test('Subsequent renewal payment by the same business does NOT generate another reward', async () => {
      // Simulate subsequent renewal payment next year
      const renewalCall = await caReferralService.processFirstPaymentReward({
        businessId: referredShopBizId,
        ownerId: referredShopOwnerId,
        planTier: 'PREMIUM',
        paymentReference: `RENEWAL-${Date.now()}`,
      });

      assert.equal(renewalCall.qualified, false, 'Renewals must never generate another initial reward');
    });
  });

  /* -------------------------------------------------------------
     TEST SUITE 4: REDEMPTION LIFECYCLE & PAYOUT STATE MACHINE
     ------------------------------------------------------------- */
  describe('4. Redemption Lifecycle (500 Coin Threshold & State Machine)', () => {
    test('Redemption request below 500 coins is rejected (HTTP 400)', async () => {
      const res = await makeRequest('/ca-referral/redemptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          coinsRequested: 100, // Below 500 minimum
          payoutMethod: 'UPI',
          upiId: 'testca@okhdfcbank',
        }),
      });

      assert.equal(res.status, 400, 'Request below 500 coins must be rejected');
      assert.match(res.data.message, /Minimum redemption request is 500 coins/);
    });

    test('Redemption request exceeding available coins is rejected', async () => {
      const res = await makeRequest('/ca-referral/redemptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          coinsRequested: 500, // CA currently only has 100 coins
          payoutMethod: 'UPI',
          upiId: 'testca@okhdfcbank',
        }),
      });

      assert.equal(res.status, 400);
      assert.match(res.data.message, /Insufficient available coin/);
    });

    test('When CA reaches 500 coins, valid redemption reserves coins atomically', async () => {
      // Artificially credit 400 coins to reach 500 coins for testing redemption
      await prisma.caReferralProfile.update({
        where: { userId: caUserId },
        data: { availableCoins: 500, totalCoinsEarned: 500 },
      });

      const res = await makeRequest('/ca-referral/redemptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          coinsRequested: 500,
          payoutMethod: 'UPI',
          upiId: 'chartered.acc@okaxis',
        }),
      });

      assert.equal(res.status, 201, 'Redemption request should be created');
      const redemption = res.data.data;
      assert.equal(redemption.coinsRequested, 500);
      assert.equal(redemption.rupeeAmount, 500);
      assert.equal(redemption.status, 'PENDING_REVIEW');

      // Verify atomic coin reservation: Available becomes 0, Reserved becomes 500
      const dashboard = await caReferralService.getCaDashboard(caUserId);
      assert.equal(dashboard.profile.availableCoins, 0, 'Available coins should drop to 0');
      assert.equal(dashboard.profile.reservedCoins, 500, 'Reserved coins should be 500');

      // Double spend prevention: immediate second request should fail
      const doubleSpendRes = await makeRequest('/ca-referral/redemptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          coinsRequested: 500,
          payoutMethod: 'UPI',
          upiId: 'chartered.acc@okaxis',
        }),
      });
      assert.equal(doubleSpendRes.status, 400, 'Double-spending reserved coins must be blocked');
    });

    test('Super admin approves redemption request (Transitions to APPROVED)', async () => {
      const pendingRedemption = await prisma.caRedemptionRequest.findFirst({
        where: { caUserId, status: 'PENDING_REVIEW' },
      });
      assert.ok(pendingRedemption);

      const res = await makeRequest(`/ca-referral/admin/redemptions/${pendingRedemption.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ notes: 'Verified CA credentials and valid UPI VPA' }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.data.status, 'APPROVED');

      // Coins remain reserved, not yet finalized
      const profile = await prisma.caReferralProfile.findUnique({ where: { userId: caUserId } });
      assert.equal(profile.reservedCoins, 500);
      assert.equal(profile.redeemedCoins, 0);
    });

    test('Super admin records payout: status transitions to PAID, ledger finalized', async () => {
      const approvedRedemption = await prisma.caRedemptionRequest.findFirst({
        where: { caUserId, status: 'APPROVED' },
      });
      assert.ok(approvedRedemption);

      const utrRef = `BANK-UTR-${Date.now()}`;
      const res = await makeRequest(`/ca-referral/admin/redemptions/${approvedRedemption.id}/payout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({
          transactionReference: utrRef,
          paymentDate: new Date().toISOString().slice(0, 10),
          notes: 'IMPS payment completed via HDFC Corporate Banking',
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.data.status, 'PAID');
      assert.equal(res.data.data.paymentReference, utrRef);

      // Verify CA Profile balances: reserved cleared, redeemed updated, payout updated
      const profile = await prisma.caReferralProfile.findUnique({ where: { userId: caUserId } });
      assert.equal(profile.availableCoins, 0);
      assert.equal(profile.reservedCoins, 0, 'Reserved coins cleared');
      assert.equal(profile.redeemedCoins, 500, 'Redeemed coins updated');
      assert.equal(profile.totalPayoutRupees, 500, 'Total payout updated to ₹500');

      // Verify PAYOUT_COMPLETED ledger entry created
      const payoutLedger = await prisma.caRewardLedger.findFirst({
        where: {
          caUserId,
          entryType: 'PAYOUT_COMPLETED',
        },
      });
      assert.ok(payoutLedger);
      assert.equal(payoutLedger.coins, -500);
    });

    test('Rejection workflow: rejecting request requires reason and restores reserved coins', async () => {
      // 1. Credit 500 coins and submit a second redemption request
      await prisma.caReferralProfile.update({
        where: { userId: caUserId },
        data: { availableCoins: 500 },
      });

      const redeemRes = await makeRequest('/ca-referral/redemptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({
          coinsRequested: 500,
          payoutMethod: 'BANK_TRANSFER',
          bankAccountNumber: '9876543210123',
          bankIfsc: 'HDFC0000123',
          bankAccountName: 'Test CA Firm',
        }),
      });

      const secondRedemption = redeemRes.data.data;
      assert.equal(secondRedemption.status, 'PENDING_REVIEW');

      // 2. Rejecting without a reason fails
      const noReasonRes = await makeRequest(`/ca-referral/admin/redemptions/${secondRedemption.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ reason: '' }),
      });
      assert.equal(noReasonRes.status, 400, 'Rejection reason is mandatory');

      // 3. Rejecting with valid reason restores reserved coins
      const rejectRes = await makeRequest(`/ca-referral/admin/redemptions/${secondRedemption.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ reason: 'Bank IFSC branch code inactive. Please provide active bank details.' }),
      });
      if (rejectRes.status !== 200) {
        console.log('DEBUG reject failure:', rejectRes.status, rejectRes.data, 'secondRedemption:', secondRedemption);
      }
      assert.equal(rejectRes.status, 200);
      assert.equal(rejectRes.data.data.status, 'REJECTED');

      // Verify reserved coins refunded back to available
      const profile = await prisma.caReferralProfile.findUnique({ where: { userId: caUserId } });
      assert.equal(profile.availableCoins, 500, 'Reserved coins must be restored to available balance');
      assert.equal(profile.reservedCoins, 0);
    });
  });

  /* -------------------------------------------------------------
     TEST SUITE 5: PROGRAM CONFIGURATION & AUDITING
     ------------------------------------------------------------- */
  describe('5. Program Configuration & Auditing', () => {
    test('Super admin can update program configuration', async () => {
      const res = await makeRequest('/ca-referral/admin/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({
          coinsPerReferral: 100,
          rupeesPerCoin: 1.0,
          minRedemptionCoins: 500,
          isEnabled: true,
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.data.coinsPerReferral, 100);
      assert.equal(res.data.data.rupeesPerCoin, 1.0);
      assert.equal(res.data.data.minRedemptionCoins, 500);
    });

    test('Unauthorized non-admin cannot update configuration', async () => {
      const res = await makeRequest('/ca-referral/admin/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${caToken}` },
        body: JSON.stringify({ coinsPerReferral: 200 }),
      });

      assert.equal(res.status, 403);
    });
  });
});
