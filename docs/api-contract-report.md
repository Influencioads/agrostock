# AgroTraders — API Contract Report

_Audit date: 2026-06-28._

Cross-checked the NestJS REST surface against the shared client
(`packages/api-client`) and the web/admin consumers.

## Method
Read every controller in `apps/api/src/**/*.module.ts` + `auth/*` and compared
routes, methods, request bodies, and response shapes to `createApiClient` and its
callers. Prisma is the single source of truth for entity shapes; `api-client`
exports hand-written interfaces that mirror it.

## Findings

| # | Contract issue | Resolution |
|---|----------------|-----------|
| C1 | `AuthResult.refreshToken` returned by API but **no** `/auth/refresh` route or client method | Added `POST /auth/refresh` + `auth.refresh()` + transparent 401 refresh interceptor |
| C2 | `api-client` typecheck was stubbed (`echo`) — types never validated against compiler | Added `tsconfig.json`, enabled `tsc --noEmit` |
| C3 | `ApiStats` interface missing `pendingProducts` (API `admin.stats` returns it) | Documented; low impact (extra field, clients ignore) — see note |
| C4 | Logistics/loader request bodies are inline TS types, not DTOs → not runtime-validated | Flagged (security S9); client sends correct shapes already |

### Verified consistent
- **Auth:** `login`/`register`/`me` paths, bodies, and `AuthResult` shape match.
- **Products:** query params (`category/verified/safe/offer/auction/search/sort`)
  match `findAll`; `mine`/`create`/`update`/`remove` paths and seller-role guard
  match.
- **Orders / Auctions / Transport / Loaders / Me / Admin:** all client method
  paths, HTTP verbs, and param names align with controllers.
- **Enums** are consistent because both sides derive from the Prisma schema
  (`OrderStatus`, `TripStatus`, `JobStatus`, `KycStatus`, `Role`, `TxType`). No
  divergent string literals found between client and server.

### Note on C3
`AdminService.stats()` returns `{ users, products, orders, pendingKyc, pendingProducts }`
but `ApiStats` declares only the first four. Adding `pendingProducts?: number` to
`ApiStats` is a safe, additive follow-up (left out of this pass to avoid touching
the admin dashboard typings without runtime verification).

## Response envelope convention
The API returns **bare JSON** (entity or array) on success and standard NestJS
`{statusCode, message, error}` on failure. This is consistent across modules. There
is no `{data, meta}` envelope and no server-side pagination yet — list endpoints
return full result sets (see performance note in `known-limitations.md`).

## Recommended next steps
- Add `pendingProducts` to `ApiStats` (C3).
- Convert logistics/loader inline bodies to validated DTO classes (C4 / S9).
- Generate the client from the OpenAPI document (Swagger is already wired) to remove
  hand-maintained drift risk entirely.
- Introduce cursor/offset pagination on `products`, `admin.orders`, `admin.users`.
