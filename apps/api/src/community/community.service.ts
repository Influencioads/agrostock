import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import type { Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { maskContacts, sanitizeMessage } from '../common/sanitize';
import { localize } from '../common/locale';
import { TranslationService } from '../translation/translation.service';
import {
  COMMUNITY_GROUP_UPSERTED,
  COMMUNITY_POST_UPSERTED,
  COMMUNITY_REQUIREMENT_UPSERTED,
  type ContentUpsertedEvent,
} from '../translation/translation.events';
import type { AuthUser } from '../auth/current-user.decorator';
import type {
  CreateGroupDto,
  CreatePostDto,
  CreateRequirementDto,
  ReportDto,
  RespondRequirementDto,
} from './dto';

/** Translatable columns on a trade requirement, folded from its translation row. */
const REQUIREMENT_TR_FIELDS = ['title', 'productName', 'grade', 'delivery'] as const;
const GROUP_TR_FIELDS = ['name', 'description'] as const;

interface GroupTranslationRow {
  name: string;
  description: string | null;
}

interface RequirementTranslationRow {
  title: string;
  productName: string;
  grade: string | null;
  delivery: string | null;
}

function localizeRequirement<
  T extends {
    title: string;
    productName: string;
    grade: string | null;
    delivery: string | null;
    translations?: RequirementTranslationRow[];
  },
>(row: T): T {
  return localize(row, [...REQUIREMENT_TR_FIELDS]);
}

function localizeGroup<
  T extends {
    name: string;
    description: string | null;
    translations?: GroupTranslationRow[];
  },
>(row: T): T {
  return localize(row, [...GROUP_TR_FIELDS]);
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') +
  '-' +
  Math.random().toString(36).slice(2, 6);

const DEFAULT_TAKE = 30;

type GroupUnreadSource = { groupId: string; lastReadAt: Date | null };
type ThreadUnreadSource = { id: string; aId: string; aLastReadAt: Date | null; bLastReadAt: Date | null };

@Injectable()
export class CommunityService {
  private readonly logger = new Logger('CommunityService');

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private events: EventEmitter2,
    private translation: TranslationService,
  ) {}

  private baseLang(tag?: string | null): string {
    return tag ? tag.split('-')[0].toLowerCase() : '';
  }

  /**
   * Detect a message's source language once, after send (fire-and-forget). Drives
   * lazy translate-on-read: readers whose locale differs get a cached translation.
   */
  private detectMessageLang(messageId: string, body: string) {
    if (!this.translation.enabled) return;
    void this.translation
      .detect(body)
      .then((lang) =>
        lang ? this.prisma.communityMessage.update({ where: { id: messageId }, data: { sourceLang: lang } }) : null,
      )
      .catch((err) => this.logger.error(`message ${messageId} lang detect failed: ${(err as Error).message}`));
  }

  /**
   * Fold each message into the viewer's locale: use a cached translation when one
   * exists, else translate live (auto-detected source) and cache it. Messages
   * already in the viewer's language, or with no detected source yet, pass through.
   * Returns messages with `body` localized plus `originalBody`/`sourceLang`.
   */
  private async localizeMessages<
    T extends { id: string; body: string; sourceLang: string | null; translations?: { body: string }[] },
  >(messages: T[], locale: Lang | undefined) {
    const target = this.baseLang(locale);
    const rows = messages.map(({ translations, ...m }) => ({
      ...m,
      originalBody: m.body,
      cached: translations?.[0]?.body as string | undefined,
    }));

    if (this.translation.enabled && target) {
      const todo = rows.filter((r) => !r.cached && r.sourceLang && this.baseLang(r.sourceLang) !== target);
      if (todo.length) {
        try {
          const translated = await this.translation.translateAuto(
            todo.map((r) => r.originalBody),
            locale as string,
          );
          await Promise.all(
            todo.map((r, i) =>
              this.prisma.communityMessageTranslation
                .upsert({
                  where: { messageId_locale: { messageId: r.id, locale: locale as string } },
                  create: { messageId: r.id, locale: locale as string, body: translated[i] },
                  update: { body: translated[i] },
                })
                .then(() => {
                  r.cached = translated[i];
                }),
            ),
          );
        } catch (err) {
          this.logger.error(`chat translate failed: ${(err as Error).message}`);
        }
      }
    }

    return rows.map(({ cached, ...r }) => ({ ...r, body: cached ?? r.originalBody }));
  }

  // ── blocks ────────────────────────────────────────────────────────
  /** All user ids the viewer should not see (blocked by them, or blocking them). */
  private async blockedIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.communityUserBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const r of rows) {
      ids.add(r.blockerId === userId ? r.blockedId : r.blockerId);
    }
    return [...ids];
  }

  private groupedCount(row: { _count?: { _all?: number } } | null | undefined): number {
    return row?._count?._all ?? 0;
  }

  private async unreadByGroup(userId: string, memberships: GroupUnreadSource[]) {
    if (!memberships.length) return new Map<string, number>();
    const rows = await this.prisma.communityMessage.groupBy({
      by: ['groupId'],
      where: {
        OR: memberships.map((m) => ({
          groupId: m.groupId,
          deletedAt: null,
          senderId: { not: userId },
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        })),
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.groupId!, this.groupedCount(row)]));
  }

  private async unreadByThread(userId: string, threads: ThreadUnreadSource[]) {
    if (!threads.length) return new Map<string, number>();
    const rows = await this.prisma.communityMessage.groupBy({
      by: ['threadId'],
      where: {
        OR: threads.map((thread) => {
          const lastReadAt = thread.aId === userId ? thread.aLastReadAt : thread.bLastReadAt;
          return {
            threadId: thread.id,
            deletedAt: null,
            senderId: { not: userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          };
        }),
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.threadId!, this.groupedCount(row)]));
  }

  // ── groups ────────────────────────────────────────────────────────
  private async localizeGroups<
    T extends { id: string; name: string; description: string | null; translations?: GroupTranslationRow[] },
  >(rows: T[], locale: Lang) {
    if (!this.translation.enabled || this.baseLang(locale) === 'en') return rows.map(localizeGroup);

    const missing = rows.filter((row) => !row.translations?.length);
    await Promise.all(
      missing.map(async (group) => {
        try {
          const tr = await this.translation.translateFields(group, GROUP_TR_FIELDS, locale);
          const data = {
            name: tr.name ?? group.name,
            description: tr.description ?? group.description,
          };
          await this.prisma.communityGroupTranslation.upsert({
            where: { groupId_locale: { groupId: group.id, locale } },
            create: { groupId: group.id, locale, ...data },
            update: data,
          });
          group.translations = [data];
        } catch (err) {
          this.logger.error(`group ${group.id} translate failed: ${(err as Error).message}`);
        }
      }),
    );

    return rows.map(localizeGroup);
  }

  async listGroups(params: { kind?: string; search?: string }, locale: Lang = 'en') {
    const where: Prisma.CommunityGroupWhereInput = {
      deletedAt: null,
      visibility: 'public',
    };
    if (params.kind) where.kind = params.kind as Prisma.CommunityGroupWhereInput['kind'];
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };
    const groups = await this.prisma.communityGroup.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { members: true, messages: true } },
        translations: { where: { locale }, select: { name: true, description: true } },
      },
    });
    return this.localizeGroups(groups, locale);
  }

  async myGroups(userId: string, locale: Lang = 'en') {
    const memberships = await this.prisma.communityGroupMember.findMany({
      where: { user: { id: userId }, group: { deletedAt: null } },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
            translations: { where: { locale }, select: { name: true, description: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const unread = await this.unreadByGroup(userId, memberships);
    const result = memberships.map((m) => ({ ...m.group, membershipRole: m.role, unread: unread.get(m.groupId) ?? 0 }));
    return this.localizeGroups(result, locale);
  }

  async getGroup(user: AuthUser | undefined, id: string, locale: Lang = 'en') {
    const group = await this.prisma.communityGroup.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { members: true, messages: true } },
        translations: { where: { locale }, select: { name: true, description: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    if (group.visibility !== 'public') {
      await this.assertMember(user, id);
    }
    const [localized] = await this.localizeGroups([group], locale);
    return localized;
  }

  async createGroup(user: AuthUser, dto: CreateGroupDto) {
    const group = await this.prisma.communityGroup.create({
      data: {
        slug: slugify(dto.name),
        name: dto.name,
        kind: dto.kind ?? 'custom',
        visibility: dto.visibility ?? 'public',
        description: dto.description,
        emoji: dto.emoji,
        region: dto.region,
        cropTag: dto.cropTag,
        ownerId: user.id,
        members: { create: { userId: user.id, role: 'owner' } },
      },
      include: { _count: { select: { members: true } } },
    });
    await this.audit.log({ actorId: user.id, action: 'community.group.create', entityType: 'CommunityGroup', entityId: group.id });
    this.events.emit(COMMUNITY_GROUP_UPSERTED, { id: group.id } satisfies ContentUpsertedEvent);
    return group;
  }

  async joinGroup(user: AuthUser, groupId: string) {
    const group = await this.prisma.communityGroup.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.visibility !== 'public') {
      throw new ForbiddenException('This group is invite-only');
    }
    await this.prisma.communityGroupMember.upsert({
      where: { groupId_userId: { groupId, userId: user.id } },
      create: { groupId, userId: user.id, role: 'member' },
      update: {},
    });
    return { ok: true };
  }

  async leaveGroup(user: AuthUser, groupId: string) {
    await this.prisma.communityGroupMember.deleteMany({ where: { groupId, userId: user.id } });
    return { ok: true };
  }

  async inviteUser(user: AuthUser, groupId: string, targetUserId: string) {
    await this.assertGroupManager(user, groupId);
    await this.prisma.communityGroupMember.upsert({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      create: { groupId, userId: targetUserId, role: 'member' },
      update: {},
    });
    return { ok: true };
  }

  async removeMember(user: AuthUser, groupId: string, targetUserId: string) {
    await this.assertGroupManager(user, groupId);
    await this.prisma.communityGroupMember.deleteMany({ where: { groupId, userId: targetUserId } });
    await this.audit.log({ actorId: user.id, action: 'community.member.remove', entityType: 'CommunityGroup', entityId: groupId, meta: { targetUserId } });
    return { ok: true };
  }

  private async assertMember(user: AuthUser | undefined, groupId: string) {
    if (!user) throw new ForbiddenException('Sign in to view this group');
    const member = await this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (!member && !user.roles.includes('admin')) {
      throw new ForbiddenException('You are not a member of this group');
    }
    return member;
  }

  private async assertGroupManager(user: AuthUser, groupId: string) {
    if (user.roles.includes('admin')) return;
    const member = await this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenException('Only group managers can do this');
    }
  }

  /** Ensure the user may post: members always; public groups auto-join. */
  private async ensureCanPost(user: AuthUser, groupId: string) {
    const group = await this.prisma.communityGroup.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundException('Group not found');
    const member = await this.prisma.communityGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (member) return group;
    if (group.visibility === 'public') {
      await this.prisma.communityGroupMember.create({ data: { groupId, userId: user.id, role: 'member' } });
      return group;
    }
    throw new ForbiddenException('You are not a member of this group');
  }

  // ── feed & posts ──────────────────────────────────────────────────
  async getFeed(user: AuthUser | undefined, params: { cursor?: string; take?: number }, locale: Lang = 'en') {
    const take = Math.min(params.take ?? DEFAULT_TAKE, 50);
    const excluded = user ? await this.blockedIds(user.id) : [];
    const posts = await this.prisma.communityPost.findMany({
      where: {
        deletedAt: null,
        OR: [{ groupId: null }, { group: { visibility: 'public' } }],
        ...(excluded.length ? { authorId: { notIn: excluded } } : {}),
      },
      include: {
        author: { select: { id: true, name: true, role: true, country: true } },
        group: { select: { id: true, name: true, emoji: true } },
        requirement: {
          include: { _count: { select: { responses: true } }, translations: { where: { locale } } },
        },
        _count: { select: { savedBy: true } },
        translations: { where: { locale } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    // Localize before masking so contact-masking runs over the text buyers see.
    const localized = posts.map((p) => ({
      ...localize(p, ['title', 'body']),
      requirement: p.requirement ? localizeRequirement(p.requirement) : p.requirement,
    }));
    return this.maskPublic(localized);
  }

  private maskPublic<T extends { body: string; group?: { id: string } | null }>(posts: T[]) {
    // Public-group / feed bodies get contact-masked by default.
    return posts.map((p) => ({ ...p, body: maskContacts(p.body) }));
  }

  async createPost(user: AuthUser, dto: CreatePostDto) {
    if (dto.groupId) await this.ensureCanPost(user, dto.groupId);
    const post = await this.prisma.communityPost.create({
      data: {
        authorId: user.id,
        groupId: dto.groupId,
        type: dto.type ?? 'discussion',
        title: dto.title,
        body: sanitizeMessage(dto.body),
      },
      include: {
        author: { select: { id: true, name: true, role: true, country: true } },
        group: { select: { id: true, name: true, emoji: true } },
      },
    });
    this.events.emit(COMMUNITY_POST_UPSERTED, { id: post.id } satisfies ContentUpsertedEvent);
    return post;
  }

  // ── trade requirements ────────────────────────────────────────────
  async createRequirement(user: AuthUser, dto: CreateRequirementDto) {
    if (dto.groupId) await this.ensureCanPost(user, dto.groupId);
    const result = await this.prisma.$transaction(async (tx) => {
      const post = await tx.communityPost.create({
        data: {
          authorId: user.id,
          groupId: dto.groupId,
          type: 'trade_requirement',
          title: dto.title,
          body: sanitizeMessage(`${dto.title} — ${dto.quantity} ${dto.unit} ${dto.productName}`),
        },
      });
      const requirement = await tx.communityTradeRequirement.create({
        data: {
          postId: post.id,
          authorId: user.id,
          title: dto.title,
          productCategory: dto.productCategory,
          productName: dto.productName,
          quantity: dto.quantity,
          unit: dto.unit,
          grade: dto.grade,
          budget: dto.budget,
          buyerLocation: dto.buyerLocation,
          destinationCountry: dto.destinationCountry,
          delivery: dto.delivery,
          neededDate: dto.neededDate ? new Date(dto.neededDate) : null,
          transportRequired: dto.transportRequired ?? false,
          loaderRequired: dto.loaderRequired ?? false,
          importExport: dto.importExport ?? false,
          visibility: dto.visibility ?? 'public',
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        },
        include: { _count: { select: { responses: true } } },
      });
      return { requirement, postId: post.id };
    });
    this.events.emit(COMMUNITY_POST_UPSERTED, { id: result.postId } satisfies ContentUpsertedEvent);
    this.events.emit(COMMUNITY_REQUIREMENT_UPSERTED, { id: result.requirement.id } satisfies ContentUpsertedEvent);
    return result.requirement;
  }

  async listRequirements(
    params: { category?: string; country?: string; search?: string; take?: number; cursor?: string },
    locale: Lang = 'en',
  ) {
    const take = Math.min(params.take ?? DEFAULT_TAKE, 50);
    const rows = await this.prisma.communityTradeRequirement.findMany({
      where: {
        visibility: 'public',
        ...(params.category ? { productCategory: params.category } : {}),
        ...(params.country
          ? { destinationCountry: { contains: params.country, mode: 'insensitive' as const } }
          : {}),
        ...(params.search
          ? {
              OR: [
                { title: { contains: params.search, mode: 'insensitive' as const } },
                { productName: { contains: params.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        author: { select: { id: true, name: true, role: true, country: true, kycStatus: true } },
        _count: { select: { responses: true } },
        translations: { where: { locale } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    return rows.map(localizeRequirement);
  }

  async getRequirement(user: AuthUser | undefined, id: string, locale: Lang = 'en') {
    const req = await this.prisma.communityTradeRequirement.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, role: true, country: true, kycStatus: true } },
        responses: {
          include: { responder: { select: { id: true, name: true, role: true, country: true } } },
          orderBy: { createdAt: 'asc' },
        },
        translations: { where: { locale } },
      },
    });
    if (!req) throw new NotFoundException('Requirement not found');
    // API-07: the list endpoint only ever returns `visibility: 'public'` rows, but
    // this by-id read exposed non-public requirements (and every responder's
    // identity) to anyone. Restrict a non-public requirement to its author, a
    // responder, or an admin. 404 (not 403) so the id's existence stays hidden.
    if (req.visibility !== 'public') {
      const uid = user?.id;
      const isAuthor = !!uid && req.authorId === uid;
      const isResponder = !!uid && req.responses.some((r) => r.responderId === uid);
      const isAdmin = !!user?.roles?.includes('admin');
      if (!isAuthor && !isResponder && !isAdmin) throw new NotFoundException('Requirement not found');
    }
    return localizeRequirement(req);
  }

  async respondToRequirement(user: AuthUser, requirementId: string, dto: RespondRequirementDto) {
    const req = await this.prisma.communityTradeRequirement.findUnique({ where: { id: requirementId } });
    if (!req) throw new NotFoundException('Requirement not found');
    const response = await this.prisma.communityRequirementResponse.create({
      data: {
        requirementId,
        responderId: user.id,
        kind: dto.kind ?? 'offer',
        body: sanitizeMessage(dto.body),
        priceText: dto.priceText,
        quantityText: dto.quantityText,
        deliveryText: dto.deliveryText,
        productId: dto.productId,
      },
      include: { responder: { select: { id: true, name: true, role: true, country: true } } },
    });
    return { response, requirementAuthorId: req.authorId };
  }

  // ── group messages ────────────────────────────────────────────────
  async getGroupMessages(
    user: AuthUser | undefined,
    groupId: string,
    params: { cursor?: string; take?: number },
    locale?: Lang,
  ) {
    const group = await this.prisma.communityGroup.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.visibility !== 'public') await this.assertMember(user, groupId);
    const take = Math.min(params.take ?? DEFAULT_TAKE, 50);
    const excluded = user ? await this.blockedIds(user.id) : [];
    const messages = await this.prisma.communityMessage.findMany({
      where: { groupId, deletedAt: null, ...(excluded.length ? { senderId: { notIn: excluded } } : {}) },
      include: {
        sender: { select: { id: true, name: true, role: true, country: true } },
        reactions: { select: { emoji: true, userId: true } },
        attachments: { select: { id: true, kind: true, mime: true, originalName: true } },
        replyTo: { select: { id: true, body: true, sender: { select: { name: true } } } },
        translations: locale ? { where: { locale }, select: { body: true } } : false,
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    return (await this.localizeMessages(messages, locale)).reverse();
  }

  /**
   * API-01: verify the caller may read a message before returning its content.
   * A message belongs either to a group (members-only unless the group is public)
   * or to a DM thread (its two participants only). Admins bypass. Mirrors the
   * checks getGroupMessages / getDmMessages already enforce on the list paths.
   */
  private async assertCanViewMessage(user: AuthUser, message: { groupId: string | null; threadId: string | null }) {
    if (user.roles.includes('admin')) return;
    if (message.groupId) {
      const group = await this.prisma.communityGroup.findFirst({ where: { id: message.groupId, deletedAt: null } });
      if (!group) throw new NotFoundException('Message not found');
      if (group.visibility !== 'public') await this.assertMember(user, message.groupId);
      return;
    }
    if (message.threadId) {
      const thread = await this.prisma.communityDirectThread.findUnique({ where: { id: message.threadId } });
      if (!thread || (thread.aId !== user.id && thread.bId !== user.id)) {
        throw new ForbiddenException('You cannot view this message');
      }
      return;
    }
    throw new ForbiddenException('You cannot view this message');
  }

  /**
   * Translate a single message into the viewer's locale (cached). Used by clients
   * to localize a message that arrived over the socket in its original language.
   * API-01: access-checked — previously ANY signed-in user could read ANY DM or
   * private-group message by id via this endpoint.
   */
  async translateMessage(user: AuthUser, messageId: string, locale: Lang) {
    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      include: { translations: { where: { locale }, select: { body: true } } },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertCanViewMessage(user, message);
    const [localized] = await this.localizeMessages([message], locale);
    return { id: message.id, body: localized.body, originalBody: localized.originalBody, sourceLang: localized.sourceLang };
  }

  async sendGroupMessage(
    user: AuthUser,
    groupId: string,
    body: string,
    opts: { replyToId?: string; attachmentIds?: string[] } = {},
  ) {
    await this.ensureCanPost(user, groupId);
    const message = await this.prisma.communityMessage.create({
      data: {
        groupId,
        senderId: user.id,
        body: sanitizeMessage(body),
        replyToId: opts.replyToId,
      },
    });
    if (opts.attachmentIds?.length) {
      await this.linkAttachments(user.id, message.id, opts.attachmentIds);
    }
    this.detectMessageLang(message.id, message.body);
    return this.hydrateMessage(message.id);
  }

  private async linkAttachments(uploaderId: string, messageId: string, attachmentIds: string[]) {
    await this.prisma.chatAttachment.updateMany({
      where: { id: { in: attachmentIds }, uploaderId, system: 'community', communityMessageId: null },
      data: { communityMessageId: messageId },
    });
  }

  private async hydrateMessage(id: string) {
    return this.prisma.communityMessage.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, role: true, country: true } },
        reactions: { select: { emoji: true, userId: true } },
        attachments: { select: { id: true, kind: true, mime: true, originalName: true } },
        replyTo: { select: { id: true, body: true, sender: { select: { name: true } } } },
      },
    });
  }

  /** Ids of members to notify for a group message (excludes the sender). */
  async groupMemberIds(groupId: string, exceptUserId: string) {
    const members = await this.prisma.communityGroupMember.findMany({
      where: { groupId, userId: { not: exceptUserId } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async markGroupRead(user: AuthUser, groupId: string) {
    await this.prisma.communityGroupMember.updateMany({
      where: { groupId, userId: user.id },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  // ── direct messages ───────────────────────────────────────────────
  private orderPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  /**
   * Aggregate unread counts for the live badges (web chat buttons + mobile
   * tab bar): unread group messages across memberships + unread DM messages.
   */
  async unreadSummary(userId: string) {
    const memberships = await this.prisma.communityGroupMember.findMany({
      where: { userId },
      select: { groupId: true, lastReadAt: true },
    });
    const threads = await this.prisma.communityDirectThread.findMany({
      where: { OR: [{ aId: userId }, { bId: userId }] },
      select: { id: true, aId: true, aLastReadAt: true, bLastReadAt: true },
    });
    const [groupUnread, dmUnread] = await Promise.all([
      this.unreadByGroup(userId, memberships),
      this.unreadByThread(userId, threads),
    ]);
    const groups = [...groupUnread.values()].reduce((sum, count) => sum + count, 0);
    const dms = [...dmUnread.values()].reduce((sum, count) => sum + count, 0);
    return { groups, dms, total: groups + dms };
  }

  /** Mark the DM thread with `otherUserId` as read for the calling user. */
  async markDmRead(user: AuthUser, otherUserId: string) {
    const [aId, bId] = this.orderPair(user.id, otherUserId);
    const thread = await this.prisma.communityDirectThread.findUnique({ where: { aId_bId: { aId, bId } } });
    if (!thread) return { ok: true };
    await this.prisma.communityDirectThread.update({
      where: { id: thread.id },
      data: thread.aId === user.id ? { aLastReadAt: new Date() } : { bLastReadAt: new Date() },
    });
    return { ok: true };
  }

  async ensureThread(userId: string, otherUserId: string) {
    if (userId === otherUserId) throw new ForbiddenException('Cannot message yourself');
    const [aId, bId] = this.orderPair(userId, otherUserId);
    const thread = await this.prisma.communityDirectThread.upsert({
      where: { aId_bId: { aId, bId } },
      create: { aId, bId },
      update: {},
    });
    return thread;
  }

  async getDmMessages(
    user: AuthUser,
    otherUserId: string,
    params: { cursor?: string; take?: number },
    locale?: Lang,
  ) {
    const thread = await this.ensureThread(user.id, otherUserId);
    const take = Math.min(params.take ?? DEFAULT_TAKE, 50);
    const messages = await this.prisma.communityMessage.findMany({
      where: { threadId: thread.id, deletedAt: null },
      include: {
        sender: { select: { id: true, name: true, role: true, country: true } },
        attachments: { select: { id: true, kind: true, mime: true, originalName: true } },
        translations: locale ? { where: { locale }, select: { body: true } } : false,
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    return { threadId: thread.id, messages: (await this.localizeMessages(messages, locale)).reverse() };
  }

  async sendDm(user: AuthUser, otherUserId: string, body: string, opts: { attachmentIds?: string[] } = {}) {
    // Block check both directions.
    const blocked = await this.prisma.communityUserBlock.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: user.id },
        ],
      },
    });
    if (blocked) throw new ForbiddenException('Messaging is blocked between these users');
    const thread = await this.ensureThread(user.id, otherUserId);
    const message = await this.prisma.communityMessage.create({
      data: { threadId: thread.id, senderId: user.id, body: sanitizeMessage(body) },
    });
    if (opts.attachmentIds?.length) await this.linkAttachments(user.id, message.id, opts.attachmentIds);
    await this.prisma.communityDirectThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });
    this.detectMessageLang(message.id, message.body);
    const hydrated = await this.hydrateMessage(message.id);
    return { threadId: thread.id, message: hydrated, recipientId: otherUserId };
  }

  // ── reactions ─────────────────────────────────────────────────────
  /**
   * API-12: reacting requires the same read access as viewing. Previously any
   * authenticated socket could react to ANY message id, which both wrote a row
   * against a conversation the user can't see and probed message existence.
   */
  private async assertCanReact(user: AuthUser, messageId: string) {
    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      select: { groupId: true, threadId: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertCanViewMessage(user, message);
  }

  async addReaction(user: AuthUser, messageId: string, emoji: string) {
    await this.assertCanReact(user, messageId);
    await this.prisma.communityMessageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } },
      create: { messageId, userId: user.id, emoji },
      update: {},
    });
    return { messageId, emoji, userId: user.id };
  }

  async removeReaction(user: AuthUser, messageId: string, emoji: string) {
    await this.assertCanReact(user, messageId);
    await this.prisma.communityMessageReaction.deleteMany({ where: { messageId, userId: user.id, emoji } });
    return { messageId, emoji, userId: user.id };
  }

  /** API-12: the DM equivalent of assertCanJoinGroup — only the two participants. */
  async assertThreadParticipant(user: AuthUser, threadId: string) {
    const thread = await this.prisma.communityDirectThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Conversation not found');
    if (thread.aId !== user.id && thread.bId !== user.id && !user.roles.includes('admin')) {
      throw new ForbiddenException('You are not part of this conversation');
    }
    return thread;
  }

  // ── message room resolution (for the gateway access guard) ─────────
  async assertCanJoinGroup(user: AuthUser, groupId: string) {
    const group = await this.prisma.communityGroup.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.visibility !== 'public') await this.assertMember(user, groupId);
    return group;
  }

  // ── moderation: save / report / block ─────────────────────────────
  async savePost(user: AuthUser, postId: string) {
    await this.prisma.communitySavedPost.upsert({
      where: { userId_postId: { userId: user.id, postId } },
      create: { userId: user.id, postId },
      update: {},
    });
    return { ok: true };
  }

  async unsavePost(user: AuthUser, postId: string) {
    await this.prisma.communitySavedPost.deleteMany({ where: { userId: user.id, postId } });
    return { ok: true };
  }

  savedPosts(userId: string) {
    return this.prisma.communitySavedPost.findMany({
      where: { userId },
      include: { post: { include: { author: { select: { id: true, name: true, role: true } }, requirement: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async report(user: AuthUser, dto: ReportDto) {
    const report = await this.prisma.communityReport.create({
      data: { reporterId: user.id, targetType: dto.targetType, targetId: dto.targetId, reason: dto.reason },
    });
    await this.audit.log({ actorId: user.id, action: 'community.report.create', entityType: 'CommunityReport', entityId: report.id, meta: { targetType: dto.targetType, targetId: dto.targetId } });
    return report;
  }

  async block(user: AuthUser, blockedId: string) {
    if (user.id === blockedId) throw new ForbiddenException('Cannot block yourself');
    await this.prisma.communityUserBlock.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
      create: { blockerId: user.id, blockedId },
      update: {},
    });
    await this.audit.log({ actorId: user.id, action: 'community.block', entityType: 'User', entityId: blockedId });
    return { ok: true };
  }

  async unblock(user: AuthUser, blockedId: string) {
    await this.prisma.communityUserBlock.deleteMany({ where: { blockerId: user.id, blockedId } });
    return { ok: true };
  }

  // ── search ────────────────────────────────────────────────────────
  async search(user: AuthUser | undefined, q: string) {
    if (!q || q.length < 2) return { groups: [], messages: [] };
    const excluded = user ? await this.blockedIds(user.id) : [];
    const [groups, messages] = await Promise.all([
      this.prisma.communityGroup.findMany({
        where: { deletedAt: null, visibility: 'public', name: { contains: q, mode: 'insensitive' } },
        take: 10,
      }),
      this.prisma.communityMessage.findMany({
        where: {
          deletedAt: null,
          body: { contains: q, mode: 'insensitive' },
          group: { visibility: 'public' },
          ...(excluded.length ? { senderId: { notIn: excluded } } : {}),
        },
        include: { sender: { select: { name: true } }, group: { select: { id: true, name: true } } },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { groups, messages };
  }

  // ── admin moderation ──────────────────────────────────────────────
  reports(status?: string) {
    return this.prisma.communityReport.findMany({
      where: status ? { status: status as Prisma.CommunityReportWhereInput['status'] } : {},
      include: { reporter: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveReport(admin: AuthUser, reportId: string, action: 'actioned' | 'dismissed', note?: string) {
    const report = await this.prisma.communityReport.update({
      where: { id: reportId },
      data: { status: action, reviewedById: admin.id, reviewedAt: new Date(), resolutionNote: note },
    });
    await this.audit.log({ actorId: admin.id, action: `community.report.${action}`, entityType: 'CommunityReport', entityId: reportId });
    return report;
  }

  async deleteMessage(admin: AuthUser, messageId: string) {
    await this.prisma.communityMessage.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
    await this.audit.log({ actorId: admin.id, action: 'community.message.delete', entityType: 'CommunityMessage', entityId: messageId });
    return { ok: true };
  }

  async analytics() {
    const [groups, posts, requirements, messages, openReports] = await Promise.all([
      this.prisma.communityGroup.count({ where: { deletedAt: null } }),
      this.prisma.communityPost.count({ where: { deletedAt: null } }),
      this.prisma.communityTradeRequirement.count(),
      this.prisma.communityMessage.count({ where: { deletedAt: null } }),
      this.prisma.communityReport.count({ where: { status: 'open' } }),
    ]);
    return { groups, posts, requirements, messages, openReports };
  }

  // ── admin group / post management ──────────────────────────────
  adminGroups() {
    return this.prisma.communityGroup.findMany({
      where: { deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { members: true, posts: true, messages: true } } },
    });
  }

  async adminCreateGroup(
    admin: AuthUser,
    dto: { name: string; description?: string; emoji?: string; isDefault?: boolean },
  ) {
    const slug =
      dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    const group = await this.prisma.communityGroup.create({
      // Admin-created groups are official channels owned by the platform.
      data: { slug, name: dto.name, description: dto.description, emoji: dto.emoji, isDefault: !!dto.isDefault, kind: 'channel' },
    });
    await this.audit.log({ actorId: admin.id, action: 'community.group.admin_create', entityType: 'CommunityGroup', entityId: group.id });
    this.events.emit(COMMUNITY_GROUP_UPSERTED, { id: group.id } satisfies ContentUpsertedEvent);
    return group;
  }

  async adminUpdateGroup(
    admin: AuthUser,
    id: string,
    dto: { name?: string; description?: string; emoji?: string; isDefault?: boolean },
  ) {
    const existing = await this.prisma.communityGroup.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Group not found');
    const group = await this.prisma.communityGroup.update({
      where: { id },
      data: { name: dto.name, description: dto.description, emoji: dto.emoji, isDefault: dto.isDefault },
    });
    await this.audit.log({ actorId: admin.id, action: 'community.group.admin_update', entityType: 'CommunityGroup', entityId: id });
    this.events.emit(COMMUNITY_GROUP_UPSERTED, { id } satisfies ContentUpsertedEvent);
    return group;
  }

  async adminDeleteGroup(admin: AuthUser, id: string) {
    const existing = await this.prisma.communityGroup.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Group not found');
    await this.prisma.communityGroup.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ actorId: admin.id, action: 'community.group.admin_delete', entityType: 'CommunityGroup', entityId: id });
    return { ok: true };
  }

  adminFeed(groupId?: string) {
    return this.prisma.communityPost.findMany({
      where: { deletedAt: null, ...(groupId ? { groupId } : {}) },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        author: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { savedBy: true } },
      },
    });
  }

  async adminDeletePost(admin: AuthUser, id: string) {
    await this.prisma.communityPost.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ actorId: admin.id, action: 'community.post.delete', entityType: 'CommunityPost', entityId: id });
    return { ok: true };
  }

  async adminPinPost(admin: AuthUser, id: string, pinned: boolean) {
    const post = await this.prisma.communityPost.update({ where: { id }, data: { pinned } });
    await this.audit.log({ actorId: admin.id, action: pinned ? 'community.post.pin' : 'community.post.unpin', entityType: 'CommunityPost', entityId: id });
    return post;
  }

  /** Platform-level community ban: deactivate the account so it can't sign in. */
  async adminBanUser(admin: AuthUser, userId: string) {
    if (userId === admin.id) throw new BadRequestException('You cannot ban yourself.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { active: false } });
    await this.audit.log({ actorId: admin.id, action: 'community.user.ban', entityType: 'User', entityId: userId });
    return { ok: true };
  }
}
