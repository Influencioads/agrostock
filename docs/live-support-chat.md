# Live Support (Chat System 2)

A private 1-to-1 customer-support conversation between a user and AgroTraders's
admin / operations / assigned support agents. It is **fully separate** from
[Community](./community-chat.md): different tables, a different Socket.IO
namespace (`/support`), and stricter permissions. A user never sees another
user's support chat.

## Where it lives

| Surface | Entry point | File |
| --- | --- | --- |
| Public website | Floating **headset** button, **bottom-right** → private drawer | `apps/web/src/chat/support/SupportWidget.tsx` |
| Web dashboards | Same widget, mounted globally | `apps/web/src/chat/ChatWidgets.tsx` |
| Mobile app | **More → Live Support** (+ user Profile/Help) | `apps/mobile/src/screens/support/Support.tsx` |
| Admin / Ops | Support Inbox (list · conversation · details) | `apps/admin/src/pages/SupportInboxPage.tsx` |

## User flow

1. User opens Live Support and sees a welcome + category grid.
2. User picks a **category**, adds a subject and description.
3. `POST /support/tickets` creates a `SupportTicket` (+ `SupportConversation`,
   seeded first message, system acknowledgement, and an SLA row).
4. Staff are notified in real time (`ticket:new` to `support:agents`).
5. A supervisor assigns the ticket; the agent replies.
6. The user receives the reply live + a `support.reply` notification.
7. Agent marks the ticket resolved; user can **rate** (1–5) or **reopen**.

Categories (`SUPPORT_CATEGORIES` in `packages/types`): account & KYC, product
listing, buyer order, seller order, payment/Safe Deal, wallet/payout,
auction/bid, transport, loader/worker, import/export, technical, global office,
other.

Statuses: `new`, `waiting_support`, `assigned`, `in_progress`, `waiting_user`,
`escalated`, `resolved`, `closed`. Priorities: `low`, `medium`, `high`,
`urgent`.

## Admin / agent inbox

`apps/admin/src/pages/SupportInboxPage.tsx` provides the three-pane inbox: ticket
list (with status/priority/category/country/language filters and search),
active conversation, and a details rail (user, references, assignment, internal
notes, actions). Agent actions: accept/assign, transfer, add internal note,
change status/priority, add tags, escalate, resolve, close, reopen. The mobile
Support screen also exposes a lean **Inbox** toggle for admins (assign-to-me +
resolve inline).

Analytics (`GET /support/analytics`): first-response time, resolution time, open
count, SLA breaches, category/country volume, EN vs RU split, satisfaction.

## Realtime model

Namespace `/support`. Rooms:

- `support:conv:{ticketId}` — the conversation; **join is IDOR-guarded** so only
  the ticket owner + staff can subscribe.
- `support:user:{userId}` — per-user notifications + reply mirroring.
- `support:agents` — all admins/agents (new-ticket + ticket-update fan-out).

Events: `ticket:join`, `message:send` → `message:new` (echoes `tempId`),
`typing`, `read`, plus server pushes `ticket:new`, `ticket:update`, `notify:new`.
The gateway (`apps/api/src/support/support.gateway.ts`) is the single
orchestration layer — both sockets and the REST controller call the same methods
so realtime emits happen in one place.

## Data model

`SupportTicket`, `SupportConversation`, `SupportMessage`,
`SupportTicketAssignment`, `SupportAgent`, `SupportInternalNote`, `SupportTag`,
`SupportTicketTag`, `SupportSLA`, `SupportRating` — in
`apps/api/prisma/schema.prisma`. Attachments reuse the shared `ChatAttachment`
table with `system = 'support'`. Support notifications use `Notification` with
`system = 'support'`.

## Continuity across web & mobile

Tickets are server-side records keyed to the user, so the same conversation
continues seamlessly across web and mobile — both clients read
`GET /support/tickets/mine` and join the same `support:conv:{ticketId}` room.

See also: [chat-api.md](./chat-api.md), [chat-security.md](./chat-security.md).
