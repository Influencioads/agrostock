import { ServiceUnavailableException } from '@nestjs/common';

export const LEGACY_FINANCE_DISABLED_CODE = 'LEGACY_FINANCE_DISABLED';

/**
 * Temporary containment for writes that have no verified provider/ledger
 * backing. Production can never opt in; local demos must do so explicitly.
 */
export function assertLegacyFinancialWritesEnabled(
  operation: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  const explicitlyEnabled = env.NODE_ENV !== 'production' && env.ENABLE_LEGACY_FINANCIAL_WRITES === '1';
  if (explicitlyEnabled) return;

  throw new ServiceUnavailableException({
    statusCode: 503,
    code: LEGACY_FINANCE_DISABLED_CODE,
    message: `${operation} is disabled until verified payment and ledger controls are available.`,
  });
}
