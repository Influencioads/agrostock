import { Body, Controller, Get, Global, Module, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { NotificationsService, type ChatSystem } from './notifications.service';
import type { NotificationPrefs } from './notification-categories';

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

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
