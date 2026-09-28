// DB migrations runner
// Follows docs/architecture.md

import { Pool } from 'pg';
import { getDb } from './client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Run schema.sql against the given DB (or the default singleton) */
export async function migrate(database?: Pool): Promise<void> {
  const db = database ?? getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await db.query(schema);
  console.log('✅ Database schema applied');
}
