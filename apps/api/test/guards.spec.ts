import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/auth/guards';

/** Builds a minimal ExecutionContext carrying a request user + handler metadata. */
function ctx(user: unknown, requiredRoles?: string[]): ExecutionContext {
  const handler = () => undefined;
  if (requiredRoles) Reflect.defineMetadata('roles', requiredRoles, handler);
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows when no roles are required', () => {
    expect(guard.canActivate(ctx({ role: 'buyer' }))).toBe(true);
  });

  it('allows when the user has a required role', () => {
    expect(guard.canActivate(ctx({ role: 'admin' }, ['admin']))).toBe(true);
  });

  it('denies when the user lacks the required role', () => {
    expect(guard.canActivate(ctx({ role: 'buyer' }, ['admin']))).toBe(false);
  });

  it('denies when there is no authenticated user', () => {
    expect(guard.canActivate(ctx(undefined, ['buyer']))).toBe(false);
  });
});
