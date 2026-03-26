import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config';
import { registerSocketHandlers } from './socket';
import { startTunnel } from './services/tunnelService';
import { ClientToServerEvents, ServerToClientEvents } from './types';

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const { hostname } = new URL(origin);
        if (hostname === 'localhost' || hostname === '127.0.0.1') return callback(null, true);
        if (hostname === config.localIp) return callback(null, true);
        if (config.publicUrl) {
          const tunnelHost = new URL(config.publicUrl).hostname;
          if (hostname === tunnelHost) return callback(null, true);
        }
      } catch { /* malformed origin */ }
      callback(new Error('CORS: origin not permitted'));
    },
    methods: ['GET', 'POST'],
  },
});

registerSocketHandlers(io);

server.listen(config.port, '0.0.0.0', async () => {
  console.log(`Bar Trivia server running on http://${config.localIp}:${config.port}`);
  console.log(`LAN URL: ${config.clientUrl}`);
  const tunnelUrl = await startTunnel();
  if (tunnelUrl) {
    console.log(`Players join at: ${tunnelUrl}`);
  } else {
    console.log(`Tunnel failed — players can still join via LAN: ${config.clientUrl}`);
  }
});
