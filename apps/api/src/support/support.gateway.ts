import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { SupportPriority, SupportStatus } from '@prisma/client';
import { WsAuthService } from '../realtime/ws-auth.service';
import { NotificationsService, type NotificationCreatedEvent, type NotificationParams } from '../notifications/notifications.service';
import { NOTIFICATION_CREATED } from '../notifications/notification-categories';
import type { AuthUser } from '../auth/current-user.decorator';
import { SupportService } from './support.service';
import type { CreateTicketDto, SendSupportMessageDto } from './dto';

type ChatSocket = Socket & { data: { user?: AuthUser } };

const convRoom = (ticketId: string) => `support:conv:${ticketId}`;
const userRoom = (userId: string) => `support:user:${userId}`;
const AGENTS_ROOM = 'support:agents';

/**
 * Real-time gateway for Live Support (System 2). Strictly separate from
 * Community: dedicated `/support` namespace and `support:*` rooms. Room join is
 * guarded so only the ticket owner + staff can read a conversation (IDOR-safe).
 *
 * Also acts as the orchestration layer: both socket handlers and the REST
 * controller call these methods so realtime emits happen from one place.
 */
@WebSocketGateway({ namespace: '/support', cors: { origin: true, credentials: true } })
export class SupportGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('SupportGateway');

  constructor(
    private support: SupportService,
    private notifications: NotificationsService,
    private wsAuth: WsAuthService,
  ) {}

  async handleConnection(socket: ChatSocket) {
    try {
      const user = await this.wsAuth.verify(this.wsAuth.tokenFromSocket(socket));
      socket.data.user = user;
      socket.join(userRoom(user.id));
      if (user.roles.includes('admin')) socket.join(AGENTS_ROOM);
      socket.emit('ready', { userId: user.id });
    } catch {
      socket.emit('error', { message: 'Unauthorized' });
      socket.disconnect(true);
    }
  }

  private user(socket: ChatSocket): AuthUser {
    const u = socket.data.user;
    if (!u) throw new Error('Unauthenticated socket');
    return u;
  }

  private async notify(userId: string, type: string, body: string | undefined, ticketId: string, params?: NotificationParams) {
    // create() emits NOTIFICATION_CREATED → onNotificationCreated relays the live
    // `notify:new` badge on the /support namespace (and fans out to push/email). The
    // title is rendered from `notification:<type>`; `body` is passthrough user content.
    await this.notifications.create({ userId, system: 'support', type, params, body, data: { ticketId } });
  }

  /**
   * Relay point for Support notifications only, on the /support namespace — keeps
   * this drawer's unread counter partitioned from the Community bell. Community &
   * everything else is relayed by CommunityGateway.
   */
  @OnEvent(NOTIFICATION_CREATED)
  onNotificationCreated({ notification }: NotificationCreatedEvent) {
    if (notification.system === 'support') {
      this.server?.to(userRoom(notification.userId)).emit('notify:new', notification);
    }
  }

  // ── orchestration (shared by REST + sockets) ─────────────────────
  async createTicket(user: AuthUser, dto: CreateTicketDto) {
    const ticket = await this.support.createTicket(user, dto);
    if (ticket) {
      this.server?.to(AGENTS_ROOM).emit('ticket:new', ticket);
      for (const agentId of await this.support.agentUserIds()) {
        await this.notify(agentId, 'support.ticket_new', ticket.subject, ticket.id);
      }
    }
    return ticket;
  }

  async postMessage(user: AuthUser, ticketId: string, dto: SendSupportMessageDto) {
    const { message, ticket, authoredByStaff } = await this.support.sendMessage(user, ticketId, dto);
    const payload = { ...message, tempId: dto.tempId };
    this.server?.to(convRoom(ticketId)).emit('message:new', payload);
    if (ticket) {
      this.server?.to(AGENTS_ROOM).emit('ticket:update', ticket);
      this.server?.to(userRoom(ticket.userId)).emit('ticket:update', ticket);
      if (authoredByStaff) {
        await this.notify(ticket.userId, 'support.reply', message?.body?.slice(0, 120), ticketId);
        this.server?.to(userRoom(ticket.userId)).emit('message:new', payload);
      } else {
        for (const agentId of await this.support.agentUserIds()) {
          await this.notify(agentId, 'support.user_reply', message?.body?.slice(0, 120), ticketId);
        }
      }
    }
    return message;
  }

  private broadcastTicket(ticket: { id: string; userId: string } | null) {
    if (!ticket) return;
    this.server?.to(convRoom(ticket.id)).emit('ticket:update', ticket);
    this.server?.to(AGENTS_ROOM).emit('ticket:update', ticket);
    this.server?.to(userRoom(ticket.userId)).emit('ticket:update', ticket);
  }

  async assignTicket(admin: AuthUser, ticketId: string, agentId?: string) {
    const { ticket, agentId: target } = await this.support.assign(admin, ticketId, agentId);
    this.broadcastTicket(ticket);
    await this.notify(target, 'support.assigned_agent', ticket.subject, ticketId);
    await this.notify(ticket.userId, 'support.assigned_user', ticket.subject, ticketId);
    return ticket;
  }

  async changeStatus(actor: AuthUser, ticketId: string, status: SupportStatus) {
    const ticket = await this.support.setStatus(actor, ticketId, status);
    this.broadcastTicket(ticket);
    await this.notify(ticket.userId, 'support.status', ticket.subject, ticketId, { status: { enum: 'support_status', value: status } });
    return ticket;
  }

  async resolveTicket(actor: AuthUser, ticketId: string) {
    const ticket = await this.support.resolve(actor, ticketId);
    this.broadcastTicket(ticket);
    await this.notify(ticket.userId, 'support.resolved', ticket.subject, ticketId);
    return ticket;
  }

  async reopenTicket(user: AuthUser, ticketId: string) {
    const ticket = await this.support.reopen(user, ticketId);
    this.broadcastTicket(ticket);
    return ticket;
  }

  async setPriority(admin: AuthUser, ticketId: string, priority: SupportPriority) {
    const ticket = await this.support.setPriority(admin, ticketId, priority);
    this.broadcastTicket(ticket);
    return ticket;
  }

  // ── socket handlers ──────────────────────────────────────────────
  @SubscribeMessage('ticket:join')
  async onJoin(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { ticketId: string }) {
    const user = this.user(socket);
    await this.support.assertCanView(user, body.ticketId); // IDOR guard
    socket.join(convRoom(body.ticketId));
    return { ok: true };
  }

  @SubscribeMessage('message:send')
  async onMessage(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { ticketId: string } & SendSupportMessageDto) {
    const user = this.user(socket);
    const message = await this.postMessage(user, body.ticketId, body);
    return { ok: true, id: message?.id, tempId: body.tempId };
  }

  @SubscribeMessage('typing')
  onTyping(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { ticketId: string; typing: boolean }) {
    const user = this.user(socket);
    socket.to(convRoom(body.ticketId)).emit('typing', { userId: user.id, ticketId: body.ticketId, typing: body.typing });
    return { ok: true };
  }

  @SubscribeMessage('read')
  async onRead(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { ticketId: string }) {
    const user = this.user(socket);
    await this.support.markRead(user, body.ticketId);
    socket.to(convRoom(body.ticketId)).emit('read', { userId: user.id, ticketId: body.ticketId, at: new Date().toISOString() });
    return { ok: true };
  }
}
