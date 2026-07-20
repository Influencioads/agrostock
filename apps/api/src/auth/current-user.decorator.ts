import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminPermission } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  /** Primary role (default active view). */
  role: string;
  /** Effective roles = {role} ∪ approved extra roles. Authorization checks this. */
  roles: string[];
  /** Per-module admin capabilities (empty for non-admins). */
  adminPermissions: AdminPermission[];
}

export function resolveActiveRole(user: Pick<AuthUser, 'role' | 'roles'>, requested: unknown): string {
  const requestedRole = Array.isArray(requested) ? requested[0] : requested;
  if (typeof requestedRole === 'string' && user.roles.includes(requestedRole)) {
    return requestedRole;
  }
  return user.role;
}

/** Injects the JWT-authenticated user (set by JwtStrategy.validate). On optional
 *  routes a guest has no `req.user`; we return `undefined` rather than crash. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;
    if (!user) return undefined;
    return {
      ...user,
      role: resolveActiveRole(user, req.headers?.['x-agro-active-role']),
    };
  },
);
