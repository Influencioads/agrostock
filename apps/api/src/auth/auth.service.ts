import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { jwtAccessSecret, jwtRefreshSecret } from '../config/secrets';
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
/** How long a refresh session stays valid without use. */
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * F37: per-account send limits for mailing endpoints (OTP / reset / verification
 * resend). These cap how many emails a *single account* can be made to receive
 * in a window, closing the gap the per-IP throttler leaves open when an attacker
 * rotates source IPs to mailbomb one victim.
 */
const ACCOUNT_MAIL_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_MAIL_MAX = 5;

/** Optional device/network context recorded on a session for the management UI. */
export interface SessionMeta {
  device?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  private accessSecret() {
    return jwtAccessSecret();
  }
  private refreshSecret() {
    return jwtRefreshSecret();
  }

  /** Sign an access + refresh pair for a given session and rotation id. */
  private async signPair(
    user: { id: string; email: string; role: string },
    sessionId: string,
    jti: string,
  ) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    // `typ` separates token purposes: the access strategy accepts ONLY
    // `typ=access`, so refresh/download tokens can never act as Bearer tokens.
    const accessToken = await this.jwt.signAsync({ ...payload, typ: 'access' }, {
      secret: this.accessSecret(),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId, jti, typ: 'refresh' },
      {
        secret: this.refreshSecret(),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );
    return { accessToken, refreshToken };
  }

  /**
   * Open a new revocable session family (F39) and mint its first token pair.
   * The token's random `jti` is stored only as a hash; every refresh rotates it.
   */
  private async issueSession(
    user: { id: string; email: string; role: string },
    meta?: SessionMeta,
  ) {
    const jti = randomUUID();
    const session = await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: this.hashToken(jti),
        device: meta?.device?.slice(0, 255),
        ip: meta?.ip?.slice(0, 64),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return this.signPair(user, session.id, jti);
  }

