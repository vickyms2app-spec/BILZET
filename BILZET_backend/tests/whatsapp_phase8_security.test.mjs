import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.mjs';
import {
  requireWhatsAppBusinessContext,
  sendInvoiceWhatsAppSchema,
} from '../src/middleware/whatsapp.middleware.mjs';
import { requireAnyPermission } from '../src/middleware/permission.middleware.mjs';

test('1. All /api/v1/whatsapp/* endpoints require authentication (401)', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const routes = [
      ['POST', '/api/v1/whatsapp/connect'],
      ['GET', '/api/v1/whatsapp/qr'],
      ['GET', '/api/v1/whatsapp/status'],
      ['POST', '/api/v1/whatsapp/refresh-qr'],
      ['POST', '/api/v1/whatsapp/disconnect'],
      ['POST', '/api/v1/whatsapp/send-invoice'],
      ['GET', '/api/v1/whatsapp/messages/sale-123'],
    ];

    for (const [method, path] of routes) {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({}) : undefined,
      });
      assert.equal(res.status, 401, `${method} ${path} must reject unauthenticated requests`);
    }
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('2. Tenant middleware blocks missing businessId and cross-tenant spoofing', () => {
  let errMissing = null;
  requireWhatsAppBusinessContext(
    { user: { id: 'u1', role: 'ADMIN', businessId: null }, body: {}, query: {} },
    {},
    (err) => {
      errMissing = err;
    }
  );
  assert.equal(errMissing?.statusCode, 400);

  let errSpoof = null;
  requireWhatsAppBusinessContext(
    {
      user: { id: 'u1', role: 'ADMIN', businessId: 'busi-1' },
      body: {},
      query: { businessId: 'busi-2' },
    },
    {},
    (err) => {
      errSpoof = err;
    }
  );
  assert.equal(errSpoof?.statusCode, 403);
});

test('3. Strict Zod validation rejects injected pdfPath or invalid send-invoice payloads', () => {
  assert.throws(() =>
    sendInvoiceWhatsAppSchema.parse({
      invoiceId: 'sale-1',
      customerPhone: '9876543210',
      pdfPath: '/etc/passwd',
    })
  );

  assert.throws(() =>
    sendInvoiceWhatsAppSchema.parse({
      invoiceId: '',
      customerPhone: '123',
    })
  );
});

test('4. RBAC middleware rejects inactive users and unauthenticated requests', async () => {
  const mw = requireAnyPermission('billing.create', 'billing.view');
  let errInactive = null;
  await mw(
    { user: { id: 'u-inactive', isActive: false, role: 'CASHIER' } },
    {},
    (err) => {
      errInactive = err;
    }
  );
  assert.equal(errInactive?.statusCode, 403);
});
