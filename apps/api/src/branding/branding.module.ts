import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';

/** The singleton row id. Branding is global, not per-tenant. */
const BRANDING_ID = 1;

export const BRAND_ASSET_KINDS = ['logo', 'appIcon', 'favicon'] as const;
export type BrandAssetKind = (typeof BRAND_ASSET_KINDS)[number];

/** Per-kind encoding. Icons must be PNG and small; the logo can be a WebP. */
const ASSET_RULES: Record<
  BrandAssetKind,
  { column: 'logoUrl' | 'appIconUrl' | 'faviconUrl'; format: 'webp' | 'png'; size: number }
> = {
  logo: { column: 'logoUrl', format: 'webp', size: 512 },
  appIcon: { column: 'appIconUrl', format: 'png', size: 512 },
  favicon: { column: 'faviconUrl', format: 'png', size: 180 },
};

export class ClearBrandingDto {
  @IsOptional()
  @IsIn(BRAND_ASSET_KINDS as unknown as string[])
  clear?: BrandAssetKind;
}

export interface BrandingDto {
  logoUrl: string | null;
  appIconUrl: string | null;
  faviconUrl: string | null;
}

@Injectable()
export class BrandingService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  /** Always returns a row — created empty on first read so callers never 404. */
  async get(): Promise<BrandingDto> {
    const row = await this.prisma.branding.upsert({
      where: { id: BRANDING_ID },
      update: {},
      create: { id: BRANDING_ID },
    });
    return { logoUrl: row.logoUrl, appIconUrl: row.appIconUrl, faviconUrl: row.faviconUrl };
  }

  async setAsset(kind: BrandAssetKind, file?: Express.Multer.File): Promise<BrandingDto> {
    const rule = ASSET_RULES[kind];
    const url = await this.uploads.saveImage(file, 'branding', {
      format: rule.format,
      maxWidth: rule.size,
      maxHeight: rule.size,
    });
    await this.prisma.branding.upsert({
      where: { id: BRANDING_ID },
      update: { [rule.column]: url },
      create: { id: BRANDING_ID, [rule.column]: url },
    });
    return this.get();
  }

  /** Null the column so the app falls back to its built-in default. */
  async clear(kind: BrandAssetKind): Promise<BrandingDto> {
    await this.prisma.branding.upsert({
      where: { id: BRANDING_ID },
      update: { [ASSET_RULES[kind].column]: null },
      create: { id: BRANDING_ID },
    });
    return this.get();
  }
}

@ApiTags('branding')
@Controller('branding')
export class BrandingController {
  constructor(private branding: BrandingService) {}

  /** Public: web, admin and mobile read this at boot. */
  @Get() get() {
    return this.branding.get();
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('branding_manage')
@Controller('admin/branding')
export class AdminBrandingController {
  constructor(private branding: BrandingService) {}

  @Get() get() {
    return this.branding.get();
  }

  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Query('kind') kind: string, @UploadedFile() file?: Express.Multer.File) {
    if (!isBrandAssetKind(kind)) {
      throw new BadRequestException(`kind must be one of: ${BRAND_ASSET_KINDS.join(', ')}`);
    }
    return this.branding.setAsset(kind, file);
  }

  @Patch() clear(@Body() dto: ClearBrandingDto) {
    if (!dto.clear) throw new BadRequestException('Nothing to clear');
    return this.branding.clear(dto.clear);
  }
}

function isBrandAssetKind(v: string): v is BrandAssetKind {
  return (BRAND_ASSET_KINDS as readonly string[]).includes(v);
}

@Module({
  controllers: [BrandingController, AdminBrandingController],
  providers: [BrandingService],
})
export class BrandingModule {}
