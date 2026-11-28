import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import {
  WhatsAppConnectionManager,
  WHATSAPP_STATUS,
} from '../src/services/whatsapp.service.mjs';

test('Phase 5: Persisted WhatsApp sessions recover automatically across backend restarts', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bilzet-wa-persist-'));
  const pairedDir = path.join(tempRoot, 'busi-paired');
  const unpairedDir = path.join(tempRoot, 'busi-unpaired');
  fs.mkdirSync(pairedDir, { recursive: true });
  fs.mkdirSync(unpairedDir, { recursive: true });
  fs.writeFileSync(
    path.join(pairedDir, 'creds.json'),
    JSON.stringify({ me: { id: '919999999999:1@s.whatsapp.net' }, registered: true })
  );
  // Empty / unpaired creds should not auto-connect
  fs.writeFileSync(path.join(unpairedDir, 'creds.json'), JSON.stringify({}));

  const sockets = [];
  const createManager = () =>
    new WhatsAppConnectionManager({
      sessionsDir: tempRoot,
      versionFetcher: async () => ({ version: [2, 3000, 1] }),
      authStateFactory: async () => ({ state: { creds: {}, keys: {} }, saveCreds: async () => {} }),
      socketFactory: () => {
        const sock = { ev: new EventEmitter(), user: null, end() {} };
        sockets.push(sock);
        return sock;
      },
      prismaClient: null,
    });

  const managerAfterRestart = createManager();
  try {
    const restored = await managerAfterRestart.restorePersistedSessions();
    assert.deepEqual(restored, ['busi-paired']);
    assert.equal(sockets.length, 1);

    sockets[0].user = { id: '919999999999:1@s.whatsapp.net' };
    sockets[0].ev.emit('connection.update', { connection: 'open' });
    await new Promise((r) => setTimeout(r, 20));

    const status = await managerAfterRestart.getStatus('busi-paired');
    assert.equal(status.status, WHATSAPP_STATUS.CONNECTED);
    assert.equal(status.connected, true);
    assert.equal(status.phoneNumber, '+919999999999');
  } finally {
    await managerAfterRestart.shutdownAll();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
