import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Normalizes every error into a single JSON shape:
 *
 *   { statusCode, message, code?, params? }
 *
 * `code` is a stable, machine-readable key (e.g. `auth.invalid_credentials`) that the
 * client translates against the `errors` catalog. It only appears on throws that have
 * been migrated to `AppException` or the validation `exceptionFactory`; everything else
 * still returns just `message`, so nothing breaks while the migration is in progress.
 */
@Catch()
export class I18nExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(I18nExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // `throw new BadRequestException('text')` yields a string payload; object payloads
      // (AppException, ValidationPipe) already carry their own fields.
      const body =
        typeof payload === 'string'
          ? { statusCode: status, message: payload }
          : { statusCode: status, ...(payload as Record<string, unknown>) };

      res.status(status).json(body);
      return;
    }

    // API-14: map the Prisma errors that represent a CLIENT mistake to the right
    // status. Many handlers update/delete by id without a prior existence check,
    // so a bad id surfaced as a generic 500 (and a scary log line) instead of a
    // 404 — and a duplicate unique value as a 500 instead of a 409. Everything
    // else still falls through to the opaque 500 below.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'not_found',
          message: 'Not found',
        });
        return;
      }
      if (exception.code === 'P2002') {
        res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          code: 'conflict',
          message: 'That value is already taken.',
        });
        return;
      }
      // P2003 (FK constraint) / P2000 (value too long) are bad input, not bugs.
      if (exception.code === 'P2003' || exception.code === 'P2000') {
        res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'invalid_reference',
          message: 'That request references something that does not exist.',
        });
        return;
      }
    }
    // A malformed enum / unknown field reaching Prisma is a client-supplied value
    // that slipped past validation — a 400, not an internal error.
    if (exception instanceof Prisma.PrismaClientValidationError) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'invalid_request',
        message: 'Invalid request parameters.',
      });
      return;
    }

    // Anything non-HTTP is a bug: log it, but never leak internals to the client.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'unknown',
      message: 'Internal server error',
    });
  }
}
