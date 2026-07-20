import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminPermission } from '@prisma/client';

export const PERMISSIONS_KEY = 'admin_permissions';
export const ANY_PERMISSIONS_KEY = 'admin_permissions_any';

/**
 * Restricts a route to admins holding specific per-module permissions. Use
 * together with `JwtAuthGuard`, `RolesGuard` and `@Roles('admin')`. Routes
 * WITHOUT this decorator stay open to any admin, so the decorator can be rolled
 * out incrementally without locking anyone out.
 */
export const RequirePermissions = (...perms: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

/**
 * Like `RequirePermissions`, but the account only needs to hold ANY ONE of the
 * listed permissions. Use for endpoints shared by several modules (e.g. hire
 * requests surfaced on both the transport and loaders pages).
 */
export const RequireAnyPermission = (...perms: AdminPermission[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, perms);

/** True when a staff member is a super-admin (can manage staff → can do anything). */
export const isSuperAdmin = (perms: readonly string[] | undefined): boolean =>
  !!perms?.includes('staff_manage');

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const required = this.reflector.getAllAndOverride<AdminPermission[]>(PERMISSIONS_KEY, targets);
    const anyOf = this.reflector.getAllAndOverride<AdminPermission[]>(ANY_PERMISSIONS_KEY, targets);
    const hasAll = required && required.length > 0;
    const hasAny = anyOf && anyOf.length > 0;
    // No permission metadata → any authenticated admin (RolesGuard already ran) passes.
    if (!hasAll && !hasAny) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) return false;
    const held: string[] = user.adminPermissions ?? [];
    // Super-admins bypass every per-module check.
    if (isSuperAdmin(held)) return true;
    // Must hold every all-of permission AND at least one any-of permission.
    if (hasAll && !required.every((p) => held.includes(p))) return false;
    if (hasAny && !anyOf.some((p) => held.includes(p))) return false;
    return true;
  }
}
