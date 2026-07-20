import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { getAttributeFields } from '@agrotraders/types';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService, type AttributeValues } from './translation.service';
import {
  BUYER_BID_UPSERTED,
  COMMUNITY_POST_UPSERTED,
  COMMUNITY_REQUIREMENT_UPSERTED,
  PRODUCT_UPSERTED,
  REVIEW_UPSERTED,
  type ContentUpsertedEvent,
} from './translation.events';

/**
 * Translate-on-write worker. Each `@OnEvent` listener is fire-and-forget with its
 * own try/catch (mirrors PushService) so a translation failure never breaks the
 * originating request. Each handler skips work when the source text is unchanged
 * (per-field hashing) and otherwise fills a translation row per target locale.
 * Locales are processed sequentially, which naturally throttles the Google API.
 */
@Injectable()
export class ContentTranslationWorker {
  private readonly logger = new Logger('ContentTranslation');

  constructor(
    private prisma: PrismaService,
    private translation: TranslationService,
  ) {}

  private hashesUnchanged(stored: Prisma.JsonValue | null | undefined, next: Record<string, string>): boolean {
    return this.translation.unchanged(stored as Record<string, string> | null, next);
  }

  private jsonAttrs(attrs: AttributeValues | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    return attrs ? (attrs as Prisma.InputJsonValue) : Prisma.JsonNull;
  }

  // ── Product (text fields + attribute values) ───────────────────────────
  @OnEvent(PRODUCT_UPSERTED)
  async onProduct({ id }: ContentUpsertedEvent) {
    if (!this.translation.enabled) return;
    try {
      const p = await this.prisma.product.findUnique({
        where: { id },
        include: { category: { select: { name: true } }, subcategory: { select: { name: true } } },
      });
      if (!p) return;

      const fields = ['name', 'grade', 'origin', 'qty', 'moq', 'delivery'] as const;
      const hashes = this.translation.fieldHashes(p, [...fields, 'attributes']);
      if (this.hashesUnchanged(p.sourceHashes, hashes)) return;

      const schema = getAttributeFields(p.category?.name, p.subcategory?.name);
      for (const locale of this.translation.targets) {
        const tr = await this.translation.translateFields(p, fields, locale);
        const attrs = await this.translation.translateAttributes(p.attributes as AttributeValues, schema, locale);
        const data = {
          name: tr.name ?? p.name,
          grade: tr.grade ?? null,
          origin: tr.origin ?? null,
          qty: tr.qty ?? null,
          moq: tr.moq ?? null,
          delivery: tr.delivery ?? null,
          attributes: this.jsonAttrs(attrs),
        };
        await this.prisma.productTranslation.upsert({
          where: { productId_locale: { productId: id, locale } },
          create: { productId: id, locale, ...data },
          update: data,
        });
      }
      await this.prisma.product.update({ where: { id }, data: { sourceHashes: hashes } });
      this.logger.log(`translated product ${id} into ${this.translation.targets.length} locales`);
    } catch (err) {
      this.logger.error(`product ${id} translation failed: ${(err as Error).message}`);
    }
  }

  // ── Review (single text field) ─────────────────────────────────────────
  @OnEvent(REVIEW_UPSERTED)
  async onReview({ id }: ContentUpsertedEvent) {
    if (!this.translation.enabled) return;
    try {
      const r = await this.prisma.review.findUnique({ where: { id } });
      if (!r || !r.text) return;
      const hashes = this.translation.fieldHashes(r, ['text']);
      if (this.hashesUnchanged(r.sourceHashes, hashes)) return;

      for (const locale of this.translation.targets) {
        const [text] = await this.translation.translateFields(r, ['text'], locale).then((m) => [m.text]);
        const body = text ?? r.text;
        await this.prisma.reviewTranslation.upsert({
          where: { reviewId_locale: { reviewId: id, locale } },
          create: { reviewId: id, locale, text: body },
          update: { text: body },
        });
      }
      await this.prisma.review.update({ where: { id }, data: { sourceHashes: hashes } });
    } catch (err) {
      this.logger.error(`review ${id} translation failed: ${(err as Error).message}`);
    }
  }

