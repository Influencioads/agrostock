import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'change-me-access-secret',
    });
  }

  /**
   * Re-reads the account on every request so deleted users and stale role claims
   * cannot keep a live session. Authorization always uses the DB role, not the
   * (potentially outdated) token claim.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, roles: true, active: true, adminPermissions: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    if (!user.active) throw new UnauthorizedException('Account is deactivated');
    // Effective roles = primary role ∪ approved extra roles (deduped).
    const roles = Array.from(new Set<string>([user.role, ...user.roles]));
    return { id: user.id, email: user.email, role: user.role, roles, adminPermissions: user.adminPermissions };
  }
}
