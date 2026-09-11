import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { MeService } from '../src/me/me.module';

/**
 * Self-service account deletion (App Store Guideline 5.1.1(v)).
 *
 * Two things have to hold at once: a user must genuinely be able to delete
 * their account from inside the app, and deleting must not strand a
 * counterparty who is mid-trade or leave personal data behind.
 */

const PASSWORD = 'correct-horse-battery';

type Counts = {
  balanceCents?: number;
  openOrders?: number;
  escrowHeld?: number;
  liveAuctions?: number;
  liveBids?: number;
  /** Trade/community history — routes deletion to anonymization instead of a drop. */
  footprint?: boolean;
  /** Make the hard delete fail the way an uncounted FK relation would. */
  fkViolation?: boolean;
};

async function serviceFor(counts: Counts = {}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const updates: Record<string, unknown> = {};
  const deleted: string[] = [];
  const del = (name: string) => ({
    deleteMany: vi.fn(async () => {
      deleted.push(name);
      return { count: 0 };
    }),
  });
  const prisma = {
    // Only `user.delete` rejects under `fkViolation` — the anonymizing
    // transaction that follows must still be allowed to succeed.
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    user: {
      findUnique: vi.fn(async () => ({
        passwordHash,
        _count: { products: counts.footprint ? 1 : 0 },
        wallet: { balanceCents: counts.balanceCents ?? 0, _count: { txns: 0 } },
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updates.user = data;
        return { id: 'u1' };
      }),
      delete: vi.fn(async () => {
        deleted.push('user.delete');
        if (counts.fkViolation) throw Object.assign(new Error('FK'), { code: 'P2003' });
        return { id: 'u1' };
      }),
    },
    wallet: { findUnique: vi.fn(async () => ({ balanceCents: counts.balanceCents ?? 0 })), ...del('wallet') },
    order: { count: vi.fn(async () => counts.openOrders ?? 0) },
    escrowHold: { count: vi.fn(async () => counts.escrowHeld ?? 0) },
    product: {
      count: vi.fn(async () => counts.liveAuctions ?? 0),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updates.product = data;
        return { count: 1 };
      }),
    },
    auctionBid: { count: vi.fn(async () => counts.liveBids ?? 0) },
    profile: {
      ...del('profile'),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updates.profile = data;
        return { count: 1 };
      }),
    },
    refreshSession: {
      ...del('refreshSession'),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        updates.refreshSession = data;
        return { count: 2 };
      }),
    },
    deviceToken: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    roleRequest: del('roleRequest'),
    communityMessageReaction: del('communityMessageReaction'),
    communitySavedPost: del('communitySavedPost'),
    communityGroupMember: del('communityGroupMember'),
    communityUserBlock: del('communityUserBlock'),
    notification: del('notification'),
    kycRecord: del('kycRecord'),
  };
  const svc = new MeService(prisma as never, {} as never, {} as never, {} as never, {} as never);
  return { svc, prisma, updates, deleted };
}

