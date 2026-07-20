import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_CREATED } from '../notifications/notification-categories';
import { channelEnabled } from '../notifications/notification-categories';
import type { NotificationCreatedEvent } from '../notifications/notifications.service';

/**
 * Server-side push via Firebase Cloud Messaging (web + mobile share FCM tokens).
 * Credentials come from `FIREBASE_SERVICE_ACCOUNT` (a JSON string) or the
 * ambient `GOOGLE_APPLICATION_CREDENTIALS`. When neither is set the service
 * disables itself and every send is a logged no-op — the app boots fine without
 * push configured (mirrors the frontend firebase.ts null-guard).
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger('PushService');
  private app: admin.app.App | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    try {
      const raw = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
      const hasAppDefault = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (!raw && !hasAppDefault) {
        this.logger.warn('FCM disabled: set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS to enable push.');
        return;
      }
      // Reuse an already-initialised default app if one exists (e.g. HMR reload).
      if (admin.apps.length) {
        this.app = admin.app();
        return;
      }
      const credential = raw
        ? admin.credential.cert(JSON.parse(raw) as admin.ServiceAccount)
        : admin.credential.applicationDefault();
      this.app = admin.initializeApp({
        credential,
        projectId: this.config.get<string>('FIREBASE_PROJECT_ID') || undefined,
      });
      this.logger.log('FCM initialised.');
    } catch (err) {
      this.logger.error(`FCM init failed — push disabled: ${(err as Error).message}`);
      this.app = null;
    }
  }

  get enabled() {
    return this.app !== null;
  }

  /** Fan-out listener: deliver a persisted notification to the user's devices. */
  @OnEvent(NOTIFICATION_CREATED)
  async onNotificationCreated({ notification, overrides }: NotificationCreatedEvent) {
    if (!this.enabled) return;
    try {
      const prefs = await this.prisma.user
        .findUnique({ where: { id: notification.userId }, select: { notificationPrefs: true } })
        .then((u) => u?.notificationPrefs ?? null);
      const pushAllowed = overrides.push ?? channelEnabled(prefs, notification.system, 'push');
      if (!pushAllowed) return;
      await this.sendToUser(notification.userId, {
        title: notification.title,
        body: notification.body ?? undefined,
        linkUrl: notification.linkUrl ?? undefined,
        data: {
          notificationId: notification.id,
          type: notification.type,
          system: notification.system,
        },
      });
    } catch (err) {
      this.logger.error(`push dispatch failed: ${(err as Error).message}`);
    }
  }

  /** Send to every registered device for a user; prunes tokens FCM rejects. */
  async sendToUser(
    userId: string,
    msg: { title: string; body?: string; linkUrl?: string; data?: Record<string, string> },
  ) {
    if (!this.app) return { sent: 0, pruned: 0 };
    const devices = await this.prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
    const tokens = devices.map((d) => d.token);
    if (tokens.length === 0) return { sent: 0, pruned: 0 };

    const data: Record<string, string> = { ...(msg.data ?? {}) };
    if (msg.linkUrl) data.linkUrl = msg.linkUrl;

    const res = await admin.messaging(this.app).sendEachForMulticast({
      tokens,
      notification: { title: msg.title, body: msg.body },
      data,
      webpush: msg.linkUrl
        ? { fcmOptions: { link: msg.linkUrl }, notification: { title: msg.title, body: msg.body } }
        : undefined,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    const dead: string[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        dead.push(tokens[i]);
      }
    });
    if (dead.length) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
    }
    return { sent: res.successCount, pruned: dead.length };
  }
}
