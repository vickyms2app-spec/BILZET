import assert from 'node:assert/strict';
import prisma from '../src/config/prisma.mjs';
import {
  getSubscriptionUsage,
  assertCanAddSubUser,
} from '../src/services/subscription.service.mjs';
import {
  getEffectivePermissions,
  getUserPermissionBreakdown,
  updateUserPermissionOverrides,
} from '../src/services/permission.service.mjs';

async function runE2EVerification() {
  console.log('--- Starting Comprehensive End-to-End RBAC & DB Test ---');

  // 1. Roles with Permissions and User Count
  console.log('1. Testing Role query with nested permissions & count...');
  const roles = await prisma.appRole.findMany({
    where: { isSystem: true },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: {
        select: { users: true },
      },
    },
  });

  assert.equal(roles.length, 8, 'Expected 8 system roles');
  const adminRole = roles.find((r) => r.code === 'ADMIN');
  assert.ok(adminRole, 'ADMIN role must exist');
  assert.ok(adminRole.permissions.length >= 40, `ADMIN role has ${adminRole.permissions.length} permissions`);
  assert.ok(adminRole.permissions[0].permission.key, 'Permission key must be populated in join');
  console.log(`✅ Roles verified (${roles.length} roles, ADMIN has ${adminRole.permissions.length} permissions)`);

  // 2. User query with relations and select
  console.log('2. Testing User query with select & appRole join...');
  const users = await prisma.user.findMany({
    where: { businessId: 'busi-01' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isOwner: true,
      appRole: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      _count: {
        select: {
          permissionOverrides: true,
        },
      },
    },
  });

  assert.ok(users.length >= 1, 'Expected at least 1 user in busi-01');
  const ownerUser = users[0];
  assert.equal(ownerUser.isOwner, true, 'User should be owner');
  assert.equal(ownerUser.appRole?.code, 'ADMIN', 'Owner role should be ADMIN');
  console.log(`✅ User join verified (User: ${ownerUser.name}, Role: ${ownerUser.appRole?.name})`);

  // 3. Subscription usage check
  console.log('3. Testing Subscription Usage...');
  const usageBefore = await getSubscriptionUsage('busi-01');
  assert.equal(usageBefore.planTier, 'PRO');
  assert.equal(usageBefore.maxSeats, 5);
  assert.equal(usageBefore.usedSeats, 0);
  assert.equal(usageBefore.remainingSeats, 5);
  assert.equal(usageBefore.canAddUser, true);
  console.log(`✅ Subscription usage verified: ${usageBefore.usedSeats}/${usageBefore.maxSeats} seats used`);

  // 4. Owner effective permissions
  console.log('4. Testing Owner Effective Permissions bypass...');
  const ownerPerms = await getEffectivePermissions('admin-01');
  assert.ok(ownerPerms instanceof Set, 'Owner permissions should be a Set');
  assert.ok(ownerPerms.size >= 44, 'Owner should have all permissions');
  assert.ok(ownerPerms.has('billing.view'), 'Owner must have billing.view');
  assert.ok(ownerPerms.has('team.manage'), 'Owner must have team.manage');
  assert.ok(ownerPerms.has('settings.edit'), 'Owner must have settings.edit');
  assert.ok(ownerPerms.has('attendance.check_in'), 'Owner must have attendance.check_in');
  console.log(`✅ Owner full permissions verified (${ownerPerms.size} permissions granted)`);

  // 5. Creating a sub-user (Cashier)
  console.log('5. Creating Cashier sub-user and testing permissions...');
  const cashierRole = roles.find((r) => r.code === 'CASHIER');
  assert.ok(cashierRole, 'CASHIER role must exist');

  await assertCanAddSubUser('busi-01');

  const cashierUser = await prisma.user.create({
    data: {
      id: 'sub-cashier-test-1',
      name: 'Ravi Cashier',
      email: 'ravi.cashier@bilzet.com',
      role: 'CASHIER',
      appRoleId: cashierRole.id,
      businessId: 'busi-01',
      isOwner: false,
      isActive: true,
    },
  });

  const usageAfter = await getSubscriptionUsage('busi-01');
  assert.equal(usageAfter.usedSeats, 1);
  assert.equal(usageAfter.remainingSeats, 4);
  console.log(`✅ Sub-user created. Seat count updated: ${usageAfter.usedSeats}/${usageAfter.maxSeats}`);

  const cashierPerms = await getEffectivePermissions(cashierUser.id);
  assert.ok(cashierPerms instanceof Set);
  assert.ok(cashierPerms.has('billing.view'), 'Cashier should have billing.view');
  assert.ok(cashierPerms.has('billing.create'), 'Cashier should have billing.create');
  assert.ok(!cashierPerms.has('settings.edit'), 'Cashier should NOT have settings.edit');
  console.log('✅ Cashier base role permissions verified');

  // 6. Explicit User Permission Overrides
  console.log('6. Testing User Permission Overrides (Grant & Deny)...');
  // Grant settings.view, Deny billing.create
  const permCatalog = await prisma.permission.findMany();
  const settingsViewPerm = permCatalog.find((p) => p.key === 'settings.view');
  const billingCreatePerm = permCatalog.find((p) => p.key === 'billing.create');

  assert.ok(settingsViewPerm && billingCreatePerm, 'Permissions catalog loaded');

  await updateUserPermissionOverrides(cashierUser.id, [
    { permissionId: settingsViewPerm.id, isGranted: true },
    { permissionId: billingCreatePerm.id, isGranted: false },
  ]);

  const updatedCashierPerms = await getEffectivePermissions(cashierUser.id);
  assert.ok(
    updatedCashierPerms.has('settings.view'),
    'Cashier should now have settings.view via grant override'
  );
  assert.ok(
    !updatedCashierPerms.has('billing.create'),
    'Cashier should NO LONGER have billing.create due to explicit deny override'
  );
  console.log('✅ Permission overrides (explicit grant + explicit deny) verified');

  // 7. Permission breakdown tree
  console.log('7. Testing User Permission Breakdown tree...');
  const breakdown = await getUserPermissionBreakdown(cashierUser.id);
  assert.equal(breakdown.userId, cashierUser.id);
  const billingCreateItem = breakdown.permissions.find((p) => p.key === 'billing.create');
  assert.ok(billingCreateItem, 'billing.create in breakdown');
  assert.equal(billingCreateItem.effective, false, 'billing.create effective status must be false (denied)');
  assert.equal(billingCreateItem.overrideAllowed, false, 'overrideAllowed must be false');
  console.log('✅ Permission breakdown structure verified');

  // Clean up test user
  await prisma.userPermission.deleteMany({ where: { userId: cashierUser.id } });
  await prisma.user.delete({ where: { id: cashierUser.id } });

  console.log('--- ALL E2E RBAC & DATABASE TESTS PASSED WITH 100% SUCCESS ---');
}

runE2EVerification().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
