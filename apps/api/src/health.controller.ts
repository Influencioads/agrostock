import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /**
   * Liveness: the process is up and can serve. Static by design — a liveness
   * probe must NOT depend on downstream systems, or a transient DB blip would
   * trigger pod restarts instead of just removing the instance from rotation.
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'agrotraders-api',
      version: '0.1.0',
      capabilities: {
        uploads: true,
        directory: true,
        workers: true,
        roles: ['buyer', 'seller', 'transporter', 'loaderco', 'worker'],
      },
      time: new Date().toISOString(),
    };
  }

  /**
   * F45: readiness actually gates on dependencies. The load balancer should only
   * route traffic here once the database answers, so a starting/broken instance
   * (migrations pending, DB unreachable) is kept out of rotation instead of
   * serving 500s. Returns 503 when a dependency is down.
   */
  @Get('health/ready')
  async ready() {
    const checks: Record<string, 'ok' | 'down'> = { database: 'down' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable', checks });
    }
    return { status: 'ready', checks, time: new Date().toISOString() };
  }
}
