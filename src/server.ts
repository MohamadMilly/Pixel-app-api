import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/database/prisma.js';
import { realtime } from './shared/realtime/index.js';

const app = createApp();
const httpServer = createServer(app);

// Attach the Socket.io realtime service (JWT handshake + per-account rooms).
realtime.init(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`🚀 API listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
});

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);

  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', (signal) => void shutdown(signal));
process.on('SIGTERM', (signal) => void shutdown(signal));
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
