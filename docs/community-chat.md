# AgroTraders Community (Chat System 1)

An open marketplace communication system where verified users post requirements,
offers, questions and discussions, join topic/regional/crop groups, and message
each other. It is **fully separate** from [Live Support](./live-support-chat.md)
in UI, database tables, Socket.IO namespace/rooms, and permissions.

## Where it lives

| Surface | Entry point | File |
| --- | --- | --- |
| Public website | Floating button, **bottom-left** → expandable drawer | `apps/web/src/chat/community/CommunityWidget.tsx` |
| Web dashboards | Same floating widget (mounted globally) | `apps/web/src/chat/ChatWidgets.tsx` |
| Mobile app | Floating community button on Home + **More → Community** | `apps/mobile/src/screens/community/Community.tsx` |
| Admin | Community Moderation page | `apps/admin/src/pages/CommunityModerationPage.tsx` |

Guests may **read** the public feed, public groups and requirements. Posting,
replying, messaging, joining, creating groups and reacting all require sign-in
(enforced server-side, not just in the UI).

## UI structure

Four tabs on both web and mobile:

- **Feed** — public posts + trade-requirement cards (`GET /community/feed`).
- **Groups** — browsable channel list with member counts + Join.
- **Requirements** — Trade Requirement cards; signed-in users can post a new one.
- **My Chats** — groups the user belongs to, with unread badges.

Opening a group shows the realtime **Room**: message bubbles, sender name,
typing indicator, and an optimistic composer that reconciles by `tempId`.

## Default channels

Seeded groups (see `apps/api/prisma/seed.ts`): General Agriculture, Buyer
Requirements, Seller Offers, Wheat/Rice/Pulses Trading, Fruits & Vegetables,
Spices & Herbs, Seeds & Fertilizers, Import & Export, Transport Requests, Loader
Services, Warehousing, Market Prices, Russia Marketplace, International Trade,
Regional City Groups. Users can also create **custom** groups with visibility
`public` / `private` / `invite_only`.

## Trade Requirement

A structured post type (`CommunityTradeRequirement`) with title, product
category/name, quantity, unit, grade, budget, buyer location, destination
country, delivery, needed date, `transportRequired` / `loaderRequired` /
`importExport` toggles, attachments, visibility and expiry. Eligible users
respond (`CommunityRequirementResponse`) with an offer, price quote, quantity,
delivery timeline and optional product link.

## Realtime model

Namespace `/community`. Rooms:

- `community:group:{groupId}` — group messages, typing, read, reactions.
- `community:thread:{threadId}` — 1:1 direct-message threads.
- `community:user:{userId}` — per-user fan-out for notifications & DM mirroring.

Socket events: `group:join` / `group:leave`, `dm:open`, `message:send` →
`message:new` (echoes `tempId` for optimistic dedupe), `typing`, `read`,
`reaction:add`/`reaction:remove` → `reaction:new`/`reaction:removed`,
`notify:new`. Gateway: `apps/api/src/community/community.gateway.ts`.

Community notifications are written to the shared `Notification` table with
`system = 'community'` and surface in the unified notification centre on web and
mobile (`apps/mobile/src/screens/public/Notifications.tsx`).

## Data model

`CommunityGroup`, `CommunityGroupMember`, `CommunityPost`,
`CommunityTradeRequirement`, `CommunityRequirementResponse`,
`CommunityDirectThread`, `CommunityMessage`, `CommunityMessageReaction`,
`CommunityReport`, `CommunityUserBlock`, `CommunitySavedPost` — all in
`apps/api/prisma/schema.prisma`. Attachments use the shared `ChatAttachment`
table with `system = 'community'`.

## Moderation

Admins review reports, resolve them (`actioned` / `dismissed`), soft-delete
messages, and view analytics via the `community/admin/*` routes (see
[chat-api.md](./chat-api.md)). Every moderation action is written to `AuditLog`.

See also: [chat-api.md](./chat-api.md), [chat-security.md](./chat-security.md).
