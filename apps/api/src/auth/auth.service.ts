import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto';
import { AppException } from '../common/app-exception';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
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
    return { user: this.safe(user), ...(await this.tokens(user)) };
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
    return { user: this.safe(user), ...(await this.tokens(user)) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.safe(user);
  }
}
