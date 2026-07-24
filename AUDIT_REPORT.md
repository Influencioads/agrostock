# AgroTraders Full Platform Audit

**Audit date:** 2026-07-24
**Audited state:** dirty worktree on `codex/remediation-phase1` (23 remediation commits ahead of `main`, plus uncommitted wishlist feature across api/web/mobile). This supersedes the 2026-07-23 audit; a prior-finding status ledger is in §4.
**Audit mode:** read-only source review + safe toolchain runs (`typecheck`, `lint`, `test`, `build`, `pnpm audit`). No database mutation, no external paid calls, no deploys. This report is the only file written.
**Method:** 7 parallel specialist review passes (business logic, API first half, API second half, security, web UI, mobile UI, features/flows, admin+infra+performance), findings deduplicated and cross-verified against each other.

---

## 1. Executive summary

**Production audit: 52/100 — materially improved, still blocked for real-money launch.**

The remediation branch is real progress: every prior money-minting route is closed or kill-switched, escrow is ledger-backed with conditional claims and idempotency keys, JWT purposes are separated, refresh sessions rotate and revoke, CORS fails closed, demo accounts are boot-guarded, readiness/graceful-shutdown exist, and the whole toolchain is green (13/13 typecheck, lint clean, 274 tests passing, full build). That was the hard part, and it shows.

What blocks launch now is different in kind: **the payment lifecycle has holes at both ends**. No user-reachable path leads to `paid` (payment effectively does not exist — orders fulfill unpaid while dashboards count them as revenue), and for orders that *do* get paid (admin/dev paths), **escrow is never released on successful delivery and never refunded on party-driven cancellation** — buyer money strands in a `held` state with no endpoint able to recover it. A parallel hire-escrow system (transport/loaders/workers) is worse: the *payee* self-attests completion and releases the payer's funds to themselves, with race-unsafe, unkeyed refunds. Alongside that sit a handful of privacy IDORs (any signed-in user can read any private chat message via the translation endpoint; hire requests harvest private contact details), memory-DoS-able uploads, and a mobile app where an API failure looks identical to "you have no orders" on ~85% of screens.

### Health scores

| Area | Score | Prior | Verdict |
|---|---:|---:|---|
| Feature completeness | 5/10 | 4/10 | Wishlist landed end-to-end; still no payment, cart, addresses, account deletion |
| Commerce/business logic | 4/10 | 1/10 | Core wallet/order paths now atomic + idempotent; escrow settlement holes and the hire-escrow subsystem undo it |
| Backend/API | 6/10 | 4/10 | Strong guard/validation baseline; IDORs in community/hires, unvalidated raw bodies, unbounded lists |
| Web storefront | 5/10 | 4/10 | Real error states arrived but on only 5 surfaces; fabricated homepage content persists; dead CTAs |
| Mobile app | 4/10 | 3/10 | Deep links + pagination landed; systemic false-empty on errors, stale caches, orphaned checkout |
| Admin panel | 6/10 | 5/10 | Granular API RBAC solid; client routes ungated, financial one-click actions unconfirmed |
| Security | 6/10 | 3/10 | Prior blockers verified fixed; residuals are medium (trust proxy, CSP, dev-secret fallbacks, 15 high dep CVEs) |
| Reliability/operations | 4/10 | 3/10 | Readiness + graceful shutdown exist but nothing consumes the healthcheck; still no backups or observability |
| Testing/CI | 6/10 | 4/10 | 274 tests green incl. financial invariants; CI installs unfrozen lockfile, no migration-drift or e2e gate |
| Performance/SEO/a11y | 4/10 | 4/10 | Catalog paginated + indexed; 1.7 MB main web chunk, full-table public directories, single-size images, SPA-only SEO |

### Top 10 issues

1. 🔴 **Delivered orders never release escrow** — `EscrowService.settle` is called only from admin dispute resolution; normal delivery strands the buyer's held funds forever (`apps/api/src/orders/orders.module.ts:705-716`). [BL-01]
2. 🔴 **`dispute → cancelled` never refunds escrow** — parties can terminate a paid order with the buyer's money stuck in a `held` hold no endpoint can recover (`orders.module.ts:136-139,527-538`). [BL-02]
3. 🔴 **Payment does not exist for users** — no transition edge reaches `paid`; "Pay escrow" buttons on web+mobile are dead code; fulfilment and revenue analytics proceed on unpaid orders (`orders.module.ts:101-141`; `me.module.ts:110`). [BL-03]
4. 🔴 **Mobile shows false "empty" business data on API failure** — only 9 of 71 fetching files handle `isError`; an outage reads as "you have no orders / you're all caught up" (systemic, e.g. `apps/mobile/src/screens/seller/Orders.tsx:176-179`). [MOB-01]
5. 🟠 **Hire escrow is releasable by its own payee and double-refundable** — transporter/loaderco/worker self-attest completion to collect held budgets; refund/release paths are race-unsafe and unkeyed (`transport.module.ts:211-229`; `hires.module.ts:355-362`). [BL-04, BL-05]
6. 🟠 **IDOR + privacy leaks** — any authed user reads any private DM via `GET /community/messages/:id/translation`; zero-cost hire requests return targets' private phone/email; public auction payloads leak the high bidder's real id (`community.controller.ts:187-192`; `hires.module.ts:62-77`; `auctions.module.ts:84-97`). [API-01/02/05]
7. 🟠 **Uploads buffer unbounded bodies in memory** — no multer `limits` anywhere; the 10 MB check runs after full buffering; presigned S3 PUTs don't bind size (`products.module.ts:483`; `attachments.service.ts:117-122`). [API-03/06]
8. 🟠 **Admin console routes are ungated client-side and overrides skip side effects** — any admin can open `/payments` etc. without the permission; the API-side order-status override skips escrow, stock, and notifications (`apps/admin/src/App.tsx:44-72`; `admin.module.ts:565-578`). [ADM-01, BL-07]
9. 🟠 **Order notifications go nowhere** — created without `linkUrl`, the web `/orders/:id` redirect drops the id (contradicting its own F05 comment), and mobile can't route order links; buyers get no order-placed confirmation at all (`orders.module.ts:197-201`; `apps/web/src/App.tsx:98-100`). [FLOW-01/02]
10. 🟠 **No backups, no observability, healthcheck unwired** — one manual 4-day-old dump; no Sentry/metrics/log rotation; `/health/ready` exists but prod compose defines no healthchecks (`infra/docker-compose.prod.yml:50-132`). [OPS-01/02/03]

### Verdict

Not production-ready for real money or real customer trust — but for reasons that are now enumerable and mostly small-to-medium fixes, rather than the systemic "demo revenue boundary" of the prior audit. The escrow settlement holes (BL-01/02), the hire-escrow payee-release path (BL-04/05), and the privacy IDORs (API-01/02) are the hard blockers; the mobile error-state sweep and notification deep-linking are the largest UX debts. If the business intends to launch *without* on-platform payment (settlement off-platform), that is currently the de-facto behavior — but then dashboards must stop labeling unpaid GMV as revenue, and the dead payment UI must be removed.

---

## 2. Architecture overview (Phase 0)

**Monorepo:** pnpm 9 + turbo. Node ≥ 20. TypeScript everywhere; ESLint 9 flat config; vitest.

| Workspace | Stack | Notes |
|---|---|---|
| `apps/api` | NestJS 10 + Prisma + PostgreSQL + Redis (Socket.IO adapter) | 36 modules, ~341 route handlers, mostly single-file `*.module.ts` (controller+service co-located). Global: `/api` prefix, helmet, fail-closed CORS allowlist, `ValidationPipe({whitelist, transform})`, 120 req/min throttler, i18n exception filter (no stack leakage), shutdown hooks. Two WS gateways (`/support`, `/community`) sharing JWT verification (`ws-auth.service.ts`). |
| `apps/web` | Vite + React SPA (react-router) | **Not Next.js — no SSR/hydration.** Public storefront + role consoles under `/console/:section`. Data via shared `packages/api-client` (axios, single-flight refresh interceptor, HttpOnly-cookie refresh mode). |
| `apps/admin` | Vite + React SPA | Subdomain-only admin (admin.agrotraders.org); 29 routes; granular permission model mirrored from API. |
| `apps/mobile` | Expo SDK 54 / RN 0.81 | React Navigation + React Query; per-role tab navigators; section-registry pattern; deep linking (`navigation/linking.ts`, new) + FCM push routing. |
| `packages/*` | api-client, i18n (11 locales), types, ui, tokens, geo, config | i18n: web/admin lazy-load namespaces; mobile statically bundles all 4.8 MB of locale JSON. |
| `infra/` | docker-compose (dev + prod), 3 Dockerfiles, nginx.conf | Prod: all services loopback-bound behind an out-of-repo host proxy; `${VAR:?}` required env; web/admin builds hard-fail on localhost API URLs. |
| CI | `.github/workflows/ci.yml` | Typecheck → Lint → Test → Build gates (none soft-failed); Docker build only on push to main. |

**Domain model** (2,220-line `schema.prisma`): multi-role users (buyer/seller/transporter/loaderco/worker/admin) with granular `AdminPermission`s; products with 5-level taxonomy (14k nodes), per-subcategory attributes, `stockQty/reservedQty`; orders with an explicit party-scoped transition table + `OrderEvent` timeline + dispatch/pickup/delivery OTPs; auctions + reverse-auction buyer bids; wallet with append-only `WalletTx` ledger, `EscrowHold` per order, `PayoutRequest`; a *separate* hire-escrow flow on `HireRequest` for transport/loader/worker services; invoices; KYC with private file store; reviews (two-way, verified-completion-gated); community (groups/DMs/requirements) + support tickets, both with WS gateways; notifications fanned out to in-app + FCM + SMTP via a `NOTIFICATION_CREATED` event; CMS, branding, email templates, FX display rates, geo.

**Money flow as implemented:** order placed (`processing`, server-priced, atomic stock reservation on the Buy-now path) → *optionally* `paid` (admin-only, kill-switched by `legacy-finance.guard.ts` in production; debits buyer wallet into `EscrowHold`) → packed → dispatched (OTP) → in_transit (pickup OTP) → delivered (delivery OTP, consumes reservation). Escrow settlement exists only inside admin dispute resolution. Wallet top-up is an explicitly mocked credit (dev-gated). **There is no payment gateway anywhere in the codebase.** FX is display-only; all money columns are integer USD cents (no float money math — verified).

**Half-built / dead surfaces found:** `POST /orders/enquiry` has zero client callers; mobile `Checkout` screen is reachable only by deep link; `stockQty` has no write surface in any UI or DTO; the server-side order `idempotencyKey` is sent by no client; web `SystemPage` is an intentional unlinked design reference; root-level `tatus` (2 MB mispiped git output) and `tmp.mjs` are junk.

---

