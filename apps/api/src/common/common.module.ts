import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/** Cross-cutting helpers shared by every domain (globally available). */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class CommonModule {}