describe('account deletion (Guideline 5.1.1(v))', () => {
  it('really deletes a clean account — Apple rejects deactivation-only', async () => {
    const { svc, prisma, deleted } = await serviceFor();
    await expect(svc.deletionBlockers('u1')).resolves.toEqual({ blockers: [], canDelete: true });
    await expect(svc.deleteAccount('u1', { password: PASSWORD })).resolves.toEqual({ ok: true, erased: 'deleted' });
    // The row itself is gone, not merely flagged inactive.
    expect(deleted).toContain('user.delete');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('clears the personal satellite rows the FK graph will not cascade', async () => {
    const { svc, deleted } = await serviceFor();
    await svc.deleteAccount('u1', { password: PASSWORD });
    for (const table of ['profile', 'kycRecord', 'wallet', 'notification', 'refreshSession', 'communityUserBlock']) {
      expect(deleted, `${table} left behind`).toContain(table);
    }
  });

  it('re-authenticates: a wrong password cannot destroy the account', async () => {
    const { svc, prisma } = await serviceFor();
    await expect(svc.deleteAccount('u1', { password: 'not-the-password' })).rejects.toBeInstanceOf(BadRequestException);
    // Nothing was written — the refusal happens before any mutation.
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['wallet_balance', { balanceCents: 2500 }],
    ['open_orders', { openOrders: 1 }],
    ['escrow_held', { escrowHeld: 1 }],
    ['live_auctions', { liveAuctions: 1 }],
    ['live_bids', { liveBids: 1 }],
  ])('refuses while %s is outstanding, and says so', async (code, counts) => {
    const { svc, prisma } = await serviceFor(counts as Counts);
    const { blockers, canDelete } = await svc.deletionBlockers('u1');
    expect(canDelete).toBe(false);
    expect(blockers.map((b) => b.code)).toContain(code);

    await expect(svc.deleteAccount('u1', { password: PASSWORD })).rejects.toThrow(new RegExp(code));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reports a wallet blocker in minor units, so the UI can show the amount', async () => {
    const { svc } = await serviceFor({ balanceCents: 2500 });
    const { blockers } = await svc.deletionBlockers('u1');
    expect(blockers).toContainEqual({ code: 'wallet_balance', count: 2500 });
  });

  it('lists every outstanding obligation at once, not just the first', async () => {
    const { svc } = await serviceFor({ balanceCents: 100, openOrders: 2, liveBids: 3 });
    const { blockers } = await svc.deletionBlockers('u1');
    expect(blockers.map((b) => b.code).sort()).toEqual(['live_bids', 'open_orders', 'wallet_balance']);
  });

  it('anonymizes an account with trade history: no personal data survives', async () => {
    const { svc, updates } = await serviceFor({ footprint: true });
    await svc.deleteAccount('u1', { password: PASSWORD });

    const user = updates.user as Record<string, unknown>;
    expect(user.active).toBe(false);
    expect(user.name).toBe('Deleted user');
    expect(user.country).toBeNull();
    // The real address is released, so it can be registered again.
    expect(user.email).toBe('deleted+u1@deleted.invalid');

    const profile = updates.profile as Record<string, unknown>;
    for (const field of ['phone', 'whatsapp', 'contactEmail', 'bio', 'location', 'avatarUrl']) {
      expect(profile[field], `${field} left behind`).toBeNull();
    }
  });

  it('makes an anonymized account unusable: sessions revoked, password unguessable', async () => {
    const { svc, prisma, updates } = await serviceFor({ footprint: true });
    await svc.deleteAccount('u1', { password: PASSWORD });

    const user = updates.user as { passwordHash: string };
    // Not simply left in place — the old password must stop working.
    await expect(bcrypt.compare(PASSWORD, user.passwordHash)).resolves.toBe(false);
    expect((updates.refreshSession as { revokedReason: string }).revokedReason).toBe('account_deleted');
    // The device stops receiving notifications for a dead account.
    expect(prisma.deviceToken.deleteMany).toHaveBeenCalled();
  });

  it("takes the seller's live listings down — nobody can order from a dead account", async () => {
    const { svc, updates } = await serviceFor({ footprint: true });
    await svc.deleteAccount('u1', { password: PASSWORD });
    expect((updates.product as { status: string }).status).toBe('archived');
  });

  it('keeps the row when trade history references it, and says which path it took', async () => {
    const { svc, deleted, updates } = await serviceFor({ footprint: true });
    await expect(svc.deleteAccount('u1', { password: PASSWORD })).resolves.toEqual({
      ok: true,
      erased: 'anonymized',
    });
    // Dropping it would orphan orders and invoices that must be retained.
    expect(deleted).not.toContain('user.delete');
    expect((updates.user as { email: string }).email).toBe('deleted+u1@deleted.invalid');
  });

  it('falls back to anonymizing when an uncounted FK holds the row — never refuses', async () => {
    const { svc, updates } = await serviceFor({ fkViolation: true });
    await expect(svc.deleteAccount('u1', { password: PASSWORD })).resolves.toEqual({
      ok: true,
      erased: 'anonymized',
    });
    expect((updates.user as { name: string }).name).toBe('Deleted user');
  });

  it('erases KYC identity documents on BOTH paths, not just the hard delete', async () => {
    // The anonymize path originally skipped KYC entirely, so the account most in
    // need of erasure — one that only ever uploaded a passport scan — kept it.
    for (const counts of [{}, { footprint: true }]) {
      const { svc, deleted } = await serviceFor(counts);
      await svc.deleteAccount('u1', { password: PASSWORD });
      expect(deleted, `KYC survived for ${JSON.stringify(counts)}`).toContain('kycRecord');
    }
  });
});
