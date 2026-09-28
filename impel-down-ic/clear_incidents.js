const Database = require('better-sqlite3');
const db = new Database('./server/impel-down.db');
db.exec('DELETE FROM incident_events');
db.exec('DELETE FROM attachments');
db.exec('DELETE FROM incidents');
console.log("Cleared all incidents");
