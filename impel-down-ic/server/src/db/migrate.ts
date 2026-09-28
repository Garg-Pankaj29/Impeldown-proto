// DB migrations runner
// Follows docs/architecture.md

import type Database from 'better-sqlite3';
import { getDb } from './client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Run schema.sql against the given DB (or the default singleton) */
export function migrate(database?: Database.Database): void {
  const db = database ?? getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('✅ Database schema applied');
}
