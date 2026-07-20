import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SupportPriority, SupportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';
import { sanitizeMessage } from '../common/sanitize';
import type { AuthUser } from '../auth/current-user.decorator';
import type {
  CreateTicketDto,
  RateDto,
  SendSupportMessageDto,
} from './dto';

/** First-response (minutes) + resolution (hours) SLA targets per priority. */
const SLA_TARGETS: Record<SupportPriority, { firstMin: number; resolveHrs: number }> = {
  low: { firstMin: 480, resolveHrs: 72 },
  medium: { firstMin: 240, resolveHrs: 48 },
  high: { firstMin: 60, resolveHrs: 24 },
  urgent: { firstMin: 15, resolveHrs: 8 },
};

const isStaff = (user: AuthUser) => user.roles.includes('admin');

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private reference() {
    return 'TK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  /** Distinct set of staff user ids to notify about new/updated tickets. */
  async agentUserIds(): Promise<string[]> {
    const [agents, admins] = await Promise.all([
      this.prisma.supportAgent.findMany({ select: { userId: true } }),
      this.prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } }),
    ]);
    return [...new Set([...agents.map((a) => a.userId), ...admins.map((a) => a.id)])];
  }

  // ── access ────────────────────────────────────────────────────────
  async assertCanView(user: AuthUser, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== user.id && !isStaff(user)) {
      throw new ForbiddenException('You cannot access this support ticket');
    }
    return ticket;
  }

  // ── create ────────────────────────────────────────────────────────
  async createTicket(user: AuthUser, dto: CreateTicketDto) {
    const priority = dto.priority ?? 'medium';
    const targets = SLA_TARGETS[priority];
    const now = Date.now();
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id }, select: { country: true } });

    const ticket = await this.prisma.supportTicket.create({
      data: {
        reference: this.reference(),
        userId: user.id,
        category: dto.category,
        subject: dto.subject,
        priority,
        status: 'waiting_support',
        country: dbUser?.country ?? null,
        orderId: dto.orderId,
        productId: dto.productId,
        auctionId: dto.auctionId,
        transportBookingId: dto.transportBookingId,
        loaderBookingId: dto.loaderBookingId,
        safeDealTxId: dto.safeDealTxId,
        conversation: { create: {} },
        sla: {
          create: {
            firstResponseDueAt: new Date(now + targets.firstMin * 60_000),
            resolutionDueAt: new Date(now + targets.resolveHrs * 3_600_000),
          },
        },
      },
      include: { conversation: true },
    });

    // Seed the thread with the user's description (+ a system acknowledgement).
    await this.prisma.supportMessage.create({
      data: {
        conversationId: ticket.conversation!.id,
        authorId: user.id,
        authorType: 'user',
        body: sanitizeMessage(dto.description),
      },
    });
    await this.prisma.supportMessage.create({
      data: {
        conversationId: ticket.conversation!.id,
        authorType: 'system',
        body: 'Thanks — your request has been received. A support agent will respond shortly.',
      },
    });

    await this.audit.log({ actorId: user.id, action: 'support.ticket.create', entityType: 'SupportTicket', entityId: ticket.id });
    return this.getTicketRaw(ticket.id);
  }

  private getTicketRaw(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, country: true } },
        conversation: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
        assignments: { where: { active: true }, include: { agent: { select: { id: true, name: true } } } },
        tags: { include: { tag: true } },
        rating: true,
        sla: true,
      },
    });
  }

  // ── reads ─────────────────────────────────────────────────────────
  myTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        assignments: { where: { active: true }, include: { agent: { select: { id: true, name: true } } } },
        rating: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTicket(user: AuthUser, id: string) {
    await this.assertCanView(user, id);
    const ticket = await this.getTicketRaw(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    // Internal notes are staff-only.
    const notes = isStaff(user)
      ? await this.prisma.supportInternalNote.findMany({
          where: { ticketId: id },
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    return { ...ticket, notes };
  }

  // ── messaging ─────────────────────────────────────────────────────
  async sendMessage(user: AuthUser, ticketId: string, dto: SendSupportMessageDto) {
    const ticket = await this.assertCanView(user, ticketId);
    const conversation = await this.prisma.supportConversation.findUnique({ where: { ticketId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const staff = isStaff(user);

    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        authorId: user.id,
        authorType: staff ? 'agent' : 'user',
        body: sanitizeMessage(dto.body),
      },
    });
    if (dto.attachmentIds?.length) {
      await this.prisma.chatAttachment.updateMany({
        where: { id: { in: dto.attachmentIds }, uploaderId: user.id, system: 'support', supportMessageId: null },
        data: { supportMessageId: message.id },
      });
    }

    // Status transitions + first-response SLA capture.
    const patch: Prisma.SupportTicketUpdateInput = {};
    if (staff) {
      if (!ticket.firstResponseAt) patch.firstResponseAt = new Date();
      patch.status = 'in_progress';
    } else if (ticket.status === 'waiting_user' || ticket.status === 'resolved') {
      patch.status = 'waiting_support';
    }
    if (Object.keys(patch).length) {
      await this.prisma.supportTicket.update({ where: { id: ticketId }, data: patch });
    }

    const hydrated = await this.prisma.supportMessage.findUnique({
      where: { id: message.id },
      include: { attachments: { select: { id: true, kind: true, mime: true, originalName: true } } },
    });
    return { message: hydrated, ticket: await this.prisma.supportTicket.findUnique({ where: { id: ticketId } }), authoredByStaff: staff };
  }

  async markRead(user: AuthUser, ticketId: string) {
    await this.assertCanView(user, ticketId);
    const conversation = await this.prisma.supportConversation.findUnique({ where: { ticketId } });
    if (!conversation) return { ok: true };
    const field = isStaff(user) ? 'readByAgentAt' : 'readByUserAt';
    await this.prisma.supportMessage.updateMany({
      where: { conversationId: conversation.id, [field]: null },
      data: { [field]: new Date() },
    });
    return { ok: true };
  }

  // ── staff actions ─────────────────────────────────────────────────
  async assign(admin: AuthUser, ticketId: string, agentId?: string) {
    const targetAgent = agentId ?? admin.id;
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.prisma.supportTicketAssignment.updateMany({
      where: { ticketId, active: true },
      data: { active: false, unassignedAt: new Date() },
    });
    await this.prisma.supportTicketAssignment.create({
      data: { ticketId, agentId: targetAgent, assignedById: admin.id },
    });
    await this.prisma.supportAgent.updateMany({ where: { userId: targetAgent }, data: { activeCount: { increment: 1 } } });
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: ticket.firstResponseAt ? 'in_progress' : 'assigned' },
    });
    await this.audit.log({ actorId: admin.id, action: 'support.ticket.assign', entityType: 'SupportTicket', entityId: ticketId, meta: { agentId: targetAgent } });
    return { ticket: updated, agentId: targetAgent };
  }

  transfer(admin: AuthUser, ticketId: string, agentId: string) {
    return this.assign(admin, ticketId, agentId);
  }

  async setStatus(actor: AuthUser, ticketId: string, status: SupportStatus) {
    const data: Prisma.SupportTicketUpdateInput = { status };
    if (status === 'resolved') data.resolvedAt = new Date();
    if (status === 'closed') data.closedAt = new Date();
    const ticket = await this.prisma.supportTicket.update({ where: { id: ticketId }, data });
    await this.audit.log({ actorId: actor.id, action: `support.ticket.status.${status}`, entityType: 'SupportTicket', entityId: ticketId });
    return ticket;
  }

  setPriority(actor: AuthUser, ticketId: string, priority: SupportPriority) {
    return this.prisma.supportTicket.update({ where: { id: ticketId }, data: { priority } });
  }

  escalate(actor: AuthUser, ticketId: string) {
    return this.setStatus(actor, ticketId, 'escalated');
  }

  async resolve(actor: AuthUser, ticketId: string) {
    const ticket = await this.setStatus(actor, ticketId, 'resolved');
    await this.audit.log({ actorId: actor.id, action: 'support.ticket.resolve', entityType: 'SupportTicket', entityId: ticketId });
    return ticket;
  }

  close(actor: AuthUser, ticketId: string) {
    return this.setStatus(actor, ticketId, 'closed');
  }

  async reopen(user: AuthUser, ticketId: string) {
    await this.assertCanView(user, ticketId);
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'waiting_support', resolvedAt: null, closedAt: null },
    });
    await this.audit.log({ actorId: user.id, action: 'support.ticket.reopen', entityType: 'SupportTicket', entityId: ticketId });
    return ticket;
  }

  // ── notes / tags ──────────────────────────────────────────────────
  addNote(admin: AuthUser, ticketId: string, body: string) {
    return this.prisma.supportInternalNote.create({
      data: { ticketId, authorId: admin.id, body: sanitizeMessage(body) },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async addTag(admin: AuthUser, ticketId: string, label: string) {
    const tag = await this.prisma.supportTag.upsert({
      where: { label },
      create: { label },
      update: {},
    });
    await this.prisma.supportTicketTag.upsert({
      where: { ticketId_tagId: { ticketId, tagId: tag.id } },
      create: { ticketId, tagId: tag.id },
      update: {},
    });
    return tag;
  }

  // ── rating ────────────────────────────────────────────────────────
  async rate(user: AuthUser, ticketId: string, dto: RateDto) {
    const ticket = await this.assertCanView(user, ticketId);
    if (ticket.userId !== user.id) throw new ForbiddenException('Only the requester can rate this ticket');
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new BadRequestException('You can rate support after the ticket is resolved');
    }
    return this.prisma.supportRating.upsert({
      where: { ticketId },
      create: { ticketId, userId: user.id, score: dto.score, comment: dto.comment },
      update: { score: dto.score, comment: dto.comment },
    });
  }

  // ── staff inbox ───────────────────────────────────────────────────
  async inbox(filters: {
    status?: string;
    priority?: string;
    category?: string;
    country?: string;
    language?: string;
    agentId?: string;
    unassigned?: string;
    q?: string;
  }) {
    const where: Prisma.SupportTicketWhereInput = {};
    if (filters.status) where.status = filters.status as SupportStatus;
    if (filters.priority) where.priority = filters.priority as SupportPriority;
    if (filters.category) where.category = filters.category as Prisma.SupportTicketWhereInput['category'];
    if (filters.country) where.country = { contains: filters.country, mode: 'insensitive' };
    if (filters.language) where.language = filters.language;
    if (filters.unassigned === 'true') where.assignments = { none: { active: true } };
    if (filters.agentId) where.assignments = { some: { active: true, agentId: filters.agentId } };
    if (filters.q) {
      where.OR = [
        { reference: { contains: filters.q, mode: 'insensitive' } },
        { subject: { contains: filters.q, mode: 'insensitive' } },
        { orderId: { contains: filters.q, mode: 'insensitive' } },
        { productId: { contains: filters.q, mode: 'insensitive' } },
        { user: { name: { contains: filters.q, mode: 'insensitive' } } },
        { user: { email: { contains: filters.q, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, country: true } },
        assignments: { where: { active: true }, include: { agent: { select: { id: true, name: true } } } },
        _count: { select: { notes: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  // ── agents ────────────────────────────────────────────────────────
  async listAgents() {
    const agents = await this.prisma.supportAgent.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    // Admins without an explicit SupportAgent row can still be assigned.
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', supportAgentProfile: null },
      select: { id: true, name: true, email: true },
    });
    return [
      ...agents.map((a) => ({ userId: a.userId, name: a.user.name, email: a.user.email, availability: a.availability, activeCount: a.activeCount })),
      ...admins.map((u) => ({ userId: u.id, name: u.name, email: u.email, availability: 'offline' as const, activeCount: 0 })),
    ];
  }

  // ── analytics ─────────────────────────────────────────────────────
  async analytics() {
    const tickets = await this.prisma.supportTicket.findMany({
      include: { sla: true, rating: true },
    });
    const open = tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length;
    const firstResp: number[] = [];
    const resolution: number[] = [];
    let slaBreached = 0;
    const byCategory: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    let en = 0;
    let ru = 0;
    const scores: number[] = [];
    const now = Date.now();

    for (const t of tickets) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
      if (t.country) byCountry[t.country] = (byCountry[t.country] ?? 0) + 1;
      if (t.language === 'ru') ru++;
      else en++;
      if (t.firstResponseAt) firstResp.push(t.firstResponseAt.getTime() - t.createdAt.getTime());
      if (t.resolvedAt) resolution.push(t.resolvedAt.getTime() - t.createdAt.getTime());
      if (t.sla) {
        const fr = !t.firstResponseAt && now > t.sla.firstResponseDueAt.getTime();
        const rr = !t.resolvedAt && now > t.sla.resolutionDueAt.getTime();
        if (fr || rr) slaBreached++;
      }
      if (t.rating) scores.push(t.rating.score);
    }
    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length / 60000) : 0);
    return {
      totals: { tickets: tickets.length, open, slaBreached },
      avgFirstResponseMin: avg(firstResp),
      avgResolutionMin: avg(resolution),
      byCategory,
      byCountry,
      language: { en, ru },
      satisfaction: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : null,
    };
  }
}
