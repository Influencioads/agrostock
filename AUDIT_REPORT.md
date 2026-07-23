# AgroTraders Full Ecommerce Production Audit

**Audit date:** 2026-07-23  
**Audited state:** current dirty worktree on `main` (`5b70717`), including staged, unstaged, and untracked application changes present during the audit. The worktree changed while checks were running; command results below use the final revalidated snapshot unless noted.  
**Audit mode:** read-only source/runtime-tooling review. No database mutation, seed, migration, paid API call, deployment, or external write was performed. This report is the only file created by the audit.

## 1. Executive summary

**Production audit: 29/100 — blocked. Do not launch with real money or customer data.**

The platform has substantial marketplace breadth—catalog, auctions, RFQs, logistics, invoices, reviews, multi-role dashboards, admin tooling, chat, localization, and mobile apps—but its revenue boundary is a demo implementation. A buyer can mark an order “paid” through a status patch without any debit; any authenticated user can mint wallet funds through a mock top-up; refunds/releases are credited without a real escrow source; and concurrent payout/dispute requests can move money twice. The production Docker configuration also builds web/admin clients against `http://localhost:3000` under the documented environment setup, which breaks all deployed browser API calls. These are launch blockers, not polish issues.

### Health scores

| Area | Score | Verdict |
|---|---:|---|
| Feature completeness | 4/10 | Broad B2B marketplace, incomplete ecommerce transaction stack |
| Commerce/business logic | 1/10 | Payment, escrow, inventory, idempotency, and concurrency are unsafe |
| Backend/API | 4/10 | Large guarded API, but validation, token-purpose, pagination, and RBAC gaps |
| Web storefront | 4/10 | Functional catalog; transactional mock fallbacks and dead commerce controls |
| Mobile app | 3/10 | Broad navigation; checkout/payment/offline/deep-link paths incomplete |
| Admin panel | 5/10 | Broad capabilities; risky financial overrides and incomplete client RBAC |
| Security | 3/10 | Several good controls, but session/token/RBAC/build-context risks remain |
| Reliability/operations | 3/10 | No proven backups/rollback/readiness/durable jobs/observability |
| Testing/CI | 4/10 | Typecheck/build exist; tests and lint are red; no E2E/native/coverage gate |
| Performance/SEO/accessibility | 4/10 | Large bundles, generic SPA SEO, unbounded reads, accessibility gaps |

### Top 10 launch blockers

1. A generic buyer status patch marks an order `paid` without charging or holding funds (`apps/api/src/orders/orders.module.ts:104-113,420-450`).
2. Authenticated users can mint wallet credit through an explicitly mocked top-up (`apps/api/src/me/me.module.ts:41-51,212-214,418-420`).
3. Dispute resolution creates unbacked wallet funds and can settle the same dispute twice (`apps/api/src/admin/admin.module.ts:582-628`).
4. Wallet debits and payout approvals are race-unsafe and non-atomic (`apps/api/src/wallet/wallet.service.ts:60-67`; `apps/api/src/admin/admin.module.ts:971-983`).
5. No stock/variant/reservation model or enforcement exists; Buy Now can oversell unlimited supply (`apps/api/prisma/schema.prisma:591-663`; `apps/api/src/orders/orders.module.ts:323-350`).
6. Orders have no idempotency key; double taps/retries create duplicates (`apps/api/src/orders/orders.module.ts:323-350`; `apps/api/prisma/schema.prisma:665-719`).
7. Production Compose ignores the documented API URL variable and resolves browser bundles to localhost (`.env.example:69-70`; `infra/docker-compose.prod.yml:106-125`).
8. Short-lived invoice/KYC/statement download JWTs are accepted as full Bearer access tokens (`apps/api/src/auth/jwt.strategy.ts:19-40`; `apps/api/src/statements/statements.module.ts:66-75`).
9. Production Docker build contexts include database/file backups and runtime logs (`.dockerignore:1-17`; all Dockerfiles use `COPY . .`).
10. The current test suite fails and lint is red; CI also omits integration/E2E/native/coverage gates (`apps/api/test/admin-role-provisioning.spec.ts:31-43`; `.github/workflows/ci.yml:25-55`).

## 2. Architecture overview

The supplied stack context differs from the repository: there is **no Next.js and no PM2 configuration**. This is a pnpm 9/Turbo monorepo:

- `apps/api`: NestJS 10, Prisma 5.22, PostgreSQL, REST + Socket.IO. Global `/api` prefix, `ValidationPipe`, Helmet, CORS, throttling, JWT auth, granular admin permissions.
- `apps/web`: React 18 + React Router + Vite SPA. Public marketplace and role-based console.
- `apps/admin`: React 18 + React Router + Vite SPA. Back-office modules for users, products, orders, finance, KYC, content, support, and reports.
- `apps/mobile`: Expo 54 / React Native 0.81, React Navigation, TanStack Query, SecureStore, FCM/expo-notifications, five role-specific tab sets.
- Shared packages: API client, UI primitives, i18n/locales, design tokens, geographic data, types/config.
- Data/services: PostgreSQL through Prisma; Redis for Socket.IO; MinIO/S3 for chat attachments; API-local named volumes for product/private uploads; SMTP email; Firebase push; Google Maps/Translate integrations.
- Async work: process-local `EventEmitter2` listeners and an in-memory serialized translation queue. No Bull/queue worker, cron framework, or durable outbox was found.
- Deployment: Docker Compose builds API/web/admin images; nginx serves each SPA. Compose binds services to loopback for an expected external reverse proxy, but that TLS/proxy configuration is not in the repository.
- CI: GitHub Actions installs, generates Prisma, typechecks, lints, tests, builds, then builds Docker images for api/web/admin.
- Database: one 2,109-line Prisma schema and 31 migration directories in the audited tree.

### Primary data flow

`Web / Admin / Mobile → shared Axios client → Nest controllers/guards/DTOs → services → Prisma/PostgreSQL → response → React Query/UI`

Realtime notification/chat flow is `DB notification/message → in-process event → Socket.IO / Firebase / SMTP`. Because the external fan-out is not durable, a crash after the DB write can permanently lose delivery.

### Half-built, dead, or misleading surfaces

- Mobile `Checkout` is registered but no UI navigates to it; it still only submits slug + quantity (`apps/mobile/src/navigation/RootNavigator.tsx:62-64`; `apps/mobile/src/screens/public/Checkout.tsx:27-83`).
- “Saved” on web/mobile returns all Safe Deal products, not user favorites (`apps/web/src/console/sections/BuyerExtras.tsx:67-89`; `apps/mobile/src/screens/buyer/Saved.tsx:15-47`).
- Web product cards contain a dead Buy button and a heart with no handler (`apps/web/src/components/site/ProductCard.tsx:36-58,95-102`).
- KYC admin falls back to demo identities when the live API fails (`apps/admin/src/pages/KycPage.tsx:43-78`).
- Homepage/product outage fallbacks can present demo inventory as live (`apps/web/src/components/site/sections.tsx:670-682`; `apps/web/src/pages/ProductPage.tsx:44-50`).
- Product “watching,” monthly order counts, and quality scores are invented constants/deterministic pseudo-data (`packages/api-client/src/helpers.ts:23-33`; `apps/web/src/pages/ProductPage.tsx:18-25`).

## 3. Verification commands and results

| Command | Result | Relevant output |
|---|---|---|
| `pnpm typecheck` | **PASS** | 13/13 Turbo tasks successful on final revalidation |
| `pnpm lint` | **FAIL** | 2 errors, 3 warnings. Errors are CommonJS `require` / undefined `require` at `apps/mobile/index.js:16`; warnings include unused import/directives |
| `pnpm test` | **FAIL** | Web 1/1 pass; mobile 22/22 pass; API 78/80 pass. Two `admin-role-provisioning` tests fail because `this.audit` is undefined at `apps/api/src/admin/admin.module.ts:1030` |
| `pnpm build` | **PASS** | API, web, admin built. Vite warned about large chunks: web entry ~1.68 MB raw, Globe chunk ~1.92 MB, admin entry ~1.20 MB |
| Prisma schema validation | **PASS** | `prisma validate` passed with a temporary nonconnecting URL; no DB mutation |
| Production Compose config | **PASS syntax / FAIL behavior** | Compose validates, but resolves web/admin `VITE_API_URL` to `http://localhost:3000` with the documented env names |
| `pnpm audit --prod` | **INCONCLUSIVE** | Failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; dependency vulnerability status is unknown. TLS verification was not disabled |
| Migration status (local DB only) | **31 found; 7 pending locally** | Not evidence of production drift; production DB was not accessed |

CI installs with `--no-frozen-lockfile`, excludes API integration specs from the normal suite, has no Postgres service, does not build native mobile binaries, does not run browser/mobile E2E, and enforces no coverage threshold (`.github/workflows/ci.yml:25-55`; `apps/api/vitest.config.ts:9-12`).

## 4. Findings

### Phase 1 — Feature completeness and reachability

#### [🟠 High] Checkout/payment is absent while the UI claims protected payment

- **Location:** `apps/mobile/src/screens/public/Checkout.tsx:27-34,58-83`; `apps/web/src/pages/ProductPage.tsx:100-110`; `apps/api/src/orders/orders.module.ts:35-38`
- **Evidence:** `PlaceOrderDto` accepts only `productSlug` and `qty`; mobile displays price/quantity and calls `api.orders.place`; web Buy Now calls the same endpoint directly.
- **Impact:** No address, shipping method/fee, tax, coupon, payment method, provider confirmation, failure/retry, or final server-priced summary exists. Orders enter `processing` without being deliverable or paid.
- **Fix:** Replace direct order creation with a server-authoritative checkout session and payment/escrow state machine.
- **Effort:** L

#### [🟠 High] “Saved” is not a wishlist and product-card controls are dead

