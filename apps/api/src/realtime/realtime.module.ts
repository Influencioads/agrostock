import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WsAuthService } from './ws-auth.service';

/** Shared realtime auth used by the Community and Support gateways. */
@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [WsAuthService],
  exports: [WsAuthService],
})
export class RealtimeModule {}
