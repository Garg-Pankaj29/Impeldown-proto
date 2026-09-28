# ⚓ Impel Down — Incident Command

**Smart Incident Management & Automatic Escalation System**
*One Piece themed — Impel Down Security Protocol & Marine Buster Call Escalation*

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev          # starts server (:4000) + client (:5173)
```

## Monorepo

| Workspace | Port | Stack |
|-----------|------|-------|
| `server/` | 4000 | Node 20, Express, TypeScript, PostgreSQL |
| `client/` | 5173 | React 18, Vite, Tailwind CSS, TypeScript |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client in dev mode |
| `npm run build` | Build both workspaces |
| `npm run test` | Run all tests (Vitest) |
| `npm run lint` | Lint all workspaces |
| `npm run seed` | Seed the database with One Piece data |

## Theme

Severity levels map to Impel Down floors (Level 1 Crimson Hell → Level 6 Eternal Hell).
Unresolved incidents auto-escalate: **Jailer Beasts → Hannyabal → Magellan → Buster Call**.
