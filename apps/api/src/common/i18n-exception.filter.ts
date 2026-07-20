import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
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

    // Anything non-HTTP is a bug: log it, but never leak internals to the client.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'unknown',
      message: 'Internal server error',
    });
  }
}
