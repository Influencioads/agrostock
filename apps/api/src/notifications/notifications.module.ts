import { Body, Controller, Get, Global, Header, Module, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { NotificationsService, type ChatSystem } from './notifications.service';
import { categoryConfig, type NotificationPrefs } from './notification-categories';
import { verifyUnsubscribeToken } from '../common/crypto';

class RegisterDeviceDto {
  @IsIn(['web', 'android', 'ios'])
  platform!: 'web' | 'android' | 'ios';

  @IsString()
  @MaxLength(4096)
  token!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

class UnregisterDeviceDto {
  @IsString()
  @MaxLength(4096)
  token!: string;
}

class UpdatePrefsDto {
  @IsOptional()
  @IsBoolean()
  emailUnsubscribedAll?: boolean;

  @IsOptional()
  @IsObject()
  categories?: NotificationPrefs['categories'];
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: AuthUser, @Query('system') system?: ChatSystem) {
    return this.notifications.unreadCount(user.id, system).then((count) => ({ count }));
  }

  @Post(':id/read')
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: AuthUser, @Query('system') system?: ChatSystem) {
    return this.notifications.markAllRead(user.id, system);
  }

  // ── Push device registration ─────────────────────────────────────
  @Post('register-device')
  registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(user.id, dto.platform, dto.token, dto.userAgent);
  }

  @Post('unregister-device')
  unregisterDevice(@CurrentUser() user: AuthUser, @Body() dto: UnregisterDeviceDto) {
    return this.notifications.unregisterDevice(user.id, dto.token);
  }

  // ── Channel preferences ──────────────────────────────────────────
  @Get('preferences')
  preferences(@CurrentUser() user: AuthUser) {
    return this.notifications.getPreferences(user.id);
  }

  @Put('preferences')
  updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: UpdatePrefsDto) {
    return this.notifications.updatePreferences(user.id, dto);
  }
}

/**
 * One-click unsubscribe, deliberately OUTSIDE the JWT guard.
 *
 * RFC 8058 requires the `List-Unsubscribe-Post` target to work with no login and
 * no confirmation step, and Gmail/Yahoo bulk-sender rules make honouring it a
 * deliverability requirement, not a nicety. The token is signed and scoped to a
 * single category, so an unauthenticated POST can only ever silence the exact
 * kind of mail the link was printed in — never receipts.
 */
@ApiTags('notifications')
@Controller('unsubscribe')
export class UnsubscribeController {
  constructor(private notifications: NotificationsService) {}

  /** Mail-client one-click target (RFC 8058). Body is ignored. */
  @Post()
  async oneClick(@Query('token') token?: string) {
    const claim = token ? verifyUnsubscribeToken(token) : null;
    if (!claim) return { ok: false };
    return this.notifications.unsubscribeCategory(claim.userId, claim.category);
  }

  /**
   * The human-visible footer link. RENDERS ONLY — it must never unsubscribe.
   *
   * Outlook SafeLinks, corporate mail scanners and prefetching clients follow
   * every URL in a message. When this handler mutated, each of them silently
   * opted a real customer out of a category they never chose to leave, with no
   * click and no confirmation. GET is safe by definition; the button below
   * posts to the RFC 8058 handler that already exists above.
   */
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  page(@Query('token') token?: string) {
    const claim = token ? verifyUnsubscribeToken(token) : null;
    if (!claim) {
      return this.shell(
        'That unsubscribe link is not valid or has expired. You can change every email setting from your notification preferences.',
      );
    }
    const label = categoryConfig(claim.category).label;
    return this.shell(
      `<p style="color:#14251A;font-size:16px;line-height:1.6;margin:0 0 24px;">Stop receiving <b>${label}</b> emails?</p>
       <form method="post" action="/api/unsubscribe?token=${encodeURIComponent(token!)}">
         <button type="submit" style="background:#0B3D2E;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer;">Unsubscribe</button>
       </form>
       <p style="color:#647268;font-size:14px;line-height:1.6;margin:24px 0 0;">Payment receipts and account notices are unaffected, and you can turn this back on any time in your notification settings.</p>`,
    );
  }

  /** The POST target for the button above, and for RFC 8058 one-click. */
  @Post('confirm')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async confirm(@Query('token') token?: string) {
    const claim = token ? verifyUnsubscribeToken(token) : null;
    const done = claim ? await this.notifications.unsubscribeCategory(claim.userId, claim.category) : { ok: false };
    return this.shell(
      done.ok
        ? `You will no longer receive <b>${claim ? categoryConfig(claim.category).label : ''}</b> emails.<br><span style="color:#647268;font-size:14px;">Payment receipts and account notices are unaffected. You can turn this back on any time in your notification settings.</span>`
        : 'That unsubscribe link is not valid or has expired. You can change every email setting from your notification preferences.',
    );
  }

  private shell(body: string): string {
    return `<!doctype html><html><body style="margin:0;background:#F6FBF7;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:520px;margin:64px auto;background:#fff;border:1px solid #D7E6DA;border-radius:16px;padding:32px;">
        <div style="font-size:20px;font-weight:800;color:#0B3D2E;margin-bottom:16px;">Agro<span style="color:#FFA000;">Traders</span></div>
        ${body}
      </div></body></html>`;
  }
}

@Global()
@Module({
  controllers: [NotificationsController, UnsubscribeController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