- **Location:** `apps/web/src/console/sections/BuyerExtras.tsx:67-89`; `apps/mobile/src/screens/buyer/Saved.tsx:15-47`; `apps/web/src/components/site/ProductCard.tsx:36-58,95-102`
- **Evidence:** Both Saved screens call `products.list({ safe: true })`; the card heart and Buy controls have no action.
- **Impact:** Users see products they never saved, cannot add/remove favorites, and cannot reliably buy from catalog cards.
- **Fix:** Add user-product wishlist persistence and mutations; separate interactive controls from the card link and label them accessibly.
- **Effort:** M

#### [🟠 High] Buyer cancellation/dispute paths are unreachable in web/mobile

- **Location:** `packages/api-client/src/index.ts:969-974`; `apps/web/src/console/sections/BuyerOrders.tsx:47-76`; `apps/mobile/src/screens/buyer/Orders.tsx:39-81`
- **Evidence:** `nextStatusFor` deliberately filters `cancelled` and `dispute`; order screens expose only the next generic status action.
- **Impact:** Customers cannot exercise cancellation or dispute flows even though backend states exist.
- **Fix:** Add policy-aware cancel/open-dispute operations, confirmation, reason capture, and refund/stock/notification side effects.
- **Effort:** M

#### [🟠 High] Moderated/expired listings remain directly readable and orderable

- **Location:** `apps/api/src/products/products.module.ts:309-321`; `apps/api/src/orders/orders.module.ts:323-350`
- **Evidence:** Both detail and Buy Now use `findUnique({ where: { slug } })` without enforcing approved/live/nonexpired/non-auction status.
- **Impact:** A known slug bypasses moderation or auction-only constraints.
- **Fix:** Apply a shared purchasable-listing predicate to public detail, order creation, RFQ, and auction actions.
- **Effort:** S

#### [🟡 Medium] Notification links target undefined routes

- **Location:** `apps/web/src/App.tsx:78-92`; `apps/web/src/console/NotificationBell.tsx:103-113`; `apps/mobile/src/navigation/navigationRef.ts:10-16`
- **Evidence:** The web defines only exact `/console`, while API links include `/orders/:id`, `/console/invoices`, and `/console/wallet`; mobile sends all non-chat notifications to the generic Notifications screen.
- **Impact:** Order/invoice/wallet/shipment notification taps are dead ends, including cold starts.
- **Fix:** Define nested URL/deep-link routes and preserve resource IDs through notification payloads.
- **Effort:** M

### Phase 2 — Business logic, money, stock, and state machines

#### [🔴 Critical] “Pay escrow” is only a status change

- **Location:** `apps/api/src/orders/orders.module.ts:104-113,420-450`; `apps/web/src/console/sections/BuyerOrders.tsx:73-76`; `apps/mobile/src/screens/buyer/Orders.tsx:75-81`
- **Evidence:** `processing → paid` is buyer-allowed; the transaction executes `order.update({ data: { status } })` and an event. No wallet debit, payment provider, or escrow record is touched.
- **Impact:** Buyers can self-declare payment. Seller/admin dashboards and Safe Deal copy treat an unfunded order as paid/escrow-held.
- **Fix:** Remove `paid` from the generic endpoint. Only an atomic wallet hold or signature-verified, idempotent provider webhook may create the paid state.
- **Effort:** L

#### [🔴 Critical] Any authenticated user can mint wallet money

- **Location:** `apps/api/src/me/me.module.ts:41-51,212-214,418-420`; `apps/mobile/src/screens/components/MoneyScreens.tsx:94-122`
- **Evidence:** Source comment: `mock top-up — it credits the wallet with no payment gateway`; route credits `Math.round(amountDollars * 100)` directly.
- **Impact:** An account can fabricate up to $1,000,000 per request and request payouts or participate in escrow-like flows.
- **Fix:** Remove/production-disable the endpoint; credit only from a reconciled provider transaction/webhook.
- **Effort:** L

#### [🔴 Critical] Dispute settlement creates unbacked funds and can execute twice

- **Location:** `apps/api/src/admin/admin.module.ts:582-628`; `apps/api/src/wallet/wallet.service.ts:38-43`
- **Evidence:** Settlement uses only `order.amountCents`, directly credits wallets, and checks `status === 'dispute'` before a transaction that updates by ID without the old status predicate.
- **Impact:** A status-only “paid” order produces real credits; concurrent admin requests can duplicate a refund/release.
- **Fix:** Link every settlement to a unique funded escrow hold; atomically claim/consume it under a lock or conditional update.
- **Effort:** L

#### [🔴 Critical] Wallet and payout balance changes are race-unsafe

- **Location:** `apps/api/src/wallet/wallet.service.ts:60-67`; `apps/api/src/me/me.module.ts:224-233`; `apps/api/src/admin/admin.module.ts:971-983`
- **Evidence:** Code reads a balance, separately writes a ledger entry, then decrements. Payout approval reads `pending`, calls standalone debit, then separately updates request status.
- **Impact:** Concurrent debits can make balances negative; payout decisions can double-debit or leave money moved while the request stays pending/retriable.
- **Fix:** One serializable transaction with conditional balance/status updates and ledger creation; require exactly one claimed row.
- **Effort:** M

#### [🟠 High] No inventory/stock/reservation model exists

- **Location:** `apps/api/prisma/schema.prisma:591-663`; `apps/api/src/orders/orders.module.ts:323-350`; `apps/mobile/src/screens/seller/Inventory.tsx:22-55`
- **Evidence:** Product has display strings `qty`/`moq`, no canonical stock or variant rows; order creation performs no availability check/decrement/reservation.
- **Impact:** Unlimited buyers can purchase the same supply; out-of-stock cart handling, negative-stock prevention, and cancellation restoration are impossible.
- **Fix:** Model canonical quantity/unit and variants; add atomic reservations with expiry, commit/release rules, and DB constraints.
- **Effort:** L

#### [🟠 High] Order creation is not idempotent and references collide

- **Location:** `apps/api/src/orders/orders.module.ts:28,323-350`; `apps/api/prisma/schema.prisma:665-719`
- **Evidence:** Every request creates a new order; no client idempotency field exists. References have only 9,000 possibilities: `AG-` + a random four-digit number.
- **Impact:** Double taps/retries create duplicate orders; random reference collisions cause unique-constraint failures as volume grows.
- **Fix:** Persist a buyer-scoped idempotency key and use a sequence/ULID-sized reference.
- **Effort:** M

#### [🟠 High] Price, unit, and display math can disagree

- **Location:** `apps/api/src/products/products.module.ts:81-92,368-375`; `apps/api/src/orders/orders.module.ts:30-31,296-309,335-341`
- **Evidence:** Product price is a permissive string/`parseFloat`; persisted display uses `Math.round(cents / 100)`; orders hardcode `qtyUnit: 'MT'`; seller may independently supply both unit and total price.
- **Impact:** Negative/malformed prices can enter commerce; $10.50 displays as $11; non-MT products are ordered/invoiced as metric tons; quote total may differ from invoice math.
- **Fix:** Integer minor-unit inputs with currency and bounds; snapshot the canonical product unit; derive one price field from the other using one rounding policy.
- **Effort:** M

#### [🟠 High] Order/admin/trip transitions are race-unsafe or unconstrained

- **Location:** `apps/api/src/orders/orders.module.ts:420-446`; `apps/api/src/admin/admin.module.ts:549-560`; `apps/api/src/transport/transport.module.ts:189-203,362-365`
- **Evidence:** Order state is read before an ID-only update; admin explicitly bypasses the state machine; transporter accepts a raw inline `TripStatus` and directly updates it.
- **Impact:** Concurrent requests create contradictory timelines; admins can deliver cancelled/unpaid orders without side effects; delivered trips can move backward.
- **Fix:** Conditional/locked transitions and explicit privileged commands with refund, stock, OTP, trip, audit, and notification side effects in one transaction.
- **Effort:** M

#### [🟠 High] Invoice issuer controls totals and self-attests payment

- **Location:** `apps/api/src/invoices/invoices.module.ts:49-70,159-176,328-348`; `apps/api/prisma/schema.prisma:813-849`
- **Evidence:** Issuer supplies arbitrary lines/tax, can invoice broadly by ownership, and issuer/admin can set paid/void. `orderId` is indexed, not unique.
- **Impact:** Duplicate/inflated invoices can be created for nonbillable orders and marked paid without a payment record.
- **Fix:** Derive immutable order lines/tax server-side; constrain billable states/duplicate policy; provider or recipient confirmation owns payment status.
- **Effort:** L

#### [🟠 High] RFQ and transport quote acceptance are not atomic

- **Location:** `apps/mobile/src/screens/public/RfqBasket.tsx:68-94`; `apps/api/src/transport/transport.module.ts:151-168`; `apps/api/prisma/schema.prisma:1004-1014,1049-1072`
- **Evidence:** Mobile sequentially posts one RFQ per line and marks a supplier sent only after all succeed. Transport acceptance independently updates quote/request then creates a trip; duplicate transporter quotes are allowed.
- **Impact:** Partial retry duplicates RFQs; quote acceptance can leave mismatched states or fail late after earlier writes.
- **Fix:** Idempotent transactional batch RFQ endpoint; transactional conditional quote acceptance and unique `(requestId, transporterId)`.
- **Effort:** M

### Phase 3 — API validation, authorization, and data access

#### [🟠 High] Download JWTs are valid full-account Bearer tokens

- **Location:** `apps/api/src/auth/jwt.strategy.ts:19-40`; `apps/api/src/statements/statements.module.ts:66-75,248-255`; `apps/api/src/kyc/kyc.module.ts:119-125`; `apps/api/src/invoices/invoices.module.ts:352-362`
- **Evidence:** Download tokens use `JWT_SECRET` and contain `sub`; `JwtStrategy` accepts any correctly signed payload and reloads by `sub`, without token type/audience.
- **Impact:** A token leaked through URL history, access logs, analytics, or referrers grants full API access for its lifetime.
- **Fix:** Separate key/audience/purpose and require `typ: access` in the Bearer strategy.
- **Effort:** M

#### [🟠 High] Scoped support RBAC is bypassed through WebSockets

