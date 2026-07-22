import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_CREATED,
  categoryConfig,
  channelEnabled,
} from '../notifications/notification-categories';
import type { NotificationCreatedEvent } from '../notifications/notifications.service';
import { renderNotificationEmail, subjectFor } from './mail.templates';

/**
 * Transactional email over SMTP (nodemailer). Configured from `SMTP_*` env; when
 * `SMTP_HOST` is absent the service disables itself and every send is a logged
 * no-op, so the app runs fine before credentials are added. Only categories
 * flagged `transactional` (see notification-categories.ts) ever email, and the
 * user's per-category email preference is honoured.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger('MailService');
  private transporter: Transporter | null = null;
  private from = '';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('Email disabled: set SMTP_HOST (and SMTP_USER/SMTP_PASS) to enable transactional email.');
      return;
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from = this.config.get<string>('MAIL_FROM') ?? `AgroTraders <no-reply@${host}>`;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: String(this.config.get('SMTP_SECURE') ?? (port === 465)).toLowerCase() === 'true' || port === 465,
      auth: user && pass ? { user, pass } : undefined,
      // Fail fast on a misconfigured or unreachable host instead of holding the
      // socket open for the OS default (~2 minutes).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    this.logger.log(`Email enabled via ${host}:${port}.`);
  }

  get enabled() {
    return this.transporter !== null;
  }

  private webUrl() {
    return (this.config.get<string>('APP_WEB_URL') ?? '').replace(/\/$/, '');
  }

  /**
   * Send one arbitrary transactional email. Returns false (never throws) when
   * mail is disabled or the send fails — callers decide whether that is fatal.
   */
  async send(opts: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, ...opts });
      return true;
    } catch (err) {
      this.logger.error(`email send failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Where the confirmation link points. Relative when APP_WEB_URL is unset. */
  verificationUrl(token: string): string {
    return `${this.webUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  }

  /** Confirm-your-address email carrying a one-shot token. */
  async sendVerificationEmail(user: { email: string; name: string }, token: string): Promise<boolean> {
    const url = this.verificationUrl(token);
    const { html, text } = renderNotificationEmail({
      title: 'Confirm your email address',
      body: 'Tap the button below to activate your AgroTraders account. The link is valid for 24 hours — if it expires, request a new one from the sign-in page.',
      ctaUrl: url,
      ctaLabel: 'Confirm my email',
      name: user.name,
    });
    return this.send({
      to: user.email,
      subject: '[AgroTraders] Confirm your email address',
      html,
      text,
    });
  }

  /** Absolute URL from a notification's relative linkUrl (best-effort). */
  private absolute(linkUrl?: string | null) {
    if (!linkUrl) return undefined;
    if (/^https?:\/\//.test(linkUrl)) return linkUrl;
    const base = this.webUrl();
    return base ? `${base}${linkUrl.startsWith('/') ? '' : '/'}${linkUrl}` : undefined;
  }

  /** Fan-out listener: email transactional notifications the user opted into. */
  @OnEvent(NOTIFICATION_CREATED)
  async onNotificationCreated({ notification, overrides }: NotificationCreatedEvent) {
    if (!this.enabled) return;
    if (!categoryConfig(notification.system).transactional) return;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, name: true, notificationPrefs: true },
      });
      if (!user?.email) return;
      const emailAllowed = overrides.email ?? channelEnabled(user.notificationPrefs, notification.system, 'email');
      if (!emailAllowed) return;

      const ctaUrl = (this.absolute(notification.linkUrl) ?? this.webUrl()) || undefined;
      const settingsUrl = this.webUrl() ? `${this.webUrl()}/console` : undefined;
      const { html, text } = renderNotificationEmail({
        title: notification.title,
        body: notification.body ?? undefined,
        ctaUrl,
        ctaLabel: ctaUrl ? 'Open AgroTraders' : undefined,
        name: user.name,
        settingsUrl,
      });

      await this.transporter!.sendMail({
        from: this.from,
        to: user.email,
        subject: subjectFor(notification.system, notification.title),
        html,
        text,
      });
    } catch (err) {
      this.logger.error(`email dispatch failed: ${(err as Error).message}`);
    }
  }
}
