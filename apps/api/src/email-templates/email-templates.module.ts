import {
  Body,
  Controller,
  Get,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  OnModuleInit,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { MailService } from '../mail/mail.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import {
  renderEditableTemplate,
  type EditableTemplateInput,
  type TemplateVars,
} from '../mail/mail.templates';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_MAP, type TemplateDef } from '../mail/template-registry';

/** Readable sample values so preview / test emails look realistic. */
const SAMPLE: Record<string, string> = {
  name: 'Alex Morgan',
  title: 'Sample notification',
  body: 'This is a preview of how the email will look with real content.',
  ctaUrl: 'https://agrotraders.org',
  code: '482913',
  amount: '$1,250.00',
  reference: 'ORD-10428',
  orderReference: 'ORD-10429',
  number: 'INV-2043',
  product: 'Premium Basmati Rice',
  cargo: '25 MT Basmati Rice',
  buyer: 'Kuban Grain Co.',
  seller: 'Punjab Agro Exports',
  issuer: 'Punjab Agro Exports',
  author: 'Kuban Grain Co.',
  actor: 'Kuban Grain Co.',
  requester: 'Kuban Grain Co.',
  loaderco: 'Delta Loaders',
  market: 'Black Sea Wheat',
  role: 'seller',
  status: 'Dispatched',
  stars: '5',
  fromCity: 'Rostov',
  toCity: 'Novorossiysk',
  detail: ' for a 2-day shift',
  unit: 'MT',
};

function sampleVars(def: TemplateDef, override: TemplateVars = {}): TemplateVars {
  const vars: TemplateVars = {};
  for (const v of def.variables) vars[v] = override[v] ?? SAMPLE[v] ?? v;
  return { ...vars, ...override };
}

export class UpdateEmailTemplateDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() bodyHtml?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  /** When set (and not the base English row), edits go to this locale's translation. */
  @IsOptional() @IsString() locale?: string;
}

export class PreviewEmailTemplateDto {
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsObject() params?: Record<string, string | number>;
  /** Preview unsaved edits without persisting. */
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() bodyHtml?: string;
  @IsOptional() @IsString() ctaLabel?: string;
}

export class TestEmailTemplateDto {
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() locale?: string;
}

