import { Global, Module } from '@nestjs/common';
import { PushService } from './push.service';

/**
 * Global so any module can inject PushService directly (rare — most delivery is
 * driven by the NOTIFICATION_CREATED event the service already listens for).
 */
@Global()
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
