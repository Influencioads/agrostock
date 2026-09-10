import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, Prisma } from '@prisma/client';
import { FALLBACK_LNG, isLang } from '@agrotraders/i18n';
import { renderNotification, type NotificationParams } from '@agrotraders/i18n/notifications';
import { PrismaService } from '../prisma/prisma.service';
import {
  channelEnabled,
  ChatSystem,
  NotificationCategory,
  NotificationPrefs,
  NOTIFICATION_CREATED,
  resolvedPrefs,
} from './notification-categories';

export type { ChatSystem, NotificationCategory } from './notification-categories';
export type { NotificationParams } from '@agrotraders/i18n/notifications';

export interface CreateNotification {
  userId: string;
  /** Category (stored in the `system` column). Drives channel policy. */
  system: NotificationCategory;
  /**
   * Dotted key into the `notification` i18n catalog (e.g. `order.new_enquiry`).
   * Title/body are rendered from it in the recipient's locale unless an explicit
   * `title`/`body` override is supplied (used for passthrough user content).
   */
  type: string;
  /** Interpolation values for the `type` template ({{reference}}, {{amount}}, …). */
  params?: NotificationParams;
  /** Explicit title override — bypasses the template. */
  title?: string;
  /** Explicit body override — bypasses the template (e.g. a chat preview, ticket subject). */
  body?: string;
  data?: Record<string, unknown>;
  linkUrl?: string;
  /** Per-call channel overrides (e.g. suppress email for a noisy event). */
  email?: boolean;
  push?: boolean;
}

/** Payload broadcast on {@link NOTIFICATION_CREATED} after persistence. */
export interface NotificationCreatedEvent {
  notification: Notification;
  overrides: { email?: boolean; push?: boolean };
  /**
   * False when the recipient muted this category in-app: nothing was persisted
   * and `notification` is an unsaved stand-in carrying the rendered text for the
   * email/push listeners, which own their own toggles. Relays to a live client
   * (the bell) must skip it — there is no row for the user to open or read.
   */
  inApp: boolean;
}

/**
 * Persists in-app notifications and fans out to every transport. Persistence is
 * synchronous; delivery (realtime socket, web/mobile push, email) happens in
 * decoupled `@OnEvent(NOTIFICATION_CREATED)` listeners so this service never
 * imports a gateway/push/mailer (no circular deps) and every caller gains all
 * channels for free.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async create(n: CreateNotification) {
    // Render title/body from the i18n catalog in the recipient's locale so every
    // channel (in-app, toast, push, email) is localized. Explicit title/body
    // overrides win (passthrough user content); the raw type is the last resort.
    const recipient = await this.prisma.user.findUnique({
      where: { id: n.userId },
      select: { locale: true, notificationPrefs: true },
    });
    const locale = recipient?.locale && isLang(recipient.locale) ? recipient.locale : FALLBACK_LNG;
    const rendered = renderNotification(locale, n.type, n.params ?? {});

    const row = {
      userId: n.userId,
      system: n.system,
      type: n.type,
      title: n.title ?? rendered?.title ?? n.type,
      body: n.body ?? rendered?.body ?? null,
      linkUrl: n.linkUrl ?? null,
    };

    // The persisted row IS the in-app channel — the bell reads nothing else — so
    // a category the user muted in-app is never written. Email and push resolve
    // their own toggles in their listeners, so the fan-out still runs, off an
    // unsaved stand-in row.
    const inApp = channelEnabled(recipient?.notificationPrefs ?? null, n.system, 'inApp');
    const notification: Notification = inApp
      ? await this.prisma.notification.create({
          data: {
            ...row,
            params: (n.params ?? undefined) as Prisma.InputJsonValue | undefined,
            data: (n.data ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        })
      : {
          ...row,
          id: '',
          readAt: null,
          createdAt: new Date(),
          params: (n.params ?? null) as Prisma.JsonValue,
          data: (n.data ?? null) as Prisma.JsonValue,
        };
    // Fire-and-forget fan-out; listeners own their own error handling so a
    // failing transport never breaks the request that created the notification.
    this.events.emit(NOTIFICATION_CREATED, {
      notification,
      overrides: { email: n.email, push: n.push },
      inApp,
    } satisfies NotificationCreatedEvent);
    return notification;
  }

  list(userId: string, take = 30) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
    });
  }

  unreadCount(userId: string, system?: ChatSystem) {
    return this.prisma.notification.count({
      where: { userId, readAt: null, ...(system ? { system } : {}) },
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string, system?: ChatSystem) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(system ? { system } : {}) },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  // ── Device tokens (web + mobile FCM) ─────────────────────────────

  /** Upsert an FCM token, (re)binding it to this user. Idempotent per token. */
  async registerDevice(userId: string, platform: string, token: string, userAgent?: string) {
    await this.prisma.deviceToken.upsert({
      where: { token },
      create: { userId, platform, token, userAgent },
      update: { userId, platform, userAgent, lastSeenAt: new Date() },
    });
    return { ok: true };
  }

  async unregisterDevice(userId: string, token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId } });
    return { ok: true };
  }

  // ── Preferences ──────────────────────────────────────────────────

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    return resolvedPrefs(user?.notificationPrefs ?? null);
  }

  /**
   * Turn one category's email off from a signed link — no session required.
   * Scoped to the category in the token so unsubscribing from promotional mail
   * never silences a payment receipt, and idempotent so a mail client that
   * pre-fetches the link twice is harmless.
   */
  async unsubscribeCategory(userId: string, category: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
    if (!user) return { ok: false as const };
    const current = (user.notificationPrefs ?? {}) as NotificationPrefs;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPrefs: {
          ...current,
          categories: {
            ...(current.categories ?? {}),
            [category]: { ...(current.categories?.[category as NotificationCategory] ?? {}), email: false },
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return { ok: true as const, category };
  }

  /**
   * Merge an incoming prefs patch into the stored JSON, PER CATEGORY.
   *
   * Clients send one switch at a time (`{ categories: { orders: { push: false } } }`),
   * so a one-level spread replaced the whole `orders` object and silently reset
   * that category's other two channels to their defaults — turning email or
   * in-app notifications back on for someone who had deliberately turned them off.
   */
  async updatePreferences(userId: string, patch: NotificationPrefs) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const current = (user?.notificationPrefs ?? {}) as NotificationPrefs;
    const merged: NotificationPrefs = {
      emailUnsubscribedAll: patch.emailUnsubscribedAll ?? current.emailUnsubscribedAll,
      categories: Object.fromEntries(
        Object.entries({ ...(current.categories ?? {}), ...(patch.categories ?? {}) }).map(([key, value]) => [
          key,
          { ...(current.categories?.[key as keyof NotificationPrefs['categories']] ?? {}), ...value },
        ]),
      ) as NotificationPrefs['categories'],
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: merged as Prisma.InputJsonValue },
    });
    return resolvedPrefs(merged);
  }
}
