import { resolveUploadDir } from '../src/uploads/upload-path';
import { normalize } from 'node:path';

describe('resolveUploadDir', () => {
  it('keeps an absolute production upload directory unchanged', () => {
    expect(resolveUploadDir('/repo/apps/api', '/repo/apps/api/uploads')).toBe('/repo/apps/api/uploads');
  });

  it('resolves a relative upload directory from the API cwd', () => {
    expect(resolveUploadDir('/repo/apps/api', 'uploads')).toBe(normalize('/repo/apps/api/uploads'));
  });
});
