import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_TAXONOMY_RU } from '../prisma/seeds/service-taxonomy-ru';
import { canRolePriceService, ROLE_SERVICE_BRANCHES, SERVICE_ROLES } from '@agrotraders/types';

/**
 * The taxonomy JSON is the seed's only input, and the seed is the only thing
 * that writes it — so a fault in the file reaches production as a broken tree
 * with nothing in between to catch it. These specs are that something.
 *
 * They need no database: everything asserted here is a property of the file.
 */

interface Node {
  name: string;
  slug: string;
  kind: 'SECTION' | 'GROUP' | 'COUNTRY' | 'SUBGROUP' | 'SERVICE';
  countryScope?: string;
  children?: Node[];
}

const DOC = JSON.parse(
  readFileSync(join(__dirname, '..', 'prisma', 'seeds', 'service-taxonomy.json'), 'utf8'),
) as { countriesServed: string[]; sections: Node[] };

/** Every node, paired with its parent, depth-first. */
function walk(nodes: Node[], parent: Node | null = null, level = 1): { node: Node; parent: Node | null; level: number }[] {
  return nodes.flatMap((node) => [
    { node, parent, level },
    ...walk(node.children ?? [], node, level + 1),
  ]);
}
const ALL = walk(DOC.sections);
const byKind = (kind: Node['kind']) => ALL.filter((e) => e.node.kind === kind);

describe('service taxonomy file', () => {
  it('carries the whole PDF: 3 sections, 36 groups, 20 middle nodes, 544 leaves', () => {
    expect(byKind('SECTION')).toHaveLength(3);
    expect(byKind('GROUP')).toHaveLength(36);
    expect(byKind('COUNTRY').length + byKind('SUBGROUP').length).toBe(20);
    expect(byKind('SERVICE')).toHaveLength(544);
    expect(ALL).toHaveLength(603);
  });

  it('has globally unique slugs — the seed upserts on them', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const { node } of ALL) {
      const prior = seen.get(node.slug);
      if (prior) clashes.push(`${node.slug}: "${prior}" vs "${node.name}"`);
      else seen.set(node.slug, node.name);
    }
    expect(clashes).toEqual([]);
  });

  it('keeps every slug equal to its parent path plus one segment', () => {
    // This is what makes the slug a materialized path — ancestor lookups rely
    // on it, and a node whose slug drifted from its parent would be unreachable.
    const broken = ALL
      .filter(({ node, parent }) => (parent ? node.slug !== `${parent.slug}/${node.slug.split('/').pop()}` : node.slug.includes('/')))
      .map(({ node }) => node.slug);
    expect(broken).toEqual([]);
  });

  it('nests no deeper than 4 levels', () => {
    expect(Math.max(...ALL.map((e) => e.level))).toBe(4);
  });

  it('makes ONLY leaf services pricable — nothing else may be selected', () => {
    // A provider prices SERVICE nodes. A SERVICE node with children would be
    // both a branch and a price row, which the provider UI cannot express.
    const serviceWithKids = byKind('SERVICE').filter((e) => (e.node.children ?? []).length > 0);
    expect(serviceWithKids).toEqual([]);
  });

  it('hangs leaves off groups directly where the PDF has no middle heading', () => {
    // Fulfilment has 42 leaves and no subgroup; inventing one would be adding
    // hierarchy the source does not have.
    const fulfilment = ALL.find((e) => e.node.slug === 'logistics-and-handling/fulfilment')!.node;
    expect(fulfilment.children).toHaveLength(42);
    expect(fulfilment.children!.every((c) => c.kind === 'SERVICE')).toBe(true);
  });

  it('preserves the one group that mixes direct leaves with country children', () => {
    // Customs & Border Logistics is the only mixed shape in the PDF. Normalising
    // it either way would misrepresent the source.
    const customs = ALL.find((e) => e.node.slug === 'logistics-and-handling/customs-and-border-logistics')!.node;
    const kinds = new Set(customs.children!.map((c) => c.kind));
    expect(kinds).toEqual(new Set(['SERVICE', 'COUNTRY']));
  });

  it('keeps duplicate leaf names apart under their own parents', () => {
    // Approved explicitly: same name, different parent, different slug. Merging
    // them would make one provider's "Frozen Storage" mean two different jobs.
    const byName = (name: string) => byKind('SERVICE').filter((e) => e.node.name === name).map((e) => e.node.slug);
    expect(byName('Frozen Storage').length).toBeGreaterThan(1);
    expect(byName('Labelling').length).toBeGreaterThan(1);
    expect(byName('Repacking').length).toBeGreaterThan(1);
    expect(byName('Metal Detection').length).toBeGreaterThan(1);
    // …and every one of them is a distinct slug, so they never collapse.
    for (const name of ['Frozen Storage', 'Labelling', 'Repacking', 'Metal Detection', 'Quality Inspection']) {
      expect(new Set(byName(name)).size).toBe(byName(name).length);
    }
  });

  it('gives every country node a scope and no other node one', () => {
    for (const { node } of byKind('COUNTRY')) expect(node.countryScope).toBeTruthy();
    const strays = ALL.filter((e) => e.node.kind !== 'COUNTRY' && e.node.countryScope);
    expect(strays).toEqual([]);
  });

  it('creates the PDF-named groups that have no services yet, as empty branches', () => {
    // Approved: they exist so the section reads correctly, but nothing under
    // them can be picked until services are added.
    for (const slug of [
      'financial-and-compliance/taxation',
      'financial-and-compliance/insurance',
      'logistics-and-handling/cold-chain',
      'logistics-and-handling/inspection',
      'processing/packaging',
    ]) {
      const entry = ALL.find((e) => e.node.slug === slug);
      expect(entry, slug).toBeTruthy();
      expect(entry!.node.kind).toBe('GROUP');
      expect(entry!.node.children ?? []).toHaveLength(0);
    }
  });

  it('keeps the taxonomy country nodes separate from the provider country list', () => {
    // Two different concepts, kept apart by decision: the tree forks on three
    // jurisdictions, providers declare eight.
    expect(new Set(byKind('COUNTRY').map((e) => e.node.name))).toEqual(new Set(['India', 'Russia', 'International']));
    expect(DOC.countriesServed).toHaveLength(8);
    expect(DOC.countriesServed).toContain('Kazakhstan');
  });
});

