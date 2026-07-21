# AgroTraders — Global Agriculture Trading Platform

A multi-role agriculture trading marketplace: public marketplace, live auctions, Safe-Deal
escrow, logistics & loader workforce, role dashboards, admin command centre, and a unified
mobile app. Bilingual **EN / RU**. Green-first theme with a **mango/orange accent**.

> Built in phases from the UI/UX reference in [`design/`](design/) (`AgroTraders.dc.html`).
> See the full plan: `~/.claude/plans/plant-to-make-frontend-golden-anchor.md`.

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | Turborepo + pnpm workspaces |
| Web / Admin | Vite + React + TypeScript, Tailwind, React Router, TanStack Query |
| API | NestJS + TypeScript (REST + WebSocket) |
| Database | PostgreSQL + Prisma |
| Mobile | Expo (React Native) + TypeScript *(Phase 7)* |
| Infra | Docker Compose — Postgres, Redis, MinIO |

## Layout

```
apps/
  web/      Vite React SPA — public marketplace + role dashboards
  admin/    Vite React SPA — Admin Command Centre
  api/      NestJS + Prisma — REST + realtime
  mobile/   Expo RN (Phase 7)
packages/
  tokens/      design tokens (green + mango/orange)
  config/      Tailwind preset + tsconfig bases
  ui/          shared React primitives
  types/       shared domain types + zod DTOs
  api-client/  typed client + query hooks
  i18n/        EN/RU catalogs
infra/         docker-compose (postgres, redis, minio, adminer)
design/        the dc.html UI/UX reference
```

## Getting started (local dev)

```bash
pnpm install
cp .env.example .env

# one-time: seed the database (creates demo logins, password: password123)
pnpm docker:up
pnpm --filter @agrotraders/api prisma migrate deploy
pnpm --filter @agrotraders/api seed
```

### Run locally (reliable)

```bash
pnpm dev:up
```

`dev:up` brings infra up (idempotent), regenerates the Prisma client, then starts all
three apps together:

| App | URL |
|-----|-----|
| Web | http://localhost:5173 |
| Admin | http://localhost:5174 |
| API | http://localhost:3100/api · Swagger `/api/docs` |

Run individual apps with `pnpm dev:api` · `pnpm dev:web` · `pnpm dev:admin`.

> **Ports.** The API uses a **dedicated port `3100`** (not `3000`) so AgroTraders can run
> alongside other local projects without clashing. Web/admin read `VITE_API_URL` from the
> repo-root `.env` (vite `envDir`), and vite uses `strictPort` so a busy 5173/5174 fails
> loudly instead of silently moving. Infra also uses non-default host ports
> (Postgres 5544 · Redis 6380 · MinIO 9100/9101 · Adminer 8081).
>
> **Keep it running.** Start the servers in your own terminal — they persist there.
> (Agents should launch them via the preview MCP / `.claude/launch.json`; detached
> background shells get reaped.) Mobile: `pnpm --filter @agrotraders/mobile start`.

**Demo logins** (password `password123`): `buyer@agrotraders.org`, `seller@…`, `transporter@…`,
`loaderco@…`, `worker@…`, `admin@agrotraders.org`.

## Production (Docker)

Production migrations are now run explicitly during deploy, not on every API boot. Use
the `migrate` compose service before restarting the API so a failed migration cannot
create a restart loop.

Multi-stage images for `api` (NestJS), `web` and `admin`
(built static, served by nginx).

```bash
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d postgres redis minio
docker compose --env-file .env -f infra/docker-compose.prod.yml run --rm migrate
docker compose --env-file .env -f infra/docker-compose.prod.yml up -d --build api web admin
# api localhost:${HOST_API_PORT:-3100} · web localhost:${HOST_WEB_PORT:-8090} · admin localhost:${HOST_ADMIN_PORT:-8091}
```

Hardening: `helmet` security headers, rate limiting (`@nestjs/throttler`, 120 req/min/IP),
env-driven CORS (`CORS_ORIGINS`), Swagger disabled in production (set `SWAGGER=1` to enable),
strict validation pipe.

## Quality gates

Real tooling is wired across the workspace (previously these were `echo` stubs):

```bash
pnpm typecheck     # tsc --noEmit across all 10 packages
pnpm lint          # ESLint 9 (flat config) + react-hooks across the repo
pnpm test          # Vitest (apps/api) — guards, RBAC, refresh-token flow
pnpm build         # api (nest) + web/admin (vite)
pnpm format:check  # prettier --check
pnpm audit         # pnpm audit --prod
pnpm db:reset      # prisma migrate reset --force (dev/test DB)
pnpm docker:up / docker:down
```

## Audit reports

A full QA / security / contract audit lives in [`docs/`](docs/):

- [`qa-audit-report.md`](docs/qa-audit-report.md) — health checks, tooling repaired, fixes
- [`security-audit-report.md`](docs/security-audit-report.md) — vulnerabilities found & fixed
- [`api-contract-report.md`](docs/api-contract-report.md) — client/server contract review
- [`e2e-test-report.md`](docs/e2e-test-report.md) — test coverage & roadmap
- [`dead-code-cleanup.md`](docs/dead-code-cleanup.md) — cleanup log
- [`known-limitations.md`](docs/known-limitations.md) — **what is and isn't built** (read this)

> ⚠️ Several features implied by the product vision (realtime/Socket.IO, chat, OTP,
> KYC uploads, real payments/escrow) are **not yet implemented** server-side.
> See [`docs/known-limitations.md`](docs/known-limitations.md) before planning a release.

## CI/CD

`.github/workflows/ci.yml` runs on every push/PR: install → Prisma generate → `pnpm typecheck`
→ `pnpm build`, then (on `main`) builds the api/web/admin Docker images.
Recommended additions: `pnpm lint` and `pnpm test` as required gates.

## Build phases — all delivered ✅

0. Foundations — monorepo, tooling, theme tokens, Docker infra
1. Design system & shared packages (green + mango/orange accent)
2. Backend core — auth/JWT, RBAC, Prisma schema, seed
3. Public website — Website / Market / Product / Offices (EN/RU), live products
4. Admin Command Centre — users, KYC, products, orders, disputes, offices, audit
5. Role dashboards — Buyer / Seller / Transporter / Loader Co / Worker / Admin
6. Mobile app (Expo) — role switcher, home, explore (live), wallet
7. Backend wiring — web + admin + mobile on live PostgreSQL data
8. Hardening, Docker images, CI/CD