- **Location:** `apps/api/src/support/support.gateway.ts:34-50,84-90`; `apps/api/src/support/support.service.ts:26,49-55,112-123`; contrast `apps/api/src/support/support.controller.ts:76-81`
- **Evidence:** Any role `admin` joins the agent room and service `isStaff` is any admin, while REST correctly requires `support_agent`.
- **Impact:** Admins lacking support permission can receive ticket/email/message payloads and operate known tickets over sockets.
- **Fix:** Centralize permission checks and apply them to handshake, rooms, socket actions, service methods, attachments, and REST.
- **Effort:** M

#### [🟠 High] `users_manage` can grant the `admin` role

- **Location:** `apps/api/src/admin/admin.module.ts:177-221,382,1175-1199`; `apps/api/src/auth/guards.ts:33`
- **Evidence:** User DTOs accept the full `Role` enum, including admin; `users_manage` endpoints create/grant it outside `staff_manage`.
- **Impact:** A scoped operator can promote a customer into admin-only paths, including paths that incorrectly treat every admin as full staff.
- **Fix:** Reject admin in customer user/role operations; provision admins exclusively behind `staff_manage`.
- **Effort:** S

#### [🟠 High] Upload limits are enforced after buffering; S3 object size is client-declared

- **Location:** `apps/api/src/me/me.module.ts:453`; `apps/api/src/uploads/uploads.service.ts:53-62`; `apps/api/src/attachments/attachments.service.ts:99-117`
- **Evidence:** `FileInterceptor('file')` has no Multer limits; service checks an already buffered file. Presigned PUT specifies content type but no enforced content length.
- **Impact:** Oversized bodies consume API memory; presigned uploads can exceed declared size and exhaust object storage.
- **Fix:** Multer file/field limits, streaming, signed size policy, and post-upload HEAD verification/AV scanning.
- **Effort:** M

#### [🟠 High] Runtime-unvalidated money/state bodies reach Prisma

- **Location:** `apps/api/src/transport/transport.module.ts:338-365`; `apps/api/src/loaders/loaders.module.ts:843-857`; `apps/api/src/admin/admin.module.ts:1248-1251`; `apps/api/src/catalog/catalog.module.ts:550-552`
- **Evidence:** Inline TypeScript body shapes and `Partial<DTO>` erase runtime metadata, so the global validation pipe cannot enforce integer/enum/bounds/whitelist rules.
- **Impact:** Negative/huge quote amounts, invalid states, or mass-assigned fields reach persistence and can produce 500s or corrupt workflow data.
- **Fix:** Concrete class DTOs with validators/`PartialType`, explicit field mapping, and bounded numeric query DTOs.
- **Effort:** M

#### [🟠 High] Hot lists and indexes will not scale

- **Location:** `apps/api/src/orders/orders.module.ts:381-405`; `apps/api/src/directory/directory.module.ts:147-223`; `apps/api/src/invoices/invoices.module.ts:305-310`; `apps/api/prisma/schema.prisma:591-663,951-967,989-1141`
- **Evidence:** Customer histories/directories/invoices are unbounded. `WalletTx` lacks `[walletId, createdAt]`; Product/logistics/workforce models lack indexes matching frequent filters/sorts.
- **Impact:** Payload/query cost grows without bound; wallet statements and catalog/logistics reads degrade into scans.
- **Fix:** Cursor pagination with caps; add query-shaped indexes verified by `EXPLAIN ANALYZE` against production-like data.
- **Effort:** M

#### [🟡 Medium] CORS fails open and WebSocket origins ignore the HTTP allowlist

- **Location:** `apps/api/src/main.ts:40-48`; `apps/api/src/community/community.gateway.ts:28`; `apps/api/src/support/support.gateway.ts:34`
- **Evidence:** Missing HTTP origins becomes `origin: true` with credentials; both gateways use `cors: { origin: true, credentials: true }`.
- **Impact:** A missing production variable silently broadens browser/WebSocket origins.
- **Fix:** Refuse production startup without an explicit allowlist and share it with Socket.IO.
- **Effort:** S

#### [🟡 Medium] One-shot auth tokens can be consumed concurrently

- **Location:** `apps/api/src/auth/auth.service.ts:211-221,277-288,328-343`
- **Evidence:** Code reads `usedAt`, then later updates token + account in a transaction without conditionally claiming `usedAt: null`.
- **Impact:** Concurrent verification/reset/OTP calls may each obtain sessions or reset the password.
- **Fix:** Conditional `updateMany` claim with expiry/unused predicate and require count one.
- **Effort:** M

### Phase 4 — End-to-end functional breaks

#### [🔴 Critical] Web can display and order the wrong product while loading

- **Location:** `apps/web/src/pages/ProductPage.tsx:38-50,100-110,289-312`
- **Evidence:** Before the requested live product resolves, `product = resolved ?? mockProducts[0]`; the page and Buy button render; mutation uses `product.id`.
- **Impact:** On a slow request for a nonmock slug, a buyer can see and order an unrelated demo product.
- **Fix:** Render a blocking loading/error/not-found state; never use transactional mock fallback; bind ordering only to a verified API product.
- **Effort:** S

#### [🟠 High] Mobile refresh failure leaves a ghost authenticated UI

- **Location:** `apps/mobile/src/lib/api.ts:61-67`; `apps/mobile/src/auth/AuthProvider.tsx:45-47,155-169`
- **Evidence:** `onAuthError` clears token caches only; navigation continues from separate `user` state and persisted `USER_KEY`.
- **Impact:** Every protected request fails while private dashboards still appear signed in; restart restores the stale user.
- **Fix:** Route terminal refresh failure through one canonical logout that clears user/role/query cache and navigates to sign-in.
- **Effort:** M

#### [🟠 High] Logout leaves the old push token registered

- **Location:** `apps/mobile/src/auth/AuthProvider.tsx:141-152`; `apps/mobile/App.tsx:31-39`; `apps/mobile/src/lib/push.ts:130-140`
- **Evidence:** Logout clears auth before `PushManager` calls the JWT-guarded unregister endpoint; failures are swallowed.
- **Impact:** A shared/logged-out device may continue receiving the previous account’s private notifications.
- **Fix:** Unregister while the access token is valid, then clear auth; securely retry/server-prune on failure.
- **Effort:** S

#### [🟠 High] Multi-role web UI and API execute different roles

- **Location:** `apps/web/src/auth/AuthContext.tsx:63-68`; `apps/web/src/console/ConsolePage.tsx:127-168`; `apps/web/src/lib/api.ts:17-32`; `packages/api-client/src/index.ts:1362-1368`
- **Evidence:** UI stores/switches `activeRole`, but web client omits `getActiveRole`, so `x-agro-active-role` is never sent.
- **Impact:** Secondary-role dashboards produce 403s or load records for the wrong role.
- **Fix:** Supply active role to the API client and invalidate all role-scoped caches after switching.
- **Effort:** S

#### [🟡 Medium] Catalog/order failures masquerade as empty/loading states

- **Location:** `apps/web/src/pages/MarketPage.tsx:171-180,635-676`; `apps/mobile/src/screens/public/ProductDetail.tsx:80-98`; `apps/mobile/src/screens/buyer/Orders.tsx:21-42`; `apps/admin/src/pages/OrdersPage.tsx:105-170`
- **Evidence:** Errors default to `[]`, “no results,” or an indefinite skeleton; admin order list does not render loading/error.
- **Impact:** Users/operators interpret outages as no products/orders, cannot retry, and may act on false state.
- **Fix:** Distinct loading, retryable error, permission, offline, and successful-empty states.
- **Effort:** M

### Phase 5 — UI, mobile, SEO, accessibility, and product trust

#### [🟠 High] Fabricated social proof and quality scores are shown as real

- **Location:** `packages/api-client/src/helpers.ts:23-33`; `apps/web/src/components/site/ProductCard.tsx:19-22,85-90`; `apps/web/src/pages/ProductPage.tsx:18-25,256-268`
- **Evidence:** A hash invents 40–320 watchers and 3–48 monthly orders; every product gets fixed 96/92/95/94 quality bars.
- **Impact:** Customers receive false scarcity/performance/quality claims at the buying decision.
- **Fix:** Calculate from auditable events/inspection data or remove/clearly mark demo-only content outside production.
- **Effort:** M

#### [🟠 High] Paid placements are not disclosed

- **Location:** `apps/web/src/components/site/sections.tsx:654-669`; `apps/web/src/pages/MarketPage.tsx:182-187`
- **Evidence:** Approved paid slots render without a Sponsored/Ad label and are promoted to the front of the market list.
- **Impact:** Advertising disclosure, trust, and accessibility risk.
- **Fix:** Persistent localized Sponsored badge/accessible label in every paid placement.
- **Effort:** S

#### [🟠 High] Mobile catalog exposes only the first page

- **Location:** `apps/mobile/src/screens/components/filterState.ts:97-113`; `apps/mobile/src/screens/public/Browse.tsx:53-59,114-145`; `packages/api-client/src/index.ts:1277-1288`
- **Evidence:** Queries never set page/pageSize; UI displays `total` but renders `items` once in a `ScrollView`, with no load more/infinite query.
- **Impact:** Products beyond the default server page are unreachable.
- **Fix:** `useInfiniteQuery` plus virtualized grid and `onEndReached`.
- **Effort:** M

#### [🟡 Medium] Web SEO is generic SPA-only

- **Location:** `apps/web/index.html:6-24`; `apps/web/src/main.tsx:3-20`; `apps/web/src/App.tsx:92`
- **Evidence:** One static title/description/OG URL/image; no route metadata, canonical, Product JSON-LD, sitemap, or robots files; unknown URLs redirect home.
- **Impact:** Product/category pages have weak crawl/social previews and no true 404 semantics.
- **Fix:** SSR/prerender route metadata and structured data, sitemap/robots, canonical URLs, and real 404.
- **Effort:** L

#### [🟡 Medium] Mobile URL deep linking is declared but not routed

- **Location:** `apps/mobile/app.json:5-8`; `apps/mobile/android/app/src/main/AndroidManifest.xml:25-31`; `apps/mobile/App.tsx:73-76`
- **Evidence:** Custom schemes exist, but `NavigationContainer` has no `linking` configuration.
- **Impact:** Product/order/profile links launch the app without opening the correct screen.
- **Fix:** Typed route mapping plus verified HTTPS app/universal links and cold/warm-start tests.
- **Effort:** M

