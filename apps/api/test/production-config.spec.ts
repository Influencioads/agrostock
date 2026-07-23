import { describe, expect, it } from 'vitest';
import { assertProductionConfig } from '../src/config/production-config';

const validConfig = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://app:strong-password@postgres:5432/agrostock?schema=public',
  REDIS_URL: 'redis://redis:6379',
  JWT_SECRET: 'access-secret-that-is-long-and-unique-123456',
  JWT_REFRESH_SECRET: 'refresh-secret-that-is-long-and-unique-654321',
  S3_ENDPOINT: 'http://minio:9000',
  S3_ACCESS_KEY: 'production-object-user',
  S3_SECRET_KEY: 'production-object-secret-that-is-long',
  S3_BUCKET: 'agrostock-production',
  CORS_ORIGINS: 'https://app.agrotraders.example,https://admin.agrotraders.example',
} as const;

describe('production configuration', () => {
  it('accepts complete distinct production configuration', () => {
    expect(() => assertProductionConfig(validConfig)).not.toThrow();
  });

  it.each(['DATABASE_URL', 'REDIS_URL', 'S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET', 'CORS_ORIGINS'])(
    'rejects missing %s',
    (key) => {
      expect(() => assertProductionConfig({ ...validConfig, [key]: '' })).toThrow(key);
    },
  );

  it('rejects placeholder, identical, or short JWT secrets', () => {
    expect(() => assertProductionConfig({ ...validConfig, JWT_SECRET: 'change-me-access-secret' })).toThrow('JWT_SECRET');
    expect(() => assertProductionConfig({ ...validConfig, JWT_REFRESH_SECRET: validConfig.JWT_SECRET })).toThrow('must differ');
    expect(() => assertProductionConfig({ ...validConfig, JWT_SECRET: 'short' })).toThrow('JWT_SECRET');
  });

  it('rejects localhost and wildcard production CORS origins', () => {
    expect(() => assertProductionConfig({ ...validConfig, CORS_ORIGINS: 'http://localhost:5173' })).toThrow('CORS_ORIGINS');
    expect(() => assertProductionConfig({ ...validConfig, CORS_ORIGINS: '*' })).toThrow('CORS_ORIGINS');
  });

  it('does nothing outside production', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'test' })).not.toThrow();
  });
});
