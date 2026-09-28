# Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast dev loop, typed |
| Styling | Tailwind CSS + CSS variables | Rapid theming (Seastone/Marine palette) |
| Animation | Framer Motion | Buster Call & card transitions |
| State/Data | TanStack Query + small Zustand store | Cache, refetch, realtime merge |
| Realtime | Server-Sent Events (SSE) | Simple, one-way push, no extra infra |
| Backend | Node.js 20 + Express + TypeScript | Familiar, quick |
| Validation | Zod | Shared schemas for request/response |
| Database | SQLite via better-sqlite3 | Zero setup, transactional, durable |
| Scheduler | In-process tick (setInterval 5 s) using DB-driven deadlines | Restart-safe, no cron dependency |
| Auth (optional) | Role header/JWT (jsonwebtoken) with roles: guard, responder, warden | Demo-level RBAC |
| Security libs | helmet, cors (allow-list), express-rate-limit | Baseline hardening |
| Testing | Vitest + Supertest | Unit + API tests |
| Tooling | ESLint, Prettier, npm workspaces (`/server`, `/client`) | Consistency |
| Audio/Assets | Local mp3/svg (no hotlinking) | Offline demo |

## Fonts & Look
Display: "Pirata One" or "Bangers" (self-hosted). Body: Inter. Palette: Seastone grey `#1b2430`, Marine blue `#1e3a8a`, Magma orange `#ff6b1a`, Buster gold `#f5c542`, Alert red `#e11d48`.

## Versions
Node ≥ 20, npm ≥ 10.