#### [🟡 Medium] Shared dialogs/buttons miss core accessibility behavior

- **Location:** `packages/ui/src/Modal.tsx:21-65`; `apps/mobile/src/ui/index.tsx:137-182`; `apps/mobile/src/screens/public/ProductDetail.tsx:189-197`
- **Evidence:** Web modal lacks dialog semantics, label, Escape/focus trap/restore. Mobile shared Button lacks accessibility role/state; icon quantity controls are unlabeled; small buttons are 38px tall.
- **Impact:** Keyboard, screen-reader, and motor-impaired users cannot reliably operate critical forms/actions.
- **Fix:** Correct shared primitives first: semantics, focus management, labels/state, and ≥44px targets.
- **Effort:** M

#### [🟡 Medium] Mobile has no real offline/focus recovery

- **Location:** `apps/mobile/src/lib/queryClient.ts:3-9`
- **Evidence:** Only retry/stale-time are configured; no NetInfo/onlineManager/focusManager/AppState integration, persisted query cache, offline banner, or pull-to-refresh was found.
- **Impact:** Backgrounded sessions can stay stale; poor-network failures look empty/loading; offline restart is unusable.
- **Fix:** Wire network/AppState to TanStack Query, persist safe reads, add offline/retry UI and refresh controls.
- **Effort:** M

### Phase 6 — Security

#### [🟠 High] Dispatch OTPs are weak, permanent, and unmetered

- **Location:** `apps/api/src/orders/orders.module.ts:28-29,557-611`; `apps/api/src/app.module.ts:48,88`
- **Evidence:** Pickup/delivery codes use four digits from `Math.random()` (9,000 possibilities); verification has no per-order attempt counter, expiry, rotation, or endpoint-specific throttle beyond the broad 120/minute global limit.
- **Impact:** An assigned transporter can brute-force a code and codes remain valid indefinitely until used.
- **Fix:** Cryptographic random 6+ digit codes, hash at rest, short expiry, rotation, per-order attempt lockout and endpoint/account throttling.
- **Effort:** M

#### [🟡 Medium] Auth OTP/resend protection is IP-only

- **Location:** `apps/api/src/auth/auth.controller.ts:45-74`; `apps/api/src/auth/auth.service.ts:305-343`
- **Evidence:** Request/resend endpoints use IP throttles, while service replaces outstanding codes but has no Redis/DB account cooldown or rolling recipient quota. Verification does cap attempts at five.
- **Impact:** Distributed clients can repeatedly email one victim and invalidate the code/link the victim is trying to use.
- **Fix:** Add per-account/device cooldowns and rolling quotas alongside IP limits.
- **Effort:** M

#### [🟠 High] Web/admin store access and refresh tokens in `localStorage`

- **Location:** `apps/web/src/auth/AuthContext.tsx:72-78`; `apps/admin/src/auth/AuthContext.tsx:31-40`; `apps/web/src/lib/api.ts:17-25`
- **Evidence:** Both token types are written/read from `localStorage`.
- **Impact:** Any XSS or compromised third-party script can exfiltrate the seven-day refresh capability.
- **Fix:** Rotated HttpOnly Secure SameSite refresh cookie; short-lived access token in memory; CSRF controls appropriate to cookie mode.
- **Effort:** L

#### [🟠 High] Refresh tokens cannot be revoked and survive password reset

- **Location:** `apps/api/src/auth/auth.service.ts:36-67,287-296`; `apps/api/src/auth/auth.controller.ts:23-90`
- **Evidence:** Refresh JWTs are stateless; refresh issues a new pair but prior tokens remain valid; reset updates password only. No logout/logout-all/session inventory endpoint exists.
- **Impact:** A stolen refresh token survives recovery and remains usable until expiry.
- **Fix:** Persist hashed token families/JTIs, rotate, detect replay, revoke on reset/deactivation/logout/all-devices.
- **Effort:** L

#### [🟠 High] Sensitive backups/logs are sent into Docker builder contexts

- **Location:** `.dockerignore:1-17`; `infra/Dockerfile.api:8-10`; `infra/Dockerfile.web:6-8`; `infra/Dockerfile.admin:6-8`
- **Evidence:** Ignore rules omit `backups/`, archives/dumps, `.local-logs`, and `*.log`; each build starts `COPY . .`. Current context contains a PostgreSQL dump, file/MinIO archives, mobile zip, and runtime logs.
- **Impact:** Customer/database/log data enters local or remote builder layers/cache even though final stages copy selected outputs.
- **Fix:** Move backups outside repo; deny dumps/archives/logs in `.dockerignore`; use allowlisted COPY paths and purge/rotate exposed builder caches.
- **Effort:** S

#### [🟠 High] Production Compose has guessable credential fallbacks

- **Location:** `infra/docker-compose.prod.yml:15-18,44-46,71-77`; `apps/api/src/main.ts:13-28`
- **Evidence:** DB and MinIO default to `agrostock`/`agrostock-secret`; production startup only rejects two exact JWT placeholders/equality, not weak DB/S3/JWT values.
- **Impact:** Missing secrets silently deploy predictable backing-service credentials.
- **Fix:** `${VAR:?required}` or secret manager/Docker secrets, startup length/entropy checks, no production defaults.
- **Effort:** S

#### [🟠 High] Current native Android source permits cleartext traffic

- **Location:** `apps/mobile/android/app/src/main/AndroidManifest.xml:16`; conflicting intent `apps/mobile/app.config.js:35-61`
- **Evidence:** Committed manifest has `android:usesCleartextTraffic="true"`; config plugin intends false only for production.
- **Impact:** The current native source permits HTTP. Whether EAS resynchronizes it must be verified from the signed artifact.
- **Fix:** Explicitly disallow cleartext in production native configuration and inspect the merged release manifest in CI.
- **Effort:** S

#### [🟡 Medium] Public demo credentials can become a production admin compromise

- **Location:** `apps/api/prisma/seed.ts:157-163,303,409-416`; `apps/web/src/auth/AuthContext.tsx:139-141`; `apps/admin/src/pages/LoginPage.tsx:45-60`
- **Evidence:** Seed creates buyer through admin/scoped-admin accounts with `password123`; web/admin expose demo credentials/actions.
- **Impact:** If seed runs in production, public credentials include full/scoped admin access. Production DB presence was not checked, so deployment exposure remains manual verification.
- **Fix:** Gate fixtures/UI behind an explicit demo build and guarantee production never runs demo seed; rotate/delete any deployed accounts.
- **Effort:** S

### Phase 7 — Performance and reliability

#### [🔴 Critical] Production web/admin are built against browser localhost

- **Location:** `.env.example:69-70`; `infra/docker-compose.prod.yml:106-125`; `apps/web/src/lib/api.ts:4,17-19`; `apps/admin/src/lib/api.ts:3,16-18`
- **Evidence:** Docs define `VITE_API_URL`; Compose reads undocumented `PUBLIC_API_URL` and defaults to `http://localhost:3000`. Compose resolution confirmed both build args become localhost with the current documented env names.
- **Impact:** Deployed browsers call the shopper/admin machine’s localhost; all API-driven flows fail.
- **Fix:** One canonical required public API variable, validated in CI/Compose, followed by rebuilt images.
- **Effort:** S

#### [🟠 High] Health is static and Compose does not gate required dependencies

- **Location:** `apps/api/src/health.controller.ts:5-18`; `infra/docker-compose.prod.yml:24-64`
- **Evidence:** Health always returns `status: ok` without DB/Redis/storage probes; only Postgres has a healthcheck, while API depends on Redis/MinIO as merely started.
- **Impact:** Traffic can be routed to an API unable to transact, store files, or provide realtime services.
- **Fix:** Separate liveness/readiness, bounded dependency probes, service healthchecks, and degraded capability reporting.
- **Effort:** M

#### [🟠 High] No production backup/restore or rollback path is evidenced

- **Location:** `infra/docker-compose.prod.yml:22-23,35-48,85-104,134-139`; `README.md:82-96`
- **Evidence:** Orders/users/files live only in named volumes; deploy steps migrate and rebuild in place. No automated off-host backup, RPO/RTO, restore drill, versioned images, N-1 rollback, or migration recovery runbook exists.
- **Impact:** Volume/host loss can erase data; a bad migration/release has no proven fast recovery.
- **Fix:** Encrypted off-host scheduled backups for DB/object/uploads, monitored retention and restore drills; immutable tagged images and expand/contract migration rollback plan.
- **Effort:** L

#### [🟠 High] Transactional email/push/translation delivery is non-durable

- **Location:** `apps/api/src/notifications/notifications.service.ts:76-94`; `apps/api/src/mail/mail.service.ts:225-259`; `apps/api/src/push/push.service.ts:58-80`; `apps/api/src/translation/content-translation.worker.ts:18-37`
- **Evidence:** Persisted notification is followed by in-process `events.emit`; listeners log failures with no durable retry; translation queue is process memory.
- **Impact:** Crash/redeploy loses order/payment/shipment email/push/translation work permanently.
- **Fix:** Transactional outbox + durable idempotent workers, retry/backoff/dead-letter and delivery status.
- **Effort:** L

#### [🟡 Medium] CI/release gates are incomplete and current tests/lint fail

- **Location:** `.github/workflows/ci.yml:25-55`; `apps/api/vitest.config.ts:9-12`; `apps/mobile/package.json:6-13`; `apps/api/src/admin/admin.module.ts:1030`
- **Evidence:** CI uses nonfrozen installs; integration specs excluded; no DB/E2E/native/coverage/audit gate. Current role-provisioning tests fail and lint has two errors.
- **Impact:** Database, browser, native packaging, and revenue paths can regress without detection; current branch would fail CI.
- **Fix:** Repair tests/lint; frozen installs; DB integration service/migrations; browser/mobile E2E; native build; ≥80% meaningful coverage; dependency audit policy.
- **Effort:** L

