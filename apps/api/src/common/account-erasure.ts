import type { PrismaService } from '../prisma/prisma.service';

/**
 * Shared account-erasure primitives, used by BOTH the admin "delete user" tool
 * and the user's own in-app deletion (App Store Guideline 5.1.1(v)).
 *
 * Apple is explicit that "only offering to temporarily deactivate or disable an
 * account is insufficient" — the account record itself has to go. But a
 * marketplace cannot drop a row that invoices, orders and the wallet ledger
 * still point at, and those carry statutory retention duties.
 *
 * So erasure has two outcomes, decided by `hasFootprint`:
 *   • no trade/financial/support history  → the row is genuinely deleted;
 *   • any such history                    → the row survives with every piece
 *     of personal data stripped (see MeService.deleteAccount).
 *
 * A brand-new account — which is what an App Review tester creates — always
 * takes the first path, so deletion is a real delete.
 *
 * These live here rather than in either module so the two callers cannot drift:
 * a relation added to one list but not the other would either orphan trade
 * history or fail the delete with P2003.
 */

/**
 * Relations that make an account too entangled to drop. Several are nullable
 * FKs (e.g. `Product.sellerId`) that Postgres would SET NULL on delete —
 * orphaning trade history rather than failing — so they must be counted
 * explicitly; an FK error is not a reliable backstop.
 */
export const ACCOUNT_FOOTPRINT_SELECT = {
  _count: {
    select: {
      products: true,
      buyerOrders: true,
      sellerOrders: true,
      auctionBids: true,
      buyerBids: true,
      sellerBids: true,
      transportRequests: true,
      transportQuotes: true,
      trips: true,
      vehicles: true,
      routes: true,
      drivers: true,
      workers: true,
      teams: true,
      loaderJobsCreated: true,
      loaderJobsManaged: true,
      payoutRequests: true,
      hireRequestsMade: true,
      hireRequestsReceived: true,
      invoicesIssued: true,
      invoicesReceived: true,
      reviewsAuthored: true,
      reviewsReceived: true,
      adCampaigns: true,
      supportTickets: true,
      // Community content is other people's context as much as this user's: a
      // thread with their posts removed reads as a conversation with holes, and
      // the rows are referenced by translations, reactions and replies. Counting
      // them here routes such accounts to anonymization, which strips the author
      // identity without shredding the thread.
      communityPosts: true,
      communityMessages: true,
      tradeRequirements: true,
      requirementResponses: true,
      ownedCommunityGroups: true,
      supportMessages: true,
    },
  },
  wallet: { select: { balanceCents: true, _count: { select: { txns: true } } } },
} as const;

export type AccountFootprint = {
  _count?: Record<string, number>;
  wallet?: { balanceCents: number; _count: { txns: number } } | null;
} | null;

/** True when the account carries trade, financial or support records. */
export function hasFootprint(footprint: AccountFootprint): boolean {
  const counts: Record<string, number> = footprint?._count ?? {};
  if (Object.values(counts).some((n) => (n ?? 0) > 0)) return true;
  const wallet = footprint?.wallet;
  return wallet ? wallet._count.txns > 0 || wallet.balanceCents !== 0 : false;
}

/**
 * The personal satellite rows the FK graph will not cascade, in dependency
 * order, followed by the user itself. Pass the result straight to
 * `prisma.$transaction` so the whole erasure is atomic.
 *
 * KYC is deliberately NOT part of the footprint test above — ID documents are
 * personal data, not a trade record, so the one account you most want to be
 * able to erase must not be the one that cannot be. The rows go here; the files
 * behind `KycDocument.storageKey` need a private-store sweep, which belongs
 * with a real erasure job rather than a request handler.
 */
export function personalRowDeletions(prisma: PrismaService, userId: string) {
  return [
    prisma.roleRequest.deleteMany({ where: { userId } }),
    prisma.communityMessageReaction.deleteMany({ where: { userId } }),
    prisma.communitySavedPost.deleteMany({ where: { userId } }),
    prisma.communityGroupMember.deleteMany({ where: { userId } }),
    // Blocks the account raised, and blocks raised against it.
    prisma.communityUserBlock.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.deviceToken.deleteMany({ where: { userId } }),
    prisma.refreshSession.deleteMany({ where: { userId } }),
    prisma.wallet.deleteMany({ where: { userId } }),
    prisma.kycRecord.deleteMany({ where: { userId } }),
    prisma.profile.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ];
}

/**
 * Prisma's foreign-key violation. A clean-looking account can still be held by a
 * relation nobody counted — an empty DM thread the other party is in, say — and
 * the caller's job then is to fall back to anonymization rather than fail the
 * user's deletion request outright.
 */
export const FK_CONSTRAINT_VIOLATION = 'P2003';
