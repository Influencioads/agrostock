import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, mkdir, writeFile } from 'fs/promises';
import { isAbsolute, join, normalize } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

/** MIME types we accept for image uploads (everything is re-encoded to WebP). */
const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
]);

/** File extension per MIME for raw (non-re-encoded) private uploads. */
const PRIVATE_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/**
 * Local/public image storage. Every upload is re-encoded to WebP and written
 * under `<UPLOAD_DIR>/<subdir>/<uuid>.webp`, served statically at
 * `/uploads/<subdir>/<uuid>.webp` (see main.ts useStaticAssets). No S3 —
 * this runs on plain filesystem (Hostinger for now).
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger('UploadsService');
  private readonly baseDir: string;
  private readonly privateDir: string;
  private readonly maxBytes: number;

  constructor(private config: ConfigService) {
    this.baseDir = config.get<string>('UPLOAD_DIR') || 'uploads';
    this.privateDir = config.get<string>('PRIVATE_UPLOAD_DIR') || 'private-uploads';
    this.maxBytes = (Number(config.get('UPLOAD_MAX_MB')) || 10) * 1024 * 1024;
  }

  /**
   * Validate, re-encode, and persist an uploaded image.
   * Returns the public URL path to store on the entity (e.g. Product.imageUrl).
   *
   * Defaults produce a 1200px WebP, which is right for product and profile
   * photos. Brand assets override this — a favicon must stay PNG (and small),
   * because a 1200px WebP is useless as an icon.
   */
  async saveImage(
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    subdir = 'products',
    opts: { format?: 'webp' | 'png'; maxWidth?: number; maxHeight?: number } = {},
  ): Promise<string> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException('Unsupported image type');
    }
    if (!file.size || file.size > this.maxBytes) {
      throw new BadRequestException('Image missing or exceeds size limit');
    }

    const { format = 'webp', maxWidth = 1200, maxHeight = 1200 } = opts;

    let out: Buffer;
    try {
      const pipeline = sharp(file.buffer)
        .rotate() // honour EXIF orientation
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });
      out = await (format === 'png'
        ? pipeline.png({ compressionLevel: 9 })
        : pipeline.webp({ quality: 80 })
      ).toBuffer();
    } catch (e) {
      this.logger.warn(`Image conversion failed: ${(e as Error).message}`);
      throw new BadRequestException('Could not process this image');
    }

    const dir = join(process.cwd(), this.baseDir, subdir);
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${format}`;
    await writeFile(join(dir, filename), out);
    return `/uploads/${subdir}/${filename}`;
  }

  /**
   * Persist a raw (un-re-encoded) file — PDFs and images — into the PRIVATE
   * store, which is NOT mounted on the public `/uploads` route. Used for
   * sensitive documents (KYC) that must only be reachable through an
   * access-checked, streamed endpoint. Returns a `storageKey` like
   * `kyc/<uuid>.pdf` — store that on the entity, never a public URL.
   */
  async savePrivateFile(
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    subdir: string,
    allowedMime: Set<string>,
  ): Promise<{ storageKey: string; mime: string; sizeBytes: number }> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!allowedMime.has(file.mimetype) || !PRIVATE_EXT[file.mimetype]) {
      throw new BadRequestException('Unsupported file type');
    }
    if (!file.size || file.size > this.maxBytes) {
      throw new BadRequestException('File missing or exceeds size limit');
    }

    const dir = join(process.cwd(), this.privateDir, subdir);
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${PRIVATE_EXT[file.mimetype]}`;
    await writeFile(join(dir, filename), file.buffer);
    return { storageKey: `${subdir}/${filename}`, mime: file.mimetype, sizeBytes: file.size };
  }

  /**
   * Resolve a `storageKey` to an absolute path inside the private store,
   * rejecting any traversal (`..`, absolute paths) so a crafted key can never
   * escape the directory.
   */
  privatePath(storageKey: string): string {
    const root = join(process.cwd(), this.privateDir);
    const abs = normalize(join(root, storageKey));
    if (isAbsolute(storageKey) || !abs.startsWith(root)) {
      throw new BadRequestException('Invalid file reference');
    }
    return abs;
  }

  async privateFileExists(storageKey: string): Promise<boolean> {
    try {
      await access(this.privatePath(storageKey));
      return true;
    } catch {
      return false;
    }
  }
}
