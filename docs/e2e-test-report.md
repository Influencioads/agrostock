# AgroTraders — Test & E2E Report

_Audit date: 2026-06-28._

## What exists now

### Unit tests (Vitest, `apps/api`) — 11 passing
| File | Coverage |
|------|----------|
| `test/guards.spec.ts` | `RolesGuard`: no-roles allow, role match, role mismatch deny, no-user deny |
| `test/register-roles.spec.ts` | Privilege-escalation regression: `PUBLIC_ROLES` excludes `admin`/`worker` |
| `test/auth.service.spec.ts` | `AuthService.refresh`: bad signature, wrong `typ`, missing account, happy path, no password-hash leak |

Run: `pnpm test` (via Turbo) or `pnpm --filter @agrotraders/api test`.

## What is NOT yet implemented (honest status)

**No web E2E (Playwright) suite was created or run in this pass**, and no
integration tests against a live database were executed. The marketplace/auction/
Safe-Deal/transport/loader flows described in the original brief were reviewed at the
source level (see the QA and security reports) but not driven end-to-end.

Reasons and prerequisites:
- A live stack (Postgres + Redis + MinIO via Docker, seeded DB) is required for
  integration/E2E and was not booted in this pass.
- Several flows in the brief assume backend features that **do not exist yet**
  (Socket.IO realtime, chat/community, OTP, user-facing KYC submission + uploads,
  payment gateway). Those cannot be E2E-tested until built — see
  [`known-limitations.md`](known-limitations.md).

## Recommended test roadmap (prioritised)
1. **Integration (API + test DB):** spin a disposable Postgres, seed, and use
   `@nestjs/testing` + supertest to cover: register rejects `admin`; login →
   refresh → me; product create→approve→list; order place→status authz; bid floor +
   closed-auction rejection; admin KYC decide.
2. **Playwright web E2E:** guest browse → login → buyer order; seller add product →
   admin approve → appears in market; language switch persists; logout.
3. **Concurrency test** for the auction serializable transaction (two parallel bids,
   exactly one wins).
4. **Mobile:** Expo smoke + navigation + role-based screen visibility.

A `test:integration` / `test:e2e` script split is stubbed in the root brief; wire
these once (1) and (2) land.
