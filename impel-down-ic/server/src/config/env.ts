// Environment config mapping
// Follows docs/architecture.md

import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from workspace root first, then monorepo root as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

export const config = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  DB_PATH: process.env.DB_PATH || './data/impeldown.db',
  TICK_INTERVAL_MS: parseInt(process.env.TICK_INTERVAL_MS || '5000', 10),
  BUSTER_CALL_LIMIT_MIN: parseInt(process.env.BUSTER_CALL_LIMIT_MIN || '15', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  DEMO_MODE_ENABLED: process.env.DEMO_MODE_ENABLED === 'true',
} as const;

export type Config = typeof config;
