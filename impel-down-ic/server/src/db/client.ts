// DB client setup
// Follows docs/architecture.md

import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config/env';

let db: Database.Database | null = null;

/** Get (or create) the singleton DB connection */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(process.cwd(), config.DB_PATH);
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/** Close the singleton DB connection */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Create an in-memory DB for tests */
export function createMemoryDb(): Database.Database {
  closeDb(); // Ensure any existing DB is closed
  const memDb = new Database(':memory:');
  memDb.pragma('journal_mode = WAL');
  memDb.pragma('foreign_keys = ON');
  db = memDb; // Inject into singleton
  return memDb;
}
