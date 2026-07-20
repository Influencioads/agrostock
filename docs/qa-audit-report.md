# AgroTraders — QA Audit Report

_Audit date: 2026-06-28._

End-to-end health audit of the AgroTraders monorepo (Turborepo + pnpm): web, admin,
api, mobile, and shared packages.

## Phase 1 — Project health (baseline → after fixes)

| Check | Before | After | Notes |
|-------|--------|-------|-------|
| `pnpm typecheck` | 6/10 real, 4 stubbed (`echo`) | **10/10 real, pass** | Enabled `api-client` + `i18n` typecheck (added tsconfigs) |
| `pnpm lint` | **Fake** — every script was `echo` | **Real ESLint 9, 0 errors** | Added flat config + `react-hooks`; 11 warnings remain (unused imports) |
| `pnpm test` | **No tests** (0 tasks) | **11 tests pass** | Vitest in `apps/api` (guards, register roles, refresh) |
| `pnpm build` | Pass (api/web/admin) | Pass | — |
| Prisma generate/validate | Pass | Pass | Schema is valid |

Node ≥20 / pnpm 9.15.9 confirmed. Turbo pipeline intact.

## Tooling repaired
- **ESLint:** `eslint.config.mjs` (flat config), `typescript-eslint` recommended +
  `react-hooks` rules for the three React/RN apps. CJS config files and RN lazy
  `require()` handled via scoped overrides. Wired every package's `lint` script to
  real `eslint .`; root `pnpm lint` runs the whole repo.
- **Tests:** Vitest config in `apps/api`, three real spec files, `test`/`test:watch`
  scripts. Root `pnpm test` runs them through Turbo.
- **Stubbed typechecks enabled:** `packages/api-client` and `packages/i18n` now run
  `tsc --noEmit` against real tsconfigs.
- **Scripts added** to root `package.json`: `lint:fix`, `format:check`, `test:unit`,
  `audit`, `docker:up`, `docker:down`, `db:reset`.

## Code fixes
See [`security-audit-report.md`](security-audit-report.md) for the auth/RBAC fixes
and [`api-contract-report.md`](api-contract-report.md) for the refresh-token contract
completion. Behavioural fixes in this pass:

| Area | Fix | Files |
|------|-----|-------|
| Auth | Added refresh endpoint + transparent client refresh-on-401 | `auth.*`, `packages/api-client`, web/admin `lib/api.ts` |
| Auth | Self-logout on unrecoverable 401 | web/admin `lib/api.ts` |
| Auctions | Serializable bid transaction (race fix) | `auctions.module.ts` |
| Mobile | Replaced ternary-as-statement with `if/else` in auth screens | `SignIn.tsx`, `SignUp.tsx` |

## Outstanding QA warnings (non-blocking)
11 ESLint warnings, all `no-unused-vars` (dead imports / unused state). Listed in
[`dead-code-cleanup.md`](dead-code-cleanup.md). The unused `active/setActive` state
in `apps/mobile/.../public/Browse.tsx` suggests a half-wired filter control worth a
follow-up.

## Verification commands run
```
pnpm install
pnpm --filter @agrotraders/api exec prisma generate
pnpm typecheck      # 10/10 pass
pnpm lint           # 0 errors, 11 warnings, exit 0
pnpm test           # 11 passed
pnpm build          # 3/3 pass
```

## Not covered in this pass (honest scope)
Runtime/E2E execution against a live stack (Docker + DB), Playwright web E2E, mobile
device testing, i18n overflow review, accessibility audit, and performance profiling
were **not executed**. See [`e2e-test-report.md`](e2e-test-report.md) and
[`known-limitations.md`](known-limitations.md).
