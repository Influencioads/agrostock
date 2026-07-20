import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/current-user.decorator';

interface AccessPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Verifies the JWT presented on a Socket.IO handshake and resolves the live
 * account (re-read from the DB, mirroring jwt.strategy.ts so deactivated users
 * and stale role claims cannot hold a socket). Shared by BOTH gateways.
 */
@Injectable()
export class WsAuthService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /** Extract the bearer token from a handshake (auth payload or Authorization header). */
  tokenFromSocket(socket: Socket): string | undefined {
    const fromAuth = (socket.handshake.auth as { token?: string })?.token;
    const fromHeader = socket.handshake.headers?.authorization;
    return fromAuth || fromHeader;
  }

  async verify(token?: string): Promise<AuthUser> {
    if (!token) throw new UnauthorizedException('Missing token');
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(raw, {
        secret: this.config.get<string>('JWT_SECRET') || 'change-me-access-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, roles: true, active: true, adminPermissions: true },
    });
    if (!user || !user.active) throw new UnauthorizedException('Account unavailable');
    const roles = Array.from(new Set<string>([user.role, ...user.roles]));
    return { id: user.id, email: user.email, role: user.role, roles, adminPermissions: user.adminPermissions };
  }
}
