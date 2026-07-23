import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const read = (path: string) => readFileSync(`${root}/${path}`, 'utf8');

describe('production deployment containment', () => {
  it('uses the documented VITE_API_URL and requires it for both browser builds', () => {
    const compose = read('infra/docker-compose.prod.yml');
    expect(compose).not.toContain('PUBLIC_API_URL');
    expect(compose.match(/VITE_API_URL: \$\{VITE_API_URL:\?/g)).toHaveLength(2);
  });

  it('has no guessable production credential fallbacks', () => {
    const compose = read('infra/docker-compose.prod.yml');
    for (const unsafe of [
      'POSTGRES_USER:-agrostock',
      'POSTGRES_PASSWORD:-agrostock',
      'POSTGRES_DB:-agrostock',
      'S3_ACCESS_KEY:-agrostock',
      'S3_SECRET_KEY:-agrostock-secret',
      'JWT_SECRET:-change-me-access-secret',
      'JWT_REFRESH_SECRET:-change-me-refresh-secret',
    ]) {
      expect(compose).not.toContain(unsafe);
    }
  });

  it('does not give browser Docker builds a localhost API default', () => {
    for (const dockerfile of ['infra/Dockerfile.web', 'infra/Dockerfile.admin']) {
      expect(read(dockerfile)).not.toMatch(/ARG VITE_API_URL=http:\/\/localhost/);
    }
  });

  it('excludes backups, logs, local agent state, archives, and reports from Docker context', () => {
    const ignore = read('.dockerignore');
    for (const pattern of [
      '**/backups/**',
      '**/*.log',
      '**/*.sql',
      '**/*.dump',
      '**/*.tar',
      '**/*.zip',
      '.claude',
      '.local-logs',
      'AUDIT_REPORT.md',
      'REMEDIATION_PLAN.md',
    ]) {
      expect(ignore).toContain(pattern);
    }
  });
});
