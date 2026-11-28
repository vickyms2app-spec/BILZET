import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { DisconnectReason } from '@whiskeysockets/baileys';
import {
  WhatsAppConnectionManager,
  WHATSAPP_STATUS,
} from '../src/services/whatsapp.service.mjs';

const createMockSocket = () => {
  const ev = new EventEmitter();
  return {
    ev,
    user: null,
    ended: false,
    loggedOut: false,
    end() {
      this.ended = true;
    },
    async logout() {
      this.loggedOut = true;
    },
  };
};

const createTestManager = () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bilzet-wa-test-'));
  const socketsByDir = new Map();
  const dbRows = new Map();

  const manager = new WhatsAppConnectionManager({
    sessionsDir: tempRoot,
    reconnectBaseDelayMs: 25,
    versionFetcher: async () => ({ version: [2, 3000, 1] }),
    qrGenerator: async (qr) => `data:image/png;base64,${Buffer.from(qr).toString('base64')}`,
    authStateFactory: async (dir) => {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'creds.json'), JSON.stringify({ me: { id: 'mock' } }));
      return {
        state: { creds: {}, keys: {} },
        saveCreds: async () => {},
      };
    },
    socketFactory: () => {
      const sock = createMockSocket();
      socketsByDir.set(socketsByDir.size, sock);
      return sock;
    },
    prismaClient: {
      whatsAppSession: {
        upsert: async ({ where, create, update }) => {
          const existing = dbRows.get(where.businessId);
          const next = existing ? { ...existing, ...update } : { ...create };
          dbRows.set(where.businessId, next);
          return next;
        },
        findUnique: async ({ where }) => dbRows.get(where.businessId) || null,
      },
    },
  });

  return {
    manager,
    tempRoot,
    socketsByDir,
    dbRows,
    cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true }),
  };
};

test('1-3. Connection init, QR generation, and connection open transition', async () => {
  const ctx = createTestManager();
  try {
    const p1 = ctx.manager.connect('busi-alpha');
    const p2 = ctx.manager.connect('busi-alpha'); // concurrent init lock
    const [res1, res2] = await Promise.all([p1, p2]);
    assert.equal(ctx.socketsByDir.size, 1);
    assert.equal(res1.status, WHATSAPP_STATUS.CONNECTING);
    assert.equal(res2.status, WHATSAPP_STATUS.CONNECTING);

    const sock = ctx.socketsByDir.get(0);
    sock.ev.emit('connection.update', { qr: 'mock-qr-payload-123' });
    await new Promise((r) => setTimeout(r, 20));

    const qrRes = await ctx.manager.getQr('busi-alpha');
    assert.equal(qrRes.status, WHATSAPP_STATUS.WAITING_FOR_QR);
    assert.ok(qrRes.qrCode.startsWith('data:image/png;base64,'));

    sock.user = { id: '919876543210:12@s.whatsapp.net' };
    sock.ev.emit('connection.update', { connection: 'open' });
    await new Promise((r) => setTimeout(r, 20));

    const statusRes = await ctx.manager.getStatus('busi-alpha');
    assert.equal(statusRes.status, WHATSAPP_STATUS.CONNECTED);
    assert.equal(statusRes.connected, true);
    assert.equal(statusRes.phoneNumber, '+919876543210');
    assert.equal(statusRes.hasQr, false);
    assert.equal('creds' in statusRes, false);
  } finally {
    await ctx.manager.shutdownAll();
    ctx.cleanup();
  }
});

test('4. Multi-tenant isolation: separate sockets and auth dirs per businessId', async () => {
  const ctx = createTestManager();
  try {
    await ctx.manager.connect('busi-1');
    await ctx.manager.connect('busi-2');
    assert.equal(ctx.socketsByDir.size, 2);

    const sock1 = ctx.socketsByDir.get(0);
    sock1.user = { id: '911111111111:1@s.whatsapp.net' };
    sock1.ev.emit('connection.update', { connection: 'open' });
    await new Promise((r) => setTimeout(r, 20));

    const s1 = await ctx.manager.getStatus('busi-1');
    const s2 = await ctx.manager.getStatus('busi-2');
    assert.equal(s1.connected, true);
    assert.equal(s1.phoneNumber, '+911111111111');
    assert.equal(s2.connected, false);
    assert.equal(s2.phoneNumber, null);
  } finally {
    await ctx.manager.shutdownAll();
    ctx.cleanup();
  }
});

test('5. LoggedOut clears credentials and sets AUTH_FAILED without reconnecting', async () => {
  const ctx = createTestManager();
  try {
    await ctx.manager.connect('busi-logout');
    const sock = ctx.socketsByDir.get(0);
    sock.ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: DisconnectReason.loggedOut } } },
    });
    await new Promise((r) => setTimeout(r, 40));

    const status = await ctx.manager.getStatus('busi-logout');
    assert.equal(status.status, WHATSAPP_STATUS.AUTH_FAILED);
    assert.equal(fs.existsSync(path.join(ctx.tempRoot, 'busi-logout')), false);
    assert.equal(ctx.socketsByDir.size, 1);
  } finally {
    await ctx.manager.shutdownAll();
    ctx.cleanup();
  }
});

test('6. Network close triggers exponential reconnect and disconnect cleans up', async () => {
  const ctx = createTestManager();
  try {
    await ctx.manager.connect('busi-net');
    const sock0 = ctx.socketsByDir.get(0);
    sock0.ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: { output: { statusCode: 500 } } },
    });
    await new Promise((r) => setTimeout(r, 60));

    assert.equal(ctx.socketsByDir.size >= 2, true);

    const disc = await ctx.manager.disconnect('busi-net', { unlink: true });
    assert.equal(disc.status, WHATSAPP_STATUS.DISCONNECTED);
    assert.equal(fs.existsSync(path.join(ctx.tempRoot, 'busi-net')), false);
  } finally {
    await ctx.manager.shutdownAll();
    ctx.cleanup();
  }
});
