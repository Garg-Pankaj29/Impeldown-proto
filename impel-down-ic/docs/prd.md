# PRD — Impel Down Incident Command (PS-07)

**Product:** Smart Incident Management & Automatic Escalation System
**Theme:** One Piece — Impel Down Security Protocol & Marine Buster Call Escalation
**Domain:** DevOps & Incident Response

## 1. Vision
A real-time incident command center where every "security breach" in Impel Down (a stand-in for a production incident) is reported, assigned, timed against an SLA, and **automatically escalated** up the chain of command — Jailer Beasts → Deputy Warden Hannyabal → Chief Warden Magellan → **Golden Den Den Mushi Buster Call** — with zero manual action.

## 2. Problem
Teams lose incidents in chat threads, miss deadlines, and escalate late. Different incidents need different urgency, and overdue ones must surface automatically.

## 3. Users & Personas
| Persona | One Piece Role | Needs |
|---|---|---|
| Reporter | Guard / Jailer | Report a breach in <30 seconds |
| Responder | Jailer Beast / Blugori / Seastone team | See assigned incidents, time left, update status |
| Commander | Chief Warden Magellan | Watch all active/escalated incidents, reassign |
| Auditor | Marine HQ | Review full incident history and SLA compliance |

## 4. Goals
1. Report, categorize, and set severity for incidents.
2. Assign to a responsible team with an SLA deadline derived from severity.
3. Show a live countdown of remaining response time.
4. Detect overdue incidents and auto-escalate through a defined chain.
5. Keep an immutable history of every change.
6. Separate Active, Escalated, and Resolved views.

## 5. Non-Goals
Real paging (SMS/phone), multi-tenant SaaS, production-grade SSO.

## 6. Domain Mapping
**Severity = Impel Down Level**
| Level | Name | Severity | SLA (default) |
|---|---|---|---|
| 1 | Crimson Hell | Low | 15 min |
| 2 | Wild Beast Hell | Minor | 12 min |
| 3 | Starvation Hell | Medium | 10 min |
| 4 | Burning Hell | High | 7 min |
| 5 | Freezing Hell | Critical | 5 min |
| 6 | Eternal Hell | Catastrophic | 3 min |

**Escalation chain (auto)**
`Tier 0 Jailer Beasts` → `Tier 1 Deputy Warden Hannyabal` → `Tier 2 Chief Warden Magellan` → `Tier 3 BUSTER CALL (Fleet Admiral Akainu)`
Hard rule from lore: **any incident unresolved 15 minutes after creation triggers a Buster Call.**

**Categories:** Cell Riot, Poison Gas Alert, Prisoner Escape, Sea King Breach, Seastone Failure (Devil Fruit suppression), Gate Malfunction, Marine/Pirate Invasion.

**Teams:** Jailer Beasts, Blugori Squad, Hannyabal's Guard, Magellan's Command, Seastone Engineering, Buster Call Fleet.

## 7. Key User Stories
- As a Guard, I report an incident with title, category, level, description → it appears instantly on all dashboards.
- As a Responder, I see a countdown and can move status to In Progress → Resolved.
- As Magellan, I see escalated incidents and the Buster Call banner fire automatically.
- As an Auditor, I open any incident and see a timeline of every event.

## 8. Success Metrics
- Escalation fires within 5 s of deadline breach.
- 0 missed escalations under restart (state is DB-backed).
- Dashboard updates <1 s via realtime channel.
- Demo-ready in <2 min with Demo Mode.

## 9. Scope for Hackathon (MVP → Stretch)
**MVP:** all requirements in requirements.md.
**Stretch:** unique features in uniquefeatures.md.
