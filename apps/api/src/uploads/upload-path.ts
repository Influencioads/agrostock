import { isAbsolute, join } from 'node:path';

/**
 * Resolve the directory served at `/uploads`.
 *
 * Local dev commonly passes `uploads`, while production passes an absolute
 * Docker volume mount such as `/repo/apps/api/uploads`. `path.join(cwd, abs)`
 * would incorrectly produce `/repo/apps/api/repo/apps/api/uploads`, so absolute
 * values must be used as-is.
 */
export function resolveUploadDir(cwd: string, configured = 'uploads'): string {
  return isAbsolute(configured) ? configured : join(cwd, configured);
}
