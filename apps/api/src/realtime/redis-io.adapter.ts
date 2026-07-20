import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter backed by Redis pub/sub so unread counts, presence and
 * room broadcasts stay consistent across multiple API instances. Degrades
 * gracefully to the in-memory adapter if Redis is unreachable (dev safety).
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger('RedisIoAdapter');

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connect(): Promise<void> {
    try {
      const pub = new Redis(this.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
      const sub = pub.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      this.adapterConstructor = createAdapter(pub, sub);
      this.logger.log('Socket.IO Redis adapter connected');
    } catch (e) {
      this.logger.warn(
        `Redis adapter unavailable, using in-memory fallback: ${(e as Error).message}`,
      );
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
