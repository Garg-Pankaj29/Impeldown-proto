// Boot: middleware, routes, scheduler
// Follows docs/architecture.md

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      !config.CLIENT_ORIGIN ||
      config.CLIENT_ORIGIN === '*' ||
      origin === config.CLIENT_ORIGIN ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────
import { router as apiRouter } from './api/routes';
import { authRouter } from './api/auth';
import { errorHandler } from './api/middlewares';

app.use('/api', apiRouter);
app.use('/api/auth', authRouter);

// ── Health ──────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'impel-down-ic',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

// ── Frontend Serving (Production) ───────────────────────────
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React frontend app
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Catch-all route to serve index.html for React Router
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});
// ── Start ───────────────────────────────────────────────────
import { ticker } from './services/scheduler';
import { migrate } from './db/migrate';

let server: ReturnType<typeof app.listen> | null = null;

// Only start listening when run directly (not imported by tests)
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.PORT, () => {
    console.log(`⚓ Impel Down Command Center running on port ${config.PORT}`);
    migrate().catch(console.error);
    ticker.start();
  });
}

export { app, server };
