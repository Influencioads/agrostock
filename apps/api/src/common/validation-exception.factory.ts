import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

interface FieldError {
  /** Dotted path of the offending property, e.g. `address.city`. */
  field: string;
  /** class-validator constraint name, e.g. `isEmail` — the key into the `validation` catalog. */
  constraint: string;
  /** class-validator's English default, kept as the fallback. */
  message: string;
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.entries(e.constraints ?? {}).map(([constraint, message]) => ({ field, constraint, message }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

/**
 * Turns class-validator failures into the same `{ code, message }` contract the rest of
 * the API uses. `message` stays an array of English strings (Nest's default shape) so
 * existing clients keep working; `errors[].constraint` is what new clients translate
 * against the `validation` catalog.
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const fields = flatten(errors);
  return new BadRequestException({
    statusCode: 400,
    code: 'validation.failed',
    message: fields.map((f) => f.message),
    errors: fields,
  });
}
