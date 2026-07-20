import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notification, Prisma } from '@prisma/client';
import { FALLBACK_LNG, isLang, type Lang } from '@agrotraders/i18n';
import { renderNotification, type NotificationParams } from '@agrotraders/i18n/notifications';
import { PrismaService } from '../prisma/prisma.service';
import {
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

  /** The locale to render this recipient's notification in: their saved preference, else English. */
  private async recipientLocale(userId: string): Promise<Lang> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
    return user?.locale && isLang(user.locale) ? user.locale : FALLBACK_LNG;
  }

  async create(n: CreateNotification) {
    // Render title/body from the i18n catalog in the recipient's locale so every
    // channel (in-app, toast, push, email) is localized. Explicit title/body
    // overrides win (passthrough user content); the raw type is the last resort.
    const locale = await this.recipientLocale(n.userId);
    const rendered = renderNotification(locale, n.type, n.params ?? {});
    const title = n.title ?? rendered?.title ?? n.type;
    const body = n.body ?? rendered?.body;

    const notification = await this.prisma.notification.create({
      data: {
        userId: n.userId,
        system: n.system,
        type: n.type,
        title,
        body,
        params: (n.params ?? undefined) as Prisma.InputJsonValue | undefined,
        linkUrl: n.linkUrl,
        data: (n.data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    // Fire-and-forget fan-out; listeners own their own error handling so a
    // failing transport never breaks the request that created the notification.
    this.events.emit(NOTIFICATION_CREATED, {
      notification,
      overrides: { email: n.email, push: n.push },
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

  /** Shallow-merge an incoming prefs patch into the stored JSON. */
  async updatePreferences(userId: string, patch: NotificationPrefs) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const current = (user?.notificationPrefs ?? {}) as NotificationPrefs;
    const merged: NotificationPrefs = {
      emailUnsubscribedAll: patch.emailUnsubscribedAll ?? current.emailUnsubscribedAll,
      categories: { ...(current.categories ?? {}), ...(patch.categories ?? {}) },
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: merged as Prisma.InputJsonValue },
    });
    return resolvedPrefs(merged);
  }
}
