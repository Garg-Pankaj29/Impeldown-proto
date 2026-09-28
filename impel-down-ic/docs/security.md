# Security

## Threat Model (hackathon scope)
Malicious/careless input, tampering with deadlines, spoofed escalation, XSS via incident text, abuse of admin/demo endpoints, DoS via spam.

## Controls
| Area | Control |
|---|---|
| Input | Zod validation, length limits, enum checks for category/level/status |
| Injection | Parameterized queries only (better-sqlite3 prepared statements) |
| XSS | React escaping; never `dangerouslySetInnerHTML`; strip control chars server-side |
| Headers | `helmet` defaults, strict CSP (self + local assets) |
| CORS | Explicit allow-list from env, no `*` |
| Rate limiting | `express-rate-limit` (e.g. 100 req/min/IP; stricter on POST) |
| AuthN/Z | Simple JWT or signed session; roles `guard` (create), `responder` (update/resolve own team), `warden` (all + admin) |
| Integrity | Clients cannot set `deadline_at`, `tier`, `created_at`, or `buster_called_at`; ignored/rejected |
| Concurrency | Optimistic `version` check prevents lost updates and double escalation |
| Audit | Append-only events with actor; no update/delete endpoints for history |
| Admin endpoints | Demo Mode endpoint requires `warden` and is disabled when `NODE_ENV=production` |
| Secrets | `.env` git-ignored, `.env.example` committed, no secrets in client bundle |
| Errors | No stack traces to clients; generic 500 message, details logged server-side |
| SSE | Auth-checked, heartbeat, connection cap per IP |
| Dependencies | `npm audit` before demo; pin versions |

## Privacy
No real personal data; seed uses fictional One Piece characters only.

## Checklist Before Submission
- [ ] Try creating an incident with `<script>` in the title
- [ ] Try PATCH with a forged `deadline_at`
- [ ] Try invalid status transitions
- [ ] Try hitting the demo endpoint as a non-warden
- [ ] Run `npm audit`