#### [🟡 Medium] No graceful shutdown, structured observability, or alerting

- **Location:** `apps/api/src/main.ts:31-81`; `apps/api/src/prisma/prisma.service.ts:8-47`; `infra/nginx.conf:1-20`
- **Evidence:** No `enableShutdownHooks`, dependency drain, request IDs, structured/redacted logs, error tracker, metrics, or alerts.
- **Impact:** Deploys can terminate in-flight orders/jobs; payment/notification failures are hard to correlate or detect.
- **Fix:** Bounded drain/close hooks plus durable jobs; correlation IDs, structured logging, Sentry/OpenTelemetry/metrics and alerts.
- **Effort:** M

#### [🟡 Medium] Bundles/images are oversized and nondeterministic

- **Location:** `apps/web/src/App.tsx:8-31`; `apps/admin/src/App.tsx:8-34`; `infra/Dockerfile.api:5-25`; `.github/workflows/ci.yml:25-26`
- **Evidence:** All routes are statically imported; build produced ~1.68 MB web entry, ~1.92 MB Globe chunk, ~1.20 MB admin entry. Images/tags are mutable; API copies whole repo/node_modules, includes dev dependencies, and runs without a nonroot `USER`.
- **Impact:** Slow cold loads and broad, drifting runtime/supply-chain surface.
- **Fix:** Route-level lazy loading and bundle budgets; frozen lockfile, digest-pinned images, pruned production dependencies, unprivileged/read-only runtime.
- **Effort:** M

## 5. Feature completeness matrix

Legend: ✅ end-to-end implemented; ⚠️ partial/broken; ❌ missing. A file or stub alone is not counted as implemented.

### Customer — auth and account

| Feature | Status | Current implementation |
|---|---|---|
| Email signup/login | ✅ | Web/mobile forms → validated Nest auth DTO/service → JWT session |
| Phone login | ❌ | No phone-auth provider/flow; phone is profile data |
| Email OTP login | ⚠️ | API/web/mobile implemented; mobile request failures/cooldown UX incomplete |
| Social login | ❌ | No OAuth/social provider |
| Forgot/reset password | ⚠️ | API + web completion; mobile request only, completion is web link |
| Email verification | ⚠️ | Implemented; silently auto-verifies if mail is disabled (`auth.service.ts:162`) |
| Profile edit/avatar | ✅ | Web/mobile + owner-scoped API; avatar upload exists |
| Multiple/default addresses | ❌ | No address model/routes/screens anywhere in Prisma/API |
| Account deletion | ❌ | Only admin deactivation/removal; no customer deletion/export flow |
| Access-token refresh | ⚠️ | Transparent refresh works; stateless refresh tokens are unrevocable; mobile terminal failure leaves ghost UI |
| Logout | ⚠️ | Client storage clear only; mobile push unregister ordering is broken |
| Logout all devices/sessions | ❌ | No persisted sessions, revocation, family replay detection, or endpoint |

### Catalog and discovery

| Feature | Status | Current implementation |
|---|---|---|
| Category tree | ✅ | Deep category/subcategory API and web/mobile selectors |
| Product pagination | ⚠️ | API capped; web uses paging; mobile shows first page only |
| Price/category/location/attribute filters | ✅ | Server query builder and web/mobile filter surfaces |
| Sorting | ✅ | Server/UI options exist |
| Product gallery/detail | ⚠️ | Gallery/attributes exist; non-live listings directly readable; web loading can show wrong mock product |
| Variants | ❌ | No variant/SKU model or order snapshot |
| Stock status/availability | ❌ | Only display strings; no canonical stock/reservation |
| Price/MRP/discount | ⚠️ | Price cents/display exist; no MRP/discount model; permissive/negative input and display rounding defect |
| Search | ⚠️ | Search/empty UI exists; no typo-tolerance evidence; mobile pagination incomplete |
| Recently viewed | ❌ | Recent search terms only |
| Related/recommended | ⚠️ | Client-side category list subset, not a complete recommendation service |

### Cart and wishlist

| Feature | Status | Current implementation |
|---|---|---|
| Web cart | ❌ | No cart route/model/API |
| Mobile cart | ⚠️ | Local RFQ basket by design, not a checkout cart (`BasketContext.tsx:5-16`) |
| Add/update/remove | ⚠️ | Mobile RFQ lines only; web has no equivalent cart |
| Quantity vs stock/MOQ | ❌ | Quantity is only clamped ≥1 |
| Price recalculation | ⚠️ | RFQ basket refetches products; no committed cart pricing |
| Guest persistence/merge | ❌ | One device-local basket key; no login merge/account sync |
| Out-of-stock cart handling | ❌ | Cannot exist without stock model |
| Wishlist add/remove | ❌ | “Saved” is a Safe Deal filter, not user data |
| Move wishlist to cart | ❌ | Neither source nor target flow exists |

### Checkout and payment

| Feature | Status | Current implementation |
|---|---|---|
| Address selection/creation | ❌ | No address data model or UI |
| Delivery options/shipping fee | ❌ | Logistics arranged later; no checkout fee calculation |
| Coupon/promo rules | ❌ | No coupon/promo model/module/routes |
| Tax calculation | ❌ | Only issuer-entered invoice tax; no checkout tax engine |
| Server order-summary equation | ❌ | Direct order is DB unit price × qty only; no shipping/tax/discount total |
| Payment gateway | ❌ | No provider SDK/module/payment model |
| Webhook signature/idempotency | ❌ | No payment webhook exists |
| COD | ❌ | No explicit method/state |
| Payment failure/retry | ❌ | No payment initiation, failure state, or retry |
| Idempotent order creation | ❌ | No client request key; unconditional create |
| Escrow | 🔴 Broken | UI/status says paid/held without debit; mock wallet funds; unsafe settlement |

### Orders and post-purchase

| Feature | Status | Current implementation |
|---|---|---|
| Confirmation screen | ⚠️ | Alert/toast only; no durable confirmation route and mobile caches not invalidated |
| Confirmation email/SMS/push | ⚠️ | Seller event notification; buyer direct-order confirmation missing; email/push nondurable; no SMS |
| History/detail/timeline | ✅ | Buyer/seller/transporter queries and order events |
| Cancellation | ⚠️ | Backend edges exist; buyer web/mobile controls absent; no refund/stock side effects |
| Returns/replacement | ❌ | No models/routes/screens |
| Refund processing/status | 🔴 Broken | Admin wallet credit is unbacked and race-unsafe |
| Invoice download | ✅ | PDF and signed short-lived URL |
| Tracking/shipping integration | ⚠️ | Internal trip/dispatch/OTP tracking; no external carrier integration |

### Notifications

| Feature | Status | Current implementation |
|---|---|---|
| In-app | ✅ | Persisted list/read/unread + sockets |
| Push | ⚠️ | FCM registration/fan-out; logout token removal and resource tap routing broken |
| Email | ⚠️ | SMTP listener/templates; no durable retry/outbox; can be disabled silently |
| SMS/WhatsApp | ❌ | No provider integration found |
| Order placed | ⚠️ | Seller notified; buyer direct-order notification absent |
| Payment failed | ❌ | No payment-failure domain event |
| Shipped/delivered | ⚠️ | Order notifications exist, but navigation payloads are incomplete |
| Refund processed | ⚠️ | Notification infrastructure exists; settlement itself is unsafe |

### Reviews and ratings

| Feature | Status | Current implementation |
|---|---|---|
| Verified-purchase submit | ✅ | Delivered/completed subject + party eligibility checks |
| Edit/delete | ⚠️ | Author edit exists; author delete absent; admin delete exists |
| Moderation | ✅ | Permission-guarded admin workflow |
| Pagination | ❌ | Public/user/review lists are unbounded |
| Aggregation | ⚠️ | Exists; product review is also counted into seller user aggregate (`reviews.module.ts:119-122,362-371`) |

### Admin panel

| Feature | Status | Current implementation |
|---|---|---|
| Dashboard metrics/reports | ✅ | Stats, volume, reports and UI |
| Product CRUD | ⚠️ | Seller CRUD/admin moderation; admin UI lacks full create/variants/bulk/stock management |
| Variants/images/bulk upload | ⚠️ | Product gallery upload exists; variants/bulk catalog absent |
| Inventory management | ❌ | “Inventory” is product listing CRUD, not stock control |
| Order status/refunds | 🔴 Broken | Broad tools exist; state override and dispute settlement unsafe |
| Coupon management | ❌ | No coupon domain |
| User/category/market management | ✅ | API + admin UI |
| Banner/CMS | ⚠️ | CMS pages/branding exist; no dedicated campaign/banner management |
| Reports/exports | ✅ | Finance/report views and CSV/PDF statements |
| Granular admin access | ⚠️ | Server permissions mostly strong; WebSocket bypass, admin-role grant, and client direct-route gaps |

### Platform

| Feature | Status | Current implementation |
|---|---|---|
| Web metadata/OG | ⚠️ | Generic site-wide static tags only |
| Sitemap/robots/Product JSON-LD | ❌ | No files/route generation found |
| Mobile deep linking | ❌ | Scheme/intent exists; no navigation linking map |
| App force update/OTA policy | ❌ | No version gate; native manifest has Expo updates disabled (`AndroidManifest.xml:17`) |
| Funnel analytics | ❌ | Firebase Analytics initializes on web; no funnel `logEvent` calls found |
| Error tracking | ❌ | No Sentry/similar integration |
| Rate limiting | ⚠️ | Global + selected auth throttles; no account-level OTP cooldown; proxy behavior unverified |
| Health check | ⚠️ | Public static liveness only; not readiness |
| DB/file backups | ❌ | Local ignored artifacts exist, but no automated off-host schedule/restore evidence |

## 6. Requested end-to-end flow traces

