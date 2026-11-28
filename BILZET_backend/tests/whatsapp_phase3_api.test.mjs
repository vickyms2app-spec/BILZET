import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.mjs';
import { requireWhatsAppBusinessContext } from '../src/middleware/whatsapp.middleware.mjs';

test('1. Unauthenticated requests to /api/v1/whatsapp/* are rejected with 401', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const endpoints = [
      ['POST', '/api/v1/whatsapp/connect'],
      ['GET', '/api/v1/whatsapp/qr'],
      ['GET', '/api/v1/whatsapp/status'],
      ['POST', '/api/v1/whatsapp/refresh-qr'],
      ['POST', '/api/v1/whatsapp/disconnect'],
    ];

    for (const [method, path] of endpoints) {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { method });
      assert.equal(res.status, 401, `${method} ${path} should return 401`);
    }
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('2. requireWhatsAppBusinessContext blocks cross-tenant businessId spoofing', () => {
  let nextErr = null;
  requireWhatsAppBusinessContext(
    {
      user: { id: 'user-1', businessId: 'busi-1', role: 'ADMIN' },
      body: { businessId: 'busi-other' },
      query: {},
    },
    {},
    (err) => {
      nextErr = err;
    }
  );
  assert.ok(nextErr);
  assert.equal(nextErr.statusCode, 403);
});

test('3. requireWhatsAppBusinessContext attaches trusted req.whatsappBusinessId', () => {
  const req = {
    user: { id: 'user-1', businessId: 'busi-trusted', role: 'ADMIN' },
    body: {},
    query: {},
  };
  let nextErr = null;
  requireWhatsAppBusinessContext(req, {}, (err) => {
    nextErr = err || null;
  });
  assert.equal(nextErr, null);
  assert.equal(req.whatsappBusinessId, 'busi-trusted');
});
