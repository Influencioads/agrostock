import { mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { UploadsService } from '../src/uploads/uploads.service';

describe('UploadsService', () => {
  it('accepts a small product photo and stores it as a 1:1 square image', async () => {
    const uploadDir = await mkdtemp(join(tmpdir(), 'agro-uploads-'));
    try {
      const service = new UploadsService({
        get: (key: string) => (key === 'UPLOAD_DIR' ? uploadDir : key === 'UPLOAD_MAX_MB' ? '10' : undefined),
      } as never);
      const buffer = await sharp({
        create: { width: 1, height: 1, channels: 3, background: '#ffffff' },
      }).png().toBuffer();

      const url = await service.saveImage({ buffer, mimetype: 'image/png', size: buffer.length }, 'products', {
        square: 1200,
      });

      const saved = join(uploadDir, url.replace('/uploads/', ''));
      await expect(stat(saved)).resolves.toMatchObject({ isFile: expect.any(Function) });
      await expect(sharp(saved).metadata()).resolves.toMatchObject({ width: 1200, height: 1200, format: 'webp' });
    } finally {
      sharp.cache(false);
      await rm(uploadDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });
});