| # | Flow | What actually happens / break |
|---:|---|---|
| 1 | Guest browse → cart → signup → merge → checkout → pay → history → notification | Mobile RFQ basket persists locally through signup on that device, but does not merge to an account/server and submits RFQs, not checkout. Web has no cart. Direct Buy Now creates an unpaid processing order. Seller may be notified; buyer confirmation is only immediate UI. |
| 2 | Payment initiated → user closes → webhook → reopen | No provider payment is initiated and no payment webhook exists. Reopen simply sees whatever client-set order status was persisted. |
| 3 | Payment fails → retry → stock release | No payment failure/retry or stock reservation/release domain exists. |
| 4 | User/admin cancellation → refund + stock + notification | User controls are absent. Generic/admin cancellation has no real payment refund or stock restoration. Admin dispute credit is financially unsafe. |
| 5 | Product goes out of stock in cart | Stock is not modeled. Mobile refetches product display data but cannot block invalid quantity/availability. |
| 6 | Admin edits price while item is in cart | Mobile RFQ display refetches; RFQ price is uncommitted. Direct Buy Now charges the current server price without a quoted-price expiry/reconfirmation. |
| 7 | Coupon applied, item removed below minimum | Coupons do not exist. |
| 8 | Token expires mid-session | Shared client refreshes once. Web redirects on terminal failure; mobile clears tokens but leaves/restores user state, producing a ghost authenticated UI. |
| 9 | Deep link / notification tap / cold start | Web `/console/*` and `/orders/:id` targets are undefined. Mobile routes only community/support specially; order/shipping taps open generic notifications. URL schemes have no navigation map. |
| 10 | Same account on two devices | Sessions coexist and cannot be centrally revoked. Orders are server-shared; basket/wishlist are device-local or nonexistent. Logout may leave a push token registered. |

## 7. API endpoint inventory

**Inventory result:** 333 HTTP endpoints across 29 controller-bearing source files. All paths below include the global `/api` prefix (`apps/api/src/main.ts:25`).

Legend: `P` public, `O` optional JWT, `J` JWT; `[role]` role guard; `{permission}` granular admin permission; `DTO` named class-validator DTO; `inline`/`Partial<T>` means runtime validation is absent or incomplete. Scalar path/query strings are not class-validator DTOs unless stated.

The table groups endpoints by controller to remain reviewable; every resolved method/path is explicitly listed.

