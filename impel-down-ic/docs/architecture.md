# Architecture

## Overview
```
[React SPA] <--REST--> [Express API] <--> [SQLite]
     ^                     |    ^
     |---- SSE stream <----|    |
                           v    |
                    [Escalation Engine (tick 5s)]
```

## Monorepo Layout
```
impel-down-ic/
  docs/                # these .md files
  server/src/
    index.ts           # boot, middleware, routes, scheduler start
    config/            # sla.ts, tiers.ts, env.ts
    db/                # schema.sql, migrate.ts, seed.ts, client.ts
    domain/            # incident.ts (state machine), sla.ts, escalation.ts
    routes/            # incidents.ts, teams.ts, stream.ts, admin.ts
    services/          # incidentService.ts, eventBus.ts, clock.ts
    scheduler/         # escalationTicker.ts
    middleware/        # auth.ts, validate.ts, errors.ts, rateLimit.ts
    tests/
  client/src/
    app/               # router, providers
    features/incidents/  # list, card, form, detail, timeline
    features/buster/   # BusterCallOverlay, sound
    features/dashboard/  # Active/Escalated/Resolved tabs, tower map
    lib/               # api.ts, sse.ts, time.ts
    theme/             # tokens, backgrounds
```

## Data Model
```
teams(id, name, tier, emoji)
incidents(id, title, description, category, level, status, team_id,
          tier, reporter, created_at, deadline_at, resolved_at,
          escalated_at, buster_called_at, escalation_count, version)
incident_events(id, incident_id, type, actor, from_value, to_value,
                message, at)   -- append-only
sla_config(level, minutes)
```
Indexes: `(status, deadline_at)`, `(incident_id, at)`.

## State Machine
`REPORTED → ASSIGNED → IN_PROGRESS → RESOLVED`
Escalation is orthogonal: `tier` 0–3 plus `escalated` derived from `tier > 0`. `BUSTER_CALLED` when tier = 3. Resolving is allowed from any non-resolved state, including after Buster Call.

## Escalation Engine
Every 5 s, in one DB transaction:
1. `SELECT` incidents where `status != RESOLVED AND deadline_at <= now AND tier < 3`.
2. For each: `tier += 1`, set `team_id` to the tier's team, `deadline_at = now + tierGrace(level)`, `escalation_count++`, insert event `AUTO_ESCALATED`.
3. Also select incidents where `now - created_at >= 15 min` and not Buster-called → force tier 3, set `buster_called_at`, insert `BUSTER_CALL` event.
4. Emit events on the event bus → SSE.
Idempotency: guarded by the `version` column (`UPDATE ... WHERE id=? AND version=?`).

## API (REST, JSON)
| Method | Path | Purpose |
|---|---|---|
| POST | /api/incidents | Create |
| GET | /api/incidents?view=active\|escalated\|resolved | List (adds `remainingSeconds`) |
| GET | /api/incidents/:id | Detail + events |
| PATCH | /api/incidents/:id/status | Status change |
| PATCH | /api/incidents/:id/assign | Assign team |
| POST | /api/incidents/:id/resolve | Resolve |
| GET | /api/teams | Teams |
| GET | /api/stream | SSE |
| GET | /api/stats | Counts, SLA compliance |
| POST | /api/admin/demo/speed | Demo time multiplier (warden only) |

## Realtime
SSE events: `incident.created`, `incident.updated`, `incident.escalated`, `incident.buster_call`, `incident.resolved`. Client merges into TanStack cache and triggers UI/audio effects.

## Time Handling
All time from `clock.now()`; Demo Mode applies a multiplier. Server is the source of truth; client countdown = `deadline - (serverNow + drift)`.