## 3. Toolchain verification (run this session)

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ 13/13 tasks pass |
| `pnpm lint` | ✅ clean (exit 0) |
| `pnpm test` | ✅ 274 tests green — api 210 (38 files, incl. wallet invariants, escrow, order lifecycle, token purpose, CORS, financial containment), web 8, mobile 26 |
| `pnpm build` | ✅ all workspaces build. ⚠️ web chunks: `index-*.js` **1,680 kB** and `Globe3D-*.js` **1,916 kB** (pre-gzip) — see PERF-05 |
| `pnpm audit --prod` | ⚠️ **39 vulnerabilities: 15 high, 22 moderate, 2 low.** High: nodemailer <8.0.4 (raw-option file read/SSRF), multer (DoS via incomplete cleanup), lodash (`_.template` code injection), js-yaml, fast-xml-parser, fast-uri, postcss, brace-expansion. See SEC-05 |

This is a dramatic reversal from the prior audit's red suite, and the API tests meaningfully cover the financial invariants added by the remediation.

---

## 4. Prior-audit remediation status (verified against current code)

| Prior blocker (2026-07-23) | Status | Evidence |
|---|---|---|
| Buyer status patch marks `paid` without charging (F06) | **Fixed** | No transition edge into `paid`; when reached (admin), `escrow.hold` debits first; whole path kill-switched (`orders.module.ts:101-141,517-525`) |
| Any user can mint wallet funds via mock top-up (F07) | **Contained** | Top-up still gateway-less but 503s unless `NODE_ENV!=='production' && ENABLE_LEGACY_FINANCIAL_WRITES=1` (`legacy-finance.guard.ts:9-21`) |
| Dispute settlement mints unbacked funds / double-settles (F08) | **Mostly fixed** | Conditional claim + hold-backed settle + idempotency keys; residual: non-atomic claim-vs-settle (BL-10), dev-gated unbacked fallback |
| Wallet/payout race-unsafe (F09) | **Fixed (core)** | Conditional `updateMany` debit + claim-before-debit payouts; **not** applied to hire escrow (BL-05) |
| No stock/reservation model (F10) | **Partial** | Atomic raw-SQL reservation on Buy-now; enquiry/bid-award paths don't reserve (BL-08); no UI can set stock (FLOW-04) |
| No order idempotency (F11) | **Partial** | Unique `idempotencyKey` supported server-side; no client sends it (FLOW-03); concurrent-retry race errors (BL-11) |
| Prod compose → localhost browser bundles (F44) | **Fixed** | `VITE_API_URL: ${VITE_API_URL:?}` + Dockerfiles hard-fail on local/non-HTTPS URLs |
| Download JWTs usable as Bearer tokens (F16) | **Fixed** | `typ==='access'` enforced; purpose-derived secrets for kyc/invoice/statement tokens; WS enforces too |
| Docker context includes backups/logs (F40) | **Fixed** | `.dockerignore` denies backups/dumps/tars/env/keys; `backups/` untracked |
| Red tests/lint, CI gaps (F48) | **Fixed (suite) / Partial (gates)** | Suite green; CI still `--no-frozen-lockfile`, no migration-drift/e2e gate (OPS-04) |
| Demo credentials (F43) | **Largely fixed** | Seed still creates them, but production boot hard-fails if any seeded email exists in DB; needs live-DB verification |
| Refresh tokens in localStorage / unrevocable (F38/F39) | **Fixed** | HttpOnly `agro_refresh` cookie; DB-backed rotating session families with replay detection + logout-all |
| CORS fails open; WS ignores allowlist (F22) | **Fixed** | Shared fail-closed allowlist for HTTP + both gateways |
| Android cleartext (F42) | **Fixed** | `usesCleartextTraffic="false"`; config flag only outside production profile |
| Support RBAC bypass via WS (F17) | **Fixed** | `isSupportStaff` gating on agent rooms; access-token-only WS auth |
| Readiness/shutdown (F45/F49) | **Fixed in code** | `/health/ready` + shutdown hooks; not consumed by compose (OPS-03) |
| Backups/observability (F46/F49) | **Unfixed** | OPS-01/02 |
| F03/F05/F29/F30/F31 client fixes | **Mixed** | Cancel/dispute reachable ✅; Sponsored labels ✅; mobile pagination ✅ (but unvirtualized, MOB-04); F05 deep links **incomplete** (FLOW-01); F29 **incomplete** — fabricated homepage sections remain (WEB-01) |

---

## 5. Findings — Phase 2: Business logic (money, stock, state machines)

### [🔴 CRITICAL] BL-01 — Delivered orders never release escrow; sellers can never be paid
- Location: `apps/api/src/orders/orders.module.ts:705-716` (verifyDelivery), `apps/api/src/wallet/wallet.service.ts:160-184` (settle), `apps/api/src/admin/admin.module.ts:634` (sole caller)
- Evidence:
```ts
await this.prisma.$transaction(async (tx) => {
  await tx.order.update({ where: { id }, data: { status: 'delivered', deliveryVerifiedAt: new Date() } });
  ...
});
// no escrow.settle anywhere on this path; `delivered` is terminal (ORDER_TRANSITIONS.delivered: [])
```
- Impact: for any order that reached `paid` (escrow held), the buyer's wallet was debited into `EscrowHold` — and on a *successful* delivery the money is never credited to the seller, and never can be: the only settlement call site requires `status === 'dispute'`, which a delivered (terminal) order can't enter. Funds are conserved but permanently stranded; the only workaround is the kill-switched admin manual wallet adjustment.
- Fix: on `delivery_verified` (and on `cancelled`, see BL-02) call `EscrowService.settle` with full release/refund inside the transition, keyed idempotently (`escrow:release:${orderId}` keys already exist).
- Effort: S

### [🔴 CRITICAL] BL-02 — `dispute → cancelled` by the parties strands the buyer's escrow
- Location: `apps/api/src/orders/orders.module.ts:136-139` (transition), `:527-538` (setStatus side effects)
- Evidence:
```ts
dispute: [ { to: 'processing', by: ['seller'] }, { to: 'cancelled', by: ['buyer', 'seller'] } ],
...
if (status === 'cancelled') await this.settleReservation(order, false); // stock only — no escrow refund
```
- Impact: a paid order can go `paid → dispute → cancelled` driven entirely by buyer/seller. The order terminates, `EscrowHold` stays `held`, the buyer is never refunded — and once the order has left `dispute`, `resolveDispute` rejects, so even the admin path can't recover it. In production `resolveDispute` is 503-gated anyway.
- Fix: in `setStatus` (and admin `setOrderStatus`), when target is `cancelled` and a `held` hold exists, `settle({ refundCents: hold.amountCents })`.
- Effort: S

### [🔴 CRITICAL] BL-03 — Payment doesn't exist for users; fulfilment and revenue accounting proceed unpaid
- Location: `apps/api/src/orders/orders.module.ts:101-141` (no edge into `paid`), `apps/api/src/me/me.module.ts:42-53,110,213-217`, `apps/api/src/common/legacy-finance.guard.ts:9-21`
- Evidence:
```ts
export const EARNED_STATUSES = ['paid', 'packed', 'dispatched', 'shipped', 'in_transit', 'delivered'] as const;
```
- Impact: there is no payment gateway anywhere (grep: none); wallet top-up is an explicitly mocked credit gated to dev; no buyer-drivable transition reaches `paid` — yet `processing → … → delivered` runs end-to-end with zero funds movement, the "Pay escrow" buttons rendered by web (`BuyerOrders.tsx:105`) and mobile (`buyer/Orders.tsx:109`) can never appear (dead code), and `revenueSeries` / admin `reports` count `packed`+ orders as transacted money whether or not anything was paid. This is the intended containment state — but it must be treated as *payment does not exist yet*, and metrics/UI must stop implying otherwise.
- Fix: real gateway + webhook-driven `paid` transition (L); until then relabel unpaid orders as order volume, not revenue, and hide the dead payment UI (S).
- Effort: L / S

### [🟠 HIGH] BL-04 — Hire escrow: the payee self-attests completion and releases the payer's money to themselves
- Location: `apps/api/src/transport/transport.module.ts:211-229` (transporter marks own trip delivered), `apps/api/src/loaders/loaders.module.ts:447-461` (loaderco job completed), `:515-531` (worker checkout)
- Evidence:
```ts
if (status === 'delivered' && trip.requestId) {
  const hire = await tx.hireRequest.findFirst({ where: { transportRequestId: trip.requestId, escrowState: 'held', ... } });
  if (hire?.budgetCents) await this.wallets.credit(hire.targetUserId, hire.budgetCents, 'escrow_release', 'Delivery completed — payout', tx);
```
- Impact: the beneficiary of the payment is the sole authority for the event that pays them — no OTP (trips *have* an unused `otp` field minted at accept), no requester confirmation, no state-machine constraint (any status any time, and the trip-status body is unvalidated — API-08). A dishonest provider accepts a hire and collects the full held budget minutes later. None of these paths sit behind the legacy-finance kill switch, and the requester's debit at `hires.create` is also ungated — this is live wherever wallets carry balance.
- Fix: require the requester's confirmation or the existing OTP machinery before `delivered`/`completed` release; at minimum gate these releases behind the same kill switch.
- Effort: M

### [🟠 HIGH] BL-05 — Hire escrow refund/release are race-unsafe and unkeyed — double credits possible
- Location: `apps/api/src/hires/hires.module.ts:355-362` (refundEscrow), `apps/api/src/loaders/loaders.module.ts:162-176` (releaseJobEscrow), `transport.module.ts:211-229`
- Evidence:
```ts
if (hire.escrowState !== 'held' || !hire.budgetCents) return;      // check on a stale pre-tx read
await this.prisma.$transaction(async (tx) => {
  await this.wallets.credit(hire.requesterId, hire.budgetCents!, 'refund', 'Hire budget refunded', tx); // no idempotencyKey
  await tx.hireRequest.update({ where: { id: hire.id }, data: { escrowState: 'refunded' } });           // unconditional
```
- Impact: unlike the order-escrow path (conditional `updateMany` claim + unique idempotency key), concurrent `decline` (target) + `cancel` (requester), or two concurrent `delivered`/`completed` calls, can both pass the stale check and both credit — minting money. `hires.create` double-tap also creates two hires with two escrow debits (no key).
- Fix: claim with `updateMany({ where: { id, escrowState: 'held' } })` and bail on count 0; add `hire:refund:${id}` / `hire:release:${id}` keys to the credits.
- Effort: S

### [🟠 HIGH] BL-06 — Invoice `taxCents` bypasses the "cannot bill more than agreed" cap (F14 regression)
- Location: `apps/api/src/invoices/invoices.module.ts:281-300`
- Evidence:
```ts
if (subject.authoritativeCents != null && subtotalCents > subject.authoritativeCents) {
  throw new BadRequestException('Invoice total cannot exceed the agreed amount for this order.');
}
const taxCents = dto.taxCents ?? 0;   // issuer-supplied, only @Min(0)
totalCents: subtotalCents + taxCents,
```
- Impact: the subtotal is capped at the agreed order/quote/job amount, but the issuer supplies unbounded `taxCents` — subtotal $100 + "tax" $1,000,000 produces a legitimate-looking invoice, emailed to the recipient, exceeding the agreed amount. Exactly what F14 aimed to prevent.
- Fix: cap `subtotalCents + taxCents` against `authoritativeCents` (or bound tax to a rate).
- Effort: S

