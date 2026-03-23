import os from 'os';

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/bar-trivia',
  clientUrl: process.env.CLIENT_URL || `http://${localIp}:${parseInt(process.env.PORT || '3001', 10)}`,
  publicUrl: '' as string,
  localIp,
  totalRounds: 6,
  questionsPerRound: 3,
  earlyRoundWagers: [1, 2, 3],
  lateRoundWagers: [2, 4, 6],
  lateRoundStart: 4,
  getWagersForRound(round: number): number[] {
    return round < this.lateRoundStart ? this.earlyRoundWagers : this.lateRoundWagers;
  },
};
