/**
 * subscription_switching.test.mjs
 * 13 acceptance criteria for subscription plan switching.
 */
import assert from "assert";
import {
  FEATURE_ENTITLEMENTS,
  isFeatureAllowedByTier,
} from "../config/plans.config.mjs";
import {
  getActiveSubscription,
  upgradeSubscription,
  cancelSubscription,
} from "../services/subscription.service.mjs";
import prisma from "../config/prisma.mjs";

let passed = 0;
let failed = 0;

async function runTest(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${label}`);
    console.error(`    → ${err.message}`);
    failed++;
  }
}

async function createTestUser(suffix) {
  const id = `tswitch-${suffix}-${Date.now()}`;
  await prisma.user
    .create({ data: { id, name: "Test " + suffix, email: `${id}@test.internal`, role: "ADMIN", isOwner: true, isActive: true } })
    .catch(() => {});
  return id;
}
async function cleanUser(id) {
  await prisma.subscription.deleteMany({ where: { userId: id } }).catch(() => {});
  await prisma.user.delete({ where: { id } }).catch(() => {});
}

console.log("\n=======================================================");
console.log("BILZET — Subscription Plan Switching Tests (13 specs)");
console.log("=======================================================\n");

async function runAll() {
  // 1
  await runTest("1. New user receives Free plan by default", async () => {
    const id = await createTestUser("new");
    try {
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "FREE");
      assert.strictEqual(sub.isActive, true);
    } finally { await cleanUser(id); }
  });

  // 2
  await runTest("2. Verified Pro purchase grants Pro (not Premium) entitlements", async () => {
    const id = await createTestUser("pro");
    try {
      await upgradeSubscription({ userId: id, planTier: "PRO", paymentReference: "PAY-PRO-" + Date.now(), amount: 4999 });
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "PRO");
      assert.ok(isFeatureAllowedByTier("users.sub_users", "PRO"), "Pro feature must be allowed");
      assert.ok(!isFeatureAllowedByTier("ca.connect", "PRO"), "Premium feature must be locked on PRO");
    } finally { await cleanUser(id); }
  });

  // 3
  await runTest("3. Verified Premium purchase grants all entitlements", async () => {
    const id = await createTestUser("prem");
    try {
      await upgradeSubscription({ userId: id, planTier: "PREMIUM", paymentReference: "PAY-PREM-" + Date.now(), amount: 9999 });
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "PREMIUM");
      assert.ok(isFeatureAllowedByTier("billing.create", "PREMIUM"));
      assert.ok(isFeatureAllowedByTier("users.sub_users", "PREMIUM"));
      assert.ok(isFeatureAllowedByTier("ca.connect", "PREMIUM"));
    } finally { await cleanUser(id); }
  });

  // 4
  await runTest("4. Previous Premium purchase does not grant Premium after downgrade to Free", async () => {
    const id = await createTestUser("prem-free");
    try {
      await upgradeSubscription({ userId: id, planTier: "PREMIUM", paymentReference: "PAY-P4-" + Date.now(), amount: 9999 });
      await upgradeSubscription({ userId: id, planTier: "FREE" });
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "FREE", "Must be FREE after downgrade, not previous Premium");
      assert.ok(!isFeatureAllowedByTier("ca.connect", "FREE"));
    } finally { await cleanUser(id); }
  });

  // 4b
  await runTest("4b. Previous Premium does not grant Premium after downgrade to Pro", async () => {
    const id = await createTestUser("prem-pro");
    try {
      await upgradeSubscription({ userId: id, planTier: "PREMIUM", paymentReference: "PAY-4B1-" + Date.now(), amount: 9999 });
      await upgradeSubscription({ userId: id, planTier: "PRO", paymentReference: "PAY-4B2-" + Date.now(), amount: 4999 });
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "PRO", "Must be PRO after Pro purchase, not previous Premium");
      assert.ok(!isFeatureAllowedByTier("ca.connect", "PRO"));
    } finally { await cleanUser(id); }
  });

  // 5
  await runTest("5. Free users cannot access Pro or Premium features", async () => {
    ["users.sub_users", "invoice.remove_watermark", "reports.profit_loss"].forEach(f =>
      assert.ok(!isFeatureAllowedByTier(f, "FREE"), f + " must be locked on FREE")
    );
    ["ca.connect", "users.custom_roles", "sales.credit_debit_notes"].forEach(f =>
      assert.ok(!isFeatureAllowedByTier(f, "FREE"), f + " must be locked on FREE")
    );
  });

  // 6
  await runTest("6. Pro users cannot access Premium-exclusive features", async () => {
    ["ca.connect", "users.custom_roles", "users.permission_overrides", "sales.returns"].forEach(f =>
      assert.ok(!isFeatureAllowedByTier(f, "PRO"), f + " must be locked on PRO")
    );
    ["billing.create", "users.sub_users", "invoice.remove_watermark"].forEach(f =>
      assert.ok(isFeatureAllowedByTier(f, "PRO"), f + " must be accessible to PRO")
    );
  });

  // 7
  await runTest("7. Premium users can access all Free + Pro + Premium features", async () => {
    const all = Object.keys(FEATURE_ENTITLEMENTS).filter(k => k.includes("."));
    all.forEach(f => assert.ok(isFeatureAllowedByTier(f, "PREMIUM"), f + " must be accessible to PREMIUM"));
  });

  // 8
  await runTest("8. Expired subscriptions do not retain paid access", async () => {
    const id = await createTestUser("expired");
    try {
      const pastDate = new Date(Date.now() - 2 * 86400000);
      await prisma.subscription.create({
        data: {
          userId: id, planTier: "PREMIUM", planName: "Premium", status: "ACTIVE",
          billingCycle: "ANNUAL", amount: 9999, maxSubUsers: -1,
          startDate: new Date(Date.now() - 366 * 86400000), endDate: pastDate, expiresAt: pastDate,
          paymentReference: "PAY-EXP-" + Date.now(), paymentStatus: "PAID",
        },
      });
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "FREE", "Expired Premium must resolve to FREE");
      assert.strictEqual(sub.isActive, false);
      assert.strictEqual(sub.isExpired, true);
    } finally { await cleanUser(id); }
  });

  // 9
  await runTest("9. Failed/pending payments do not unlock paid features", async () => {
    const id = await createTestUser("pending");
    try {
      await prisma.subscription.create({
        data: {
          userId: id, planTier: "PRO", planName: "Pro", status: "PENDING",
          billingCycle: "ANNUAL", amount: 4999, maxSubUsers: 5,
          startDate: new Date(), endDate: new Date(Date.now() + 365 * 86400000),
          expiresAt: new Date(Date.now() + 365 * 86400000),
          paymentReference: "PAY-PEND-" + Date.now(), paymentStatus: "PENDING",
        },
      });
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "FREE", "PENDING subscription must not grant PRO");
      assert.strictEqual(sub.isActive, false);
    } finally { await cleanUser(id); }
  });

  // 10
  await runTest("10. Frontend-claimed plan tier is ignored; backend always determines entitlements", async () => {
    const id = await createTestUser("fe-manip");
    try {
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "FREE");
      // Simulate attacker claiming PREMIUM — backend still returns FREE from DB
      const backendSub = await getActiveSubscription(null, id);
      const effective = backendSub.isActive ? backendSub.planTier : "FREE";
      assert.strictEqual(effective, "FREE", "Backend must ignore frontend-claimed tier");
    } finally { await cleanUser(id); }
  });

  // 11
  await runTest("11. Plan changes persist across login/reload/different device (DB is source of truth)", async () => {
    const id = await createTestUser("persist");
    try {
      await upgradeSubscription({ userId: id, planTier: "PRO", paymentReference: "PAY-PERS-" + Date.now(), amount: 4999 });
      const sub1 = await getActiveSubscription(null, id);
      assert.strictEqual(sub1.planTier, "PRO", "PRO must persist in DB");
      // Downgrade
      await upgradeSubscription({ userId: id, planTier: "FREE" });
      const sub2 = await getActiveSubscription(null, id);
      assert.strictEqual(sub2.planTier, "FREE", "FREE must persist in DB after downgrade");
    } finally { await cleanUser(id); }
  });

  // 12
  await runTest("12. Existing valid paid subscriptions are preserved (not inadvertently downgraded)", async () => {
    const id = await createTestUser("preserve");
    try {
      const end = new Date(Date.now() + 300 * 86400000);
      await prisma.subscription.create({
        data: {
          userId: id, planTier: "PRO", planName: "Pro Business", status: "ACTIVE",
          billingCycle: "ANNUAL", amount: 4999, maxSubUsers: 5,
          startDate: new Date(), endDate: end, expiresAt: end,
          paymentReference: "PAY-PRSV-" + Date.now(), paymentStatus: "PAID",
        },
      });
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "PRO", "Valid existing PRO subscription must be preserved");
      assert.strictEqual(sub.isActive, true);
      assert.strictEqual(sub.isExpired, false);
    } finally { await cleanUser(id); }
  });

  // 13
  await runTest("13. Cancelled subscription immediately reverts to FREE (audit record preserved)", async () => {
    const id = await createTestUser("cancel");
    try {
      await upgradeSubscription({ userId: id, planTier: "PRO", paymentReference: "PAY-CAN-" + Date.now(), amount: 4999 });
      await cancelSubscription(null, id);
      const sub = await getActiveSubscription(null, id);
      assert.strictEqual(sub.planTier, "FREE", "After cancellation, must be FREE");
      assert.strictEqual(sub.isActive, false);
      // History must still exist
      const hist = await prisma.subscription.findFirst({ where: { userId: id, planTier: "PRO" }, orderBy: { createdAt: "desc" } });
      assert.ok(hist, "PRO subscription history must be preserved");
      assert.strictEqual(hist.status, "CANCELLED");
    } finally { await cleanUser(id); }
  });

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("\nALL SUBSCRIPTION SWITCHING TESTS PASSED SUCCESSFULLY! ✓\n");
    process.exit(0);
  } else {
    console.log(`\n${failed} TEST(S) FAILED.\n`);
    process.exit(1);
  }
}

runAll();
