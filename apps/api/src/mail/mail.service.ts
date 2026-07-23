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
import {
  renderNotificationEmail,
  renderEditableTemplate,
  subjectFor,
  type EditableTemplateInput,
  type TemplateVars,
} from './mail.templates';
import { EMAIL_TEMPLATE_MAP } from './template-registry';

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

  private settingsUrl() {
    return this.webUrl() ? `${this.webUrl()}/console` : undefined;
  }

  /**
   * Resolve an admin-edited template (locale translation → base). Returns null
   * when the row is missing or disabled so callers fall back to a built-in
   * default. Queries Prisma directly rather than injecting EmailTemplatesService,
   * which would create a circular provider dependency.
   */
  private async resolveTemplate(key: string, locale?: string): Promise<EditableTemplateInput | null> {
    try {
      const useLocale = locale && locale !== 'en';
      const row = await this.prisma.emailTemplate.findUnique({
        where: { key },
        include: useLocale ? { translations: { where: { locale } } } : undefined,
      });
      if (!row || !row.enabled) return null;
      const tr = (row as { translations?: Array<{ subject: string; bodyHtml: string; ctaLabel: string | null }> })
        .translations?.[0];
      return {
        subject: tr?.subject ?? row.subject,
        bodyHtml: tr?.bodyHtml ?? row.bodyHtml,
        ctaLabel: tr?.ctaLabel ?? row.ctaLabel,
      };
    } catch {
      return null;
    }
  }

  /**
   * Render a keyed template (DB row → registry default) with the given vars.
   * Used by the direct auth emails (verify / reset / OTP / welcome).
   */
  private async renderKeyed(
    key: string,
    locale: string | undefined,
    vars: TemplateVars,
    ctx: { name?: string; ctaUrl?: string; settingsUrl?: string },
  ) {
    const saved = await this.resolveTemplate(key, locale);
    const def = EMAIL_TEMPLATE_MAP[key];
    const tpl: EditableTemplateInput = saved ?? {
      subject: def?.subject ?? `[AgroTraders] ${key}`,
      bodyHtml: def?.bodyHtml ?? '<p>{{body}}</p>',
      ctaLabel: def?.ctaLabel,
    };
    return renderEditableTemplate(tpl, vars, ctx);
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

  /** Where the reset link points. */
  resetUrl(token: string): string {
    return `${this.webUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  }

  /** Confirm-your-address email carrying a one-shot token. */
  async sendVerificationEmail(
    user: { email: string; name: string; locale?: string | null },
    token: string,
  ): Promise<boolean> {
    const url = this.verificationUrl(token);
    const { subject, html, text } = await this.renderKeyed(
      'auth.email_verify',
      user.locale ?? undefined,
      { name: user.name },
      { name: user.name, ctaUrl: url, settingsUrl: this.settingsUrl() },
    );
    return this.send({ to: user.email, subject, html, text });
  }

  /** Password-reset email carrying a one-shot token link. */
  async sendPasswordReset(
    user: { email: string; name: string; locale?: string | null },
    token: string,
  ): Promise<boolean> {
    const url = this.resetUrl(token);
    const { subject, html, text } = await this.renderKeyed(
      'auth.password_reset',
      user.locale ?? undefined,
      { name: user.name },
      { name: user.name, ctaUrl: url, settingsUrl: this.settingsUrl() },
    );
    return this.send({ to: user.email, subject, html, text });
  }

  /** Passwordless login: email a 6-digit code. */
  async sendLoginOtp(
    user: { email: string; name: string; locale?: string | null },
    code: string,
  ): Promise<boolean> {
    const { subject, html, text } = await this.renderKeyed(
      'auth.login_otp',
      user.locale ?? undefined,
      { name: user.name, code },
      { name: user.name, settingsUrl: this.settingsUrl() },
    );
    return this.send({ to: user.email, subject, html, text });
  }

  /** One-off welcome email after an account is verified. */
  async sendWelcome(user: { email: string; name: string; locale?: string | null }): Promise<boolean> {
    const { subject, html, text } = await this.renderKeyed(
      'auth.welcome',
      user.locale ?? undefined,
      { name: user.name },
      { name: user.name, ctaUrl: this.webUrl() || undefined, settingsUrl: this.settingsUrl() },
    );
    return this.send({ to: user.email, subject, html, text });
  }

  /**
   * Flatten a notification's `params` JSON to scalar template vars. Enum-ref
   * params (`{ enum, value }`) need locale resolution and already appear in the
   * rendered title/body, so they are skipped here.
   */
  private scalarParams(params: unknown): TemplateVars {
    const out: TemplateVars = {};
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
        if (typeof v === 'string' || typeof v === 'number') out[k] = v;
      }
    }
    return out;
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
        select: { email: true, name: true, locale: true, notificationPrefs: true },
      });
      if (!user?.email) return;
      const emailAllowed = overrides.email ?? channelEnabled(user.notificationPrefs, notification.system, 'email');
      if (!emailAllowed) return;

      const ctaUrl = (this.absolute(notification.linkUrl) ?? this.webUrl()) || undefined;
      const settingsUrl = this.settingsUrl();

      // Prefer an admin-edited template keyed by the notification type; fall back
      // to the built-in generic layout when none exists / is disabled.
      const tpl = await this.resolveTemplate(notification.type, user.locale ?? undefined);
      if (tpl) {
        const vars: TemplateVars = {
          name: user.name,
          title: notification.title,
          body: notification.body ?? '',
          ...this.scalarParams(notification.params),
        };
        const rendered = renderEditableTemplate(tpl, vars, { name: user.name, ctaUrl, settingsUrl });
        await this.transporter!.sendMail({
          from: this.from,
          to: user.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        return;
      }

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
