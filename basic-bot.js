const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const from = msg.key.remoteJid;

    if (text === '.ping') {
      await sock.sendMessage(from, { text: 'Pong 🏓' });
    }

    if (text === '.menu') {
      await sock.sendMessage(from, {
        text: '🤖 Basic WhatsApp Bot\n\n.ping\n.menu'
      });
    }
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }

    if (connection === 'open') {
      console.log('Bot connected!');
    }
  });
}

startBot();
