# Chat API Contract

All routes are under the global `/api` prefix and documented in Swagger at
`/api/docs`. Auth is JWT bearer unless marked *(guest OK)*. Two Socket.IO
namespaces — `/community` and `/support` — carry realtime traffic; the REST
routes below are the fallback + data-loading layer. Typed client wrappers live
in `packages/api-client/src/index.ts` (`api.community.*`, `api.support.*`,
`api.notifications.*`, `api.attachments.*`, `createChatSocket`).

## Community — REST (`apps/api/src/community/community.controller.ts`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/community/feed` | Public feed *(guest OK)* |
| GET | `/community/groups` | List/search groups *(guest OK)* — `?kind&search` |
| GET | `/community/groups/:id` | Group detail *(guest OK)* |
| GET | `/community/groups/:id/messages` | Messages *(guest OK for public)* — `?cursor` |
| GET | `/community/requirements` | List trade requirements *(guest OK)* — `?category&cursor` |
| GET | `/community/requirements/:id` | Requirement detail *(guest OK)* |
| GET | `/community/search` | Search groups & messages *(guest OK)* — `?q` |
| GET | `/community/my/groups` | My groups + unread |
| GET | `/community/my/saved` | Saved posts |
| POST | `/community/groups` | Create group (10/min) |
| POST | `/community/groups/:id/join` · `/leave` · `/invite` · `/remove` · `/read` | Membership + read receipt |
| POST | `/community/posts` | Create post (40/min) |
| POST | `/community/requirements` | Create trade requirement (20/min) |
| POST | `/community/requirements/:id/respond` | Respond to a requirement |
| POST | `/community/messages` | Send group/DM message (REST fallback, 60/min) |
| GET | `/community/dm/:userId` | Direct-message thread — `?cursor` |
| POST/DELETE | `/community/posts/:id/save` | Save / unsave |
| POST | `/community/report` · `/block` · `/unblock` | Report / block |
| GET | `/community/admin/reports` | Moderation queue *(admin)* |
| POST | `/community/admin/reports/:id/resolve` · `/messages/:id/delete` | *(admin)* |
| GET | `/community/admin/analytics` | *(admin)* |

## Live Support — REST (`apps/api/src/support/support.controller.ts`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/support/tickets` | Create ticket + conversation (10/min) |
| GET | `/support/tickets/mine` | My tickets |
| GET | `/support/tickets/:id` | Ticket + messages *(owner/staff — IDOR guarded)* |
| POST | `/support/tickets/:id/messages` | Send message (60/min) |
| POST | `/support/tickets/:id/read` | Mark read |
| POST | `/support/tickets/:id/rate` | Rate 1–5 (after resolve) |
| POST | `/support/tickets/:id/reopen` | Reopen |
| GET | `/support/inbox` | Filtered inbox *(admin)* — status/priority/category/country/language/search |
| GET | `/support/agents` · `/analytics` | *(admin)* |
| POST | `/support/tickets/:id/assign` · `/transfer` · `/note` · `/status` · `/priority` · `/tag` · `/escalate` · `/resolve` · `/close` | Agent actions *(admin)* |

## Shared — REST

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/notifications` | Unified centre (community + support + platform) |
| GET | `/notifications/unread-count` | `?system=community\|support` |
| POST | `/notifications/:id/read` · `/notifications/read-all` | |
| POST | `/attachments/presign` | Presigned upload — `{ system, mime, sizeBytes, originalName }` |
| GET | `/attachments/:id/url` | Scoped download URL |

## Socket.IO events

Connect with `createChatSocket({ baseURL, namespace, token })`.

**`/community`** — emit: `group:join`, `group:leave`, `dm:open`,
`message:send`, `typing`, `read`, `reaction:add`, `reaction:remove`. Receive:
`ready`, `message:new`, `typing`, `read`, `reaction:new`, `reaction:removed`,
`notify:new`.

**`/support`** — emit: `ticket:join`, `message:send`, `typing`, `read`.
Receive: `ready`, `message:new`, `ticket:new` *(agents)*, `ticket:update`,
`typing`, `read`, `notify:new`.

Every `message:send` carries a client `tempId`, echoed back on `message:new`
for optimistic-update dedupe (see [chat-security.md](./chat-security.md)).

## Conventions

- **Validation** — `class-validator` DTOs (`community/dto.ts`, `support/dto.ts`).
- **Pagination** — cursor-based (`?cursor`) on message/feed lists.
- **Errors** — standard Nest exceptions (`400` validation, `403` access/IDOR,
  `404` missing).
- **Audit** — mutating admin/agent actions write `AuditLog`.

## Tests

- `pnpm --filter @agrotraders/api test` — unit suite incl.
  `chat-permissions.spec.ts` (IDOR + private-group access, DB-free).
- `pnpm --filter @agrotraders/api test:integration` — full realtime round-trip in
  `chat.integration.spec.ts`; **requires** the seeded Postgres (`localhost:5544`)
  and `@nestjs/testing` installed (`pnpm install`).
