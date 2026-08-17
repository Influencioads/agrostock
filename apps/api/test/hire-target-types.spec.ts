import { describe, expect, it } from 'vitest';
import { HireTargetType } from '@prisma/client';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateHireDto } from '../src/hires/hires.module';

/**
 * Regression test for the unreachable service-provider enquiry.
 *
 * `HireTargetType` gained `service_provider` and `HiresService.create` grew a
 * branch for it, but `CreateHireDto` kept a hand-written `@IsIn([...])` listing
 * only the original three. Every service-provider hire was rejected by the
 * validation pipe before reaching the code written to handle it — a 400 that
 * looked like a client bug, from a server list nobody remembered to update.
 *
 * The property under test is not "service_provider is allowed" but "the
 * validator and the schema enum cannot disagree", which is what actually broke.
 */
describe('CreateHireDto targetType', () => {
  const errorsFor = (targetType: string) =>
    validateSync(plainToInstance(CreateHireDto, { targetType, targetUserId: 'u1' }))
      .filter((e) => e.property === 'targetType');

  it('accepts every value the schema enum declares', () => {
    for (const value of Object.values(HireTargetType)) {
      expect(errorsFor(value), `rejected ${value}`).toHaveLength(0);
    }
  });

  it('still rejects a value the enum does not declare', () => {
    expect(errorsFor('admin')).toHaveLength(1);
  });
});