  // ── Community post (title + body) ──────────────────────────────────────
  @OnEvent(COMMUNITY_POST_UPSERTED)
  async onCommunityPost({ id }: ContentUpsertedEvent) {
    if (!this.translation.enabled) return;
    try {
      const post = await this.prisma.communityPost.findUnique({ where: { id } });
      if (!post) return;
      const hashes = this.translation.fieldHashes(post, ['title', 'body']);
      if (this.hashesUnchanged(post.sourceHashes, hashes)) return;

      for (const locale of this.translation.targets) {
        const tr = await this.translation.translateFields(post, ['title', 'body'], locale);
        const data = { title: tr.title ?? post.title, body: tr.body ?? post.body };
        await this.prisma.communityPostTranslation.upsert({
          where: { postId_locale: { postId: id, locale } },
          create: { postId: id, locale, ...data },
          update: data,
        });
      }
      await this.prisma.communityPost.update({ where: { id }, data: { sourceHashes: hashes } });
    } catch (err) {
      this.logger.error(`community post ${id} translation failed: ${(err as Error).message}`);
    }
  }

  // ── Community trade requirement (title / productName / grade / delivery) ─
  @OnEvent(COMMUNITY_REQUIREMENT_UPSERTED)
  async onRequirement({ id }: ContentUpsertedEvent) {
    if (!this.translation.enabled) return;
    try {
      const req = await this.prisma.communityTradeRequirement.findUnique({ where: { id } });
      if (!req) return;
      const fields = ['title', 'productName', 'grade', 'delivery'] as const;
      const hashes = this.translation.fieldHashes(req, [...fields]);
      if (this.hashesUnchanged(req.sourceHashes, hashes)) return;

      for (const locale of this.translation.targets) {
        const tr = await this.translation.translateFields(req, fields, locale);
        const data = {
          title: tr.title ?? req.title,
          productName: tr.productName ?? req.productName,
          grade: tr.grade ?? null,
          delivery: tr.delivery ?? null,
        };
        await this.prisma.communityTradeRequirementTranslation.upsert({
          where: { requirementId_locale: { requirementId: id, locale } },
          create: { requirementId: id, locale, ...data },
          update: data,
        });
      }
      await this.prisma.communityTradeRequirement.update({ where: { id }, data: { sourceHashes: hashes } });
    } catch (err) {
      this.logger.error(`requirement ${id} translation failed: ${(err as Error).message}`);
    }
  }

  // ── Buyer bid (title / productName / notes) ────────────────────────────
  @OnEvent(BUYER_BID_UPSERTED)
  async onBuyerBid({ id }: ContentUpsertedEvent) {
    if (!this.translation.enabled) return;
    try {
      const bid = await this.prisma.buyerBid.findUnique({ where: { id } });
      if (!bid) return;
      const fields = ['title', 'productName', 'notes'] as const;
      const hashes = this.translation.fieldHashes(bid, [...fields]);
      if (this.hashesUnchanged(bid.sourceHashes, hashes)) return;

      for (const locale of this.translation.targets) {
        const tr = await this.translation.translateFields(bid, fields, locale);
        const data = {
          title: tr.title ?? bid.title,
          productName: tr.productName ?? bid.productName,
          notes: tr.notes ?? null,
        };
        await this.prisma.buyerBidTranslation.upsert({
          where: { bidId_locale: { bidId: id, locale } },
          create: { bidId: id, locale, ...data },
          update: data,
        });
      }
      await this.prisma.buyerBid.update({ where: { id }, data: { sourceHashes: hashes } });
    } catch (err) {
      this.logger.error(`buyer bid ${id} translation failed: ${(err as Error).message}`);
    }
  }
}
