# Requirements

## Functional (mapped 1:1 to PS-07)
| ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-01 | Create incident reports | Form validates title (3–120), description, category, level, reporter; returns 201 with incident |
| FR-02 | Category & severity | Category enum + severity = Impel Down Level 1–6 |
| FR-03 | Assign to teams | Assign on create or later; change recorded in history |
| FR-04 | Deadline from severity | `deadline = created_at + SLA[level]`, computed server-side only |
| FR-05 | Remaining response time | API returns `remainingSeconds`; UI countdown ticks locally, resyncs from server |
| FR-06 | Update status | `REPORTED → ASSIGNED → IN_PROGRESS → RESOLVED`; invalid transitions rejected (409) |
| FR-07 | Mark resolved | Sets `resolved_at`, stops the SLA clock, removes from Active |
| FR-08 | Detect overdue | Scheduler flags incidents where `now > deadline` and not resolved |
| FR-09 | Auto-escalate | Overdue → next tier, new deadline, reassign to tier team, history event; no manual action |
| FR-10 | Incident history | Append-only `incident_events`; visible as timeline |
| FR-11 | Separate views | Tabs: **Active**, **Escalated**, **Resolved** (+ All) |
| FR-12 | Buster Call | At Tier 3 or 15 min age, fire Buster Call event, banner, sound |

## Non-Functional
- **Reliability:** escalation state lives in DB; restart-safe and idempotent (no double-escalation).
- **Performance:** list endpoints <200 ms for 1,000 incidents; scheduler tick every 5 s.
- **Realtime:** SSE/WebSocket push for create/update/escalate.
- **Usability:** responsive (desktop + tablet), keyboard accessible, WCAG AA contrast.
- **Testability:** clock is injectable; Demo Mode accelerates time.
- **Security:** see security.md.
- **Portability:** runs with `npm install && npm run dev`, no external services.

## Data Requirements
Tables: `incidents`, `incident_events`, `teams`, `users` (optional), `sla_config`.
Times stored as UTC ISO-8601 / epoch ms.

## Constraints
Single-repo, no paid APIs, works offline, must ship a seed script with realistic One Piece data.