| Controller/source | Endpoints (method path — auth) | Validation/notes |
|---|---|---|
| Health `health.controller.ts:3-18` | `GET /api/health` — P | Static liveness only |
| Auth `auth/auth.controller.ts:19-90` | `POST /api/auth/register` — P; `POST /api/auth/login` — P; `POST /api/auth/verify-email` — P; `POST /api/auth/resend-verification` — P; `POST /api/auth/forgot-password` — P; `POST /api/auth/reset-password` — P; `POST /api/auth/request-otp` — P; `POST /api/auth/verify-otp` — P; `POST /api/auth/refresh` — P; `GET /api/auth/me` — J | Named DTOs on all POSTs; selected throttles; no logout/session endpoints |
| Products `products/products.module.ts:467-531` | `GET /api/products` — P; `POST /api/products/upload-image` — J[seller]; `POST /api/products/upload-images` — J[seller]; `GET /api/products/mine` — J[seller]; `POST /api/products` — J[seller]; `PATCH /api/products/:id` — J[seller]; `DELETE /api/products/:id` — J[seller]; `GET /api/products/:slug` — P | Product query is raw but page manually capped; create/update DTO; file interceptors; detail lacks live predicate |
| Orders `orders/orders.module.ts:622-679` | `POST /api/orders` — J[buyer]; `POST /api/orders/enquiry` — J[buyer]; `GET /api/orders/mine` — J[buyer]; `GET /api/orders/incoming` — J[seller]; `GET /api/orders/transporting` — J[transporter]; `PATCH /api/orders/:id/respond` — J[seller]; `PATCH /api/orders/:id/status` — J; `POST /api/orders/:id/dispatch` — J[seller]; `POST /api/orders/:id/pickup/verify` — J; `POST /api/orders/:id/delivery/verify` — J; `GET /api/orders/:id` — J | Named DTOs; party ownership in service; histories unpaginated; status endpoint carries no payment side effect |
| Invoices `invoices/invoices.module.ts:451-488` | `GET /api/invoices/:id/pdf` — P[signed query token]; `POST /api/invoices` — J[seller/transporter/loaderco/worker/admin]; `GET /api/invoices/mine` — J; `POST /api/invoices/:id/pdf-token` — J; `PATCH /api/invoices/:id/status` — J; `GET /api/invoices/:id` — J | Named DTO for create/status; raw role query; signed token purpose-confused with access JWT |
| Wallet/account `me/me.module.ts:414-470` | `GET /api/me/wallet` — J; `POST /api/me/wallet/topup` — J; `POST /api/me/wallet/withdraw` — J; `GET /api/me/earnings` — J; `GET /api/me/dashboard` — J; `GET /api/me/analytics/revenue` — J; `GET /api/me/analytics/series` — J; `GET /api/me/profile` — J; `PUT /api/me/profile` — J; `POST /api/me/profile/avatar` — J; `PUT /api/me/locale` — J; `GET /api/me/role-requests` — J; `POST /api/me/role-requests` — J | Named DTOs except file; top-up is mock; no multipart prebuffer limit |
| Statements `statements/statements.module.ts:241-255` | `POST /api/me/wallet/statement/token` — J; `GET /api/me/wallet/statement.csv` — P[signed token]; `GET /api/me/wallet/statement.pdf` — P[signed token] | Raw from/to; token-purpose issue |
| Reviews `reviews/reviews.module.ts:482-562` | `GET /api/reviews/subject/:kind/:id` — O; `GET /api/reviews/product/:id` — O; `GET /api/reviews/user/:id` — O; `GET /api/reviews/mine` — J; `GET /api/reviews/eligibility` — J; `POST /api/reviews` — J; `PATCH /api/reviews/:id` — J; `GET /api/admin/reviews` — J[admin]{reviews_moderate}; `PATCH /api/admin/reviews/:id` — same; `POST /api/admin/reviews/:id/delete` — same | Create/update/admin DTOs; route/query enums raw; public lists unpaginated; admin take/skip manually parsed |
| Notifications `notifications/notifications.module.ts:46-85` | `GET /api/notifications` — J; `GET /api/notifications/unread-count` — J; `POST /api/notifications/:id/read` — J; `POST /api/notifications/read-all` — J; `POST /api/notifications/register-device` — J; `POST /api/notifications/unregister-device` — J; `GET /api/notifications/preferences` — J; `PUT /api/notifications/preferences` — J | Device DTOs; ownership checks; nested category preferences lack robust nested validation |
| Ads `ads/ads.module.ts:200-255` | `GET /api/ads/promoted` — P; `POST /api/ads/:id/click` — P; `GET /api/ads` — J[seller]; `POST /api/ads` — J[seller]; `PATCH /api/ads/:id` — J[seller]; `GET /api/admin/ads` — J[admin]{ads_moderate}; `PATCH /api/admin/ads/:id/approve` — same; `PATCH /api/admin/ads/:id/reject` — same | Named DTOs for mutations; raw limit/status |
| Auctions `auctions/auctions.module.ts:429-528` | `GET /api/auctions` — O; `GET /api/auctions/mine` — J[buyer]; `GET /api/auctions/selling` — J[seller]; `GET /api/auctions/:slug` — O; `POST /api/auctions/:slug/close` — J; `GET /api/auctions/:slug/bids` — O; `POST /api/auctions/:slug/bids` — J[buyer]; `POST /api/auctions/:slug/autobid` — J[buyer]; `DELETE /api/auctions/:slug/autobid` — J[buyer]; `GET /api/admin/auctions` — J[admin]{auctions_manage}; `GET /api/admin/auctions/:slug` — same; `GET /api/admin/auctions/:slug/bids` — same; `POST /api/admin/auctions/:slug/close` — same; `POST /api/admin/auctions/:slug/cancel` — same | Bid/autobid DTOs; ownership in service; raw admin status |
| Buyer bids/RFQ `buyer-bids/buyer-bids.module.ts:541-654` | `GET /api/buyer-bids/live` — O; `POST /api/buyer-bids/upload-images` — J[buyer]; `GET /api/buyer-bids/mine` — J[buyer]; `GET /api/buyer-bids/mine/bids` — J[seller]; `GET /api/buyer-bids/open` — J[seller]; `POST /api/buyer-bids` — J[buyer]; `GET /api/buyer-bids/:id` — O; `GET /api/buyer-bids/:id/bids` — O; `POST /api/buyer-bids/:id/bids` — J[seller]; `POST /api/buyer-bids/:id/bids/:bidId/award` — J[buyer]; `POST /api/buyer-bids/:id/cancel` — J[buyer]; `GET /api/admin/buyer-bids` — J[admin]{bids_manage}; `GET /api/admin/buyer-bids/:id` — same; `POST /api/admin/buyer-bids/:id/cancel` — same; `POST /api/admin/buyer-bids/:id/bids/:bidId/award` — same | Create/submit DTOs; ownership in service; raw category/mode/status queries; file interceptor |
| Categories/offices `catalog/catalog.module.ts:416-555` | `GET /api/categories` — P; `GET /api/categories/:id/subtree` — P; `POST /api/admin/categories` — J[admin]{products_moderate}; `PATCH /api/admin/categories/:id` — same; `DELETE /api/admin/categories/:id` — same; `POST /api/admin/categories/:id/subcategories` — same; `PATCH /api/admin/subcategories/:id` — same; `DELETE /api/admin/subcategories/:id` — same; `GET /api/offices` — P; `POST /api/admin/offices` — J[admin]{offices_manage}; `PATCH /api/admin/offices/:id` — same; `DELETE /api/admin/offices/:id` — same | Named DTOs except runtime-erased `Partial<OfficeDto>` on office PATCH; raw locale/depth |
| Markets `markets/markets.module.ts:99-115` | `GET /api/markets` — P; `GET /api/markets/mine` — J; `POST /api/markets` — J[seller] | CreateMarketDto |
| Directory `directory/directory.module.ts:330-352` | `GET /api/directory/sellers` — P; `GET /api/directory/transporters` — P; `GET /api/directory/loaders` — P; `GET /api/directory/workers` — P; `GET /api/directory/profile/:userId` — P | Raw `DirectoryQuery` interfaces; lists unbounded; public profile masks selected contact fields |
| Hires `hires/hires.module.ts:372-409` | `POST /api/hires` — J; `GET /api/hires/mine` — J; `GET /api/hires/incoming` — J[transporter/loaderco/worker]; `POST /api/hires/:id/accept` — same; `POST /api/hires/:id/decline` — same; `POST /api/hires/:id/cancel` — J | CreateHireDto; service ownership; escrow depends on race-unsafe wallet |
| Transport `transport/transport.module.ts:325-506` | `POST /api/transport/requests` — J; `GET /api/transport/requests/mine` — J; `GET /api/transport/requests` — J[transporter]; `POST /api/transport/requests/:id/quotes` — J[transporter]; `GET /api/transport/quotes/mine` — J[transporter]; `DELETE /api/transport/quotes/:id` — J[transporter]; `POST /api/transport/quotes/:id/accept` — J; `GET /api/transport/trips/mine` — J[transporter]; `PATCH /api/transport/trips/:id/status` — J[transporter]; `GET /api/transport/vehicles` — J[transporter]; `POST /api/transport/vehicles` — J[transporter]; `PATCH /api/transport/vehicles/:id` — J[transporter]; `POST /api/transport/vehicles/:id/photo` — J[transporter]; `DELETE /api/transport/vehicles/:id` — J[transporter]; `GET /api/transport/routes` — J[transporter]; `POST /api/transport/routes` — J[transporter]; `PATCH /api/transport/routes/:id` — J[transporter]; `DELETE /api/transport/routes/:id` — J[transporter]; `GET /api/admin/transport/companies` — J[admin]{transport_manage}; `GET /api/admin/transport/companies/:id` — same; `PATCH /api/admin/transport/companies/:id/listing` — same; `PATCH /api/admin/transport/vehicles/:id` — same; `PATCH /api/admin/transport/routes/:id` — same | Named request/vehicle/route DTOs; quote price, trip status, listing bodies are inline/unvalidated; acceptance nontransactional |
| Drivers `drivers/drivers.module.ts:110-127` | `GET /api/drivers` — J[transporter]; `POST /api/drivers` — J[transporter]; `PATCH /api/drivers/:id` — J[transporter]; `POST /api/drivers/:id/photo` — J[transporter]; `DELETE /api/drivers/:id` — J[transporter] | Create/update DTOs; owner checks; file interceptor |
| Loaders/workforce `loaders/loaders.module.ts:665-857` | `GET /api/loaders/teams` — J[loaderco]; `POST /api/loaders/teams` — same; `PATCH /api/loaders/teams/:id` — same; `POST /api/loaders/teams/:id/delete` — same; `GET /api/loaders/workers` — same; `POST /api/loaders/workers` — same; `PATCH /api/loaders/workers/:id` — same; `POST /api/loaders/workers/:id/delete` — same; `POST /api/loaders/jobs` — J; `GET /api/loaders/jobs/open` — J[loaderco]; `GET /api/loaders/jobs/mine` — same; `GET /api/loaders/jobs/:id` — same; `POST /api/loaders/jobs/:id/claim` — same; `POST /api/loaders/jobs/:id/assign` — same; `POST /api/loaders/jobs/:id/unassign` — same; `POST /api/loaders/jobs/:id/status` — same; `POST /api/loaders/jobs/:id/review` — J; `GET /api/loaders/availability` — J[loaderco]; `PUT /api/loaders/availability` — same; `GET /api/loaders/attendance` — same; `POST /api/loaders/attendance/checkin` — same; `POST /api/loaders/attendance/checkout` — same; `GET /api/loaders/rates` — same; `POST /api/loaders/rates` — same; `PATCH /api/loaders/rates/:id` — same; `POST /api/loaders/rates/:id/delete` — same; `GET /api/loaders/reviews` — same; `GET /api/loaders/worker/jobs` — J[worker]; `POST /api/loaders/assignments/:id/accept` — same; `POST /api/loaders/assignments/:id/checkin` — same; `POST /api/loaders/assignments/:id/checkout` — same; `GET /api/loaders/worker/attendance` — same; `GET /api/loaders/worker/reviews` — same; `POST /api/loaders/worker/availability` — same; `GET /api/admin/loaders/companies` — J[admin]{loaders_manage}; `GET /api/admin/loaders/companies/:id` — same; `PATCH /api/admin/loaders/companies/:id/listing` — same; `PATCH /api/admin/loaders/rates/:id` — same | Most named DTOs; attendance date raw; two admin PATCH bodies inline/unvalidated; many lists unbounded |
| KYC `kyc/kyc.module.ts:188-218` | `GET /api/kyc/documents/:id/file` — P[signed token]; `GET /api/me/kyc` — J; `POST /api/me/kyc/documents` — J; `DELETE /api/me/kyc/documents/:id` — J; `POST /api/kyc/documents/:id/token` — J | Upload DTO + file; ownership; any effective admin bypass on token path; token-purpose issue |
| Attachments `attachments/attachments.module.ts:18-30` | `POST /api/attachments/presign` — J; `GET /api/attachments/:id/url` — J | PresignBody DTO; membership/uploader checks; any-admin bypass; size not provider-enforced |
| Support `support/support.controller.ts:31-166` | `POST /api/support/tickets` — J; `GET /api/support/tickets/mine` — J; `GET /api/support/tickets/:id` — J; `POST /api/support/tickets/:id/messages` — J; `POST /api/support/tickets/:id/read` — J; `POST /api/support/tickets/:id/rate` — J; `POST /api/support/tickets/:id/reopen` — J; `GET /api/support/inbox` — J[admin]{support_agent}; `GET /api/support/agents` — same; `GET /api/support/analytics` — same; `POST /api/support/tickets/:id/assign` — same; `POST /api/support/tickets/:id/transfer` — same; `POST /api/support/tickets/:id/note` — same; `POST /api/support/tickets/:id/status` — same; `POST /api/support/tickets/:id/priority` — same; `POST /api/support/tickets/:id/tag` — same; `POST /api/support/tickets/:id/escalate` — same; `POST /api/support/tickets/:id/resolve` — same; `POST /api/support/tickets/:id/close` — same | Named DTOs; owner/assigned staff checks; REST permission is stronger than WebSocket service logic; user history unbounded |
| Community `community/community.controller.ts:38-367` | `GET /api/community/feed` — O; `GET /api/community/groups` — P; `GET /api/community/groups/:id` — O; `GET /api/community/groups/:id/messages` — O; `GET /api/community/requirements` — P; `GET /api/community/requirements/:id` — P; `GET /api/community/search` — O; `GET /api/community/my/groups` — J; `GET /api/community/my/saved` — J; `POST /api/community/groups` — J; `POST /api/community/groups/:id/join` — J; `POST /api/community/groups/:id/leave` — J; `POST /api/community/groups/:id/invite` — J; `POST /api/community/groups/:id/remove` — J; `POST /api/community/groups/:id/read` — J; `POST /api/community/posts` — J; `POST /api/community/requirements` — J; `POST /api/community/requirements/:id/respond` — J; `POST /api/community/messages` — J; `GET /api/community/messages/:id/translation` — J; `GET /api/community/dm/:userId` — J; `POST /api/community/dm/:userId/read` — J; `GET /api/community/unread-summary` — J; `POST /api/community/posts/:id/save` — J; `DELETE /api/community/posts/:id/save` — J; `POST /api/community/report` — J; `POST /api/community/block` — J; `POST /api/community/unblock` — J; `GET /api/community/admin/reports` — J[admin]{community_moderate}; `POST /api/community/admin/reports/:id/resolve` — same; `POST /api/community/admin/messages/:id/delete` — same; `GET /api/community/admin/analytics` — same; `GET /api/community/admin/groups` — same; `POST /api/community/admin/groups` — same; `POST /api/community/admin/groups/:id` — same; `DELETE /api/community/admin/groups/:id` — same; `GET /api/community/admin/feed` — same; `POST /api/community/admin/posts/:id/delete` — same; `POST /api/community/admin/posts/:id/pin` — same; `POST /api/community/admin/users/:id/ban` — same | Most user mutations named DTOs; block/unblock and several admin moderation/group bodies are inline/unvalidated; scalar cursors/filters raw |
| CMS `cms/cms.module.ts:82-106` | `GET /api/cms` — P; `GET /api/cms/:slug` — P; `GET /api/admin/cms` — J[admin]{cms_manage}; `POST /api/admin/cms` — same; `PATCH /api/admin/cms/:id` — same | Named create/update DTOs |
| Branding `branding/branding.module.ts:100-130` | `GET /api/branding` — P; `GET /api/admin/branding` — J[admin]{branding_manage}; `POST /api/admin/branding/upload` — same; `PATCH /api/admin/branding` — same | Raw asset query + file; clear DTO |
| Email templates `email-templates/email-templates.module.ts:278-298` | `GET /api/admin/email-templates` — J[admin]{email_templates}; `GET /api/admin/email-templates/:key` — same; `PATCH /api/admin/email-templates/:key` — same; `POST /api/admin/email-templates/:key/preview` — same; `POST /api/admin/email-templates/:key/test` — same | Named DTOs |
| FX `fx/fx.module.ts:65-68` | `GET /api/fx/rates` — P | Raw base query |
| Geo `geo/geo.module.ts:170-193` | `GET /api/geo/cities` — P; `GET /api/geo/geocode` — J; `GET /api/geo/route` — J | Raw scalar queries; geocode client has bounded timeout; translation client does not |
| Admin core `admin/admin.module.ts:1118-1439` | `GET /api/admin/products`; `GET /api/admin/products/all`; `PATCH /api/admin/products/:id/approve`; `PATCH /api/admin/products/:id/reject`; `PATCH /api/admin/products/:id`; `DELETE /api/admin/products/:id` — J[admin]{products_moderate}; `GET /api/admin/users`; `POST /api/admin/users`; `GET /api/admin/users/:id`; `PATCH /api/admin/users/:id`; `POST /api/admin/users/:id/roles`; `DELETE /api/admin/users/:id/roles/:role`; `PATCH /api/admin/users/:id/kyc`; `DELETE /api/admin/users/:id` — J[admin]{users_manage}; `GET /api/admin/profile`; `PATCH /api/admin/profile/password` — J[admin]; `GET /api/admin/hires` — J[admin]{transport_manage OR loaders_manage}; `GET /api/admin/markets`; `POST /api/admin/markets`; `PATCH /api/admin/markets/:id/approve`; `PATCH /api/admin/markets/:id/reject`; `PATCH /api/admin/markets/:id`; `DELETE /api/admin/markets/:id` — J[admin]{markets_manage}; `GET /api/admin/orders`; `GET /api/admin/orders/:id`; `PATCH /api/admin/orders/:id/status` — J[admin]{orders_manage}; `GET /api/admin/disputes`; `POST /api/admin/orders/:id/dispute/resolve` — J[admin]{disputes_manage}; `GET /api/admin/kyc`; `GET /api/admin/kyc/:id`; `PATCH /api/admin/kyc/:id` — J[admin]{kyc_review}; `GET /api/admin/invoices`; `GET /api/admin/payments/statement.csv`; `GET /api/admin/payments/statement.pdf`; `GET /api/admin/payments`; `GET /api/admin/wallets`; `GET /api/admin/wallets/:userId`; `POST /api/admin/wallets/:userId/adjust`; `GET /api/admin/payouts`; `POST /api/admin/payouts/:id/decide` — J[admin]{finance_manage}; `GET /api/admin/stats`; `GET /api/admin/stats/volume`; `GET /api/admin/reports` — J[admin]{reports_view}; `GET /api/admin/audit` — J[admin]{audit_view}; `GET /api/admin/role-requests`; `PATCH /api/admin/role-requests/:id` — J[admin]{role_requests}; `GET /api/admin/staff`; `POST /api/admin/staff`; `PATCH /api/admin/staff/:id`; `DELETE /api/admin/staff/:id` — J[admin]{staff_manage} | Most mutations named DTOs. Market update is runtime-erased `Partial<UpsertMarketDto>`; list/filter/pagination strings are manually parsed and several lists unbounded. User DTOs wrongly allow admin role. Financial operations carry the critical races described above |

