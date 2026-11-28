import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWhatsAppPhoneNumber,
  sendInvoicePdfViaWhatsApp,
  getInvoiceWhatsAppMessages,
  WHATSAPP_STATUS,
} from '../src/services/whatsapp.service.mjs';

test('1. Phone number validation & normalization supports Indian and international formats', () => {
  assert.equal(normalizeWhatsAppPhoneNumber('9876543210').e164, '+919876543210');
  assert.equal(normalizeWhatsAppPhoneNumber('09876543210').jid, '919876543210@s.whatsapp.net');
  assert.equal(normalizeWhatsAppPhoneNumber('+91 98765 43210').e164, '+919876543210');
  assert.equal(normalizeWhatsAppPhoneNumber('+1 (415) 555-2671').e164, '+14155552671');
  assert.equal(normalizeWhatsAppPhoneNumber('00447911123456').e164, '+447911123456');

  assert.throws(() => normalizeWhatsAppPhoneNumber('12345'), /Invalid WhatsApp phone number/);
  assert.throws(() => normalizeWhatsAppPhoneNumber('abc-phone'), /Invalid WhatsApp phone number/);
  assert.throws(() => normalizeWhatsAppPhoneNumber(''), /required/);
});

const createSendTestContext = ({ shouldFailSend = false } = {}) => {
  const sentPayloads = [];
  const messageRows = [];

  const mockManager = {
    getActiveSocket: (bizId) => {
      if (bizId !== 'busi-A') return null;
      return {
        status: WHATSAPP_STATUS.CONNECTED,
        sendMessage: async (jid, content) => {
          if (shouldFailSend) throw new Error('Baileys socket disconnected mid-send');
          sentPayloads.push({ jid, content });
          return { key: { id: `wa-msg-${sentPayloads.length}` } };
        },
      };
    },
  };

  const mockPrisma = {
    sale: {
      findUnique: async ({ where }) => {
        if (where.id === 'sale-A1') {
          return {
            id: 'sale-A1',
            businessId: 'busi-A',
            invoiceNumber: 'INV-2026-001',
            grandTotal: 5000,
            business: { id: 'busi-A', name: 'BILZET Store A' },
          };
        }
        if (where.id === 'sale-B1') {
          return {
            id: 'sale-B1',
            businessId: 'busi-B',
            invoiceNumber: 'INV-2026-999',
            grandTotal: 1200,
            business: { id: 'busi-B', name: 'Other Store B' },
          };
        }
        return null;
      },
    },
    whatsAppMessage: {
      findFirst: async ({ where }) => {
        return (
          messageRows.find(
            (m) =>
              m.businessId === where.businessId &&
              m.invoiceId === where.invoiceId &&
              m.customerPhone === where.customerPhone &&
              where.messageStatus.in.includes(m.messageStatus)
          ) || null
        );
      },
      findMany: async ({ where }) =>
        messageRows.filter(
          (m) => m.businessId === where.businessId && m.invoiceId === where.invoiceId
        ),
      create: async ({ data }) => {
        const row = { id: `msg-${messageRows.length + 1}`, ...data, createdAt: new Date() };
        messageRows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const idx = messageRows.findIndex((m) => m.id === where.id);
        messageRows[idx] = { ...messageRows[idx], ...data };
        return messageRows[idx];
      },
    },
  };

  const mockPdfGenerator = async (saleId, bizId) =>
    Buffer.from(`%PDF-1.4 MOCK ${saleId} FOR ${bizId}`);

  return { sentPayloads, messageRows, mockManager, mockPrisma, mockPdfGenerator };
};

test('2. Sends authorized invoice PDF via Baileys and persists SENT history', async () => {
  const ctx = createSendTestContext();
  const res = await sendInvoicePdfViaWhatsApp({
    businessId: 'busi-A',
    invoiceId: 'sale-A1',
    customerPhone: '9876543210',
    manager: ctx.mockManager,
    prismaClient: ctx.mockPrisma,
    pdfBufferGenerator: ctx.mockPdfGenerator,
  });

  assert.equal(res.sent, true);
  assert.equal(res.invoiceNumber, 'INV-2026-001');
  assert.equal(res.fileName, 'INV-2026-001.pdf');
  assert.equal(res.customerPhone, '+919876543210');
  assert.equal(res.messageStatus, 'SENT');
  assert.equal(ctx.sentPayloads.length, 1);
  assert.equal(ctx.sentPayloads[0].jid, '919876543210@s.whatsapp.net');
  assert.ok(Buffer.isBuffer(ctx.sentPayloads[0].content.document));
  assert.equal(ctx.sentPayloads[0].content.mimetype, 'application/pdf');
  assert.equal(ctx.messageRows[0].messageStatus, 'SENT');
});

test('3. Prevents cross-tenant invoice sending (403 Forbidden)', async () => {
  const ctx = createSendTestContext();
  await assert.rejects(
    () =>
      sendInvoicePdfViaWhatsApp({
        businessId: 'busi-A',
        invoiceId: 'sale-B1',
        customerPhone: '9876543210',
        manager: ctx.mockManager,
        prismaClient: ctx.mockPrisma,
        pdfBufferGenerator: ctx.mockPdfGenerator,
      }),
    (err) => err.statusCode === 403
  );
});

test('4. Prevents duplicate sends within window unless allowDuplicate is true', async () => {
  const ctx = createSendTestContext();
  await sendInvoicePdfViaWhatsApp({
    businessId: 'busi-A',
    invoiceId: 'sale-A1',
    customerPhone: '9876543210',
    manager: ctx.mockManager,
    prismaClient: ctx.mockPrisma,
    pdfBufferGenerator: ctx.mockPdfGenerator,
  });

  await assert.rejects(
    () =>
      sendInvoicePdfViaWhatsApp({
        businessId: 'busi-A',
        invoiceId: 'sale-A1',
        customerPhone: '9876543210',
        manager: ctx.mockManager,
        prismaClient: ctx.mockPrisma,
        pdfBufferGenerator: ctx.mockPdfGenerator,
      }),
    (err) => err.statusCode === 409
  );

  const retryRes = await sendInvoicePdfViaWhatsApp({
    businessId: 'busi-A',
    invoiceId: 'sale-A1',
    customerPhone: '9876543210',
    allowDuplicate: true,
    manager: ctx.mockManager,
    prismaClient: ctx.mockPrisma,
    pdfBufferGenerator: ctx.mockPdfGenerator,
  });
  assert.equal(retryRes.sent, true);
});

test('5. Records FAILED status when socket send fails and retrieves message history', async () => {
  const ctx = createSendTestContext({ shouldFailSend: true });
  await assert.rejects(
    () =>
      sendInvoicePdfViaWhatsApp({
        businessId: 'busi-A',
        invoiceId: 'sale-A1',
        customerPhone: '9876543210',
        manager: ctx.mockManager,
        prismaClient: ctx.mockPrisma,
        pdfBufferGenerator: ctx.mockPdfGenerator,
      }),
    /WhatsApp delivery failed/
  );

  assert.equal(ctx.messageRows.length, 1);
  assert.equal(ctx.messageRows[0].messageStatus, 'FAILED');
  assert.match(ctx.messageRows[0].errorMessage, /disconnected mid-send/);

  const history = await getInvoiceWhatsAppMessages({
    businessId: 'busi-A',
    invoiceId: 'sale-A1',
    prismaClient: ctx.mockPrisma,
  });
  assert.equal(history.length, 1);
  assert.equal(history[0].messageStatus, 'FAILED');
});
