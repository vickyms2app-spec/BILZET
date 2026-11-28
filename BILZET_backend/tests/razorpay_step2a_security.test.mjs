
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';

import {
  verifyRazorpayPaymentSignature,
  handleRazorpayWebhook,
} from '../src/services/razorpay.service.mjs';

import app from '../src/app.mjs';

// Start an isolated HTTP server for integration tests.
const startTestServer = () =>
  new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);

      const addr = server.address();

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`,
      });
    });
  });

// Close the server and all active HTTP connections.
const stopTestServer = (server) =>
  new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });

    // Close idle and active connections after initiating shutdown.
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
  });

// Always disable HTTP connection reuse in test requests.
const testFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Connection: 'close',
    },
  });

// 1. Valid payment signature.
test('1. Valid Razorpay payment signature verification returns true', () => {
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;
  const prevKey = process.env.RAZORPAY_KEY_ID;

  try {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_unit12345';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_unit_secret_987654';

    const orderId = 'order_Test123';
    const paymentId = 'pay_Test456';

    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(
      verifyRazorpayPaymentSignature({
        orderId,
        paymentId,
        signature,
      }),
      true
    );
  } finally {
    if (prevSecret === undefined) {
      delete process.env.RAZORPAY_KEY_SECRET;
    } else {
      process.env.RAZORPAY_KEY_SECRET = prevSecret;
    }

    if (prevKey === undefined) {
      delete process.env.RAZORPAY_KEY_ID;
    } else {
      process.env.RAZORPAY_KEY_ID = prevKey;
    }
  }
});

// 2. Invalid payment signature.
test('2. Invalid payment signature is rejected', () => {
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;

  try {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_unit_secret_987654';

    assert.equal(
      verifyRazorpayPaymentSignature({
        orderId: 'order_Test123',
        paymentId: 'pay_Test456',
        signature: 'deadbeef'.repeat(8),
      }),
      false
    );
  } finally {
    if (prevSecret === undefined) {
      delete process.env.RAZORPAY_KEY_SECRET;
    } else {
      process.env.RAZORPAY_KEY_SECRET = prevSecret;
    }
  }
});

// 3. Missing payment signature.
test('3. Missing payment signature is rejected', () => {
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;

  try {
    process.env.RAZORPAY_KEY_SECRET = 'rzp_unit_secret_987654';

    assert.equal(
      verifyRazorpayPaymentSignature({
        orderId: 'order_Test123',
        paymentId: 'pay_Test456',
        signature: '',
      }),
      false
    );

    assert.equal(
      verifyRazorpayPaymentSignature({
        orderId: 'order_Test123',
        paymentId: 'pay_Test456',
      }),
      false
    );
  } finally {
    if (prevSecret === undefined) {
      delete process.env.RAZORPAY_KEY_SECRET;
    } else {
      process.env.RAZORPAY_KEY_SECRET = prevSecret;
    }
  }
});

// 4. Mock signature rejection.
test('4. Mock signature sig_mock_verified is rejected even in test mode', () => {
  const prevSecret = process.env.RAZORPAY_KEY_SECRET;
  const prevKey = process.env.RAZORPAY_KEY_ID;

  try {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_unit12345';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_unit_secret_987654';

    assert.equal(
      verifyRazorpayPaymentSignature({
        orderId: 'order_Test123',
        paymentId: 'pay_Test456',
        signature: 'sig_mock_verified',
      }),
      false
    );
  } finally {
    if (prevSecret === undefined) {
      delete process.env.RAZORPAY_KEY_SECRET;
    } else {
      process.env.RAZORPAY_KEY_SECRET = prevSecret;
    }

    if (prevKey === undefined) {
      delete process.env.RAZORPAY_KEY_ID;
    } else {
      process.env.RAZORPAY_KEY_ID = prevKey;
    }
  }
});

// 5-9. Webhook integration and security tests.
test(
  '5-9. Webhook HTTP integration: signature validation, missing secret and rawBody preservation',
  async () => {
    const { server, baseUrl } = await startTestServer();
    const prevWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    try {
      const webhookSecret = 'whsec_test_strict_secret_2026';

      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

      // Preserve original JSON whitespace for raw-body signature verification.
      const rawPayload =
        '{\n  "event" : "payment.authorized",\n  "payload" : { "note" : "raw-check" }\n}';

      const validSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(Buffer.from(rawPayload, 'utf8'))
        .digest('hex');

      // 5 & 9. Valid signature and original rawBody.
      const validRes = await testFetch(
        `${baseUrl}/api/v1/subscription/razorpay/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-razorpay-signature': validSig,
          },
          body: rawPayload,
        }
      );

      assert.equal(validRes.status, 200);

      const validJson = await validRes.json();

      assert.equal(validJson.success, true);
      assert.equal(validJson.data.received, true);
      assert.equal(validJson.data.event, 'payment.authorized');

      // 6. Invalid signature.
      const invalidRes = await testFetch(
        `${baseUrl}/api/v1/subscription/razorpay/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-razorpay-signature': '0'.repeat(64),
          },
          body: rawPayload,
        }
      );

      assert.equal(invalidRes.status, 401);

      // 7. Missing signature.
      const missingSigRes = await testFetch(
        `${baseUrl}/api/v1/subscription/razorpay/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: rawPayload,
        }
      );

      assert.equal(missingSigRes.status, 401);

      // 8. Missing webhook secret.
      delete process.env.RAZORPAY_WEBHOOK_SECRET;

      const missingSecretRes = await testFetch(
        `${baseUrl}/api/v1/subscription/razorpay/webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-razorpay-signature': validSig,
          },
          body: rawPayload,
        }
      );

      assert.equal(missingSecretRes.status, 500);

      const errBody = await missingSecretRes.text();

      assert.equal(errBody.includes(webhookSecret), false);

      // Verify rawBody validation.
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

      await assert.rejects(
        () =>
          handleRazorpayWebhook({
            payload: { event: 'payment.authorized' },
            signature: validSig,
            rawBody: { event: 'payment.authorized' },
          }),
        /Missing raw webhook request body/
      );
    } finally {
      if (prevWebhookSecret === undefined) {
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
      } else {
        process.env.RAZORPAY_WEBHOOK_SECRET = prevWebhookSecret;
      }

      await stopTestServer(server);
    }
  },
  { timeout: 15000 }
);

// 10. Existing non-webhook JSON parsing.
test(
  '10. Existing non-webhook API JSON parsing still works',
  async () => {
    const { server, baseUrl } = await startTestServer();

    try {
      const res = await testFetch(
        `${baseUrl}/api/v1/subscription/dealer-offers/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: 'NONEXISTENT_CODE',
            planTier: 'PRO',
          }),
        }
      );

      assert.ok(
        [200, 400, 404].includes(res.status),
        `Unexpected response status: ${res.status}`
      );

      // Consume response body before closing the server.
      await res.text();
    } finally {
      await stopTestServer(server);
    }
  },
  { timeout: 15000 }
);
