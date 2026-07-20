import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/** Interpolation values for the client-side message, e.g. `{ min: 100 }`. */
export type ErrorParams = Record<string, string | number>;

/**
 * Helpers that throw the *real* Nest exception types with a payload carrying a stable,
 * machine-readable `code` (e.g. `auctions.bid_too_low`) that clients translate against
 * the `errors` catalog.
 *
 * They deliberately return `UnauthorizedException`/`NotFoundException`/… rather than a
 * bespoke subclass, so `instanceof` checks in guards, interceptors and tests keep working.
 *
 * The English `message` is still sent, so clients that predate the code contract are
 * unaffected; new clients prefer `code` and fall back to `message` when it is absent.
 */
function body(statusCode: number, code: string, message: string, params: ErrorParams = {}) {
  return { statusCode, code, params, message };
}

export const AppException = {
  badRequest: (code: string, message: string, params?: ErrorParams) =>
    new BadRequestException(body(400, code, message, params)),
  unauthorized: (code: string, message: string, params?: ErrorParams) =>
    new UnauthorizedException(body(401, code, message, params)),
  forbidden: (code: string, message: string, params?: ErrorParams) =>
    new ForbiddenException(body(403, code, message, params)),
  notFound: (code: string, message: string, params?: ErrorParams) =>
    new NotFoundException(body(404, code, message, params)),
  conflict: (code: string, message: string, params?: ErrorParams) =>
    new ConflictException(body(409, code, message, params)),
};
