import { BadRequestException, Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';
import { TranslationAdminService } from './translation-admin.service';

export class SetAutoTranslateDto {
  @IsBoolean()
  enabled!: boolean;
}

/** Admin → Translation: the master switch, coverage, and the manual full run. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('translation_manage')
@Controller('admin/translation')
export class TranslationAdminController {
  constructor(
    private readonly svc: TranslationAdminService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Translation coverage per source, plus the master switch' })
  overview() {
    return this.svc.overview();
  }

  @Patch()
  async setEnabled(@CurrentUser() admin: AuthUser, @Body() dto: SetAutoTranslateDto) {
    const out = await this.svc.setEnabled(dto.enabled);
    await this.audit.log({
      actorId: admin.id,
      action: dto.enabled ? 'translation.enable' : 'translation.disable',
      entityType: 'TranslationSettings',
      entityId: '1',
    });
    return out;
  }

  /**
   * Translate everything outstanding. Audited because it spends real API budget
   * and rewrites display text across the catalogue.
   */
  @Post('run')
  async run(@CurrentUser() admin: AuthUser) {
    let out;
    try {
      out = await this.svc.runNow();
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    await this.audit.log({
      actorId: admin.id,
      action: 'translation.run',
      entityType: 'TranslationSettings',
      entityId: '1',
      meta: { filled: out.lastRunFilled },
    });
    return out;
  }
}
