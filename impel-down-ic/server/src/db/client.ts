// DB client setup
// Follows docs/architecture.md

import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { config } from '../config/env';

let pool: Pool | null = null;
let db: any = null;

/** Get (or create) the singleton DB connection */
export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
    });
    
    // Test the connection
    pool.query('SELECT NOW()').catch(err => {
      console.error('Failed to connect to PostgreSQL', err);
    });
  }
  return pool;
}

/** Close the singleton DB connection */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
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