const BASE_LOCALES = new Set(['', 'en']);

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger('EmailTemplatesService');

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mail: MailService,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  /**
   * Idempotent seed: create any missing template row from the registry, and keep
   * the static label/description fresh — but never overwrite an admin's edited
   * subject/body/ctaLabel/enabled.
   */
  async seedDefaults() {
    try {
      for (const def of EMAIL_TEMPLATES) {
        await this.prisma.emailTemplate.upsert({
          where: { key: def.key },
          create: {
            key: def.key,
            name: def.name,
            description: def.description,
            subject: def.subject,
            bodyHtml: def.bodyHtml,
            ctaLabel: def.ctaLabel ?? null,
          },
          update: { name: def.name, description: def.description },
        });
      }
    } catch (e) {
      this.logger.warn(`email template seed skipped: ${(e as Error).message}`);
    }
  }

  private meta(key: string): TemplateDef | undefined {
    return EMAIL_TEMPLATE_MAP[key];
  }

  /** Merge a DB row with its static registry metadata for the admin UI. */
  private decorate<T extends { key: string }>(row: T) {
    const def = this.meta(row.key);
    return {
      ...row,
      category: def?.category ?? 'account',
      variables: def?.variables ?? [],
      defaultSubject: def?.subject ?? '',
      defaultBodyHtml: def?.bodyHtml ?? '',
    };
  }

  async listAll() {
    const rows = await this.prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => this.decorate(r));
  }

  async get(key: string) {
    const row = await this.prisma.emailTemplate.findUnique({
      where: { key },
      include: { translations: true },
    });
    if (!row) throw new NotFoundException('Template not found');
    return this.decorate(row);
  }

  async update(key: string, dto: UpdateEmailTemplateDto, adminId?: string) {
    const row = await this.prisma.emailTemplate.findUnique({ where: { key } });
    if (!row) throw new NotFoundException('Template not found');

    const locale = (dto.locale ?? '').trim();
    if (locale && !BASE_LOCALES.has(locale)) {
      // Per-locale override.
      await this.prisma.emailTemplateTranslation.upsert({
        where: { templateId_locale: { templateId: row.id, locale } },
        create: {
          templateId: row.id,
          locale,
          subject: dto.subject ?? row.subject,
          bodyHtml: dto.bodyHtml ?? row.bodyHtml,
          ctaLabel: dto.ctaLabel ?? row.ctaLabel,
        },
        update: {
          ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
          ...(dto.bodyHtml !== undefined ? { bodyHtml: dto.bodyHtml } : {}),
          ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel } : {}),
        },
      });
    } else {
      await this.prisma.emailTemplate.update({
        where: { key },
        data: {
          ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
          ...(dto.bodyHtml !== undefined ? { bodyHtml: dto.bodyHtml } : {}),
          ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        },
      });
    }

    await this.audit.log({
      actorId: adminId,
      action: 'emailTemplate.update',
      entityType: 'EmailTemplate',
      entityId: key,
      meta: { locale: locale || 'base', fields: Object.keys(dto).filter((k) => k !== 'locale') },
    });
    return this.get(key);
  }

  /**
   * Resolve the editable content for a key in a locale (translation → base).
   * Returns null when the template is missing or disabled, so the caller falls
   * back to its built-in default. Used by MailService and preview/test.
   */
  async resolve(key: string, locale?: string): Promise<EditableTemplateInput | null> {
    const row = await this.prisma.emailTemplate.findUnique({
      where: { key },
      include: locale && !BASE_LOCALES.has(locale) ? { translations: { where: { locale } } } : undefined,
    });
    if (!row || !row.enabled) return null;
    const tr = (row as { translations?: Array<{ subject: string; bodyHtml: string; ctaLabel: string | null }> })
      .translations?.[0];
    return {
      subject: tr?.subject ?? row.subject,
      bodyHtml: tr?.bodyHtml ?? row.bodyHtml,
      ctaLabel: tr?.ctaLabel ?? row.ctaLabel,
    };
  }

  /** Render a template (saved or the supplied unsaved edit) with sample vars. */
  async preview(key: string, dto: PreviewEmailTemplateDto) {
    const def = this.meta(key);
    if (!def) throw new NotFoundException('Template not found');
    const saved = await this.resolve(key, dto.locale);
    const tpl: EditableTemplateInput = {
      subject: dto.subject ?? saved?.subject ?? def.subject,
      bodyHtml: dto.bodyHtml ?? saved?.bodyHtml ?? def.bodyHtml,
      ctaLabel: dto.ctaLabel ?? saved?.ctaLabel ?? def.ctaLabel,
    };
    const vars = sampleVars(def, dto.params ?? {});
    const ctaUrl = def.variables.includes('ctaUrl') ? String(vars.ctaUrl ?? SAMPLE.ctaUrl) : undefined;
    const rendered = renderEditableTemplate(tpl, vars, {
      name: String(vars.name ?? ''),
      ctaUrl,
      settingsUrl: 'https://agrotraders.org/console',
    });
    return { subject: rendered.subject, html: rendered.html };
  }

  /** Send a rendered sample of a template to an address (defaults to the admin). */
  async sendTest(key: string, dto: TestEmailTemplateDto, admin?: AuthUser) {
    const to = (dto.to ?? admin?.email ?? '').trim();
    if (!to) throw new NotFoundException('No destination email');
    const def = this.meta(key);
    if (!def) throw new NotFoundException('Template not found');
    const rendered = await this.preview(key, { locale: dto.locale });
    const ok = await this.mail.send({
      to,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.subject,
    });
    await this.audit.log({
      actorId: admin?.id,
      action: 'emailTemplate.test',
      entityType: 'EmailTemplate',
      entityId: key,
      meta: { to, delivered: ok },
    });
    return { ok, delivered: ok, to, mailEnabled: this.mail.enabled };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('email_templates')
@Controller('admin/email-templates')
export class AdminEmailTemplatesController {
  constructor(private templates: EmailTemplatesService) {}

  @Get() list() {
    return this.templates.listAll();
  }
  @Get(':key') get(@Param('key') key: string) {
    return this.templates.get(key);
  }
  @Patch(':key') update(
    @Param('key') key: string,
    @Body() dto: UpdateEmailTemplateDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.templates.update(key, dto, admin.id);
  }
  @Post(':key/preview') preview(@Param('key') key: string, @Body() dto: PreviewEmailTemplateDto) {
    return this.templates.preview(key, dto);
  }
  @Post(':key/test') test(
    @Param('key') key: string,
    @Body() dto: TestEmailTemplateDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.templates.sendTest(key, dto, admin);
  }
}

@Module({
  controllers: [AdminEmailTemplatesController],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
