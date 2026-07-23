import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService, type SessionMeta } from './auth.service';
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
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie, wantsCookieAuth } from './refresh-cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Coarse device/network context recorded on the refresh session (F39). */
  private meta(req: Request): SessionMeta {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.ip;
    return { device: req.headers['user-agent'], ip: ip ?? undefined };
  }

  /**
   * F38: for cookie-mode (browser) clients, move the refresh token into an
   * HttpOnly cookie and strip it from the JSON body so JavaScript never sees it.
   * Native clients keep receiving it in the body unchanged.
   */
  private async emit<T extends object>(result: Promise<T>, req: Request, res: Response): Promise<T> {
    const value = await result;
    const token = (value as { refreshToken?: unknown }).refreshToken;
    if (wantsCookieAuth(req) && typeof token === 'string' && token) {
      setRefreshCookie(res, token);
      return { ...value, refreshToken: '' } as T;
    }
    return value;
  }

  // Tighter limit than the global throttler to blunt brute-force / enumeration.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.emit(this.auth.register(dto, this.meta(req)), req, res);
  }

  // Generous enough for the demo role-switcher (which re-logs-in per role switch)
  // while still blunting password brute-force (bcrypt cost-10 makes this cheap to defend).
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.emit(this.auth.login(dto, this.meta(req)), req, res);
  }

  /** Consume a confirmation link and sign the account in. */
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.emit(this.auth.verifyEmail(dto.token, this.meta(req)), req, res);
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
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.emit(this.auth.resetPassword(dto.token, dto.password, this.meta(req)), req, res);
  }

  // Sends mail → tight limit.
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('request-otp')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestLoginOtp(dto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.emit(this.auth.verifyLoginOtp(dto.email, dto.code, this.meta(req)), req, res);
  }

  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Cookie-mode clients present the token via the HttpOnly cookie; native
    // clients pass it in the body. Rotation issues a fresh cookie via emit().
    const token = wantsCookieAuth(req) ? readRefreshCookie(req) : dto.refreshToken;
    return this.emit(this.auth.refresh(token ?? '', this.meta(req)), req, res);
  }

  /** Revoke the session behind a refresh token (idempotent). */
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('logout')
  async logout(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = wantsCookieAuth(req) ? readRefreshCookie(req) : dto.refreshToken;
    if (wantsCookieAuth(req)) clearRefreshCookie(res);
    return this.auth.logout(token ?? '');
  }

  /** Revoke every session for the signed-in account (sign out everywhere). */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@Req() req: Request & { user: { id: string } }, @Res({ passthrough: true }) res: Response) {
    if (wantsCookieAuth(req)) clearRefreshCookie(res);
    return this.auth.logoutAll(req.user.id);
  }

  /** List the account's active sessions for the management UI. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@Req() req: { user: { id: string } }) {
    return this.auth.sessions(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }
}
