const fs = require('fs');

const dbPath = './casino-data.json';

function loadData() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ lottery: { pool: 0, players: [] } }, null, 2));
  }

  return JSON.parse(fs.readFileSync(dbPath));
}

function saveData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getUser(data, sender) {
  if (!data[sender]) {
    data[sender] = {
      coins: 1000,
      lastDaily: 0
    };
  }

  return data[sender];
}

function randomSlot() {
  const emojis = ['🍒', '🍋', '💎', '7️⃣', '🍀'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

async function casinoCommand(sock, msg, text) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  const data = loadData();
  const user = getUser(data, sender);

  const args = text.split(' ');
  const command = args[0].toLowerCase();

  if (command === '.balance') {
    return sock.sendMessage(from, {
      text: `💰 Balance: ${user.coins} coins`
    });
  }

  if (command === '.daily') {
    const now = Date.now();

    if (now - user.lastDaily < 86400000) {
      return sock.sendMessage(from, {
        text: '⏳ Kamu sudah claim daily reward hari ini.'
      });
    }

    const reward = Math.floor(Math.random() * 2000) + 500;
    user.coins += reward;
    user.lastDaily = now;

    saveData(data);

    return sock.sendMessage(from, {
      text: `🎁 Daily reward: ${reward} coins!`
    });
  }

  if (command === '.coinflip') {
    const side = args[1];
    const bet = parseInt(args[2]);

    if (!['heads', 'tails'].includes(side)) {
      return sock.sendMessage(from, {
        text: 'Gunakan: .coinflip heads/tails jumlah'
      });
    }

    if (!bet || bet <= 0 || bet > user.coins) {
      return sock.sendMessage(from, {
        text: 'Taruhan tidak valid.'
      });
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    if (side === result) {
      user.coins += bet;
      await sock.sendMessage(from, {
        text: `🪙 Hasil: ${result}\n🎉 Menang ${bet} coins!`
      });
    } else {
      user.coins -= bet;
      await sock.sendMessage(from, {
        text: `🪙 Hasil: ${result}\n💀 Kalah ${bet} coins!`
      });
    }

    saveData(data);
  }

  if (command === '.slot') {
    const bet = parseInt(args[1]);

    if (!bet || bet <= 0 || bet > user.coins) {
      return sock.sendMessage(from, {
        text: 'Gunakan: .slot jumlah'
      });
    }

    const s1 = randomSlot();
    const s2 = randomSlot();
    const s3 = randomSlot();

    let reward = 0;

    if (s1 === s2 && s2 === s3) {
      reward = bet * 5;
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
      reward = bet * 2;
    }

    if (reward > 0) {
      user.coins += reward;
      await sock.sendMessage(from, {
        text: `${s1} | ${s2} | ${s3}\n🎉 Menang ${reward} coins!`
      });
    } else {
      user.coins -= bet;
      await sock.sendMessage(from, {
        text: `${s1} | ${s2} | ${s3}\n💀 Kalah ${bet} coins!`
      });
    }

    saveData(data);
  }

  if (command === '.blackjack') {
    const bet = parseInt(args[1]);

    if (!bet || bet <= 0 || bet > user.coins) {
      return sock.sendMessage(from, {
        text: 'Gunakan: .blackjack jumlah'
      });
    }

    const player = Math.floor(Math.random() * 11) + 12;
    const dealer = Math.floor(Math.random() * 11) + 12;

    if (player > dealer && player <= 21 || dealer > 21) {
      user.coins += bet * 2;
      await sock.sendMessage(from, {
        text: `🃏 Kamu: ${player}\n🤖 Dealer: ${dealer}\n🎉 Blackjack menang!`
      });
    } else {
      user.coins -= bet;
      await sock.sendMessage(from, {
        text: `🃏 Kamu: ${player}\n🤖 Dealer: ${dealer}\n💀 Kamu kalah!`
      });
    }

    saveData(data);
  }

  if (command === '.lottery') {
    const amount = parseInt(args[1]);

    if (!amount || amount <= 0 || amount > user.coins) {
      return sock.sendMessage(from, {
        text: 'Gunakan: .lottery jumlah'
      });
    }

    user.coins -= amount;

    data.lottery.pool += amount;
    data.lottery.players.push(sender);

    saveData(data);

    return sock.sendMessage(from, {
      text: `🎟️ Kamu masuk lottery dengan taruhan ${amount} coins.\n💰 Pool sekarang: ${data.lottery.pool}`
    });
  }

  if (command === '.drawlottery') {
    if (!data.lottery.players.length) {
      return sock.sendMessage(from, {
        text: 'Belum ada peserta lottery.'
      });
    }

    const winner = data.lottery.players[Math.floor(Math.random() * data.lottery.players.length)];

    getUser(data, winner).coins += data.lottery.pool;

    await sock.sendMessage(from, {
      text: `🏆 Lottery selesai!\nPemenang: ${winner}\n💰 Hadiah: ${data.lottery.pool} coins`
    });

    data.lottery.pool = 0;
    data.lottery.players = [];

    saveData(data);
  }

  if (command === '.casinomenu') {
    return sock.sendMessage(from, {
      text:
`🎰 CASINO MENU

💰 .balance
🎁 .daily
🪙 .coinflip heads/tails jumlah
🎰 .slot jumlah
🃏 .blackjack jumlah
🎟️ .lottery jumlah
🏆 .drawlottery`
    });
  }
}

module.exports = casinoCommand;
