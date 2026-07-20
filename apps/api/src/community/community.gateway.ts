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
import { WsAuthService } from '../realtime/ws-auth.service';
import { NotificationsService, type NotificationCreatedEvent } from '../notifications/notifications.service';
import { NOTIFICATION_CREATED } from '../notifications/notification-categories';
import type { AuthUser } from '../auth/current-user.decorator';
import { CommunityService } from './community.service';

type ChatSocket = Socket & { data: { user?: AuthUser } };

const groupRoom = (id: string) => `community:group:${id}`;
const threadRoom = (id: string) => `community:thread:${id}`;
const userRoom = (id: string) => `community:user:${id}`;

/**
 * Real-time gateway for AgroTraders Community (System 1). Strictly separate from
 * Live Support: dedicated `/community` namespace and `community:*` rooms.
 */
@WebSocketGateway({ namespace: '/community', cors: { origin: true, credentials: true } })
export class CommunityGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger('CommunityGateway');

  constructor(
    private community: CommunityService,
    private notifications: NotificationsService,
    private wsAuth: WsAuthService,
  ) {}

  async handleConnection(socket: ChatSocket) {
    try {
      const user = await this.wsAuth.verify(this.wsAuth.tokenFromSocket(socket));
      socket.data.user = user;
      socket.join(userRoom(user.id));
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

  /**
   * Push an already-persisted notification to a user's personal room. Lets
   * other modules (e.g. hires) deliver live `notify:new` badges without their
   * own gateway.
   */
  notifyUser(userId: string, notif: unknown) {
    this.server?.to(userRoom(userId)).emit('notify:new', notif);
  }

  /**
   * Single relay point for every persisted notification that isn't Support's.
   * NotificationsService emits this after writing the row, so any module can
   * deliver a live `notify:new` badge just by calling `create()` — no gateway
   * dependency. Support notifications are relayed by SupportGateway on its own
   * namespace instead (keeps the two drawers' unread counts partitioned).
   */
  @OnEvent(NOTIFICATION_CREATED)
  onNotificationCreated({ notification }: NotificationCreatedEvent) {
    if (notification.system !== 'support') this.notifyUser(notification.userId, notification);
  }

  @SubscribeMessage('group:join')
  async onJoin(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { groupId: string }) {
    const user = this.user(socket);
    await this.community.assertCanJoinGroup(user, body.groupId);
    socket.join(groupRoom(body.groupId));
    return { ok: true, room: groupRoom(body.groupId) };
  }

  @SubscribeMessage('group:leave')
  onLeave(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { groupId: string }) {
    socket.leave(groupRoom(body.groupId));
    return { ok: true };
  }

  @SubscribeMessage('dm:open')
  async onDmOpen(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { toUserId: string }) {
    const user = this.user(socket);
    const thread = await this.community.ensureThread(user.id, body.toUserId);
    socket.join(threadRoom(thread.id));
    return { ok: true, threadId: thread.id };
  }

  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody()
    body: { tempId?: string; groupId?: string; toUserId?: string; body: string; replyToId?: string; attachmentIds?: string[] },
  ) {
    const user = this.user(socket);
    if (!body?.body?.trim() && !body.attachmentIds?.length) return { ok: false, error: 'Empty message' };

    if (body.groupId) {
      const message = await this.community.sendGroupMessage(user, body.groupId, body.body, {
        replyToId: body.replyToId,
        attachmentIds: body.attachmentIds,
      });
      // Echo tempId so the sender can reconcile its optimistic message (dedupe).
      this.server.to(groupRoom(body.groupId)).emit('message:new', { ...message, tempId: body.tempId });
      // Fan-out notifications + unread badges to members not in the room.
      const memberIds = await this.community.groupMemberIds(body.groupId, user.id);
      for (const uid of memberIds) {
        // create() emits NOTIFICATION_CREATED → onNotificationCreated relays the
        // live `notify:new` badge (and fans out to push/email transports).
        await this.notifications.create({
          userId: uid,
          system: 'community',
          type: 'community.message',
          body: message?.body?.slice(0, 120),
          data: { groupId: body.groupId },
        });
      }
      return { ok: true, id: message?.id, tempId: body.tempId };
    }

    if (body.toUserId) {
      const { threadId, message, recipientId } = await this.community.sendDm(user, body.toUserId, body.body, {
        attachmentIds: body.attachmentIds,
      });
      this.server.to(threadRoom(threadId)).emit('message:new', { ...message, tempId: body.tempId });
      // create() → onNotificationCreated relays the `notify:new` badge + push/email.
      await this.notifications.create({
        userId: recipientId,
        system: 'community',
        type: 'community.dm',
        body: message?.body?.slice(0, 120),
        data: { threadId },
      });
      this.server.to(userRoom(recipientId)).emit('message:new', { ...message, tempId: body.tempId });
      return { ok: true, id: message?.id, threadId, tempId: body.tempId };
    }

    return { ok: false, error: 'Missing target' };
  }

  @SubscribeMessage('typing')
  onTyping(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { groupId?: string; threadId?: string; typing: boolean }) {
    const user = this.user(socket);
    const room = body.groupId ? groupRoom(body.groupId) : body.threadId ? threadRoom(body.threadId) : null;
    if (room) socket.to(room).emit('typing', { userId: user.id, typing: body.typing, groupId: body.groupId, threadId: body.threadId });
    return { ok: true };
  }

  @SubscribeMessage('read')
  async onRead(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { groupId: string }) {
    const user = this.user(socket);
    await this.community.markGroupRead(user, body.groupId);
    socket.to(groupRoom(body.groupId)).emit('read', { userId: user.id, groupId: body.groupId, at: new Date().toISOString() });
    return { ok: true };
  }

  @SubscribeMessage('reaction:add')
  async onReactionAdd(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { messageId: string; emoji: string; groupId?: string; threadId?: string }) {
    const user = this.user(socket);
    const res = await this.community.addReaction(user, body.messageId, body.emoji);
    const room = body.groupId ? groupRoom(body.groupId) : body.threadId ? threadRoom(body.threadId) : null;
    if (room) this.server.to(room).emit('reaction:new', res);
    return { ok: true };
  }

  @SubscribeMessage('reaction:remove')
  async onReactionRemove(@ConnectedSocket() socket: ChatSocket, @MessageBody() body: { messageId: string; emoji: string; groupId?: string; threadId?: string }) {
    const user = this.user(socket);
    const res = await this.community.removeReaction(user, body.messageId, body.emoji);
    const room = body.groupId ? groupRoom(body.groupId) : body.threadId ? threadRoom(body.threadId) : null;
    if (room) this.server.to(room).emit('reaction:removed', res);
    return { ok: true };
  }
}
