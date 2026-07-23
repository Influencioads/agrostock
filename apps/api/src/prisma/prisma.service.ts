import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Wait between connection attempts, capped so startup never stalls for long. */
const RETRY_DELAYS_MS = [500, 1000, 2000, 4000, 6000];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  /**
   * Connect with a bounded retry.
   *
   * A single unretried `$connect()` made the whole API fatally dependent on the
   * database answering the very first packet. On Windows + Docker Desktop the
   * published port is frequently black-holed for a few seconds after the daemon
   * starts or resumes (the WSL2 proxy is cold), so `$connect()` threw P1001,
   * `onModuleInit` rejected, and Nest aborted the bootstrap — meaning
   * `app.listen()` never ran and the API never opened its port at all. Every
   * request from web/admin then failed with a connection error whose cause
   * looked nothing like "the database was briefly slow to accept".
   *
   * Retrying turns that transient window into a few seconds of startup delay.
   * A genuinely unreachable database still fails, just after ~13s instead of
   * instantly, and with an explicit log line naming the target.
   */
  async onModuleInit() {
    for (let attempt = 0; ; attempt++) {
      try {
        await this.$connect();
        if (attempt > 0) this.logger.log(`Database connected after ${attempt + 1} attempts`);
        return;
      } catch (e) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          this.logger.error(
            `Database unreachable after ${attempt + 1} attempts. Is it running and is DATABASE_URL correct?`,
          );
          throw e;
        }
        this.logger.warn(
          `Database not ready (${(e as Error).message.split('\n')[0]}); retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /** F49: close the connection pool cleanly when Nest shuts down (SIGTERM). */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
