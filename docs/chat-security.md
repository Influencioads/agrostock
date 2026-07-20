# Chat Security & Moderation

Covers both chat systems. Community and Live Support share this hardening but
stay isolated (separate tables, namespaces, rooms and permission checks).

## Access control

- **Private community groups** — only members (or admins) can read/post. Guests
  are rejected server-side (`CommunityService.assertMember` /
  `ensureCanPost`), not just hidden in the UI.
- **Live Support IDOR guard** — every ticket read (REST) and every
  `support:conv:{ticketId}` socket join runs `SupportService.assertCanView`,
  which allows only the ticket owner and staff (`roles.includes('admin')`). A
  different user gets `403`. Verified by unit tests in
  `apps/api/test/chat-permissions.spec.ts` and the realtime integration test in
  `apps/api/test/chat.integration.spec.ts`.
- **Staff-only routes** — moderation, inbox, assignment, analytics and
  status/priority changes are guarded by `RolesGuard` + `@Roles('admin')`.
- Socket connections require a valid JWT in the handshake `auth.token`
  (`RealtimeModule` / `WsAuthService`); unauthenticated sockets are
  disconnected immediately.

## Input safety

- **XSS** — every inbound message/post/description body is stripped of ALL HTML
  and length-clamped via `sanitizeMessage` (`apps/api/src/common/sanitize.ts`,
  `sanitize-html` with no allowed tags) before persistence.
- **Contact masking** — `maskContacts` hides emails and long digit sequences in
  **public** community bodies so phone/email aren't exposed by default.
- **DTO validation** — `class-validator` on all payloads (enum categories,
  min/max lengths, rating 1–5, etc.) with a global `ValidationPipe`
  (`whitelist: true`).

## Attachments

`apps/api/src/attachments/attachments.service.ts` issues presigned S3/MinIO URLs
and enforces:

- **MIME allow-list** — png/jpeg/webp/gif, pdf, doc/docx, xls/xlsx, and audio
  (voice notes). Anything else → `400 Unsupported file type`.
- **Size limit** — `ATTACHMENT_MAX_MB` (default 15 MB) → `400` when exceeded.
- **Scoped access** — download URLs check the requester; each attachment is
  tagged `system = 'community' | 'support'` and linked to one message, so a
  Community attachment can't leak through a Support message.
- Risk scanning is a documented placeholder (`TODO(phase-2)`).

## Rate limiting

Per-route `@Throttle` on top of the global 120/min limiter:

| Action | Limit |
| --- | --- |
| Create community group | 10 / min |
| Create community post | 40 / min |
| Create trade requirement | 20 / min |
| Send community message (REST fallback) | 60 / min |
| Create support ticket | 10 / min |
| Send support message (REST fallback) | 60 / min |

Spam detection and keyword monitoring are documented placeholders in the admin
moderation surface.

## Block & report

- `CommunityUserBlock` — blocked users' messages are filtered out of the reader's
  group/DM queries, and DMs between blocked pairs are refused.
- `CommunityReport` — users report posts/messages/users/groups; reports land in
  the admin moderation queue with status `open → reviewing → actioned/dismissed`.

## Audit logging

`AuditLog` records deletions, reports, bans/blocks, ticket creation, agent
assignments, status changes and resolutions — with `actorId`, `action`,
`entityType`, `entityId` and JSON `meta`.

## Reconnect / duplicate / ordering

- Socket.IO auto-reconnect (10 attempts) with an optional Redis adapter
  (`RedisIoAdapter`) for multi-instance fan-out.
- **Duplicate prevention** — every send carries a client `tempId`; the server
  echoes it on `message:new` so clients reconcile the optimistic bubble instead
  of duplicating it.
- **Ordering** — messages are persisted with server timestamps and returned
  `orderBy createdAt`; indexes on `(groupId, createdAt)` / `(conversationId,
  createdAt)` keep reads and unread counts fast.
