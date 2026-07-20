import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { I18nExceptionFilter } from './common/i18n-exception.filter';
import { validationExceptionFactory } from './common/validation-exception.factory';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

/** Refuse to boot in production with missing or placeholder secrets. */
function assertProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;
  const insecure = ['change-me-access-secret', 'change-me-refresh-secret', '', undefined];
  const problems: string[] = [];
  if (insecure.includes(process.env.JWT_SECRET)) problems.push('JWT_SECRET');
  if (insecure.includes(process.env.JWT_REFRESH_SECRET)) problems.push('JWT_REFRESH_SECRET');
  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    problems.push('JWT_SECRET and JWT_REFRESH_SECRET must differ');
  }
  if (problems.length) {
    throw new Error(
      `Refusing to start in production with insecure auth config: ${problems.join(', ')}. ` +
        'Set strong, distinct secrets via environment variables.',
    );
  }
}

async function bootstrap() {
  assertProductionSecrets();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  // ── public uploads (product images etc.) served as static files ──
  // Stored on the local filesystem (no S3); path configurable for prod hosts.
  const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  // ── security hardening ──────────────────────────────────────────
  // crossOriginResourcePolicy relaxed so the web/admin origins can load
  // <img> assets served from /uploads on the API origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const origins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });
  // Errors carry a stable `code` alongside the English `message` so clients can
  // translate them; see I18nExceptionFilter.
  app.useGlobalFilters(new I18nExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, exceptionFactory: validationExceptionFactory }),
  );

  // ── realtime: Socket.IO with a Redis adapter (both chat systems) ──
  const redisAdapter = new RedisIoAdapter(app, process.env.REDIS_URL || 'redis://localhost:6380');
  await redisAdapter.connect();
  app.useWebSocketAdapter(redisAdapter);

  // ── docs (disabled in production unless SWAGGER=1) ──────────────
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER === '1') {
    const config = new DocumentBuilder()
      .setTitle('AgroTraders API')
      .setDescription('Global agriculture trading platform API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = Number(process.env.API_PORT) || 3100;
  await app.listen(port, '0.0.0.0');
  Logger.log(`AgroTraders API ready on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