### [🟡 MEDIUM] BL-07 — Admin order-status override skips every money/stock/notification side effect
- Location: `apps/api/src/admin/admin.module.ts:565-578`
- Evidence: `const o = await tx.order.update({ where: { id }, data: { status } });` — no `escrow.hold`, no `settleReservation`, no party notification.
- Impact: admin `paid` creates no hold (a later dispute takes the unbacked-credit fallback in dev); admin `cancelled` never releases `reservedQty` (permanent phantom reservation → listing reads out of stock); admin `delivered` neither consumes stock nor settles escrow; parties are never notified.
- Fix: route the override through `OrdersService`'s side-effect helpers keyed on target status. Effort: S

### [🟡 MEDIUM] BL-08 — Stock is reserved only on the Buy-now path; enquiry/quote and bid-award orders oversell
- Location: `apps/api/src/orders/orders.module.ts:259-294` (enquiry — no reservation) vs `:352-360` (place — atomic reserve); `apps/api/src/buyer-bids/buyer-bids.module.ts:272-289` (award — no reservation)
- Impact: two of the three order-creation paths ignore `stockQty - reservedQty`; delivery-time capture clamps at 0 and silently absorbs the inconsistency. The F10 oversell fix covers `place()` only.
- Fix: reserve when an enquiry becomes `processing` and inside `award()`'s transaction with the same guarded UPDATE. Effort: M

### [🟡 MEDIUM] BL-09 — Auctions: reserve ignored at close, no scheduled closer, no settlement, buy-now bypass
- Location: `apps/api/src/auctions/auctions.module.ts:358-403` (close), `apps/api/src/products/sellable.ts:43-45`
- Impact: (a) `close()` declares the top bid winner even when `reserveCents` isn't met; (b) no cron/scheduler exists, so a lot whose `auctionEndsAt` lapses is never closed — no winner, no notification; (c) winning mints no order/escrow — bids are unfunded promises; (d) `assertProductSellable` only rejects *ended* auctions, so a live auction lot with a `priceCents` can be bought outright via `POST /orders`, sidestepping the bidding.
- Fix: enforce `reserveMet`; block `place()` on `isAuction`; add a scheduled closer; mint an order for the winner. Effort: M

### [🟡 MEDIUM] BL-10 — `resolveDispute` is non-atomic across the status claim and the money movement
- Location: `apps/api/src/admin/admin.module.ts:626-650`
- Impact: the order leaves `dispute` before `settle` runs; if settle throws (or the process dies), the order is terminal with the hold stuck `held` and no endpoint can ever settle it. The no-hold fallback also credits refund/release out of thin air (dev-gated).
- Fix: wrap claim + settle in one transaction, or claim the hold first and flip the order last. Effort: S

### [🟡 MEDIUM] BL-11 — Concurrent `place()` with the same idempotency key errors instead of returning the original; reservation can leak
- Location: `apps/api/src/orders/orders.module.ts:331-392`
- Impact: the pre-check is check-then-act — two simultaneous retries both pass, both reserve stock; the loser hits the unique key, releases its reservation and rethrows — the retry idempotency was meant to absorb fails. A crash between reserve and create (compensating decrement swallowed by `.catch(() => {})`) permanently strands `reservedQty`.
- Fix: on P2002 for `idempotencyKey`, re-fetch and return the prior order; move the reservation into the same transaction. Effort: S

### [🟡 MEDIUM] BL-12 — Payout requests: over-commit race; `paid`-before-debit crash window
- Location: `apps/api/src/me/me.module.ts:224-246` (withdraw), `apps/api/src/admin/admin.module.ts:1006-1022` (decide)
- Impact: the available-balance check is read-then-create, so two concurrent withdrawals both pass and over-commit pending payouts (the guarded debit at approval prevents actual loss, but admins see approvable requests that will fail). In `decidePayout` the request flips to `paid` *before* the debit; a crash between leaves a `paid` payout with money still in the wallet (catch-based rollback only covers a thrown debit).
- Fix: recheck inside a transaction at request time; debit and claim in one transaction at approval. Effort: S/M

### [🟡 MEDIUM] BL-13 — Display money rounded to whole dollars; admin chart parses strings while GMV uses cents
- Location: `apps/api/src/orders/orders.module.ts:35` (`$${Math.round(cents / 100)...}`), `apps/api/src/admin/admin.module.ts:846-854` (volumeSeries parses `amount` strings)
- Impact: `Order.amount` loses cents (150¢ renders "$2"); `volumeSeries` ignores `amountCents` and sums rounded strings while `reports()` prefers cents — the same admin page can show internally inconsistent totals.
- Fix: format with 2 decimals; aggregate from `amountCents` everywhere. Effort: S

### [🟡 MEDIUM] BL-14 — `WalletService.debit` on the root client can decrement a balance without a ledger row
- Location: `apps/api/src/wallet/wallet.service.ts:93-110`; `ensure()` at `:32-36`
- Impact: when called without a transaction client, a non-P2002 failure in `writeTx` after the conditional decrement leaves balance moved with no `WalletTx` row and nothing to roll back. Escrow paths pass a tx client (safe); direct-client callers (admin payout approval) carry the risk. `ensure()` is also find-then-create — two first-ever concurrent wallet ops race to an uncaught P2002 → 500.
- Fix: `debit` opens its own transaction when handed the root client; catch P2002 in `ensure` and re-read. Effort: S

### [🔵 LOW] BL-15 — Assorted business-logic debt
- **No self-purchase guard**: a buyer+seller account can order its own listing (`orders.module.ts:331-402`); combined with self-attested hire completion this enables ledger churn.
- **Insecure RNG where it matters operationally**: `hires.module.ts:79,259,288` and `loaders.module.ts:47` mint 4-digit `Math.random()` OTPs and weak references while the codebase's own `secureOtp/secureReference` (F36 fix) sits unused there; `loaders` `ref()` has a 900-value space against a `@unique` column — collisions 500 job creation from ~35 jobs on (see API-04).
- **Timezone mixing**: `me.module.ts:123-142,263-268` bucket by server-local time while `admin.module.ts:41-47` treats bare dates as UTC — day/month boundaries shift per deployment TZ.
- **No idempotency** on `topup` (double-tap = double credit, dev-gated) and `hires.create` (two debits).
- **Invoice `setStatus`** allows unlimited issuer-driven `paid`↔`void` flips with no recipient involvement (`invoices.module.ts:347-369`).
- **Zero-amount quotes**: `RespondDto` accepts `amountCents: 0` independent of `unitPriceCents × qty`; a 0-amount order skips escrow hold entirely (`orders.module.ts:52-58,517`).
- **`escrowHeldCents` KPI** derives from orders `status='paid'` instead of the `EscrowHold` ledger — understates held funds once orders advance (`admin.module.ts:914-924`).

---

## 6. Findings — Phase 3: API

Global setup is solid (see §2): whitelist ValidationPipe, fail-closed CORS shared with WS, helmet, throttler, no-leak exception filter, purpose-scoped download tokens, production boot asserts. The findings below are the exceptions to that baseline.

### [🟠 HIGH] API-01 — IDOR: any authenticated user can read any private message via the translation endpoint
- Location: `apps/api/src/community/community.controller.ts:187-192`, `community.service.ts:585-593`
- Evidence:
```ts
@Get('messages/:id/translation')
messageTranslation(@Param('id') id: string, @Locale() locale: Lang) {
  return this.community.translateMessage(id, locale);   // no membership/thread-party check
```
- Impact: returns `{ body, originalBody, sourceLang }` for DMs and private-group messages to any signed-in user holding a message id (ids circulate in socket payloads, notifications, replies). Every other read path enforces access; this one bypasses all of it.
- Fix: resolve the message's group/thread and apply the same access checks as `getGroupMessages` / DM party membership. Effort: S

### [🟠 HIGH] API-02 — Private contact details harvested via zero-cost hire requests
- Location: `apps/api/src/hires/hires.module.ts:62-77` (PARTY_SELECT includes `email`, `profile.phone/whatsapp/contactEmail`), returned from `create()` at `:173-204`
- Impact: the directory module's privacy rule ("contact is NEVER selected — admin-only", `directory.module.ts:11-16`) is bypassed: any authenticated user can POST /hires with `budgetCents` omitted (no wallet needed) targeting any provider and immediately receive the target's private phone/whatsapp/emails — before any acceptance. Scriptable mass scraping of the provider directory.
- Fix: masked hints while `pending`; reveal contact only after `accepted`. Effort: M

### [🟠 HIGH] API-03 — No multer size limits anywhere: full request bodies buffer in memory before the size check
- Location: every `FileInterceptor`/`FilesInterceptor` (`products.module.ts:483,495`, `me.module.ts:457`, `transport.module.ts:407`, `branding.module.ts:120`, `buyer-bids.module.ts:570`, `drivers.module.ts:121`, `kyc.module.ts:209`); check only afterwards at `uploads/uploads.service.ts:62-64`
- Impact: repo-wide grep confirms no `limits` option exists. Multer's default memory storage accepts arbitrarily large bodies; the 10 MB (`UPLOAD_MAX_MB`) check runs after the whole file is in RAM. A few concurrent multi-GB uploads from any authenticated user (KYC upload needs only a JWT) exhaust API memory.
- Fix: `{ limits: { fileSize, files } }` on every interceptor or a global MulterModule config. Effort: S

### [🟠 HIGH] API-04 — LoaderJob creation: 900-value unique reference space, open to every role, arbitrary `orderId`
- Location: `apps/api/src/loaders/loaders.module.ts:46` (`'LD-' + Math.floor(100 + Math.random()*900)`), `:303-318` + controller `:693` (no `@Roles`, no order ownership check)
- Impact: (a) references collide against `@@unique` from ~35 jobs (birthday bound) with no retry → P2002 500s; (b) any authenticated user can create a job referencing *someone else's* order id, and `openJobs`/`jobDetail` then expose that order's reference, qty, product, amount, and party names to loader companies; bad ids also FK-500.
- Fix: `secureReference('LD')`; require the caller to be the order's party; validate existence. Effort: S

### [🟠 HIGH] API-05 — Auction bidder masking defeated: `highBidderId` shipped publicly
- Location: `apps/api/src/auctions/auctions.module.ts:84-97`; resolvable via public `GET /directory/profile/:userId` (`directory.module.ts:250-322`)
- Evidence:
```ts
highBidderMasked: top ? maskName(top.bidder.name) : null,
highBidderId: top?.bidder.id ?? null,     // public payload
```
- Impact: the masked name is undone by one extra public request; buyer-bids does this correctly (`sellerId: ownerView ? … : null`). Sniping/targeting of the current leader becomes trivial.
- Fix: null `highBidderId` for non-owner views; expose an `isMe` boolean instead. Effort: S

### [🟡 MEDIUM] API-06 — Presigned S3 PUT binds nothing but content-type
- Location: `apps/api/src/attachments/attachments.service.ts:117-122`
- Impact: `sizeBytes` is client-declared and checked only in the DTO; the signed PUT has no `ContentLength`/policy condition — storage-fill DoS and orphan unlinked attachment rows (presign is repeatable at 120/min).
- Fix: sign with `ContentLength` or a POST policy `content-length-range`; add cleanup for unlinked attachments. Effort: M

