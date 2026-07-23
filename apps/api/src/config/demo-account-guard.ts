/**
 * Phase 1 containment (F43): the demo seed provisions well-known accounts that
 * all share a public password. If any of them exist in a production database,
 * the deployment is compromised-by-default and the API must refuse to serve.
 */
export const KNOWN_DEMO_EMAILS = [
  'buyer@agrotraders.org',
  'seller@agrotraders.org',
  'transporter@agrotraders.org',
  'loaderco@agrotraders.org',
  'worker@agrotraders.org',
  'worker2@agrotraders.org',
  'admin@agrotraders.org',
  'finance@agrotraders.org',
  'moderator@agrotraders.org',
] as const;

/** Throws when production still contains known demo/seed accounts. */
export function assertNoDemoAccounts(
  foundEmails: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (env.NODE_ENV !== 'production') return;
  if (foundEmails.length === 0) return;
  throw new Error(
    `Refusing to start: production database contains known demo accounts (${foundEmails.join(', ')}). ` +
      'Delete or rotate these accounts before deploying.',
  );
}

interface DemoAccountQuerier {
  user: {
    findMany(args: {
      where: { email: { in: string[] } };
      select: { email: true };
    }): Promise<Array<{ email: string }>>;
  };
}

/** Queries the database for demo accounts and fails production startup if any exist. */
export async function assertProductionHasNoDemoAccounts(
  prisma: DemoAccountQuerier,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  if (env.NODE_ENV !== 'production') return;
  const found = await prisma.user.findMany({
    where: { email: { in: [...KNOWN_DEMO_EMAILS] } },
    select: { email: true },
  });
  assertNoDemoAccounts(found.map((u) => u.email), env);
}