describe('russian translations', () => {
  it('only keys slugs that exist — a typo would silently never apply', () => {
    const slugs = new Set(ALL.map((e) => e.node.slug));
    const orphans = Object.keys(SERVICE_TAXONOMY_RU).filter((k) => !slugs.has(k));
    expect(orphans).toEqual([]);
  });

  it('covers every structural node, which is what browse shows first', () => {
    const structural = ALL.filter((e) => e.node.kind !== 'SERVICE').map((e) => e.node.slug);
    const missing = structural.filter((s) => !SERVICE_TAXONOMY_RU[s]);
    expect(missing).toEqual([]);
  });

  it('leaves the uncertain leaves untranslated rather than inventing Russian', () => {
    // Deliberate: the seed reports these in missing-ru-translations.txt for a
    // native speaker. This asserts the gap is real and known, not an oversight.
    const leaves = byKind('SERVICE').map((e) => e.node.slug);
    const translated = leaves.filter((s) => SERVICE_TAXONOMY_RU[s]).length;
    expect(translated).toBeGreaterThan(0);
    expect(translated).toBeLessThan(leaves.length);
  });
});

describe('role gating against the real taxonomy', () => {
  it('points every role branch at a node that exists', () => {
    // A prefix with a typo would silently grant nothing, and the provider would
    // see an empty picker with no error to explain it.
    const slugs = new Set(ALL.map((e) => e.node.slug));
    const missing: string[] = [];
    for (const [role, branches] of Object.entries(ROLE_SERVICE_BRANCHES)) {
      for (const b of branches) if (!slugs.has(b)) missing.push(`${role} → ${b}`);
    }
    expect(missing).toEqual([]);
  });

  it('leaves exactly ONE branch unreachable — the customs decision, still open', () => {
    // Not a bug: `customs_clearance` exists twice in the new tree, and only the
    // Financial one was granted to accountants. Handing them the 37-leaf
    // Logistics branch would broaden a permission they do not hold today, so it
    // waits on the client.
    //
    // Pinned rather than skipped: if the gap ever widens beyond this branch,
    // that IS a mapping bug and this fails. When the decision lands, the fix is
    // to add the branch to a role and shrink this list to [].
    const orphaned = byKind('SERVICE')
      .map((e) => e.node.slug)
      .filter((slug) => !SERVICE_ROLES.some((r) => canRolePriceService(r, slug)));
    const customs = 'logistics-and-handling/customs-and-border-logistics';
    expect(orphaned.every((s) => s.startsWith(`${customs}/`))).toBe(true);
    expect(orphaned).toHaveLength(37);
  });
});