### [🟡 MEDIUM] API-07 — Private trade requirements readable (with responder identities) by unauthenticated id lookup
- Location: `apps/api/src/community/community.service.ts:518-532` vs the `visibility: 'public'` filter at `:492`
- Impact: `GET /community/requirements/:id` performs no visibility/group-membership check and includes all responses + responder identities.
- Fix: enforce visibility/membership in `getRequirement`. Effort: S

### [🟡 MEDIUM] API-08 — Raw-object and `Partial<Dto>` bodies bypass the ValidationPipe entirely (mass assignment / 500s)
- Location: `transport.module.ts:362-364` (quote `{priceCents, etaDays}`), `:386-388` (trip status — the BL-04 endpoint), `admin.module.ts:1296` (`Partial<UpsertMarketDto>` → `market.update({ data: dto })`), `catalog.module.ts:551` (offices), `community.controller.ts:244-357` (block/unblock, admin report/group/pin bodies), `loaders.module.ts:844-866`
- Impact: TS types erase to `Object`, so the global pipe neither validates nor whitelists: negative/fractional/string prices persist or 500; a `markets_manage` admin can set `status/slug/sort/createdById` directly; missing fields produce Prisma 500s instead of 400s; trip status accepts any string and any transition order (pending after delivered).
- Fix: real DTO classes (`PartialType(...)` for patches) + explicit field mapping; a trip-status transition table. Effort: S–M

### [🟡 MEDIUM] API-09 — Loader job claim race: two companies can both "win"
- Location: `apps/api/src/loaders/loaders.module.ts:374-378`
- Impact: check-then-update with no conditional claim — the second claimant silently overwrites the first. Contrast the race-safe transport quote accept (`transport.module.ts:163-190`).
- Fix: `updateMany({ where: { id, loadercoId: null } })`, bail on count 0. Effort: S

### [🟡 MEDIUM] API-10 — Wishlist bypasses the non-live-listing seal (F04 regression, new code)
- Location: `apps/api/src/wishlist/wishlist.module.ts:32-49` (list), `:61-71` (add — existence-only check)
- Impact: `GET /products/:slug` deliberately 404s non-live listings, but any user can wishlist a moderated/hidden product id (confirming it exists) and then read its full localized detail — name, price, seller, attributes — via `GET /wishlist` forever, including items removed by moderation after being saved. Also renders dead 404 taps in both clients' Saved lists.
- Fix: filter `sellableWhere()` in `list`; require `status:'live'` in `add`; badge unavailable items client-side. Effort: S

### [🟡 MEDIUM] API-11 — Public catalog filters on `approved: true` instead of the canonical `status:'live'` predicate
- Location: `apps/api/src/products/products.module.ts:205` vs `products/sellable.ts:13-20`
- Impact: if `status` and `approved` diverge, hidden listings show in browse yet 404 on detail (or the reverse); the covering index is on `status`, so the boolean predicate can't use it.
- Fix: `{ ...sellableWhere() }` (also subsumes the hand-rolled expired-auction NOT). Effort: S

### [🟡 MEDIUM] API-12 — WebSocket handlers take unvalidated payloads; some skip access checks entirely
- Location: `support/support.gateway.ts:161-189` (`message:send` raw body, `typing` without `assertCanView`), `community/community.gateway.ts:154-186` (`reaction:add` on any messageId, `typing` into any room), no throttling on either WS path
- Impact: global pipes don't bind to gateways — DTO constraints exist only on the REST twin routes. Non-string bodies throw in `sanitizeMessage` (unhandled gateway error); typing/reactions can be spoofed into rooms the caller can't view; WS message spam bypasses the REST `@Throttle(60/min)`.
- Fix: `@UsePipes(ValidationPipe)` + DTOs on gateways, access checks on typing/reaction, a WS rate limit. Effort: M

### [🟡 MEDIUM] API-13 — Unbounded quantities/amounts overflow int4 money columns
- Location: `orders.module.ts:40-49` (qty no `@Max`; `amountCents = unitPriceCents * dto.qty` at `:344`), `auctions.module.ts:30-35` (bids), `buyer-bids.module.ts:90-91` (`priceCents * qtyValue` at `:254`), `RespondDto` cents fields
- Impact: Postgres int4 caps at ~2.1e9 cents ($21M); absurd but accepted inputs 500 on write or create garbage orders and huge `reservedQty` bumps.
- Fix: `@Max` caps on qty and cents fields platform-wide. Effort: S

### [🟡 MEDIUM] API-14 — Unvalidated enum params and update-without-existence produce 500s instead of 4xx
- Location: `reviews.module.ts:483-497,548-554` (`:kind`, `?role`, unclamped `Number(take/skip)`), `support.service.ts:335-338` (inbox filters), `admin.module.ts:716-721,772-777` (decideKyc/approveProduct), `community.service.ts:852-861,938-947`
- Impact: `GET /reviews/subject/banana/x` → Prisma enum error → 500 on a public route (cheap error-spam); P2025 on missing ids surfaces as 500 rather than 404.
- Fix: `ParseEnumPipe`/query DTOs; catch P2025 → 404. Effort: S

### [🟡 MEDIUM] API-15 — Unbounded `findMany` on public and admin hot paths (consolidated)
- Location (no `take`): all four public directories (`directory.module.ts:148,166,185,220` — full user table + per-row `_count`s + translation pass, unauthenticated); `auctions.module.ts:149-161` (+2 queries/product N+1); `buyer-bids` mine/open/live (+best-price N+1); `orders` mine/incoming/transporting; `products/mine`; `wishlist`; `reviews` forSubject/forUser/mine; `support` myTickets + analytics-over-all-tickets; admin users/invoices/wallets/disputes/kyc/payouts/role-requests; `admin.reports` loads all paid orders and all users into JS.
- Impact: public endpoints are linear-cost DoS levers and degrade with data growth; admin dashboards recompute full-table aggregates per hit (see also PERF-02).
- Fix: `take` caps + cursors on public lists; `groupBy`/`aggregate` for counts and reports. Effort: M (spread)

### [🔵 LOW] API-16 — Assorted API debt
- **Ad counters manipulable**: `POST /ads/:id/click` is public/unauthenticated — click fraud inflates paid-campaign stats (`ads.module.ts:205-209`).
- **Support ticket references** use `Math.random` with no collision retry (`support.service.ts:50-52`).
- **Statements**: bearer token in query string (5-min purpose-scoped — mitigated), full-ledger scan per download, CSV formula injection via user-controlled `who`/`note` cells (`statements.module.ts:55-58,101,141,251-259`).
- **Dispatch-OTP verify**: non-constant-time compare and read-then-increment attempt metering — a parallel burst gets a few extra guesses (`orders.module.ts:661-666,697-701`).
- **Geo**: unbounded in-memory cache and any authed user can burn paid Google geocode quota (`geo.module.ts:52-106`).
- **Buyer-bid images** accept arbitrary strings (external/`javascript:` URLs storable); `categoryId/productId` unchecked FKs → 500 (`buyer-bids.module.ts:86`).
- **Staff lifecycle not audited**: `createStaff`/`updateStaff` (permission grants!) write no audit rows while ordinary user updates do (`admin.module.ts:1104-1150`).
- **Admin own-password change** requires no current password and doesn't revoke sessions (`admin` PATCH /admin/profile/password).
- **Notification persists awaited post-commit**: a failing `notifications.create` after a committed money movement 500s an operation that succeeded (e.g. `admin.module.ts:1030-1037`; several order transitions).
- **Response envelopes inconsistent**: raw arrays vs `{items,total,page,pageSize}` vs `{rows,total}` vs `{ok:true}` — every client special-cases per endpoint.
- **Vehicle/driver photo saved to disk before the ownership check** — orphan files on 403 (`transport.module.ts:408-410`, `drivers.module.ts`).
- **Group-message fan-out**: one sequential `notifications.create` per member inside the socket handler (`community.gateway.ts:119-130`).

---

## 7. Findings — Phase 4: End-to-end flows

Flow verdicts (traced hop-by-hop through actual code across all three surfaces):

| # | Flow | Verdict |
|---|---|---|
| 1 | Guest browse → save → signup → Buy Now → pay → history → notification | **BREAKS at "pay"** — no edge into `paid` (BL-03); also buyer gets no order-placed notification (FLOW-02) |
| 2 | Payment initiated → user closes app | N/A (no async gateway). Residual: `escrow.hold` commits in a separate transaction before the status flip — a crash between leaves debited-but-unpaid (idempotent hold heals on retry; nothing auto-retries) |
| 3 | Payment fails → retry / stock released | **WORKS** within the mock: conditional debit rejects cleanly pre-state-change; retry = press again |
| 4 | Cancel by user / admin → refund + stock + notification | **BREAKS twice**: party `dispute→cancelled` refunds nothing (BL-02); admin override skips refund, stock, and notification (BL-07) |
| 5 | Product OOS/delisted while saved / at order | **PARTIAL**: order-time checks correct; Saved lists show delisted items that 404 on tap with no affordance (API-10) |
| 6 | Seller edits price while buyer views | **WORKS server-side** (current price re-read; client price never trusted) — but silently: buyer can be charged a changed price with no warning |
| 7 | Offer expiry during checkout | N/A — `isOffer` is a boolean with no end date; no coupon model. Auction expiry IS enforced at order time |
| 8 | Token expires mid-session | **WORKS** on both: single-flight refresh + replay, rotation server-side, HttpOnly cookie on web, SecureStore on mobile |
| 9 | Notification tap → correct screen (incl. cold start) | **BREAKS for orders on both surfaces** (FLOW-01) |
| 10 | Same account, two devices | **WORKS** (independent revocable sessions, server-backed wishlist); gap: mobile RFQ basket is device-local SecureStore — invisible on web/other devices |

### [🟠 HIGH] FLOW-01 — Order notifications cannot reach the order (F05 incomplete)
- Location: `apps/api/src/orders/orders.module.ts:197-201` (no `linkUrl` on any order notification); `apps/web/src/App.tsx:98-100` (`/orders/:id → /console/orders` drops the id — the comment claims "order pre-opened" but `BuyerOrders.tsx:16` reads no param); `apps/mobile/src/navigation/navigationRef.ts:30-34` (only `/product/:slug` links resolve)
- Impact: web bell clicks just mark read; web push lands on `/console`; mobile falls back to the generic Notifications list where non-product `linkUrl` taps do nothing but mark-as-read. The one order link that exists (buyer-bid award → `/orders/:id`) is destroyed by the web redirect.
- Fix: add `linkUrl: /orders/:id` to order notifications; forward the id (`/console/orders?open=:id`) and read it in `BuyerOrders`; extend mobile `navigateToLink` to order routes. Effort: S–M

