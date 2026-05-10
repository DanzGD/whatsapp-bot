const fs = require('fs');

const dbPath = './job-data.json';

const jobs = {
  kuli: { min: 100, max: 300, tier: 'D' },
  ojek: { min: 200, max: 500, tier: 'D' },
  kasir: { min: 400, max: 800, tier: 'C' },
  chef: { min: 700, max: 1200, tier: 'C' },
  programmer: { min: 1200, max: 2500, tier: 'B' },
  akuntan: { min: 1500, max: 3000, tier: 'B' },
  polisi: { min: 2000, max: 3500, tier: 'A' },
  pemerintah: { min: 3000, max: 5000, tier: 'A' },
  ceo: { min: 5000, max: 10000, tier: 'S' }
};

function loadData() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
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
      lastWork: 0,
      job: 'kuli'
    };
  }

  return data[sender];
}

async function jobsCommand(sock, msg, text) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  const data = loadData();
  const user = getUser(data, sender);

  const args = text.split(' ');
  const command = args[0].toLowerCase();

  if (command === '.jobs') {
    let message = '💼 JOB LIST\n\n';

    for (const job in jobs) {
      const j = jobs[job];
      message += `• ${job.toUpperCase()} [Tier ${j.tier}]\n💰 ${j.min}-${j.max} coins\n\n`;
    }

    return sock.sendMessage(from, { text: message });
  }

  if (command === '.job') {
    const selectedJob = args[1]?.toLowerCase();

    if (!jobs[selectedJob]) {
      return sock.sendMessage(from, {
        text: '❌ Job tidak ditemukan. Gunakan .jobs'
      });
    }

    user.job = selectedJob;
    saveData(data);

    return sock.sendMessage(from, {
      text: `✅ Kamu sekarang bekerja sebagai ${selectedJob}`
    });
  }

  if (command === '.work') {
    const now = Date.now();

    if (now - user.lastWork < 3600000) {
      return sock.sendMessage(from, {
        text: '⏳ Kamu sudah bekerja. Tunggu 1 jam lagi.'
      });
    }

    const jobData = jobs[user.job];

    const salary = Math.floor(Math.random() * (jobData.max - jobData.min + 1)) + jobData.min;

    user.coins += salary;
    user.lastWork = now;

    saveData(data);

    return sock.sendMessage(from, {
      text: `💼 Job: ${user.job}\n🏷️ Tier: ${jobData.tier}\n💰 Gaji: ${salary} coins\n💳 Balance: ${user.coins} coins`
    });
  }
}

module.exports = jobsCommand;
