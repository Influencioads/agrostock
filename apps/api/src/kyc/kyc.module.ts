import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { KycDocType } from '@prisma/client';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { IsIn } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

const DOC_TYPES: KycDocType[] = ['trade_license', 'government_id', 'bank_proof', 'tax_certificate', 'other'];

/** KYC files are PDFs or photos of a document. Never re-encoded, never public. */
const KYC_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

/** A doc-file link is opened by the OS/browser, which can't send a bearer header. */
const FILE_TOKEN_TTL = '5m';

const isAdmin = (u: AuthUser) => (u.roles ?? [u.role]).includes('admin');

const DOC_INCLUDE = { record: { select: { userId: true } } } as const;

interface FileTokenPayload {
  doc: string;
  sub: string;
}

export class UploadKycDocDto {
  @ApiProperty({ enum: DOC_TYPES })
  @IsIn(DOC_TYPES)
  type!: KycDocType;
}

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private secret() {
    return this.config.get<string>('JWT_SECRET') || 'change-me-access-secret';
  }

  /** The caller's own KYC record + documents, created lazily on first read. */
  async mine(userId: string) {
    const record = await this.prisma.kycRecord.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { documents: { orderBy: { createdAt: 'desc' } } },
    });
    return this.shape(record);
  }

  async addDocument(user: AuthUser, type: KycDocType, file?: Express.Multer.File) {
    const stored = await this.uploads.savePrivateFile(file, 'kyc', KYC_MIME);
    const record = await this.prisma.kycRecord.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });
    await this.prisma.kycDocument.create({
      data: {
        recordId: record.id,
        type,
        storageKey: stored.storageKey,
        originalName: file?.originalname,
        mime: stored.mime,
        sizeBytes: stored.sizeBytes,
      },
    });
    // A new submission re-opens review, and `docs` mirrors the real count.
    const docs = await this.prisma.kycDocument.count({ where: { recordId: record.id } });
    await this.prisma.kycRecord.update({ where: { id: record.id }, data: { status: 'pending', docs } });
    await this.prisma.user.update({ where: { id: user.id }, data: { kycStatus: 'pending' } });
    return this.mine(user.id);
  }

  async deleteDocument(user: AuthUser, id: string) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { id }, include: DOC_INCLUDE });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.record.userId !== user.id) throw new ForbiddenException('Not your document');
    const record = await this.prisma.kycRecord.findUnique({ where: { userId: user.id } });
    if (record && record.status !== 'pending') {
      throw new ForbiddenException('Documents can only be removed while under review');
    }
    await this.prisma.kycDocument.delete({ where: { id } });
    if (record) {
      const docs = await this.prisma.kycDocument.count({ where: { recordId: record.id } });
      await this.prisma.kycRecord.update({ where: { id: record.id }, data: { docs } });
    }
    return this.mine(user.id);
  }

  /** Short-lived, single-document token for the streamed file route. */
  async fileToken(id: string, user: AuthUser) {
    await this.readableDoc(id, user.id, isAdmin(user));
    const token = await this.jwt.signAsync({ doc: id, sub: user.id } satisfies FileTokenPayload, {
      secret: this.secret(),
      expiresIn: FILE_TOKEN_TTL,
    });
    return { token, expiresIn: FILE_TOKEN_TTL };
  }

  /** Verify the query token, re-check access, and return the file to stream. */
  async fileForToken(id: string, token: string | undefined, res: Response) {
    if (!token) throw new UnauthorizedException('Missing token');
    let payload: FileTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<FileTokenPayload>(token, { secret: this.secret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.doc !== id) throw new UnauthorizedException('Token is not valid for this document');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Unknown user');
    const admin = new Set([user.role, ...user.roles]).has('admin');
    const doc = await this.readableDoc(id, payload.sub, admin);

    if (!(await this.uploads.privateFileExists(doc.storageKey))) {
      throw new NotFoundException('File is no longer available');
    }
    res.setHeader('Content-Type', doc.mime);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName ?? doc.id}"`);
    createReadStream(this.uploads.privatePath(doc.storageKey)).pipe(res);
  }

  private async readableDoc(id: string, userId: string, admin: boolean) {
    const doc = await this.prisma.kycDocument.findUnique({ where: { id }, include: DOC_INCLUDE });
    if (!doc) throw new NotFoundException('Document not found');
    if (!admin && doc.record.userId !== userId) throw new ForbiddenException('Not your document');
    return doc;
  }

  private shape(record: {
    status: string;
    notes: string | null;
    documents: { id: string; type: KycDocType; originalName: string | null; mime: string; sizeBytes: number; createdAt: Date }[];
  }) {
    return {
      status: record.status,
      notes: record.notes,
      documents: record.documents.map((d) => ({
        id: d.id,
        type: d.type,
        originalName: d.originalName,
        mime: d.mime,
        sizeBytes: d.sizeBytes,
        createdAt: d.createdAt,
      })),
    };
  }
}

@ApiTags('kyc')
@Controller()
export class KycController {
  constructor(private kyc: KycService) {}

  /**
   * Outside the guards on purpose: authorization is the signed `token` query
   * param (mobile/browser open this URL without an Authorization header).
   */
  @Get('kyc/documents/:id/file')
  file(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    return this.kyc.fileForToken(id, token, res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me/kyc')
  mine(@CurrentUser() u: AuthUser) {
    return this.kyc.mine(u.id);
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('me/kyc/documents')
  @UseInterceptors(FileInterceptor('file'))
  upload(@CurrentUser() u: AuthUser, @Body() dto: UploadKycDocDto, @UploadedFile() file?: Express.Multer.File) {
    return this.kyc.addDocument(u, dto.type, file);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('me/kyc/documents/:id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.kyc.deleteDocument(u, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('kyc/documents/:id/token')
  token(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.kyc.fileToken(id, u);
  }
}

@Module({
  imports: [JwtModule.register({})],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
