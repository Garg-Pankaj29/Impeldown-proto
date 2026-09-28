# Rules (for humans and the Antigravity agent)

## Workflow Rules
1. **Read `/docs` first.** Never contradict PRD, requirements, or architecture. Ask if something is unclear.
2. **Build in steps.** Finish one step, run its verification, summarize, then **stop and wait for approval**.
3. Produce a short plan before coding each step; list files to be created/changed.
4. Never skip tests for domain logic (SLA, state machine, escalation).
5. Do not add libraries outside `tech-stack.md` without asking.

## Code Rules
- TypeScript `strict: true`; no `any` without a comment.
- Business logic lives in `domain/` and is pure (no Express, no DB imports) so it is unit-testable.
- All input validated with Zod at the route boundary.
- Server computes deadlines, remaining time, and escalation; the client never decides these.
- Use the injectable `clock`; never call `Date.now()` in domain code.
- DB writes that change state also write an `incident_events` row in the **same transaction**.
- No magic numbers: SLA minutes, tick interval, and Buster Call limit live in `config/`.
- Errors return `{ error: { code, message } }` with correct HTTP status.

## UI Rules
- Every incident card shows: severity/level, category, team, status, countdown, tier badge.
- Countdown color: green >50% left, amber 20–50%, red <20%, pulsing when overdue.
- Never rely on color alone (add icons/text). Respect `prefers-reduced-motion`.
- Sound is opt-in with a mute toggle; default muted until first user click.

## Naming & Git
- Files: camelCase (server), PascalCase (React components).
- Commits: `feat|fix|test|docs|chore(scope): message`, one commit per step at minimum.

## Definition of Done (per step)
Code runs, tests pass, lint clean, verification checklist ticked, short summary written.
