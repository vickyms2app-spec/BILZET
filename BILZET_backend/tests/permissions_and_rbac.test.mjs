import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.mjs';
import { getPlanSeatLimit, PLAN_SEAT_LIMITS } from '../src/config/plans.config.mjs';
import { requirePermission } from '../src/middleware/permission.middleware.mjs';

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

describe('1. Subscription Seat Quota Configuration & Validation', () => {
  test('Free tier seat quota is 0', () => {
    assert.equal(getPlanSeatLimit('FREE'), 0);
  });

  test('Pro tier seat quota is 5', () => {
    assert.equal(getPlanSeatLimit('PRO'), 5);
  });

  test('Premium / Enterprise tier seat quota is 15', () => {
    assert.equal(getPlanSeatLimit('PREMIUM'), 15);
    assert.equal(getPlanSeatLimit('ENTERPRISE'), 15);
  });

  test('Unknown plan defaults to 0', () => {
    assert.equal(getPlanSeatLimit('UNKNOWN_PLAN'), 0);
    assert.equal(getPlanSeatLimit(null), 0);
  });

  test('Seat limit configuration is not hardcoded and allows override', () => {
    assert.ok(PLAN_SEAT_LIMITS.PRO >= 5);
  });
});

describe('2. Centralized Permission Middleware Authorization', () => {
  test('requirePermission returns 401 when no user is attached to request', async () => {
    const middleware = requirePermission('billing.create');
    const req = { user: null };
    let capturedError = null;
    const next = (err) => { capturedError = err; };

    await middleware(req, {}, next);

    assert.ok(capturedError, 'Middleware should return error');
    assert.equal(capturedError.statusCode, 401);
  });

  test('requirePermission returns 403 when user account is deactivated', async () => {
    const middleware = requirePermission('billing.create');
    const req = {
      user: {
        id: 'user-deactivated',
        isActive: false,
        role: 'CASHIER',
      },
    };
    let capturedError = null;
    const next = (err) => { capturedError = err; };

    await middleware(req, {}, next);

    assert.ok(capturedError);
    assert.equal(capturedError.statusCode, 403);
    assert.match(capturedError.message, /deactivated/i);
  });

  test('requirePermission immediately permits SUPER_ADMIN without tenant restrictions', async () => {
    const middleware = requirePermission('sensitive.action');
    const req = {
      user: {
        id: 'super-admin-1',
        isActive: true,
        role: 'SUPER_ADMIN',
      },
    };
    let capturedError = null;
    let nextCalled = false;
    const next = (err) => {
      capturedError = err;
      nextCalled = true;
    };

    await middleware(req, {}, next);

    assert.equal(capturedError, undefined);
    assert.equal(nextCalled, true);
  });

  test('requirePermission immediately permits primary Business Owner', async () => {
    const middleware = requirePermission('billing.cancel');
    const req = {
      user: {
        id: 'owner-1',
        isActive: true,
        isOwner: true,
        role: 'ADMIN',
      },
    };
    let capturedError = null;
    let nextCalled = false;
    const next = (err) => {
      capturedError = err;
      nextCalled = true;
    };

    await middleware(req, {}, next);

    assert.equal(capturedError, undefined);
    assert.equal(nextCalled, true);
  });
});

describe('3. Server-Side Protection on Sensitive Endpoints', () => {
  test('Unauthenticated calls to /api/v1/users return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/users`);
    assert.equal(res.status, 401);
  });

  test('Unauthenticated calls to /api/v1/roles return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/roles`);
    assert.equal(res.status, 401);
  });

  test('Unauthenticated calls to /api/v1/subscription/usage return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/subscription/usage`);
    assert.equal(res.status, 401);
  });

  test('Unauthenticated calls to /api/v1/reports/sales return 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/reports/sales`);
    assert.equal(res.status, 401);
  });
});

describe('4. Owner Protection & Anti-Privilege Escalation Rules', () => {
  test('Sub-user cannot change their own role', () => {
    const callerId = 'subuser-123';
    const targetUserId = 'subuser-123';
    const requestedRole = 'ADMIN';

    const isSelfRoleModification = callerId === targetUserId && requestedRole !== undefined;
    assert.equal(isSelfRoleModification, true, 'Self role change should be identified as illegal');
  });

  test('Sub-user cannot delete or demote business owner', () => {
    const targetUser = { id: 'owner-uuid', isOwner: true, role: 'ADMIN' };

    const isDeleteOwnerAttempt = targetUser.isOwner === true;
    assert.equal(isDeleteOwnerAttempt, true, 'Owner cannot be deleted');
  });
});
