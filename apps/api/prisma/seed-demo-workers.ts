import { KycStatus, LabourRateBasis, PrismaClient, Role, WorkerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Ten independent workers for the labour directory.
 *
 * ADDITIVE AND IDEMPOTENT, unlike `prisma/seed.ts` — that one opens with
 * `worker.deleteMany()` and must never touch production. This upserts by email
 * and can be re-run safely.
 *
 * To appear in `/api/directory/workers` a row needs all four of these, which is
 * why the seed writes more than just a `Worker`:
 *   1. `User.active` and role `worker`
 *   2. a `Profile` with `listApproved: true` — every non-seller directory is
 *      gated on it (`directory.module.ts` roleWhere)
 *   3. `Worker.loadercoId === null` — employed crew are their company's private
 *      roster, not the public directory
 *   4. `WorkerOffering` rows, or the workerType facet filters them out
 *
 * DELETING. Every account here uses a `demo-` slug, so the whole set is
 * removable in one predictable statement:
 *
 *   DELETE FROM "User" WHERE email LIKE 'demo-%@directory.agrotraders.org';
 *
 * Worker, Profile and WorkerOffering all cascade from User. Run it against
 * nothing else — the pre-existing demo accounts do NOT carry that prefix.
 */

type Demo = {
  slug: string;
  name: string;
  country: string;
  originCity: string;
  operatingCities: string[];
  skill: string;
  /** WorkerType slugs from `seed:worker-types`; skipped if a slug is absent. */
  offerings: string[];
  dailyWageCents: number;
  minWorkHours: number;
  status: WorkerStatus;
};

const workers: Demo[] = [
  {
    slug: 'demo-worker-artem-kuznetsov', name: 'Artem Kuznetsov', country: 'Russia',
    originCity: 'Novorossiysk', operatingCities: ['Novorossiysk', 'Krasnodar'],
    skill: 'Container stuffing', offerings: ['container-stuffing-crew', 'lashing-crew'],
    dailyWageCents: 5200, minWorkHours: 4, status: WorkerStatus.available,
  },
  {
    slug: 'demo-worker-dmitri-orlov', name: 'Dmitri Orlov', country: 'Russia',
    originCity: 'Saint Petersburg', operatingCities: ['Saint Petersburg', 'Veliky Novgorod'],
    skill: 'Forklift', offerings: ['forklift-operator', 'pallet-jack-operator'],
    dailyWageCents: 6100, minWorkHours: 6, status: WorkerStatus.available,
  },
  {
    slug: 'demo-worker-sergei-volkov', name: 'Sergei Volkov', country: 'Russia',
    originCity: 'Rostov-on-Don', operatingCities: ['Rostov-on-Don', 'Azov'],
    skill: 'Bagging', offerings: ['bagging-operator', 'weighing-operator'],
    dailyWageCents: 4400, minWorkHours: 4, status: WorkerStatus.available,
  },
  {
    slug: 'demo-worker-pavel-morozov', name: 'Pavel Morozov', country: 'Russia',
    originCity: 'Yekaterinburg', operatingCities: ['Yekaterinburg', 'Perm'],
    skill: 'Reach stacker', offerings: ['reach-stacker-operator', 'dock-worker'],
    dailyWageCents: 6800, minWorkHours: 8, status: WorkerStatus.on_site,
  },
  {
    slug: 'demo-worker-ivan-sokolov', name: 'Ivan Sokolov', country: 'Russia',
    originCity: 'Samara', operatingCities: ['Samara', 'Saratov'],
    skill: 'Sorting', offerings: ['sorter', 'grader'],
    dailyWageCents: 4100, minWorkHours: 4, status: WorkerStatus.available,
  },
  {
    slug: 'demo-worker-nikolai-fedorov', name: 'Nikolai Fedorov', country: 'Russia',
    originCity: 'Novosibirsk', operatingCities: ['Novosibirsk', 'Barnaul'],
    skill: 'Palletising', offerings: ['palletiser', 'wrapping-operator'],
    dailyWageCents: 4700, minWorkHours: 6, status: WorkerStatus.available,
  },
  {
    slug: 'demo-worker-timur-abdulov', name: 'Timur Abdulov', country: 'Kazakhstan',
    originCity: 'Almaty', operatingCities: ['Almaty', 'Shymkent'],
    skill: 'Loading', offerings: ['loader-unloader', 'tally-counter'],
    dailyWageCents: 3600, minWorkHours: 4, status: WorkerStatus.available,
  },
  {
    slug: 'demo-worker-yerlan-syzdykov', name: 'Yerlan Syzdykov', country: 'Kazakhstan',
    originCity: 'Aktau', operatingCities: ['Aktau', 'Atyrau'],
    skill: 'Dock work', offerings: ['dock-worker', 'lashing-crew'],
    dailyWageCents: 3900, minWorkHours: 8, status: WorkerStatus.off,
  },
  {
    slug: 'demo-worker-mehmet-yilmaz', name: 'Mehmet Yilmaz', country: 'Turkey',
    originCity: 'Mersin', operatingCities: ['Mersin', 'Adana'],
    skill: 'Vacuum packing', offerings: ['vacuum-packing-operator', 'manual-packer'],
    dailyWageCents: 5400, minWorkHours: 6, status: WorkerStatus.available,
  },
  {
    slug: 'demo-worker-rashid-al-hammadi', name: 'Rashid Al Hammadi', country: 'UAE',
    originCity: 'Dubai', operatingCities: ['Dubai', 'Sharjah'],
    skill: 'Labelling', offerings: ['labelling-worker', 'strapping-sealing-operator'],
    dailyWageCents: 7200, minWorkHours: 4, status: WorkerStatus.available,
  },
];

async function main() {
  // Same convention as the other demo accounts. Production users must never
  // reuse these public credentials.
  const passwordHash = await bcrypt.hash(process.env.DEMO_WORKER_PASSWORD || 'password123', 10);

  const types = new Map(
    (await prisma.workerType.findMany({ select: { id: true, slug: true } })).map((t) => [t.slug, t.id]),
  );
  if (types.size === 0) {
    throw new Error('No WorkerType rows — run `npm run seed:worker-types` first.');
  }

  let users = 0;
  let offerings = 0;
  const skipped: string[] = [];

  for (const w of workers) {
    const email = `${w.slug}@directory.agrotraders.org`;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        name: w.name,
        role: Role.worker,
        country: w.country,
        active: true,
        kycStatus: KycStatus.verified,
        emailVerifiedAt: new Date(),
      },
      update: {
        name: w.name,
        role: Role.worker,
        country: w.country,
        active: true,
        kycStatus: KycStatus.verified,
      },
    });
    users++;

    // listApproved gates every non-seller directory, so an unapproved profile
    // means the account exists but is invisible — the confusing half-state.
    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        location: `${w.originCity}, ${w.country}`,
        originCity: w.originCity,
        originCountry: w.country,
        operatingCities: w.operatingCities,
        operatingCountries: [w.country],
        minWorkHours: w.minWorkHours,
        listApproved: true,
      },
      update: {
        originCity: w.originCity,
        originCountry: w.country,
        operatingCities: w.operatingCities,
        operatingCountries: [w.country],
        minWorkHours: w.minWorkHours,
        listApproved: true,
      },
    });

    // loadercoId stays null: these answer for themselves, which is what puts
    // them in the public directory rather than a company's private roster.
    const existing = await prisma.worker.findUnique({ where: { userId: user.id }, select: { id: true } });
    const data = {
      name: w.name,
      skill: w.skill,
      status: w.status,
      dailyWageCents: w.dailyWageCents,
      originCity: w.originCity,
      originCountry: w.country,
      operatingCities: w.operatingCities,
      operatingCountries: [w.country],
      minWorkHours: w.minWorkHours,
      loadercoId: null,
    };
    if (existing) await prisma.worker.update({ where: { id: existing.id }, data });
    else await prisma.worker.create({ data: { ...data, userId: user.id } });

    for (const slug of w.offerings) {
      const workerTypeId = types.get(slug);
      if (!workerTypeId) {
        skipped.push(`${w.name} → ${slug}`);
        continue;
      }
      const had = await prisma.workerOffering.findFirst({
        where: { userId: user.id, workerTypeId },
        select: { id: true },
      });
      if (had) continue;
      await prisma.workerOffering.create({
        data: {
          userId: user.id,
          workerTypeId,
          rateBasis: LabourRateBasis.per_day,
          rateMinCents: w.dailyWageCents,
          rateMaxCents: Math.round(w.dailyWageCents * 1.25),
          currency: 'USD',
          headcount: 1,
          minHours: w.minWorkHours,
          isActive: true,
        },
      });
      offerings++;
    }
  }

  console.log(`demo workers: ${users} accounts, ${offerings} offerings created`);
  if (skipped.length) {
    console.log(`  unknown worker types skipped: ${skipped.join(', ')}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
