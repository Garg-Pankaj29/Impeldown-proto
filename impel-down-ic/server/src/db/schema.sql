-- DB schema — Impel Down Incident Command
-- Follows docs/architecture.md §Data Model

CREATE TABLE IF NOT EXISTS teams (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL UNIQUE,
  tier  INTEGER NOT NULL DEFAULT 0,
  emoji TEXT    NOT NULL DEFAULT '⚔️'
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL,
  name          TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sla_config (
  level   INTEGER PRIMARY KEY,
  minutes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  location         TEXT    NOT NULL DEFAULT 'Unknown',
  occurred_at      TEXT    NOT NULL,
  category         TEXT    NOT NULL,
  level            INTEGER NOT NULL CHECK (level BETWEEN 1 AND 6),
  status           TEXT    NOT NULL DEFAULT 'REPORTED',
  team_id          INTEGER REFERENCES teams(id),
  tier             INTEGER NOT NULL DEFAULT 0,
  reporter         TEXT    NOT NULL,
  created_at       TEXT    NOT NULL,
  deadline_at      TEXT    NOT NULL,
  resolved_at      TEXT,
  escalated_at     TEXT,
  buster_called_at TEXT,
  escalation_count INTEGER NOT NULL DEFAULT 0,
  version          INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS incident_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id),
  type        TEXT    NOT NULL,
  actor       TEXT    NOT NULL DEFAULT 'system',
  from_value  TEXT,
  to_value    TEXT,
  message     TEXT,
  at          TEXT    NOT NULL
);

-- Indexes per architecture.md
CREATE INDEX IF NOT EXISTS idx_incidents_status_deadline
  ON incidents(status, deadline_at);

CREATE INDEX IF NOT EXISTS idx_events_incident_at
  ON incident_events(incident_id, at);

CREATE TABLE IF NOT EXISTS attachments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id),
  filename    TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  size        INTEGER NOT NULL,
  mime_type   TEXT    NOT NULL,
  created_at  TEXT    NOT NULL
);
