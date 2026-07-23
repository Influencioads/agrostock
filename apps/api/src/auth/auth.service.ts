import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { LoginDto, RegisterDto } from './dto';
import { AppException } from '../common/app-exception';

/** How long a confirmation link stays usable. */
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** How long a password-reset link stays usable. */
const RESET_TTL_MS = 60 * 60 * 1000;
/** How long an emailed login code stays usable. */
const OTP_TTL_MS = 10 * 60 * 1000;
/** Wrong-code guesses allowed before a code is burned. */
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  private accessSecret() {
    return this.config.get<string>('JWT_SECRET') || 'change-me-access-secret';
  }
  private refreshSecret() {
    return this.config.get<string>('JWT_REFRESH_SECRET') || 'change-me-refresh-secret';
  }

  private async tokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret(),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = await this.jwt.signAsync(
      { ...payload, typ: 'refresh' },
      {
        secret: this.refreshSecret(),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );
    return { accessToken, refreshToken };
  }

  /**
   * Exchange a valid refresh token for a fresh access/refresh pair. Re-reads the
   * user from the DB so a deleted account (or a changed role) cannot keep a live
   * session. Signature is verified against the dedicated refresh secret only.
   */
  async refresh(refreshToken: string) {
    let payload: { sub: string; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret() });
    } catch {
      throw AppException.unauthorized('auth.refresh_invalid', 'Invalid or expired refresh token');
    }
    if (payload.typ !== 'refresh') throw AppException.unauthorized('auth.not_a_refresh_token', 'Not a refresh token');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw AppException.unauthorized('auth.account_missing', 'Account no longer exists');
    return { user: this.safe(user), ...(await this.tokens(user)) };
  }

  private safe(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    roles?: string[];
    adminPermissions?: string[];
    country: string | null;
    kycStatus: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      // Effective roles = primary ∪ approved extras — drives the console switcher.
      roles: Array.from(new Set<string>([user.role, ...(user.roles ?? [])])),
      // Per-module admin capabilities — drives the admin console nav gating.
      adminPermissions: user.adminPermissions ?? [],
      country: user.country,
      kycStatus: user.kycStatus,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw AppException.conflict('auth.email_taken', 'Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? 'buyer';
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: role as never,
          country: dto.country,
        },
      });
      // Operational fields live on the Profile for transporters & loader companies.
      const hasProfileData =
        dto.phone ||
        dto.location ||
        dto.marketId ||
        dto.originCity ||
        dto.originCountry ||
        dto.operatingCities?.length ||
        dto.operatingCountries?.length ||
        dto.supplyingCities?.length ||
        dto.supplyingCountries?.length ||
        dto.minWorkHours != null ||
        dto.minDistanceKm != null ||
        dto.minLoaders != null;
      if (hasProfileData) {
        await tx.profile.create({
          data: {
            userId: created.id,
            phone: dto.phone,
            location: dto.location,
            marketId: dto.marketId || null,
            originCity: dto.originCity,
            originCountry: dto.originCountry,
            operatingCities: dto.operatingCities ?? [],
            operatingCountries: dto.operatingCountries ?? [],
            supplyingCities: dto.supplyingCities ?? [],
            supplyingCountries: dto.supplyingCountries ?? [],
            minWorkHours: dto.minWorkHours,
            minDistanceKm: dto.minDistanceKm,
            minLoaders: dto.minLoaders,
          },
        });
      }
      // Self-registered workers get an unaffiliated Worker record so they can
      // be found in the directory and receive job assignments immediately. The
      // worker directory filters on the Worker row, so location is stored there too.
      if (role === 'worker') {
        await tx.worker.create({
          data: {
            name: dto.name,
            userId: created.id,
            status: 'available',
            originCity: dto.originCity,
            originCountry: dto.originCountry,
            operatingCities: dto.operatingCities ?? [],
            operatingCountries: dto.operatingCountries ?? [],
            minWorkHours: dto.minWorkHours,
          },
        });
      }
      return created;
    });

    // Without SMTP configured there is no way to deliver a link, so the account
    // would be permanently unreachable — dev machines and CI fall through to the
    // old behaviour of signing straight in.
    if (!this.mail.enabled) {
      const verified = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
      return { user: this.safe(verified), ...(await this.tokens(verified)) };
    }

    await this.issueVerification(user);
    return { pendingVerification: true as const, email: user.email };
  }

  /* ── email confirmation ───────────────────────────────────────── */

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Mint a one-shot token, invalidate any earlier ones, and email the link.
   *
   * The token is committed before we return, but the SMTP round-trip is NOT
   * awaited: a slow or unreachable mail host would otherwise hang signup for as
   * long as the connection takes to time out. MailService.send already swallows
   * and logs its own failures, and the user can always ask for a resend.
   */
  private async issueVerification(user: { id: string; email: string; name: string }) {
    const token = randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      // A fresh request supersedes older links so only the newest email works.
      this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
        },
      }),
    ]);
    void this.mail.sendVerificationEmail(user, token);
  }

  /** Consume a confirmation token and sign the account in. */
  async verifyEmail(rawToken: string) {
    const token = (rawToken ?? '').trim();
    if (!token) throw AppException.badRequest('auth.verification_invalid', 'Invalid confirmation link');
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!record || record.usedAt) {
      throw AppException.badRequest('auth.verification_invalid', 'Invalid confirmation link');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw AppException.badRequest('auth.verification_expired', 'This confirmation link has expired');
    }
    const [, user] = await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        // Keep the first confirmation time if the account is somehow already verified.
        data: { emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() },
      }),
    ]);
    // First-time confirmation → welcome email (fire-and-forget, no-op if disabled).
    if (!record.user.emailVerifiedAt) void this.mail.sendWelcome(user);
    return { user: this.safe(user), ...(await this.tokens(user)) };
  }

  /**
   * Re-send the confirmation link. Always resolves the same way whether or not
   * the address exists, so this cannot be used to enumerate accounts.
   */
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: (email ?? '').trim() } });
    if (user && !user.emailVerifiedAt && this.mail.enabled) await this.issueVerification(user);
    return { ok: true as const };
  }

  /* ── password reset ───────────────────────────────────────────── */

  /**
   * Start a password reset. Always resolves `{ ok: true }` whether or not the
   * address exists (no account enumeration). The reset link can only be
   * delivered when SMTP is configured.
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: (email ?? '').trim() } });
    if (user && this.mail.enabled) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: this.hashToken(token),
            expiresAt: new Date(Date.now() + RESET_TTL_MS),
          },
        }),
      ]);
      void this.mail.sendPasswordReset(user, token);
    }
    return { ok: true as const };
  }

  /** Consume a reset token, set the new password, and sign the account in. */
  async resetPassword(rawToken: string, password: string) {
    const token = (rawToken ?? '').trim();
    if (!token) throw AppException.badRequest('auth.reset_invalid', 'Invalid reset link');
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!record || record.usedAt) {
      throw AppException.badRequest('auth.reset_invalid', 'Invalid reset link');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw AppException.badRequest('auth.reset_expired', 'This reset link has expired');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [, user] = await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: record.userId },
        // Proving inbox access also confirms the address if it wasn't already.
        data: { passwordHash, emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() },
      }),
    ]);
    return { user: this.safe(user), ...(await this.tokens(user)) };
  }

  /* ── passwordless email OTP login ─────────────────────────────── */

  /**
   * Email a 6-digit login code. Enumeration-safe (always `{ ok: true }`); only
   * real email accounts (not phone-only worker logins) can receive a code.
   */
  async requestLoginOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: (email ?? '').trim() } });
    if (user && this.mail.enabled) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await this.prisma.$transaction([
        this.prisma.loginOtpToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        this.prisma.loginOtpToken.create({
          data: {
            userId: user.id,
            codeHash: this.hashToken(code),
            expiresAt: new Date(Date.now() + OTP_TTL_MS),
          },
        }),
      ]);
      void this.mail.sendLoginOtp(user, code);
    }
    return { ok: true as const };
  }

  /** Verify an emailed code and sign the account in. */
  async verifyLoginOtp(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email: (email ?? '').trim() } });
    if (!user) throw AppException.unauthorized('auth.otp_invalid', 'Invalid or expired code');
    const record = await this.prisma.loginOtpToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw AppException.unauthorized('auth.otp_invalid', 'Invalid or expired code');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.loginOtpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      throw AppException.unauthorized('auth.otp_locked', 'Too many attempts — request a new code');
    }
    if (record.codeHash !== this.hashToken((code ?? '').trim())) {
      await this.prisma.loginOtpToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw AppException.unauthorized('auth.otp_invalid', 'Invalid or expired code');
    }
    const [, verified] = await this.prisma.$transaction([
      this.prisma.loginOtpToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: user.id },
        // Receiving the code proves inbox access → confirm the address.
        data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
      }),
    ]);
    return { user: this.safe(verified), ...(await this.tokens(verified)) };
  }

  /**
   * Resolve a login identifier that may be an email OR a phone number.
   * Loader-created workers can log in with a phone number: it is stored on
   * their Profile / Worker record while their User.email is a synthetic value.
   */
  private async resolveLoginUser(identifier: string) {
    const byEmail = await this.prisma.user.findUnique({ where: { email: identifier } });
    if (byEmail) return byEmail;
    const digits = identifier.replace(/[^0-9]/g, '');
    if (digits.length < 6) return null;
    const profile = await this.prisma.profile.findFirst({
      where: { phone: { contains: digits } },
      include: { user: true },
    });
    if (profile?.user) return profile.user;
    const worker = await this.prisma.worker.findFirst({
      where: { phone: { contains: digits }, userId: { not: null } },
      include: { user: true },
    });
    return worker?.user ?? null;
  }

  async login(dto: LoginDto) {
    const user = await this.resolveLoginUser(dto.email);
    if (!user) throw AppException.unauthorized('auth.invalid_credentials', 'Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw AppException.unauthorized('auth.invalid_credentials', 'Invalid credentials');
    // Self-registered accounts must confirm their address first. Seeded,
    // admin-created and loader-created accounts are stamped verified on creation.
    if (!user.emailVerifiedAt) {
      throw AppException.forbidden('auth.email_not_verified', 'Confirm your email address to sign in');
    }
    return { user: this.safe(user), ...(await this.tokens(user)) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.safe(user);
  }
}