### [🟠 HIGH] FLOW-02 — Buyer receives no confirmation for their own order
- Location: `apps/api/src/orders/orders.module.ts:394-400` — `place()` notifies the seller only; no email/push/in-app to the buyer anywhere in the flow.
- Impact: after Buy Now the buyer gets a client toast and nothing else — no record in notifications, no email. First-order trust killer.
- Fix: `notify(buyerId, 'order.placed', …)` (+ email category) in `place()` and the quote-accept path. Effort: S

### [🟡 MEDIUM] FLOW-03 — Server-side idempotency key is sent by no client (F11 half-done)
- Location: server support `orders.module.ts:42-43,334-337`; grep of web/mobile/api-client → zero senders.
- Impact: a network-level retry of Buy Now can still duplicate orders — the exact scenario F11 was for. Fix: generate a UUID per checkout intent in `api-client` and send it. Effort: S

### [🟡 MEDIUM] FLOW-04 — `stockQty` has no write surface (F10 half-done)
- Location: `CreateProductDto`/`UpdateProductDto` (`products.module.ts:87-114`) have no stock field; grep "stock" in apps/admin → 0; no seller UI.
- Impact: the reservation machinery guards a quantity nobody can set — every listing is effectively unlimited, and no stock status can be shown on any surface. Fix: stock fields in product DTOs + seller/admin UI + display. Effort: M

### [🔵 LOW] FLOW-05 — Dead/orphaned flow surfaces
- `POST /orders/enquiry` has zero client callers (mobile RFQ basket uses buyer-bids instead); mobile `Checkout` screen is reachable only via the `checkout/:slug` deep link, unauthenticated, with an infinite-skeleton error path (MOB-05); web ProductPage "Request Quote / Transport / Loaders" buttons have no onClick (WEB-04); the order stepper on both clients includes the unreachable `paid` step.
---

## 8. Findings — Phase 5A: Web UI (apps/web)

### [🟠 HIGH] WEB-01 — Fabricated content still rendered on the production homepage (F29 residual)
- Location: `apps/web/src/components/site/sections.tsx:856` (intl), `:924` (insights), `:951` (community), `:1016` (offices), `:593-607` (hardcoded fake live trade "$268 +2.4% ↑"); data at `apps/web/src/mock/data.ts:69-114`
- Impact: invented tradable products with prices ("Chickpeas Kabuli 9mm … $1,180/MT"), invented market-price sparklines, fake community posts by named fake experts, fake office managers, and a fake live trade — presented as real data on the storefront. Directly adjacent to the remediated F29 finding.
- Fix: back these sections with real endpoints or remove them. Effort: M

### [🟠 HIGH] WEB-02 — Homepage hero search discards the query; category tiles don't filter
- Location: `apps/web/src/components/site/sections.tsx:526-545` (`onKeyDown={... navigate('/market')}` — `q` never used), `:697-699` (every category tile → bare `/market`)
- Impact: users type a query, land on an unfiltered market page, and must retype; category tiles are decorative. Fix: `navigate('/market?search='+encodeURIComponent(q))` / `?categoryId=`. Effort: S

### [🟠 HIGH] WEB-03 — Market page shows "no products match" while loading
- Location: `apps/web/src/pages/MarketPage.tsx:640-651` — the empty-state branch precedes any `isPending` check; no skeleton exists on the page.
- Impact: every first load flashes "Nothing matches — clear filters" before data arrives. Fix: branch on `isPending` first. Effort: S

### [🟠 HIGH] WEB-04 — Dead purchase-panel CTAs on the product page
- Location: `apps/web/src/pages/ProductPage.tsx:300-310` — "Request Quote", "Transport", "Loaders" buttons have no `onClick`.
- Impact: three prominent CTAs on the transactional page do nothing. Fix: wire to enquiry flow / directories, or remove. Effort: S

### [🟠 HIGH] WEB-05 — Wrong-currency prices when FX rates fail; staleness never surfaced
- Location: `apps/web/src/currency/CurrencyContext.tsx:40,50-59` (`fx?.rates?.[currency] ?? 1`); the `stale` flag has zero consumers (grep).
- Impact: with a non-USD display currency and a failed `api.fx.rates()` fetch, USD amounts render with the foreign symbol at rate 1 — $840 shows as "₹840". Fix: fall back to USD display when the rate is missing; surface staleness. Effort: S

### [🟠 HIGH] WEB-06 — ErrorState adopted on only 5 surfaces; everywhere else failure renders as "empty" (F28 residual)
- Location: used only in `MarketPage`, `ProductPage`, `BuyerOrders`, `BuyerExtras` (Saved), `order-parts` (OrderDrawer). Counter-examples: `DirectoryPage.tsx:249-252`, `SellerOrders.tsx:130-133`, `AuctionsPage.tsx:75-76`, `BuyerBidsPage.tsx:33,61`, Browse/SafeDeal/Transport/Messages sections, all transporter/loaderco/worker sections; homepage sections return `null` or "no live auctions" on error.
- Impact: after react-query's retries fail, users see "You have no orders / no auctions / empty directory" during outages. Fix: propagate `isError` + `<ErrorState onRetry>` per section. Effort: M

### [🟡 MEDIUM] WEB-07 — Console navigation is stateless: back button exits the console, refresh loses your place
- Location: `apps/web/src/console/ConsolePage.tsx:156,241` — section switches call `setActive`, never `navigate`.
- Fix: push `/console/:section` on select. Effort: S

### [🟡 MEDIUM] WEB-08 — No 404 page; unknown URLs silently land on the homepage
- Location: `apps/web/src/App.tsx:105` (`path="*" → Navigate to="/"`). Fix: dedicated 404 route. Effort: S

### [🟡 MEDIUM] WEB-09 — Session-expiry logout loses the return path
- Location: `apps/web/src/lib/api.ts:33-37` — hard `location.assign('/login')` with no `from`; after re-login the user lands on `/console`, not where they were. Fix: pass `?from=`/router state. Effort: S

### [🟡 MEDIUM] WEB-10 — Currency display bugs: "$$840", mixed currencies in the bid panel
- Location: `apps/web/src/console/sections/BuyerExtras.tsx:59,98` (`${p.price}` where `price` is already `"$840"` → "$$840"; bypasses the currency selector); `apps/web/src/components/site/BidPanel.tsx:100,149,174-188` (highest bid converts via `fmtCents` while min-next/chips/button stay hardcoded `$` — two currencies in one panel); deprecated `usd()` helper still used by SafeDeal/Invoices sections (`console/lib.ts:8`).
- Fix: `fmtPrice`/`fmtCents` everywhere. Effort: S

### [🟡 MEDIUM] WEB-11 — Auctions board renders `imageUrl` without `assetUrl()` and without fallback
- Location: `apps/web/src/pages/AuctionsPage.tsx:89` — relative `/uploads/...` paths resolve against the web origin → broken images (ProductCard does both correctly).
- Fix: wrap with `assetUrl`, add onError fallback. Effort: S

### [🟡 MEDIUM] WEB-12 — New F02/F28 i18n keys exist in English only — 10 locales regress
- Location: `packages/i18n/locales/en/common.json:7-9` (`errorTitle/errorBody/retry`), `site.addToSaved/removeFromSaved` in `en/web.json` only (verified by grep across locales).
- Impact: ErrorState and wishlist strings fall back to English in ar/de/es/fa/fr/hi/ja/pt/ru/zh-Hans — a regression against the 100%-translated baseline. Fix: backfill translations. Effort: S

### [🔵 LOW] WEB-13 — Web polish debt
- Dead "View all →" buttons on International/Insights/Community sections (`sections.tsx:839,922,949` — no `onAction`).
- MOQ not enforced in the buy form (`ProductPage.tsx:284-291`, min=1 regardless of listed MOQ; server-side enforcement unverified).
- Hardcoded English bypassing i18n: `MarketPage.tsx:350` ("Back"), `:419`; `sections.tsx:766` ('Ended'); image aria-labels; footer columns render `mock/data.ts:186-191` English in all locales.
- **NUL byte embedded in `AuctionsPage.tsx:25`** (`'\0ENDED'`) — tools treat the file as binary; it is invisible to ripgrep-based search. Replace the sentinel.
- A11y: view-toggle icon buttons lack `aria-label`/`aria-pressed` (`MarketPage.tsx:624-635`); wishlist heart is 28×28 px over the image link (`ProductCard.tsx:84`). (Modal focus trap in `packages/ui/src/Modal.tsx` verified correct.)
- SEO: one static meta set for the whole SPA; no per-route titles, no robots.txt/sitemap, no structured data (`apps/web/index.html:6-25`).
- Countdown timers tick only on the 5s poll (homepage/auction board); market search refetches per keystroke (mitigated by `keepPreviousData`).
- Product detail page has no wishlist control (hearts exist only on cards).

**Verified good:** wishlist hook (optimistic update + rollback + dual invalidation), guest heart → `/login`, order mutations invalidate broadly, auth forms disable on submit, `productResolution` fails closed with tests, ProtectedRoute remembers `from`, Sponsored disclosure renders, `overflow-x-clip` long-locale guard present.

---

## 9. Findings — Phase 5B: Mobile UI (apps/mobile)

### [🔴 CRITICAL] MOB-01 — API failure renders as false "empty" business data on ~85% of screens
- Location: systemic — only 9 of 71 files calling `useQuery` handle `isError` (ProductDetail, Saved, Offers, Search, buyer/Orders, Browse, loaderco/Workers, HireModal, LiveTracking). Representative: `apps/mobile/src/screens/seller/Orders.tsx:176-179`, `screens/public/Notifications.tsx:108-111`.
- Evidence:
```tsx
{isLoading ? <SkeletonRows/> : orders.length === 0 ? (
  <EmptyState icon="cube-outline" title={t('sellerX.orders.emptyTitle')} .../>
```
- Impact: offline or API-down users are told "you have no orders" / "you're all caught up" — false business data. With `retry: 1`, no NetInfo, and zero `RefreshControl` in the app, this is the entire offline story. The F28 `ErrorState` exists (`ui/index.tsx:578`) but was wired into the public/buyer core only; all seller, transporter, loaderco, worker, dashboard, wallet, invoice, community, support screens fall through to empty states.
- Fix: sweep the proven `isError → ErrorState(onRetry)` pattern (`buyer/Orders.tsx:51-52`) across remaining screens; add pull-to-refresh on list screens. Effort: M

