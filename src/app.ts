import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createV1Router } from './routes/v1.router.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler.js';

export function createApp(): Express {
  const app = express();

  // No reverse proxy in front (no Nginx), so DON'T trust X-Forwarded-For — otherwise a
  // client could spoof its IP and defeat IP-based rate limiting. req.ip = real socket IP.
  app.set('trust proxy', false);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/api/v1', createV1Router());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
