import { Global, Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';

/** Local WebP image storage, available to any feature module that needs it. */
@Global()
@Module({
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
