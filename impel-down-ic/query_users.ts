import { getDb } from './server/src/db/client';
const db = getDb();
console.log(db.prepare('SELECT id, email, role, name FROM users').all());
