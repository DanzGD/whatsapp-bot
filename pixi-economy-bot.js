const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const DB_FILE = './database.json';

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: {},
      crypto: {
        corecoin: 120,
        pixicoin: 80,
        astralcoin: 300
      },
      redeemCodes: {
        WELCOME2026: {
          reward: 5000,
          used: []
        }
      }
    }, null, 2));
  }

  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const jobs = {
  kuli: { min: 100, max: 300, tier: 'D', chance: 100 },
  ojek: { min: 200, max: 500, tier: 'D', chance: 90 },
  kasir: { min: 500, max: 900, tier: 'C', chance: 70 },
  chef: { min: 900, max: 1500, tier: 'C', chance: 65 },
  programmer: { min: 1500, max: 2500, tier: 'B', chance: 45 },
  akuntan: { min: 2000, max: 3500, tier: 'B', chance: 40 },
  polisi: { min: 3000, max: 5000, tier: 'A', chance: 25 },
  pemerintah: { min: 5000, max: 8000, tier: 'A', chance: 15 },
  ceo: { min: 10000, max: 20000, tier: 'S', chance: 5 }
};

function getUser(db, id) {
  if (!db.users[id]) {
    db.users[id] = {
      coins: 5000,
      bank: 0,
      reputation: 0,
      workCount: 0,
      lastDaily: 0,
      lastWork: 0,
      job: 'kuli',
      crypto: {
        corecoin: 0,
        pixicoin: 0,
        astralcoin: 0
      }
    };
  }

  return db.users[id];
}

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
    if (!text) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;

    const db = loadDB();
    const user = getUser(db, sender);

    const args = text.split(' ');
    const command = args[0].toLowerCase();

    if (command === '.menu') {
      return sock.sendMessage(from, {
        text: `🤖 PIXI ECONOMY RPG BOT\n\n💰 .balance\n🎁 .daily\n💼 .jobs\n🛠️ .job\n🏢 .work\n📈 .market\n🪙 .buy\n💸 .sell\n🎁 .redeem`
      });
    }

    if (command === '.balance') {
      return sock.sendMessage(from, {
        text: `💰 Coins: ${user.coins}\n🏦 Bank: ${user.bank}\n💼 Job: ${user.job}\n⭐ Reputation: ${user.reputation}`
      });
    }

    if (command === '.daily') {
      const now = Date.now();

      if (now - user.lastDaily < 86400000) {
        return sock.sendMessage(from, {
          text: '⏳ Kamu sudah claim daily hari ini.'
        });
      }

      const reward = Math.floor(Math.random() * 5000) + 1000;

      user.coins += reward;
      user.lastDaily = now;

      saveDB(db);

      return sock.sendMessage(from, {
        text: `🎁 Daily reward: ${reward} coins`
      });
    }

    if (command === '.jobs') {
      let txt = '💼 JOB LIST\n\n';

      for (const job in jobs) {
        const j = jobs[job];
        txt += `• ${job.toUpperCase()} [${j.tier}]\n💰 ${j.min}-${j.max}\n📊 Chance: ${j.chance}%\n\n`;
      }

      return sock.sendMessage(from, { text: txt });
    }

    if (command === '.job') {
      const selected = args[1]?.toLowerCase();

      if (!jobs[selected]) {
        return sock.sendMessage(from, {
          text: '❌ Job tidak ditemukan.'
        });
      }

      const chance = jobs[selected].chance + Math.floor(user.reputation / 2);
      const roll = Math.floor(Math.random() * 100);

      if (roll > chance) {
        return sock.sendMessage(from, {
          text: `❌ Kamu ditolak menjadi ${selected}`
        });
      }

      user.job = selected;

      saveDB(db);

      return sock.sendMessage(from, {
        text: `✅ Sekarang kamu bekerja sebagai ${selected}`
      });
    }

    if (command === '.work') {
      const now = Date.now();

      if (now - user.lastWork < 3600000) {
        return sock.sendMessage(from, {
          text: '⏳ Kamu sudah bekerja. Tunggu 1 jam.'
        });
      }

      const jobData = jobs[user.job];
      const salary = Math.floor(Math.random() * (jobData.max - jobData.min + 1)) + jobData.min;

      user.coins += salary;
      user.reputation += Math.floor(Math.random() * 5) + 1;
      user.workCount += 1;
      user.lastWork = now;

      saveDB(db);

      return sock.sendMessage(from, {
        text: `💼 Job: ${user.job}\n💰 Gaji: ${salary}\n⭐ Reputation: +${user.reputation}`
      });
    }

    if (command === '.market') {
      return sock.sendMessage(from, {
        text: `📈 MARKET\n\n🪙 CoreCoin: ${db.crypto.corecoin}\n💎 PixiCoin: ${db.crypto.pixicoin}\n🌌 AstralCoin: ${db.crypto.astralcoin}`
      });
    }

    if (command === '.buy') {
      const coin = args[1]?.toLowerCase();
      const amount = parseInt(args[2]);

      if (!db.crypto[coin]) {
        return sock.sendMessage(from, {
          text: '❌ Coin tidak ditemukan.'
        });
      }

      if (!amount || amount <= 0) {
        return sock.sendMessage(from, {
          text: '❌ Jumlah tidak valid.'
        });
      }

      const cost = db.crypto[coin] * amount;

      if (user.coins < cost) {
        return sock.sendMessage(from, {
          text: '❌ Coins tidak cukup.'
        });
      }

      user.coins -= cost;
      user.crypto[coin] += amount;

      saveDB(db);

      return sock.sendMessage(from, {
        text: `✅ Membeli ${amount} ${coin}`
      });
    }

    if (command === '.sell') {
      const coin = args[1]?.toLowerCase();
      const amount = parseInt(args[2]);

      if (!db.crypto[coin]) {
        return sock.sendMessage(from, {
          text: '❌ Coin tidak ditemukan.'
        });
      }

      if (user.crypto[coin] < amount) {
        return sock.sendMessage(from, {
          text: '❌ Crypto tidak cukup.'
        });
      }

      const value = db.crypto[coin] * amount;

      user.crypto[coin] -= amount;
      user.coins += value;

      saveDB(db);

      return sock.sendMessage(from, {
        text: `💸 Menjual ${amount} ${coin} seharga ${value}`
      });
    }

    if (command === '.redeem') {
      const code = args[1];

      if (!db.redeemCodes[code]) {
        return sock.sendMessage(from, {
          text: '❌ Code tidak valid.'
        });
      }

      if (db.redeemCodes[code].used.includes(sender)) {
        return sock.sendMessage(from, {
          text: '❌ Kamu sudah menggunakan code ini.'
        });
      }

      const reward = db.redeemCodes[code].reward;

      user.coins += reward;
      db.redeemCodes[code].used.push(sender);

      saveDB(db);

      return sock.sendMessage(from, {
        text: `🎁 Redeem berhasil! +${reward} coins`
      });
    }
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }

    if (connection === 'open') {
      console.log('Pixi Economy Bot Connected');
    }
  });
}

startBot();
