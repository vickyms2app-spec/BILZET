/**
 * repairPremiumDefaults.mjs
 *
 * Safe database repair script for the "Premium-default bug".
 *
 * ROOT CAUSE: auth.service.mjs > clerkSync() previously auto-created a PREMIUM
 * subscription record with paymentReference='PAID-PREMIUM-FULL-ACCESS' for every
 * new Clerk-authenticated user, regardless of whether they had paid.
 *
 * This script:
 *   1. Identifies all such bogus subscription records (paymentReference = 'PAID-PREMIUM-FULL-ACCESS')
 *   2. Cancels them (sets status to 'CANCELLED'), reverting those users to FREE
 *   3. Preserves ALL subscription records with a genuine payment reference
 *   4. Does NOT touch subscriptions created by verified payment (verifyAndActivatePayment)
 *   5. Reports a full audit of every change made
 *
 * Usage:
 *   node BILZET_backend/src/scripts/repairPremiumDefaults.mjs [--dry-run]
 */

import prisma from '../config/prisma.mjs';

const isDryRun = process.argv.includes('--dry-run');

// These payment references were auto-assigned by the bug — they are NOT real payments
const BOGUS_PAYMENT_REFS = [
  'PAID-PREMIUM-FULL-ACCESS',
];

async function main() {
  console.log('=== BILZET Premium-Default Bug Repair Script ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes WILL be applied)'}`);
  console.log('');

  // 1. Find all bogus subscriptions
  const bogusSubs = await prisma.subscription.findMany({
    where: {
      paymentReference: { in: BOGUS_PAYMENT_REFS },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Found ${bogusSubs.length} bogus PREMIUM subscription(s) from the auto-provision bug:`);

  if (bogusSubs.length === 0) {
    console.log('  → No records to repair. Database is clean.');
    return;
  }

  let cancelledCount = 0;
  let skippedCount = 0;

  for (const sub of bogusSubs) {
    const userInfo = sub.user ? `${sub.user.email} (${sub.user.id})` : `userId=${sub.userId}`;
    console.log(`  • ${sub.id} | ${sub.planTier} | status=${sub.status} | user=${userInfo}`);

    // Only cancel if still ACTIVE — already-cancelled records are left as-is
    if (sub.status === 'ACTIVE') {
      if (!isDryRun) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
          },
        });

        // Audit log
        try {
          await prisma.auditLog.create({
            data: {
              userId: sub.userId,
              action: 'SUBSCRIPTION_CANCELLED_BY_MIGRATION',
              entity: 'Subscription',
              entityId: sub.id,
              changes: {
                reason: 'Auto-provisioned Premium subscription cancelled by repairPremiumDefaults migration',
                oldStatus: 'ACTIVE',
                newStatus: 'CANCELLED',
                planTier: sub.planTier,
                paymentReference: sub.paymentReference,
              },
              ipAddress: 'migration-script',
            },
          }).catch(() => {});
        } catch (_) {}
      }
      console.log(`    → ${isDryRun ? '[DRY RUN] Would cancel' : 'Cancelled'} (user reverts to FREE)`);
      cancelledCount++;
    } else {
      console.log(`    → Skipped (already status=${sub.status})`);
      skippedCount++;
    }
  }

  console.log('');
  console.log('=== Repair Summary ===');
  console.log(`  Bogus records found:   ${bogusSubs.length}`);
  console.log(`  ${isDryRun ? 'Would cancel' : 'Cancelled'}:            ${cancelledCount}`);
  console.log(`  Skipped (already done): ${skippedCount}`);

  if (isDryRun) {
    console.log('');
    console.log('DRY RUN complete. Run without --dry-run to apply changes.');
  } else {
    console.log('');
    console.log('Repair complete. Affected users now return to FREE plan.');
    console.log('Valid paid subscriptions (with real payment references) are untouched.');
  }
}

main()
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
