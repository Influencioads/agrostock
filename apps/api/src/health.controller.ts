import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
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
}
