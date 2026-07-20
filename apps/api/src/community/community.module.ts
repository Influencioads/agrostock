import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityGateway } from './community.gateway';

/** CHAT SYSTEM 1 — AgroTraders Community (kept separate from Live Support). */
@Module({
  controllers: [CommunityController],
  providers: [CommunityService, CommunityGateway],
  exports: [CommunityService, CommunityGateway],
})
export class CommunityModule {}
