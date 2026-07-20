# AgroTraders — Known Limitations

_Audit date: 2026-06-28._

This file records the gap between the original product brief (which describes a very
large feature set) and what the codebase **actually implements today**, plus risks
that need follow-up before staging/production. It exists so nobody mistakes
reviewed-and-documented for built-and-tested.

## Features assumed by the brief but NOT implemented in the backend
The following have **no API/Prisma support** today (some have mock/placeholder UI in
the apps). They were not — and cannot yet be — tested end-to-end:

- **Realtime / Socket.IO** — no WebSocket gateway. Live bidding uses HTTP polling.
- **Chat & community** — no models, endpoints, or gateway.
- **Notifications** — no notification model or delivery service.
- **OTP login / phone verification** — not implemented.
- **User-facing KYC submission & document upload** — only an admin
  approve/reject endpoint and a `docs` counter exist; there is no upload pipeline.
- **File/object uploads** — MinIO/S3 env vars exist, but no upload endpoint,
  MIME/size validation, or signed-URL handling in code.
- **Payments / escrow / payouts** — `me/wallet/topup` is a **mock self-credit**
  (now validated, but no gateway, no webhooks, no idempotency, no real ledger
  invariants). Safe-Deal state machine and payout/commission logic are not enforced
  server-side; order `status` is a free field gated only by ownership.
- **RFQ / Offers-of-the-day / Ads / CMS / Global-Office callback forms** — largely
  client-side or seed-backed; no dedicated backend workflow.

## Implemented but thin
- **Order status** has no state-machine validation — any participant (or admin) can
  set any status. No "buyer cannot release before delivery" enforcement.
- **Logistics/loader input validation** — request bodies are not DTO-validated
  (security S9).
- **Auth revocation** — no refresh-token store or `suspended` flag; tokens are valid
  until expiry. JWT validate re-checks existence only.

## Quality gaps not addressed this pass
- No Playwright/web E2E, no integration tests, no mobile tests (see
  [`e2e-test-report.md`](e2e-test-report.md)).
- Accessibility (keyboard, focus, contrast, alt text, ARIA) not audited.
- i18n EN/RU completeness and Russian text-overflow not verified.
- Performance: web ships a single ~444 kB JS bundle (no route code-splitting); list
  endpoints have no pagination; potential N+1 in `auctions.list` (`withHighest` per
  product).

## Infrastructure / out-of-scope (needs external review)
- TLS termination, reverse-proxy config, container-runs-as-root, DB/Redis port
  exposure, and secret management were not reviewed.
- No dependency-vulnerability gate in CI (`pnpm audit` is available but not enforced).
- This audit is **not** a penetration test or compliance certification.
