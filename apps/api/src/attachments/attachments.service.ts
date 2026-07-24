import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import type { ChatAttachment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';
import type { ChatSystem } from '../notifications/notifications.service';

/** Allow-list of upload MIME types (images, common docs, voice notes). */
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'audio/webm',
  'audio/mpeg',
  'audio/mp4',
]);

export interface PresignDto {
  system: ChatSystem;
  mime: string;
  sizeBytes: number;
  originalName?: string;
}

/**
 * Presigned MinIO/S3 uploads + access-checked downloads. Attachments are
 * created unlinked, then bound to a message when that message is sent.
 * Download access is re-verified against the linked message's room so the two
 * chat systems never cross-read (IDOR-safe).
 * TODO(phase-2): async AV / risky-file scan before the object is downloadable.
 */
@Injectable()
export class AttachmentsService implements OnModuleInit {
  private readonly logger = new Logger('AttachmentsService');
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly maxBytes: number;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.bucket = config.get<string>('S3_BUCKET') || 'agrostock';
    this.maxBytes = (Number(config.get('ATTACHMENT_MAX_MB')) || 15) * 1024 * 1024;
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION') || 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY') || '',
        secretAccessKey: config.get<string>('S3_SECRET_KEY') || '',
      },
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created attachment bucket "${this.bucket}"`);
      } catch (e) {
        this.logger.warn(`Could not ensure bucket "${this.bucket}": ${(e as Error).message}`);
      }
    }
  }

  private kindFor(mime: string): 'image' | 'voice' | 'document' {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'voice';
    return 'document';
  }

  async presignUpload(user: AuthUser, dto: PresignDto) {
    if (!ALLOWED_MIME.has(dto.mime)) throw new BadRequestException('Unsupported file type');
    if (!dto.sizeBytes || dto.sizeBytes <= 0 || dto.sizeBytes > this.maxBytes) {
      throw new BadRequestException('File missing or exceeds size limit');
    }
    const kind = this.kindFor(dto.mime);
    const s3Key = `${dto.system}/${user.id}/${randomUUID()}`;
    const attachment = await this.prisma.chatAttachment.create({
      data: {
        system: dto.system,
        uploaderId: user.id,
        kind,
        mime: dto.mime,
        sizeBytes: dto.sizeBytes,
        s3Key,
        originalName: dto.originalName,
      },
    });
    // API-06: bind the exact declared size into the signature. The client must PUT
    // with a matching Content-Length or S3 rejects it, so a signed URL can't be
    // reused to upload an arbitrarily large object and fill storage. Size was
    // otherwise only DTO-validated and unenforced at the storage layer.
    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({ Bucket: this.bucket, Key: s3Key, ContentType: dto.mime, ContentLength: dto.sizeBytes }),
      { expiresIn: 600 },
    );
    return { attachmentId: attachment.id, uploadUrl, s3Key, kind };
  }

  async downloadUrl(user: AuthUser, id: string) {
    const att = await this.prisma.chatAttachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Attachment not found');
    await this.assertCanAccess(user, att);
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: att.s3Key }),
      { expiresIn: 600 },
    );
    return { url, mime: att.mime, kind: att.kind, originalName: att.originalName };
  }

  /** Re-check that this user may view the file behind the linked message. */
  private async assertCanAccess(user: AuthUser, att: ChatAttachment) {
    if (att.uploaderId === user.id) return;
    const isAdmin = user.roles.includes('admin');

    if (att.supportMessageId) {
      if (isAdmin) return;
      const msg = await this.prisma.supportMessage.findUnique({
        where: { id: att.supportMessageId },
        include: { conversation: { include: { ticket: { include: { assignments: true } } } } },
      });
      const ticket = msg?.conversation.ticket;
      if (
        ticket &&
        (ticket.userId === user.id ||
          ticket.assignments.some((a) => a.agentId === user.id && a.active))
      ) {
        return;
      }
      throw new ForbiddenException('No access to this attachment');
    }

    if (att.communityMessageId) {
      const msg = await this.prisma.communityMessage.findUnique({
        where: { id: att.communityMessageId },
        include: { group: true },
      });
      if (!msg) throw new ForbiddenException('No access to this attachment');
      if (msg.group && msg.group.visibility === 'public') return;
      if (msg.groupId) {
        const member = await this.prisma.communityGroupMember.findUnique({
          where: { groupId_userId: { groupId: msg.groupId, userId: user.id } },
        });
        if (member) return;
      }
      if (msg.threadId) {
        const thread = await this.prisma.communityDirectThread.findUnique({
          where: { id: msg.threadId },
        });
        if (thread && (thread.aId === user.id || thread.bId === user.id)) return;
      }
      throw new ForbiddenException('No access to this attachment');
    }

    if (isAdmin) return;
    throw new ForbiddenException('No access to this attachment');
  }
}
