# AgroTraders — Security Audit Report

_Audit date: 2026-06-28 · Scope: `apps/api`, `apps/web`, `apps/admin`, `packages/api-client`._

This report covers a source-level security review of the AgroTraders backend and web
clients, the issues found, and the fixes applied in this pass. It is **not** a
penetration test or a compliance certification — see "Remaining risks" and
[`known-limitations.md`](known-limitations.md).

## Summary

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| S1 | **Critical** | Privilege escalation: self-registration accepted `role:"admin"` | ✅ Fixed |
| S2 | High | Refresh-token flow incomplete (tokens issued, never usable) | ✅ Fixed |
| S3 | High | JWT accepted for deleted accounts; role taken from token claim, not DB | ✅ Fixed |
| S4 | High | Insecure default JWT secrets could ship to production | ✅ Fixed (fail-fast) |
| S5 | Medium | No auth-specific rate limiting (brute-force / enumeration) | ✅ Fixed |
| S6 | Medium | Unvalidated wallet top-up amount (negative / unbounded self-credit) | ✅ Fixed (+ documented as mock) |
| S7 | Medium | KYC decision endpoint accepted unvalidated status | ✅ Fixed |
| S8 | Medium | Auction bid placement race (two bids clear same floor) | ✅ Fixed (serializable tx) |
| S9 | Medium | Several logistics/loader endpoints accept unvalidated inline bodies | ⚠️ Partially mitigated |
| S10 | Low | Web/admin discarded refresh token → silent logout after 15 min | ✅ Fixed |
| S11 | Info | Wallet top-up is a self-credit mock (no payment gateway) | Documented |

---

## Findings & fixes

### S1 — Privilege escalation via self-registration (Critical)
**Root cause.** `RegisterDto.role` allowed the full `Role` enum including `admin`,
and `AuthService.register` wrote it straight to the DB. Anyone could
`POST /api/auth/register {"role":"admin"}` and obtain a full admin account.
**Fix.** Introduced `PUBLIC_ROLES = ['buyer','seller','transporter','loaderco']`
(`apps/api/src/auth/dto.ts`); `admin` and `worker` can no longer be self-assigned
(admins are seeded/back-office provisioned, workers are linked by a loader company).
**Test.** `apps/api/test/register-roles.spec.ts` asserts the invariant.

### S2 — Refresh-token flow incomplete (High)
**Root cause.** `login`/`register` returned a `refreshToken`, but there was no
`/auth/refresh` endpoint and no client method — the token was dead weight, so
sessions silently died at access-token expiry (15 min).
**Fix.** Added `AuthService.refresh()` + `POST /api/auth/refresh`
(`auth.service.ts`, `auth.controller.ts`), tagged refresh tokens with `typ:"refresh"`
and verify that claim, re-read the user from the DB on refresh, and added
`auth.refresh()` to the shared client. **Test.** `apps/api/test/auth.service.spec.ts`.

### S3 — Stale/forged identity from JWT claims (High)
**Root cause.** `JwtStrategy.validate` trusted the token payload verbatim, so a
deleted account kept a live session and authorization used the (possibly stale)
role claim rather than the current DB role.
**Fix.** `validate` now re-reads the account (`id/email/role`) and rejects if it no
longer exists; downstream RBAC uses the DB role. (Cost: one indexed lookup per
authenticated request.)

### S4 — Insecure default secrets reachable in production (High)
**Fix.** `assertProductionSecrets()` in `main.ts` refuses to boot when
`NODE_ENV=production` and `JWT_SECRET`/`JWT_REFRESH_SECRET` are missing, equal to
the `change-me-*` placeholders, or identical to each other. `.env.example`
documents generation.

### S5 — No auth-specific rate limiting (Medium)
**Root cause.** Only a global 120 req/min/IP throttle existed — generous for login.
**Fix.** `@Throttle` on `/auth/register` (10/min), `/auth/login` (30/min) and
`/auth/refresh` (30/min) to blunt brute-force and account/OTP enumeration. Login is
30/min (not 10) so the demo role-switcher — which re-authenticates on each switch —
isn't throttled during normal use; bcrypt cost-10 keeps brute-force cheap to defend.
Clients surface `429` distinctly ("too many attempts") instead of "invalid password".

### S6 — Unvalidated wallet top-up (Medium)
**Root cause.** `POST /me/wallet/topup` took an inline `{amount:number}` with no
validation — negatives and arbitrarily large self-credits were accepted.
**Fix.** `TopupDto` enforces `1 ≤ amount ≤ 1_000_000`. Note this endpoint is a
**mock** (no payment gateway); see S11.

### S7 — Unvalidated KYC decision (Medium)
**Fix.** `DecideKycDto` (`@IsIn(['verified','rejected'])`) replaces the raw inline
body on `PATCH /admin/kyc/:id`.

### S8 — Auction bid race condition (Medium)
**Root cause.** `place()` read the current high bid then inserted — two concurrent
bids could both pass the floor check.
**Fix.** Floor re-read + insert now run inside a `Serializable` transaction; a
losing concurrent bid surfaces a retryable 400.

### S9 — Unvalidated inline bodies on logistics/loader endpoints (Medium, partial)
Transport (`createRequest`, `quote`, `addVehicle`, `addRoute`…) and loader
(`addTeam`, `createJob`, `assign`…) controllers accept TypeScript inline object
types rather than DTO classes, so the global `ValidationPipe` does **not** validate
them (e.g. negative `priceCents`/`payCents`). Ownership/role guards are present and
correct, so this is an input-hardening gap, not an authz hole. **Status:** flagged;
converting these to DTO classes is the recommended next step (mechanical, low risk).

### S10 — Web/admin discarded refresh token (Low)
**Fix.** Both SPAs now persist `refreshToken`, and the shared client transparently
refreshes on a 401 (single-flight, no retry loop) and force-logs-out when refresh
is impossible. Logout clears the refresh token too.

## What was checked and found OK
- **SQL injection:** all queries use Prisma's parameterized client; search uses
  `contains` filters, not raw SQL. No `$queryRawUnsafe` usage.
- **IDOR:** ownership checks present on product/order/trip/vehicle/route/worker
  mutations and on order/auction reads (`order.one`, `setStatus`).
- **Password storage:** bcrypt (cost 10); min length raised to 8.
- **Secrets in repo:** `.env` is git-ignored; only placeholder values in
  `.env.example`. No real credentials committed.
- **Security headers:** `helmet()` enabled; CORS is env-allowlist driven.
- **Swagger:** disabled in production unless `SWAGGER=1`.

## Remaining risks (require follow-up / external review)
- No server-side session/refresh-token revocation store — a stolen refresh token is
  valid until expiry. Add a token-version column or a refresh-token table for true
  revocation and reuse detection.
- No `suspended` user state, so a misbehaving account can't be locked out short of
  deletion.
- S9 input validation gaps on logistics/loader bodies.
- Payments are mocked end-to-end (S11) — needs a real, webhook-idempotent gateway
  and ledger before any financial use.
- Infrastructure review (TLS termination, DB/Redis exposure, container user, secret
  management) is out of scope here — see `known-limitations.md`.
- No automated dependency-vulnerability gate yet; `pnpm audit` is wired but not in CI.
