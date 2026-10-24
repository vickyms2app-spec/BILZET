import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.mjs';
import { env } from '../config/env.mjs';
import { ROLES } from '../utils/constants.mjs';
import { authorizeRoles } from '../middleware/role.middleware.mjs';

console.log('\n=============================================================');
console.log('BILZET — CA Role & Business Settings Authorization Tests');
console.log('=============================================================\n');

let passed = 0;
let failed = 0;

const runTest = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
};

const main = async () => {
  // Test 1: Store Owner with role 'CA' has administrative authority in authorizeRoles
  await runTest("1. Store Owner with isOwner=true is authorized for ADMIN/MANAGER resources even if user.role='CA'", async () => {
    const middleware = authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN);
    let calledNext = false;
    let nextError = null;

    const req = {
      user: {
        id: 'owner-ca-user-1',
        role: 'CA',
        isOwner: true,
      },
    };
    const res = {};
    const next = (err) => {
      calledNext = true;
      nextError = err;
    };

    middleware(req, res, next);
    assert.strictEqual(calledNext, true, 'Next must be called');
    assert.strictEqual(nextError, undefined, 'No error should be passed when isOwner is true');
  });

  // Test 2: Pure CA (isOwner=false) is rejected with 403 on ADMIN-only settings routes
  await runTest("2. Pure CA (isOwner=false) is blocked with 403 on store settings route", async () => {
    const middleware = authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN);
    let calledNext = false;
    let nextError = null;

    const req = {
      user: {
        id: 'pure-ca-user-2',
        role: 'CA',
        isOwner: false,
      },
    };
    const res = {};
    const next = (err) => {
      calledNext = true;
      nextError = err;
    };

    middleware(req, res, next);
    assert.strictEqual(calledNext, true, 'Next must be called');
    assert(nextError, 'Error must be thrown for pure CA on admin resource');
    assert.strictEqual(nextError.statusCode, 403, 'Must return 403 Forbidden');
    assert(nextError.message.includes("Role 'CA' is not authorized"), 'Must specify role CA is not authorized');
  });

  // Test 3: Business owner with role 'OWNER' is recognized
  await runTest("3. User with role 'OWNER' is authorized for ADMIN routes", async () => {
    const middleware = authorizeRoles(ROLES.ADMIN, ROLES.SUPER_ADMIN);
    let calledNext = false;
    let nextError = null;

    const req = {
      user: {
        id: 'owner-user-3',
        role: 'OWNER',
        isOwner: false,
      },
    };
    const res = {};
    const next = (err) => {
      calledNext = true;
      nextError = err;
    };

    middleware(req, res, next);
    assert.strictEqual(calledNext, true, 'Next must be called');
    assert.strictEqual(nextError, undefined, 'No error for OWNER role');
  });

  // Test 4: Super Admin is authorized for all routes
  await runTest("4. Super Admin is authorized for all administrative routes", async () => {
    const middleware = authorizeRoles(ROLES.ADMIN);
    let calledNext = false;
    let nextError = null;

    const req = {
      user: {
        id: 'super-admin-user',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      },
    };
    const res = {};
    const next = (err) => {
      calledNext = true;
      nextError = err;
    };

    middleware(req, res, next);
    assert.strictEqual(calledNext, true, 'Next must be called');
    assert.strictEqual(nextError, undefined, 'No error for Super Admin');
  });

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
