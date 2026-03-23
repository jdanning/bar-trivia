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
    origin: (_origin, callback) => callback(null, true),
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
