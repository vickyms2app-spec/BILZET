import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('BILZET Backend - Complete Clerk & JWT Integration Verification', () => {
  const testClerkUserId = `user_clerk_verify_${Date.now()}`;
  const testClerkEmail = `clerk_verify_${Date.now()}@bilzet.test`;

  // Clerk Session Token
  const clerkToken = jwt.sign(
    {
      sub: testClerkUserId,
      email: testClerkEmail,
      name: 'Clerk Verified Merchant',
      iss: 'https://united-bedbug-7593.clerk.accounts.dev',
      azp: 'http://localhost:5173',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    'dummy_rsa_dev_key',
    { algorithm: 'HS256' }
  );

  // Standard Local JWT Token
  const testJwtUserId = `jwt_user_${Date.now()}`;
  const testJwtEmail = `jwt_verify_${Date.now()}@bilzet.test`;
  const localJwtToken = jwt.sign(
    {
      id: testJwtUserId,
      email: testJwtEmail,
      name: 'Local JWT Merchant',
      role: 'ADMIN',
      isOwner: true,
    },
    env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  // ─────────────────────────────────────────────────────────────
  // 1. PUBLIC ROUTES
  // ─────────────────────────────────────────────────────────────
  test('1. Public Route: GET /api/v1/health is accessible without token (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
  });

  test('2. Public Route: GET /api/v1 status is accessible without token (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1`, {
      headers: { Accept: 'application/json' },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'online');
  });

  test('3. Public Route: POST /api/v1/auth/clerk-sync is accessible for identity onboarding (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/clerk-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clerkId: testClerkUserId,
        email: testClerkEmail,
        name: 'Clerk Sync User',
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data?.user);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PROTECTED ROUTES - MISSING TOKEN REJECTION
  // ─────────────────────────────────────────────────────────────
  test('4. Protected Route: GET /api/v1/auth/me rejects missing token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.match(body.message, /token is required/i);
  });

  test('5. Protected Route: GET /api/v1/products rejects missing token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/products`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
  });

  test('6. Protected Route: GET /api/v1/customers rejects missing token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/customers`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
  });

  test('7. Protected Route: GET /api/v1/sales rejects missing token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/sales`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
  });

  test('8. Protected Route: GET /api/v1/invoices rejects missing token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/invoices`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. PROTECTED ROUTES - INVALID TOKEN REJECTION
  // ─────────────────────────────────────────────────────────────
  test('9. Protected Route: GET /api/v1/auth/me rejects invalid token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer totally_invalid_bearer_token_string' },
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.match(body.message, /invalid|failed/i);
  });

  test('10. Protected Route: GET /api/v1/products rejects invalid token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/products`, {
      headers: { Authorization: 'Bearer totally_invalid_bearer_token_string' },
    });
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. CLERK TOKEN AUTHENTICATION & USER IDENTIFICATION
  // ─────────────────────────────────────────────────────────────
  test('11. Clerk Authenticated User: Identifies user with Clerk user ID on /api/v1/auth/me (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${clerkToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testClerkEmail);
    assert.equal(body.data.user.clerkId, testClerkUserId);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. PRESERVATION OF EXISTING JWT AUTHENTICATION
  // ─────────────────────────────────────────────────────────────
  test('12. JWT Authentication: Local JWT token is verified and preserved on /api/v1/auth/me (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${localJwtToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testJwtEmail);
    assert.equal(body.data.user.role, 'ADMIN');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. CORS VERIFICATION
  // ─────────────────────────────────────────────────────────────
  test('13. CORS: Allows requests from local frontend origin http://localhost:5173 with credentials', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  test('14. CORS: Allows requests from production domain https://bilzet.in', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: 'https://bilzet.in' },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://bilzet.in');
  });
});