### [🟠 HIGH] MOB-02 — Orders never refresh after purchase
- Location: `apps/mobile/src/screens/public/ProductDetail.tsx:92-96` and `Checkout.tsx:30-34` (buy mutations invalidate nothing — `useOrderInvalidation` exists at `components/order-parts.tsx:71` but isn't called); `lib/queryClient.ts:3-11` (`refetchOnWindowFocus: false`); tab screens stay mounted; zero pull-to-refresh.
- Impact: a newly placed order can *never* appear in the Orders tab until app restart or an unrelated order mutation. Fix: invalidate in `onSuccess` + focus-refetch/RefreshControl. Effort: S

### [🟠 HIGH] MOB-03 — Logout/login don't clear the React Query cache — cross-account data bleed
- Location: `apps/mobile/src/auth/AuthProvider.tsx:157-177` (logout), `:80-89` (forced logout), `:106-118` (login) — role-switch invalidates (F27) but these paths don't.
- Impact: user B signing in on user A's device is served A's cached orders/wallet/notifications instantly while refetches run. Fix: `queryClient.clear()` on logout and auth-failure; invalidate on login. Effort: S

### [🟠 HIGH] MOB-04 — Browse: unvirtualized infinite catalog + a request per keystroke
- Location: `apps/mobile/src/screens/public/Browse.tsx:127-171` (ScrollView + `ProductGrid` `.map`), `:48,54-60` (raw `search` state keyed into `useInfiniteQuery` — no debounce; `Search.tsx:46-49` has the 300 ms pattern).
- Impact: F31's pagination appends every page into a flexWrap View — all cards (image + Moti animation) stay mounted; on the 14k-product taxonomy this degrades scroll/memory on low-end Android. Each keystroke also starts a new page-1 fetch and caches a dead entry. Fix: FlatList `numColumns={2}` + `onEndReached` (pattern already in AuctionsBoard/Directory); reuse the debounce. Effort: M

### [🟠 HIGH] MOB-05 — Checkout screen: infinite skeleton on error, no auth gate, orphaned
- Location: `apps/mobile/src/screens/public/Checkout.tsx:29,36-38`; zero `navigate('Checkout')` call sites; kept alive only by `linking.ts:36`.
- Impact: fetch failure → skeleton forever; a signed-out deep-link visitor can tap "Place order" → raw 401. Fix: error state + auth gate, or remove the route. Effort: S

### [🟠 HIGH] MOB-06 — Bottom bars ignore the home-indicator inset
- Location: `apps/mobile/src/navigation/tabs.tsx:92-100` (hard `height: 64` opts out of safe-area handling), `ProductDetail.tsx:418-428` (sticky buy bar), `Checkout.tsx:103-110`, `ui/Sheet.tsx:87-94` (footer — insets top but never bottom).
- Impact: on gesture-nav devices the primary CTAs sit under/graze the home indicator. Fix: add `useSafeAreaInsets().bottom` in these four places. Effort: S (verify on device)

### [🟡 MEDIUM] MOB-07 — Deep-link routes break their own param contracts; no unknown-route fallback; no auth gating
- Location: `navigation/linking.ts:50,57` vs `navigation/types.ts:21,31` (`title` required by types, absent from URLs → blank headers; `Placeholder title={undefined}` for unknown console keys); `directory/garbage` renders an empty directory; unmatched paths (e.g. `/orders/123` from emails) silently open the default screen; `console/:role/:section` is not auth-gated — cold-start lands on wallet/orders whose queries 401.
- Fix: default titles in-screen, validate `type`, wildcard NotFound route, gate console links. Effort: M

### [🟡 MEDIUM] MOB-08 — Push-tap routing: cold-start races dropped; order notifications dead-tap
- Location: `lib/push.ts:120-122` + `navigationRef.ts:16,27` (`if (!navigationRef.isReady()) return;` — cold-start route silently discarded, no queue); `routeForNotification` resolves only `/product/:slug`; in the Notifications list a non-product `linkUrl` tap only marks read (`Notifications.tsx:75-82`).
- Fix: queue the pending route until `onReady`; extend link matching (pairs with FLOW-01). Effort: M

### [🟡 MEDIUM] MOB-09 — Android hardware back exits chat/support sub-flows
- Location: `screens/community/Community.tsx:492-494` (DM room / group room / composer are component state), same pattern in Support ticket view; zero `BackHandler` usage in the app.
- Impact: hardware back pops the whole screen; mid-composition text is lost. Fix: BackHandler effect while a sub-view is active. Effort: S

### [🟡 MEDIUM] MOB-10 — `fontWeight` layered on per-weight fonts (~45 sites) — double-bolds on Android
- Location: e.g. `Community.tsx:504`, `AuctionRoom.tsx:32`, `BidPanel.tsx:86`, `RootNavigator.tsx:39`, `tabs.tsx:114` — violating the design system's own warning (`theme/tokens.ts:168`).
- Fix: swap to per-weight families. Effort: M

### [🟡 MEDIUM] MOB-11 — Fabricated UI on Home (mobile twin of WEB-01)
- Location: `screens/public/Home.tsx:105` (hard-coded "04:12:33" deal countdown), `:164-166` (3 pager dots on a single static hero), `:175` (bell unread dot always on), `:100` (`user?.country || 'India'`), `:107` (guest initials 'AK'), dead mic/camera icons in search pills.
- Fix: wire to data or remove. Effort: S

### [🟡 MEDIUM] MOB-12 — RFQ basket: partial-failure duplicates and silently dropped lines
- Location: `screens/public/RfqBasket.tsx:68-94` (sequential per-line `buyerBids.create`; failure mid-loop + retry re-creates earlier lines), `:56-59` (`if (!product) return;` silently drops failed product fetches while the header count still says N).
- Fix: batch endpoint or per-line success tracking; surface fetch errors. Effort: M

### [🟡 MEDIUM] MOB-13 — Order detail sheet (the OTP surface) has no error state
- Location: `screens/components/order-parts.tsx:201-220` — `isLoading || !order → SkeletonRows` forever on failure; this sheet carries the delivery OTP a driver needs at the gate.
- Fix: ErrorState + retry. Effort: S

### [🟡 MEDIUM] MOB-14 — Form gaps: SignUp/ProfileForm keyboard, double-submit, can't-clear-fields
- Location: `screens/auth/SignUp.tsx:147-241` (no KeyboardAvoidingView — SignIn/OtpSignIn/ForgotPassword all have it); `screens/ProfileForm.tsx:107-117,175` (Save has no busy/disabled state → double-submit; `filter(([,v]) => v !== '')` means an emptied field is never sent — users cannot clear bio/phone; saving doesn't update the AuthProvider user so Home stays stale).
- Effort: M

### [🟡 MEDIUM] MOB-15 — Saved screen fires the wishlist query for guests
- Location: `screens/buyer/Saved.tsx:26-28` — no `enabled: !!user` (the hook itself has it, `lib/useWishlist.ts:18`) → guaranteed 401 + `onAuthError` churn for guests; row heart is always filled (`:62`) so un-save gives no feedback until refetch.
- Effort: S

### [🔵 LOW] MOB-16 — Mobile polish debt
- i18n: literal 'Hide password/Show password' a11y labels (`ui/index.tsx:389`), untranslated admin-signin notice, `ago()` suffixes, hardcoded `$` in BidPanel rows despite `fmtCents` a line above (`BidPanel.tsx:117,131`), `EmptyState title="—"`.
- A11y: bare 22px icon with onPress and no label (`Notifications.tsx:101-106`), auto-bid toggle 44×25 without `role="switch"`, Chip clear ≈29px target. (Buttons/SaveHeart/steppers verified labeled — F34 landed.)
- Misc: gallery width from one-shot `Dimensions.get` (rotation desync); `lib/apiBase.ts` defaults to `http://localhost:3100` (unreachable from devices; memory says use 127.0.0.1); AppBar `key={a.icon}` collides; double splash flash (`App.tsx:50-56`); `remember()` side-effect inside `queryFn` re-records search terms on background refetches.
- Orphaned: `Offices` screen URL-only; `Search` route param `title` never read.

---

## 10. Findings — Phase 6: Security

Prior security blockers are verified fixed (see §4). Residuals:

### [🟡 MEDIUM] SEC-01 — No `trust proxy`: production rate limiting collapses to one global bucket; session IPs spoofable
- Location: no `app.set('trust proxy', …)` anywhere in `apps/api`; `app.module.ts:49,90` (Throttler keyed on `req.ip`); `auth.controller.ts:27-29` (manually parsed spoofable `x-forwarded-for` stored on `RefreshSession.ip`); prod compose binds API to loopback behind a host proxy.
- Impact: every client shares the proxy's IP — one attacker can exhaust the platform-wide `forgot-password`/`request-otp` buckets (3/min) for everyone (auth DoS), and brute-force limits lose per-attacker attribution.
- Fix: `trust proxy: 1` with a proxy that overwrites `X-Forwarded-For`; derive session IP from `req.ip`. Effort: S

### [🟡 MEDIUM] SEC-02 — Hardcoded fallback JWT secrets compiled into six code paths, blocked only by `NODE_ENV=production`
- Location: `auth/jwt.strategy.ts:24`, `auth.service.ts:46,49`, `kyc.module.ts:68`, `statements.module.ts:70`, `invoices.module.ts:141`, `realtime/ws-auth.service.ts:42` — `config.get('JWT_SECRET') || 'change-me-access-secret'`.
- Impact: `assertProductionConfig` refuses these placeholders — but only when `NODE_ENV === 'production'`. A staging/PM2 deployment that forgets NODE_ENV silently signs every token with a public string → total auth bypass.
- Fix: remove the fallbacks; fail fast at module init regardless of NODE_ENV. Effort: S

### [🟡 MEDIUM] SEC-03 — No security headers/CSP on the web/admin SPAs; access token in localStorage
- Location: `infra/nginx.conf:1-20` (no CSP/X-Frame-Options/nosniff/Referrer-Policy/HSTS — admin console clickjackable); `apps/web/src/lib/api.ts:23,30` + admin equivalent (15-min access token + user JSON in localStorage — deliberate F38 residual; refresh token correctly HttpOnly).
- Impact: any XSS is directly token-stealing; the two gaps compound. Fix: header set + CSP in nginx (S); keep access token in memory only (M).

### [🟡 MEDIUM] SEC-05 — 39 known dependency vulnerabilities in production paths (15 high)
- Location: `pnpm audit --prod` (this session): **nodemailer 6.10.1** (high: raw-option arbitrary file read/SSRF; upgrade ≥8.0.4), **multer** (high DoS, incomplete-cleanup — compounding API-03), **lodash** (high `_.template` code injection), js-yaml, fast-xml-parser, fast-uri, postcss, brace-expansion (high), react-router open-redirect (moderate).
- Fix: upgrade nodemailer/multer/lodash first; schedule the rest. Effort: M

### [🔵 LOW] SEC-06 — Security polish
- Dispatch/delivery OTPs stored plaintext with no expiry (CSPRNG + lockout landed; hash-at-rest + TTL still TODO per the code's own comment, `common/secure-random.ts:8-10`).
- `Content-Disposition` built from unsanitized uploader filename — `"` can smuggle directive text to the reviewing admin (`kyc.module.ts:153`).
- Phone login matches by substring — `profile.findFirst({ phone: { contains: digits } })` can bind login attempts to the wrong account (password still required) and is an unindexed scan (`auth.service.ts:529-540`).
- `bcryptjs` (pure-JS) cost 10 — adequate floor; consider native bcrypt/argon2.
- Google Fonts from third-party origin on web+admin (GDPR/supply chain); committed Android debug keystore (standard, informational); throttler storage is in-memory/per-instance (fine single-node).

**Verified clean:** no committed secrets or env files in git history (`git log --diff-filter=A`), zero `dangerouslySetInnerHTML` in web/admin, `{{var}}` email template values HTML-escaped and admin preview sandboxed, translation client hits a fixed Google endpoint (no SSRF surface), mass-assignment blocked by whitelist pipe + role allowlists excluding admin, KYC/invoice/statement downloads purpose-token-checked with traversal-safe paths.

---

## 11. Findings — Phase 7: Admin panel, infra, performance

### Admin panel

### [🟠 HIGH] ADM-01 — Per-module RBAC enforced only in sidebar visibility; routes render ungated
- Location: `apps/admin/src/auth/ProtectedRoute.tsx:8` (role check only), `apps/admin/src/layout/AdminLayout.tsx:77` (permission filter applies to nav links), `apps/admin/src/App.tsx:44-72` (every Route renders unconditionally)
- Impact: a staff admin without `finance_manage` can type `/payments`, `/safedeal`, `/team` and get a fully rendered page with live action buttons; only API 403s stop actions, and most pages render the failure as empty data under a hardcoded green "Live API" badge (`UsersPage.tsx:74`). Server-side enforcement is solid, so this is a UX/least-surprise issue, not a bypass — but it invites accidental probing and hides real errors.
- Fix: `RequirePermission` route wrapper reusing `MODULES[].perm`. Effort: S

### [🟡 MEDIUM] ADM-02 — One-click irreversible financial decisions without confirmation or reason
- Location: `apps/admin/src/pages/PaymentsPage.tsx:61-62,149-151` (payout reject — one-shot server-side, note supported by the client API but never collected; approval is containment-disabled with no UI explanation, so pending payouts accumulate against a reject-only UI); `ProductsPage.tsx:172` (takedown), `UserDetailDrawer.tsx:55,226-227` (deactivate) — no confirm, though `CategoriesPage`/`ReviewsModerationPage` do use `window.confirm`.
- Fix: confirm dialog + reason field + "approvals disabled" notice; apply the existing confirm pattern. Effort: S

### [🟡 MEDIUM] ADM-03 — Unbounded admin lists end-to-end; silent truncation elsewhere
- Location: `UsersPage.tsx:26-39` + `admin.module.ts:260` (ALL users, client-side filtering), `SafeDealPage.tsx:65-69` + `admin.module.ts:952` (ALL wallets); Orders/Audit capped at 500 server-side but with no pager — silent truncation.
- Fix: server pagination + table pagers. Effort: M

### Infra / reliability

### [🟠 HIGH] OPS-01 — No automated backups; the only backup is a 4-day-old manual dump
- Location: `backups/` (agrostock.dump 443 KB, api-files.tar.gz, minio-data.tar.gz — all 2026-07-20); zero references to backups in `infra/`, CI, or scripts.
- Impact: `postgres_data`, `api_uploads`, `api_private_uploads` (KYC documents) named volumes have no scheduled backup; host loss loses everything since Jul 20. Fix: scheduled `pg_dump` + uploads archive to off-host storage, restore drill. Effort: M

### [🟠 HIGH] OPS-02 — No observability: no error tracking, structured logging, metrics, or log rotation
- Location: Nest default console logger only; no Sentry/pino/prom-client in `apps/api/package.json`; no `logging:` blocks in `docker-compose.prod.yml`; zero error tracking in web/admin/mobile (Firebase analytics initialized, zero `logEvent` calls).
- Impact: production incidents at agrotraders.org are invisible except `docker logs`, which grow unbounded. Fix: Sentry across API+clients, compose log rotation, minimal metrics. Effort: M

### [🟡 MEDIUM] OPS-03 — Readiness endpoint exists but nothing consumes it
- Location: `infra/docker-compose.prod.yml:50-132` — no `healthcheck:` on api/redis/minio/web/admin (dev compose has one for redis); `depends_on` uses service_started.
- Impact: a wedged API (bad DB creds, pending migrations) stays "up" forever; `/health/ready` is operationally dead code. Fix: wget-based healthcheck + `condition: service_healthy`. Effort: S

### [🟡 MEDIUM] OPS-04 — CI gaps: unfrozen lockfile, no migration-drift check, docker build only on main
- Location: `.github/workflows/ci.yml` (`pnpm install --no-frozen-lockfile`; Dockerfiles likewise); no scratch-Postgres `prisma migrate deploy` step (a real risk given the documented `db push` history); Docker matrix builds only on push to main.
- Impact: green CI doesn't prove the committed lockfile builds; schema↔migrations drift merges silently; Dockerfile breakage discovered post-merge. Fix: `--frozen-lockfile`, migration job with service-container Postgres, PR docker builds. Effort: M

### [🔵 LOW] OPS-05 — Ops polish
- Runtime API image ships full workspace node_modules incl. dev deps (`Dockerfile.api:10,21` — no prune/`pnpm deploy`).
- Repo-root junk in the build context: `tatus` (2 MB mispiped git output), `tmp.mjs`, `web-preview.log` — delete.
- nginx SPA config has no security headers (see SEC-03).
- Multi-replica hazards (informational, fine single-instance): in-memory throttler and the categories memo cache invalidate per-instance; WS already Redis-adapted; no cron schedulers exist (which is also why auctions never auto-close — BL-09).

### Performance

### [🟡 MEDIUM] PERF-01 — Public directories are unbounded full-table scans with per-row aggregate counts (see API-15)
- Location: `directory.module.ts:148-160` et al. — every unauthenticated hit loads every provider with filtered `_count`s + a translation pass. Fix: paginate + cache counts. Effort: M

### [🟡 MEDIUM] PERF-02 — Admin payments dashboard loads all wallets and all paid orders per hit
- Location: `admin.module.ts:905-925` — per-role balances and escrow totals reduced in JS over full tables; called by two pages on mount; `reports()` maps all users into JS for a growth series (`:876`). Fix: `groupBy`/`aggregate`. Effort: M

### [🟡 MEDIUM] PERF-03 — Single-size 1200px WebP served to every grid cell on web and mobile
- Location: `uploads/uploads.service.ts:56-75` (one variant, quality 80); consumed by 24-per-page grids and mobile lists (~100–300 KB per card where ~15 KB thumbs would do). Fix: emit a 320px thumb, reference in list payloads. Effort: M

### [🟡 MEDIUM] PERF-04 — Mobile statically bundles all 11 locales × 6 namespaces (~4.8 MB JSON) parsed at cold start
- Location: `packages/i18n/src/init-native.ts:1-19` (static `resources.native`); `attrs.json` alone is 165 KB/locale. Web/admin correctly lazy-load per namespace. Fix: per-locale on-demand require maps; drop `attrs` from the eager set. Effort: M

### [🟡 MEDIUM] PERF-05 — No route-level code splitting: 1.68 MB main web chunk (+1.9 MB Globe3D)
- Location: `apps/web/src/App.tsx:1-31` (31 eager page imports), `apps/admin/src/App.tsx:8-34` (29) — only `Globe3D` is lazy; build output confirms `index-*.js` 1,680 kB / gzip 447 kB. First paint of the storefront pays for the console, chat, firebase, framer-motion. Fix: `React.lazy` per route group. Effort: M

### [🔵 LOW] PERF-06 — Perf polish
- Admin search inputs fire a server query per keystroke with 4-way `contains` joins (`OrdersPage.tsx:105-129`, AuditPage, ProductsPage) — debounce.
- Google Fonts third-party origin (also SEC-06); self-host to match the API's same-origin posture.
- Memory-leak sweep came back clean: all sampled intervals/listeners/subscriptions across web/admin/mobile have cleanups; catalog/products list is properly paginated, capped, and index-backed (`schema.prisma:707-711`, migration `20260724050000`).
---

## 12. Feature completeness matrix (Phase 1)

Judged end-to-end across API + web + mobile. ✅ full flow wired · ⚠️ partial · ❌ missing · N/A.

### Auth & account
| Feature | Status | Notes |
|---|---|---|
| Signup / login (email+phone) | ✅ | phone login uses substring match (SEC-06) |
| OTP / passwordless login | ✅ | web + mobile |
| Forgot / reset password | ✅ | reset revokes all sessions |
| Email verification | ✅ | verify-before-login |
| Profile edit | ✅ | mobile can't clear fields (MOB-14) |
| Address book / default address | ❌ | no Address model; orders carry only party-derived from/to city |
| Account deletion / export | ❌ | no endpoint; admin can only deactivate |
| Token refresh | ✅ | rotating sessions + single-flight interceptor |
| Logout all devices | ✅ | + session list |

### Catalog & discovery
| Feature | Status | Notes |
|---|---|---|
| Category tree | ✅ | 5-level lazy, index-backed |
| Listing + pagination | ✅ | web URL pages, mobile infinite (unvirtualized — MOB-04) |
| Filters / sorting | ✅ | incl. per-subcategory attribute facets |
| Product detail | ⚠️ | stock never shown (FLOW-04); no wishlist control on web detail |
| Search + empty-result | ✅ | name substring only; no typo tolerance |
| Recently viewed | ❌ | absent |
| Related products | ✅ | client-side same-category |

### Cart & wishlist
| Feature | Status | Notes |
|---|---|---|
| Cart | ⚠️ (by design) | no server cart; mobile has a device-local RFQ basket; web has none; checkout is single-product Buy Now |
| Wishlist add/remove | ✅ (new) | end-to-end; but lists non-live items (API-10) |
| Guest wishlist | ⚠️ | guests redirected to login; no local guest list that merges |
| Out-of-stock handling | ⚠️ | order-time only; no OOS badge; Saved 404-dead-ends |

### Checkout & payment
| Feature | Status | Notes |
|---|---|---|
| Address selection | ❌ | no checkout address step |
| Delivery / shipping fee | ❌ | freight is a separate hire flow; not in order total |
| Coupons / promotions | ❌ | no coupon model; `isOffer` is a badge with no expiry |
| Tax | ❌ | no tax engine; invoice tax is unbounded issuer input (BL-06) |
| Server-side order math | ✅ | price server-resolved; client price never trusted |
| Payment gateway | ❌ | none — mock wallet + kill-switched escrow (BL-03) |
| Webhook signature/idempotency | N/A | no gateway |
| Payment failure handling | ⚠️ | clean within the mock; hold/status in two transactions |
| Idempotent order creation | ⚠️ | server supports key; no client sends it (FLOW-03) |
| COD | N/A | B2B escrow model |

### Orders & post-purchase
| Feature | Status | Notes |
|---|---|---|
| Order confirmation | ⚠️ | client toast only; buyer gets no notification/email (FLOW-02) |
| History / detail | ✅ | both clients |
| Status timeline | ✅ | OrderEvent rows; stepper includes unreachable `paid` |
| Cancellation | ✅ | reachable (F03); but escrow not refunded on some paths (BL-02, BL-07) |
| Returns / refunds | ⚠️ | dispute→admin only, kill-switched; no RMA |
| Invoice download | ✅ | seller-issued, token PDF; not auto-generated on delivery |
| Tracking | ✅ | status/OTP handshake; no GPS |

### Notifications
| Feature | Status | Notes |
|---|---|---|
| Fan-out infra (in-app+push+email) | ✅ | `NOTIFICATION_CREATED` event, per-category prefs, error-isolated transports |
| Order events wired | ⚠️ | seller notified; no buyer order-placed; no paid/refund (unreachable); no `linkUrl` (FLOW-01); admin override silent |
| Refund events | ⚠️ | dispute-resolution only, kill-switched |

### Reviews
| Feature | Status | Notes |
|---|---|---|
| Verified-completion gating | ✅ | delivered orders/trips only |
| Edit / delete | ⚠️ | author edit; no author self-delete |
| Moderation | ✅ | `reviews_moderate` admin |
| Aggregation | ✅ | real ratings only (F29) |

### Admin
| Feature | Status | Notes |
|---|---|---|
| Dashboard metrics | ✅ | full-table aggregates (PERF-02) |
| Product CRUD / moderation | ✅ | status source of truth |
| Inventory | ❌ | no stock surface anywhere (FLOW-04) |
| Order management | ⚠️ | status override bypasses escrow/stock/notify (BL-07) |
| Coupon management | ❌ | no coupons |
| User management | ✅ | roles, activate/deactivate, wallet adjust (gated) |
| Categories | ✅ | cycle/depth checks |
| CMS / banners / branding | ✅ | |
| Reports / exports | ✅ | CSV/PDF statements, audit log |
| Granular RBAC | ✅ (API) / ⚠️ (client) | 23 permissions server-enforced; client routes ungated (ADM-01) |

### Platform
| Feature | Status | Notes |
|---|---|---|
| SEO | ⚠️ | SPA, static meta only; no per-route/sitemap/structured data |
| Mobile deep linking | ⚠️ | wired but order links dead, no NotFound, no auth gate (MOB-07/08) |
| App force-update | ❌ | none |
| Analytics events | ❌ | Firebase initialized, zero events |
| Error tracking | ❌ | no Sentry anywhere (OPS-02) |
| Rate limiting | ✅ / ⚠️ | present, but proxy-blind in prod (SEC-01) |
| Health endpoint | ✅ | liveness + readiness (readiness unused — OPS-03) |
| DB backup | ⚠️ | one manual dump; no automation (OPS-01) |

---

## 13. API endpoint inventory (appendix)

Full route tables per module — auth guard, validation, and per-endpoint issues — are captured in the sub-audits; the salient inventory-level facts:

- **~341 route handlers across 36 modules**, all under `/api`. Guard conventions: `JwtAuthGuard` (J), `OptionalJwtAuthGuard` (OJ), `RolesGuard`+`@Roles` (R), `PermissionsGuard`+`@RequirePermissions` (P). All admin controllers are class-guarded `J+R(admin)+P(...)` with 23 granular permissions.
- **Public (no auth):** `/products`, `/products/:slug`, `/categories`, `/offices`, `/markets`, `/branding`, `/fx/rates`, `/geo/cities`, `/ads/promoted`, `POST /ads/:id/click` (⚠️ API-16), `/directory/*` (⚠️ unbounded, API-15), `/auctions` + `/auctions/:slug` (⚠️ leaks highBidderId, API-05), `/community/feed|groups|requirements|requirements/:id` (⚠️ private leak, API-07), `/cms`, `/health`, `/health/ready`, auth endpoints.
- **Token-in-query download routes** (purpose-scoped 5-min JWTs, verified): `/invoices/:id/pdf`, `/kyc/documents/:id/file`, `/me/wallet/statement.csv|.pdf`.
- **WebSocket gateways:** `/support` and `/community` — JWT-verified on connect (access-type-only, live DB re-read), room-join authorized, but **payloads unvalidated and some events skip access checks** (API-12).
- **Endpoints flagged for validation gaps** (raw/`Partial` bodies bypassing the pipe): `POST /transport/requests/:id/quotes`, `PATCH /transport/trips/:id/status`, `PATCH /admin/markets/:id`, `PATCH /admin/offices/:id`, `POST /community/block|unblock`, several `/community/admin/*`, `PATCH /admin/loaders/rates/:id`, `PATCH /admin/.../listing` (API-08).
- **IDOR-relevant resource-id endpoints reviewed:** orders/reviews/notifications/wishlist/support/statements enforce ownership in where-clauses ✅; **exceptions:** `GET /community/messages/:id/translation` (API-01), `POST /hires` contact leak (API-02), `POST /loaders/jobs` arbitrary orderId (API-04), `GET /community/requirements/:id` (API-07).

---

## 14. Needs manual verification

Requires a running environment, the live DB, a device, or out-of-repo config:

1. **`ENABLE_LEGACY_FINANCIAL_WRITES` / `NODE_ENV` in live envs** — decides whether every kill-switched money path (top-up, admin paid, dispute settle, wallet adjust) is dormant or live today, and whether the SEC-02 dev-secret fallbacks are reachable.
2. **Live prod DB migration drift** — schema↔migrations reconcile statically, but agrotraders.org was advanced via `db push` (per project memory). Run `prisma migrate diff --from-url $PROD_DB --to-schema-datamodel` before the next `migrate deploy`. Confirm the uncommitted `20260723200727_add_wishlist_item` migration is applied.
3. **Whether pre-guard demo accounts still exist in the live DB** — the boot guard only blocks *next* startup with `NODE_ENV=production`.
4. **Host-level nginx/TLS** (not in repo) — HSTS, security headers, and `X-Forwarded-For` handling; determines the real severity of SEC-01 and SEC-03.
5. **MinIO bucket policy** — attachments assume private; confirm no public-read.
6. **CMS `body` rendering** — API serves it raw; confirm the web CMS page doesn't `dangerouslySetInnerHTML` untrusted content (stored XSS risk if it does).
7. **Whether the API rejects sub-MOQ / oversell on non-place paths** — client sends qty freely; enquiry/award don't reserve (BL-08).
8. **FCM push delivery on live builds** (native module off in Expo Go); web service-worker registration on agrotraders.org.
9. **On-device mobile checks** — home-indicator overlap (MOB-06), cold-start deep-link + push-tap routing (MOB-08), grid drift in RTL/long locales.
10. **Firebase console-side restrictions** (App Check, API-key referrer/package limits) and EAS secrets — client config is public by design; safety depends on console config.

---

## 15. Prioritized fix roadmap

### Fix before any real-money launch (blockers)
1. **BL-01 / BL-02 / BL-10** — settle escrow on delivery, refund on cancel, atomic dispute resolution. Close the "money enters escrow and can't get out" holes. (S each)
2. **BL-04 / BL-05** — hire escrow: require requester confirmation/OTP before payee release; conditional claims + idempotency keys on refund/release. (M/S)
3. **BL-03 decision** — either integrate a real payment gateway (L) or, if launching without on-platform payment, remove the dead payment UI and stop labeling unpaid orders as revenue (S). Do not ship the current ambiguous state.
4. **API-01 / API-02 / API-07** — close the chat-translation IDOR, mask hire contact until accepted, enforce requirement visibility. (S/M)
5. **API-03** — multer size limits everywhere (compounds the multer CVE). (S)
6. **BL-06** — cap invoice total incl. tax against the agreed amount. (S)
7. **MOB-01 / WEB-06** — error-state sweep so outages stop masquerading as empty business data. (M)
8. **SEC-02 / SEC-01** — remove dev-secret fallbacks (fail fast); set `trust proxy` so rate limits work in prod. (S)
9. **OPS-01** — automated DB + uploads backup with a tested restore. (M)

### Fix this week (high-value, low-risk)
- BL-07 (admin override side effects), BL-08 (reserve on all order paths), API-04 (loader ref + ownership), API-05 (auction bidder id), API-08 (DTO-ize raw bodies), API-09 (loader claim race), API-10 (wishlist non-live filter).
- FLOW-01 / FLOW-02 (order notification linkUrl + buyer confirmation), FLOW-03 (send idempotency key).
- MOB-02 / MOB-03 (invalidate on purchase; clear cache on logout), MOB-05 / MOB-06 (checkout error+gate; safe-area bottoms).
- WEB-01 (remove/replace fabricated homepage content), WEB-02/03/04/05 (hero search, loading state, dead CTAs, FX fallback).
- ADM-01 (route permission wrapper), ADM-02 (confirm dialogs on financial/destructive actions).
- OPS-02 (Sentry + log rotation), OPS-03 (compose healthchecks), OPS-04 (frozen lockfile + migration-drift CI), SEC-03 (nginx CSP/headers), SEC-05 (upgrade nodemailer/multer/lodash).

### Backlog (correctness, scale, polish)
- BL-09 (auction close/scheduler/settlement + buy-now block), BL-11/BL-12/BL-13/BL-14 (idempotency/race/rounding/ledger edges), BL-15 (self-purchase, secure RNG, timezones).
- API-06 (presign size), API-11 (sellable predicate in browse), API-12 (WS validation), API-13 (int overflow caps), API-14/API-15/API-16.
- Feature gaps: address book, account deletion, coupons, tax engine, recently-viewed, real cart, stock write surface, force-update, analytics events.
- PERF-01…06 (directory pagination, admin aggregates, image thumbnails, mobile i18n splitting, web route splitting, debounces), SEC-06, WEB-07…13, MOB-07…16, ADM-03.
- SEO (per-route meta, sitemap/robots), remove repo-root junk (`tatus`/`tmp.mjs`), fix the NUL byte in `AuctionsPage.tsx`.

---

## 16. Coverage statement

- **Toolchain:** typecheck, lint, test, build, and `pnpm audit --prod` were all executed this session (results in §3) — read-only, no DB mutation or external calls.
- **API:** 100% of the 36 modules' route handlers inventoried and read (split across two passes); `schema.prisma` money/stock/escrow/index models read in full. Business-logic pass additionally deep-read orders/wallet/me/admin/hires/auctions/buyer-bids/invoices/markets/fx/wishlist and the transport/loaders money paths.
- **Web:** App/routing, api-client interceptors, MarketPage/ProductPage/AuctionsPage/WebsitePage, console (ConsolePage, Buyer sections), CurrencyContext, useWishlist, ErrorState, Modal, sections.tsx (~85%), i18n locale spot-checks. Not line-audited: OtpLogin/Verify/Forgot/Reset pages, most transporter/loaderco/worker sections (error-pattern confirmed by grep), chat/directory internals.
- **Mobile:** App/navigation/linking/push/queryClient/auth/ui + public + buyer screens read in full; error/refresh/back/keyboard/font patterns verified by repo-wide grep (isError 9/71, RefreshControl 0, BackHandler 0, NetInfo 0). Not line-audited: transporter/loaderco/worker section screens, money screens, filter/picker sheets (assessed via grep — likely additional instances of the MOB-01 class).
- **Admin:** App/auth/layout/permissions + Overview/Users/Payments/SafeDeal/Disputes/KYC/Audit read in full; ~15 remaining pages sampled by grep for pagination/mutation/confirm patterns.
- **Infra/security:** both compose files, 3 Dockerfiles, nginx.conf, `.dockerignore`, CI, `.env.example` vs full env-read inventory, migrations listing, git history for committed secrets, `backups/` (names/sizes only).
- **Not covered:** deployed-host configuration, live DB state, on-device runtime behavior, git-history content mining beyond env additions, and a per-page line audit of the ~15 sampled admin pages and role-specific client sections. No files were modified.
