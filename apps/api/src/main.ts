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
import { assertProductionConfig } from './config/production-config';
import { assertProductionHasNoDemoAccounts } from './config/demo-account-guard';
import { resolveCorsOrigins } from './config/cors';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  assertProductionConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Fail closed before serving traffic if seeded demo accounts reached prod.
  await assertProductionHasNoDemoAccounts(app.get(PrismaService));
  app.setGlobalPrefix('api');

  // ── public uploads (product images etc.) served as static files ──
  // Stored on the local filesystem (no S3); path configurable for prod hosts.
  const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  // ── security hardening ──────────────────────────────────────────
  // crossOriginResourcePolicy relaxed so the web/admin origins can load
  // <img> assets served from /uploads on the API origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // F22: shared fail-closed policy — same list the WebSocket gateways use.
  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });
  // Errors carry a stable `code` alongside the English `message` so clients can
  // translate them; see I18nExceptionFilter.
  app.useGlobalFilters(new I18nExceptionFilter());
  // F20: whitelist strips any property not declared on the DTO so unvalidated
  // fields never reach Prisma, and transform coerces payloads into their typed
  // DTOs (with class-validator constraints) before any money/state write.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, exceptionFactory: validationExceptionFactory }),
  );

  // F49: flush in-flight work and close DB/Redis connections on SIGTERM/SIGINT
  // instead of dropping them, so rolling deploys don't sever live requests.
  app.enableShutdownHooks();

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
