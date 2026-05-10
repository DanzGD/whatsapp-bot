const fs = require('fs');

const dbPath = './casino-data.json';

function loadData() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}));
  }

  return JSON.parse(fs.readFileSync(dbPath));
}

function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

async function casinoCommand(sock, msg, text) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  const data = loadData();

  if (!data[sender]) {
    data[sender] = {
      coins: 1000
    };
  }

  const args = text.split(' ');
  const command = args[0];

  if (command === '.balance') {
    await sock.sendMessage(from, {
      text: `💰 Balance kamu: ${data[sender].coins} coins`
    });
  }

  if (command === '.casino') {
    const bet = parseInt(args[1]);

    if (!bet || bet <= 0) {
      return sock.sendMessage(from, {
        text: 'Gunakan: .casino <jumlah taruhan>'
      });
    }

    if (bet > data[sender].coins) {
      return sock.sendMessage(from, {
        text: 'Coins kamu tidak cukup.'
      });
    }

    const win = Math.random() < 0.45;

    if (win) {
      data[sender].coins += bet;

      await sock.sendMessage(from, {
        text: `🎉 Kamu menang ${bet} coins!\n💰 Balance sekarang: ${data[sender].coins}`
      });
    } else {
      data[sender].coins -= bet;

      await sock.sendMessage(from, {
        text: `💀 Kamu kalah ${bet} coins.\n💰 Balance sekarang: ${data[sender].coins}`
      });
    }

    saveData(data);
  }
}

module.exports = casinoCommand;
