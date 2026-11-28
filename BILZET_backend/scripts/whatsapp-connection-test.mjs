
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys';

import QRCode from 'qrcode';
import { tmpdir } from 'os';
import { join } from 'path';

const authDirectory = join(tmpdir(), 'bilzet-whatsapp-test-auth');
const qrImagePath = join(tmpdir(), 'bilzet-whatsapp-test-qr.png');

async function startWhatsApp() {
  const { state, saveCreds } =
    await useMultiFileAuthState(authDirectory);

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['BILZET Test', 'Chrome', '1.0.0']
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      await QRCode.toFile(qrImagePath, qr);

      console.log('\nWhatsApp QR generated successfully!');
      console.log('QR image:', qrImagePath);
      console.log('Open the QR image and scan it using WhatsApp.');
    }

    if (connection === 'open') {
      console.log('\nWhatsApp connected successfully!');
      console.log('BILZET WhatsApp test connection is active.');
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      console.log('\nWhatsApp connection closed.');
      console.log('Disconnect status:', statusCode);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('WhatsApp logged out. Pair again.');
      } else {
        console.log('Restart the test script to reconnect.');
      }
    }
  });

  return socket;
}

startWhatsApp().catch((error) => {
  console.error('WhatsApp startup failed:', error);
  process.exitCode = 1;
});
