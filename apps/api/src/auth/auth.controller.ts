import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  RequestOtpDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyOtpDto,
} from './dto';
import { JwtAuthGuard } from './guards';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // Tighter limit than the global throttler to blunt brute-force / enumeration.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // Generous enough for the demo role-switcher (which re-logs-in per role switch)
  // while still blunting password brute-force (bcrypt cost-10 makes this cheap to defend).
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Consume a confirmation link and sign the account in. */
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  // Deliberately tight: this endpoint sends mail, so it is the obvious lever for
  // using us as a spam relay against a third party's inbox.
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto.email);
  }

  // Sends mail → tight limit to prevent using us as a spam relay.
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  // Sends mail → tight limit.
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestLoginOtp(dto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyLoginOtp(dto.email, dto.code);
  }

  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }
}