  /**
   * Exchange a valid refresh token for a fresh pair. Re-reads the user so a
   * deleted/disabled account cannot keep a session. Rotates the session on every
   * use and revokes the whole family on replay of a superseded token.
   */
  async refresh(refreshToken: string, meta?: SessionMeta) {
    let payload: { sub: string; typ?: string; sid?: string; jti?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret() });
    } catch {
      throw AppException.unauthorized('auth.refresh_invalid', 'Invalid or expired refresh token');
    }
    if (payload.typ !== 'refresh' || !payload.sid || !payload.jti) {
      throw AppException.unauthorized('auth.not_a_refresh_token', 'Not a refresh token');
    }
    const session = await this.prisma.refreshSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw AppException.unauthorized('auth.refresh_invalid', 'Invalid or expired refresh token');
    }
    // Replay: a token whose jti no longer matches the current hash means an old
    // (already-rotated) token was presented — burn the entire family.
    if (this.hashToken(payload.jti) !== session.tokenHash) {
      await this.revokeFamily(session.familyId, 'replay_detected');
      throw AppException.unauthorized('auth.refresh_replayed', 'Refresh token reuse detected');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw AppException.unauthorized('auth.account_missing', 'Account no longer exists');
    if (!user.active) throw AppException.unauthorized('auth.account_disabled', 'Account is deactivated');
    // Rotate under a conditional write so two concurrent uses of the same token
    // race and exactly one wins; the loser hits the replay branch next time.
    const nextJti = randomUUID();
    const rotated = await this.prisma.refreshSession.updateMany({
      where: { id: session.id, tokenHash: session.tokenHash, revokedAt: null },
      data: { tokenHash: this.hashToken(nextJti), lastUsedAt: new Date(), ...(meta?.ip ? { ip: meta.ip.slice(0, 64) } : {}) },
    });
    if (rotated.count === 0) {
      await this.revokeFamily(session.familyId, 'replay_detected');
      throw AppException.unauthorized('auth.refresh_replayed', 'Refresh token reuse detected');
    }
    return { user: this.safe(user), ...(await this.signPair(user, session.id, nextJti)) };
  }

  /** Revoke every live session in a rotation family. */
  private async revokeFamily(familyId: string, reason: string) {
    await this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  /** Revoke a single session by presenting its (still valid) refresh token. */
  async logout(refreshToken: string) {
    let payload: { sid?: string; typ?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: this.refreshSecret() });
    } catch {
      // An unparseable/expired token has no live session to revoke — treat
      // logout as idempotently successful.
      return { ok: true as const };
    }
    if (payload.typ === 'refresh' && payload.sid) {
      await this.prisma.refreshSession.updateMany({
        where: { id: payload.sid, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'logout' },
      });
    }
    return { ok: true as const };
  }

  /** Revoke every session for a user (logout-all / password reset / disable). */
  async logoutAll(userId: string, reason = 'logout_all') {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return { ok: true as const };
  }

  /** Active sessions for the session-management UI (no secrets returned). */
  async sessions(userId: string) {
    const rows = await this.prisma.refreshSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, device: true, ip: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    });
    return rows;
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

  async register(dto: RegisterDto, meta?: SessionMeta) {
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
      return { user: this.safe(verified), ...(await this.issueSession(verified, meta)) };
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
    // F37: cap verification emails per account per window. The first signup send
    // is always under the limit; this only blunts resend abuse.
    const windowStart = new Date(Date.now() - ACCOUNT_MAIL_WINDOW_MS);
    const recent = await this.prisma.emailVerificationToken.count({
      where: { userId: user.id, createdAt: { gt: windowStart } },
    });
    if (recent >= ACCOUNT_MAIL_MAX) return;
    const token = randomBytes(32).toString('hex');
    await this.prisma.$transaction([
      // A fresh request supersedes older links (burned, not deleted, so they
      // still count toward the window); prune anything outside the window.
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, createdAt: { lt: windowStart } } }),
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
  async verifyEmail(rawToken: string, meta?: SessionMeta) {
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
    // F23: conditional consume — under concurrent requests exactly one wins.
    const consumed = await this.prisma.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw AppException.badRequest('auth.verification_invalid', 'Invalid confirmation link');
    }
    const user = await this.prisma.user.update({
      where: { id: record.userId },
      // Keep the first confirmation time if the account is somehow already verified.
      data: { emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() },
    });
    // First-time confirmation → welcome email (fire-and-forget, no-op if disabled).
    if (!record.user.emailVerifiedAt) void this.mail.sendWelcome(user);
    return { user: this.safe(user), ...(await this.issueSession(user, meta)) };
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
      // F37: cap reset links-per-account per window (enumeration-safe no-op past it).
      const windowStart = new Date(Date.now() - ACCOUNT_MAIL_WINDOW_MS);
      const recent = await this.prisma.passwordResetToken.count({
        where: { userId: user.id, createdAt: { gt: windowStart } },
      });
      if (recent >= ACCOUNT_MAIL_MAX) return { ok: true as const };
      const token = randomBytes(32).toString('hex');
      await this.prisma.$transaction([
        // Supersede the previous link by burning it (kept for the window count),
        // and prune rows older than the window.
        this.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, createdAt: { lt: windowStart } } }),
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
  async resetPassword(rawToken: string, password: string, meta?: SessionMeta) {
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
    // F23: conditional consume — a replayed or concurrent reset must lose.
    const consumed = await this.prisma.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw AppException.badRequest('auth.reset_invalid', 'Invalid reset link');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.update({
      where: { id: record.userId },
      // Proving inbox access also confirms the address if it wasn't already.
      data: { passwordHash, emailVerifiedAt: record.user.emailVerifiedAt ?? new Date() },
    });
    // A password change invalidates every other live session (F39).
    await this.logoutAll(user.id, 'password_reset');
    return { user: this.safe(user), ...(await this.issueSession(user, meta)) };
  }

  /* ── passwordless email OTP login ─────────────────────────────── */

  /**
   * Email a 6-digit login code. Enumeration-safe (always `{ ok: true }`); only
   * real email accounts (not phone-only worker logins) can receive a code.
   */
  async requestLoginOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: (email ?? '').trim() } });
    if (user && this.mail.enabled) {
      // F37: cap codes-per-account per window. Silently no-op past the limit —
      // still `{ ok: true }` so this can't be used to probe the limit or enumerate.
      const windowStart = new Date(Date.now() - ACCOUNT_MAIL_WINDOW_MS);
      const recent = await this.prisma.loginOtpToken.count({
        where: { userId: user.id, createdAt: { gt: windowStart } },
      });
      if (recent >= ACCOUNT_MAIL_MAX) return { ok: true as const };
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await this.prisma.$transaction([
        // Supersede the previous code by burning it (kept, not deleted, so it
        // still counts toward the window), and prune rows outside the window.
        this.prisma.loginOtpToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
        this.prisma.loginOtpToken.deleteMany({ where: { userId: user.id, createdAt: { lt: windowStart } } }),
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
  async verifyLoginOtp(email: string, code: string, meta?: SessionMeta) {
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
    // F23: conditional consume — two devices submitting the same code race,
    // and exactly one of them signs in.
    const consumed = await this.prisma.loginOtpToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw AppException.unauthorized('auth.otp_invalid', 'Invalid or expired code');
    }
    const verified = await this.prisma.user.update({
      where: { id: user.id },
      // Receiving the code proves inbox access → confirm the address.
      data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    });
    return { user: this.safe(verified), ...(await this.issueSession(verified, meta)) };
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
    // SEC-06: match the FULL normalized number, not a substring. The old
    // `phone: { contains: digits }` let "234" bind a login attempt to a stored
    // "1234567" (wrong-account resolution). We strip non-digits from the stored
    // value in SQL and compare exactly, and refuse to resolve when two accounts
    // normalize to the same number (ambiguous → null, never a guess).
    const userId = (await this.resolvePhoneUserId('Profile', digits)) ?? (await this.resolvePhoneUserId('Worker', digits));
    return userId ? this.prisma.user.findUnique({ where: { id: userId } }) : null;
  }

  /** Exactly-one userId whose (digit-normalized) phone equals `digits`, else null. */
  private async resolvePhoneUserId(table: 'Profile' | 'Worker', digits: string): Promise<string | null> {
    // `table` is a fixed literal (never user input), so this interpolation is safe.
    const rows = await this.prisma.$queryRawUnsafe<{ userId: string | null }[]>(
      `SELECT "userId" FROM "${table}"
         WHERE "userId" IS NOT NULL
           AND regexp_replace(COALESCE("phone", ''), '[^0-9]', '', 'g') = $1
         LIMIT 2`,
      digits,
    );
    return rows.length === 1 && rows[0].userId ? rows[0].userId : null;
  }

  async login(dto: LoginDto, meta?: SessionMeta) {
    const user = await this.resolveLoginUser(dto.email);
    if (!user) throw AppException.unauthorized('auth.invalid_credentials', 'Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw AppException.unauthorized('auth.invalid_credentials', 'Invalid credentials');
    // Self-registered accounts must confirm their address first. Seeded,
    // admin-created and loader-created accounts are stamped verified on creation.
    if (!user.emailVerifiedAt) {
      throw AppException.forbidden('auth.email_not_verified', 'Confirm your email address to sign in');
    }
    return { user: this.safe(user), ...(await this.issueSession(user, meta)) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.safe(user);
  }
}
