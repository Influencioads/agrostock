import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/** Global so PayoutRequest/KYC/etc. could inject MailService for bespoke mail. */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
