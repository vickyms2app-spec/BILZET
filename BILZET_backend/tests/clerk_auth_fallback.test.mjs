import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.mjs';
import { env } from '../src/config/env.mjs';
import prisma from '../src/config/prisma.mjs';

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

describe('Clerk Authentication & Fallback in Vercel Serverless Environment', () => {
  const clerkUserId = `user_test_${Date.now()}`;
  const clerkEmail = `clerk_${Date.now()}@example.com`;

  // Simulate a Clerk session JWT token (RS256 structure with sub starting with user_)
  const clerkToken = jwt.sign(
    {
      sub: clerkUserId,
      email: clerkEmail,
      name: 'Clerk Test Merchant',
      iss: 'https://united-bedbug-7593.clerk.accounts.dev',
      azp: 'http://localhost:5173',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    'dummy_rsa_private_key',
    { algorithm: 'HS256' }
  );

  test('1. API verifies Clerk token and returns 200 on /api/v1/auth/me instead of 401', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${clerkToken}`,
      },
    });
    const body = await res.json();

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, clerkEmail);
    assert.equal(body.data.user.role, 'ADMIN');
  });

  test('2. API allows access to /api/v1/stores with Clerk token', async () => {
    const res = await fetch(`${baseUrl}/stores`, {
      headers: {
        'Authorization': `Bearer ${clerkToken}`,
      },
    });
    const body = await res.json();

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
  });

  test('3. API allows access to /api/v1/products with Clerk token', async () => {
    const res = await fetch(`${baseUrl}/products?limit=50`, {
      headers: {
        'Authorization': `Bearer ${clerkToken}`,
      },
    });
    const body = await res.json();

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
  });

  test('4. API allows access to /api/v1/customers with Clerk token', async () => {
    const res = await fetch(`${baseUrl}/customers?limit=50`, {
      headers: {
        'Authorization': `Bearer ${clerkToken}`,
      },
    });
    const body = await res.json();

    assert.equal(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
  });

  test('5. Non-Clerk local JWT token still verifies correctly', async () => {
    const localToken = jwt.sign(
      { id: clerkUserId, email: clerkEmail, role: 'ADMIN' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${localToken}`,
      },
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.data.user.email, clerkEmail);
  });
});