### API consistency notes

- Global DTO whitelist/transform is enabled (`apps/api/src/main.ts:49-51`) and most named mutation DTOs use class-validator correctly.
- Response shapes are raw domain objects/arrays/envelopes rather than one consistent API envelope; clients therefore maintain many endpoint-specific types.
- Non-HTTP exceptions are normalized by `I18nExceptionFilter`, and no remotely injectable runtime raw SQL was confirmed.
- Authentication/ownership is generally checked in order, driver, KYC, attachment, transport, loader, review, and notification service paths; the confirmed authorization exceptions are documented above rather than inferred from route names.

### Security controls confirmed present

- Root and mobile `.env` files and native Firebase config files are ignored rather than tracked; no committed private API/DB/JWT credential was confirmed by the local pattern scan (`.gitignore:13-16`; `apps/mobile/.gitignore:1-5`).
- Production startup rejects the documented placeholder JWT secrets and rejects identical access/refresh secrets (`apps/api/src/main.ts:11-28`), although it still needs stronger required-secret validation.
- Passwords use bcryptjs cost 10 (`apps/api/src/auth/auth.service.ts:97,287,379`); access-token validation reloads active user/roles from the DB.
- Helmet, global validation whitelist/transform, global throttling, error normalization, ownership checks on core resources, and granular REST admin permissions are implemented.
- The only `$executeRawUnsafe` found is a local taxonomy maintenance script that constructs placeholders internally and passes IDs as bound arguments; no remotely injectable runtime SQL path was confirmed.

## 8. Needs manual verification

These items were not promoted to confirmed bugs because the repository alone cannot prove runtime/deployment state:

1. Inspect the deployed environment for strong distinct JWT, DB, S3, SMTP, Firebase, Google and CORS values; local `.env` files are ignored and were not copied into this report.
2. Verify whether demo accounts (`password123`, including admin/scoped admin) exist in production; immediately rotate/delete them if found.
3. Inspect production DB migration status. Local development had 7 of 31 migrations pending, which says nothing about production.
4. Verify automated encrypted off-host backup schedules, retention, monitoring, RPO/RTO and successful restore drills outside the repository.
5. Confirm the external reverse proxy/TLS layer, HSTS/CSP/security headers, request-size limits, WebSocket forwarding, token/query-string log redaction, and trusted proxy/IP settings.
6. Inspect the signed EAS Android/iOS artifacts: merged cleartext policy, requested permissions, notification entitlement, Firebase configs, Maps key restrictions, signing and store build behavior.
7. Exercise cold/warm notification taps, Android 13 notification permission, iOS notch/home indicator, Android hardware back, keyboards, screen readers, large text, contrast and poor network on physical devices.
8. Load-test simultaneous order, wallet debit, withdrawal, payout, dispute, OTP/reset and quote-acceptance requests against PostgreSQL to quantify the proven race windows.
9. Verify MinIO/S3 bucket policy, quotas, lifecycle, encryption, object-size enforcement, AV scanning and cleanup of abandoned uploads.
10. Fix the local corporate CA/proxy trust chain and rerun `pnpm audit --prod`; dependency vulnerability status is currently unknown.
11. Verify SMTP/FCM delivery, bounce/invalid-token pruning, retry behavior and whether customer-facing notifications match each lifecycle transition.
12. Verify production payment sandbox behavior only after a real payment/escrow integration exists; there is currently no gateway to test.
13. Run `prisma migrate diff` against a real shadow DB to verify custom partial subcategory unique indexes remain represented across rebuild/introspection (`20260721103000_subcategory_parent_scoped_names/migration.sql:1-9`).
14. Exercise auction/offer expiry, delivery estimates, invoice dates and “today” boundaries from UTC, IST and DST-observing clients; no confirmed timezone defect was promoted from static evidence.

## 9. Prioritized fix roadmap

### Fix before any launch or real-money pilot

1. Disable mock wallet top-up and remove all generic client-driven paid/escrow transitions.
2. Design and implement Payment/Escrow records, provider/wallet funding, signature verification, webhook replay protection, reconciliation, and atomic settlement.
3. Make wallet debit/credit, payout, dispute, hire escrow, order and quote transitions transactional, conditionally claimed, and idempotent.
4. Add canonical inventory/variant/reservation data and enforce stock/MOQ/unit at checkout.
5. Replace direct Buy Now with a server-priced, idempotent checkout covering address, shipping, tax, payment, confirmation, failure/retry and expiry.
6. Fix production API-origin variable mismatch and require every production secret/config value.
7. Separate download-token purpose/key/audience from access JWTs; implement refresh-token families and revocation.
8. Close WebSocket/support/admin-role authorization gaps.
9. Remove backups/logs/archives from Docker contexts and purge exposed builder caches.
10. Repair the failing test/lint gates; add checkout/payment/escrow concurrency and idempotency tests before enabling the flow.
11. Establish off-host backups/restore drill and immutable rollbackable releases before the first customer dataset.

### Fix this week / before a controlled beta

1. Remove transactional/demo fallbacks, fabricated social proof/quality, and undisclosed paid placements.
2. Fix web wrong-product loading state, multi-role header propagation, notification routes, cancellation/dispute UI, and mobile ghost auth/push logout ordering.
3. Add runtime DTOs/bounds for all inline/partial bodies and bounded cursor pagination for user/admin lists.
4. Add catalog, wallet, logistics, workforce, order and audit query indexes; validate on production-like data.
5. Add readiness checks, graceful shutdown, durable notification outbox/workers, structured error tracking, metrics and alerts.
6. Implement real wishlist/account-scoped basket behavior or rename/remove misleading Saved/Cart surfaces.
7. Add route-level lazy loading, bundle budgets, frozen installs, pinned/rootless/pruned images.
8. Add integration DB tests, browser E2E, Expo native build checks, revenue-flow E2E, and meaningful ≥80% coverage enforcement.

### Backlog after correctness and safety

1. SSR/prerender SEO, per-product metadata/JSON-LD, sitemap/robots/canonical/404.
2. Full accessibility remediation of shared web/mobile primitives plus device/assistive-technology tests.
3. Mobile infinite catalog, NetInfo/AppState/query persistence, offline UI, pull-to-refresh and deep/universal links.
4. External shipping-carrier integration, returns/replacements, refund status, customer self-service sessions and account deletion/export.
5. Product variants, bulk catalog administration, stock dashboards, coupon/promotion engine, funnel analytics and force-update policy.

## 10. Coverage statement

- **Backend/API:** 100% of 29 controller-bearing files and all 333 HTTP routes inventoried; commerce/auth/admin/wallet/payment-adjacent services deeply traced; schema and all model/index surfaces reviewed. Socket authorization was inspected for community/support.
- **Web:** 100% route inventory; auth/API plumbing, catalog/product/cart-equivalent, orders, finance, notifications and core console flows deeply traced. Remaining operational console components sampled for common UI/error patterns.
- **Admin:** 100% route/page inventory; permissions, orders, disputes, payments, users, KYC, products and support deeply traced. Remaining pages sampled.
- **Mobile:** all navigation/auth/customer revenue paths traced; all 88 mobile screen/component files scanned; provider-role screens received targeted rather than line-by-line review.
- **Infrastructure:** all package scripts, CI, Dockerfiles, Compose, nginx, env documentation, migrations, health, build context and deployment instructions reviewed.
- **Runtime limitations:** no production URL/account, payment sandbox, physical devices, signed mobile artifact, production DB, cloud storage policy or external reverse-proxy configuration was available. No browser visual/responsive/device E2E was run. These are listed under manual verification, not asserted as confirmed failures.

**Final verdict:** the product is suitable only for a nonfinancial internal demo after clearly labelling mock data and securing demo accounts. It is not safe for production ecommerce, escrow, payouts, or real customer data until the fix-before-launch roadmap is complete and independently retested.
