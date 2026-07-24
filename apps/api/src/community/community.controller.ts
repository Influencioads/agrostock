import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, OptionalJwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';
import { CommunityService } from './community.service';
import {
  AdminCreateGroupDto,
  AdminUpdateGroupDto,
  BlockUserDto,
  CreateGroupDto,
  CreatePostDto,
  CreateRequirementDto,
  InviteDto,
  PinPostDto,
  ReportDto,
  ResolveReportDto,
  RespondRequirementDto,
  SendMessageDto,
} from './dto';

// Re-export: OptionalJwtAuthGuard used to live here; other modules import it.
export { OptionalJwtAuthGuard };

@ApiTags('community')
@Controller('community')
export class CommunityController {
  constructor(private community: CommunityService) {}

  // ── public reads (guests allowed) ────────────────────────────────
  @UseGuards(OptionalJwtAuthGuard)
  @Get('feed')
  feed(@CurrentUser() user: AuthUser | undefined, @Locale() locale: Lang, @Query('cursor') cursor?: string) {
    return this.community.getFeed(user, { cursor }, locale);
  }

  @Get('groups')
  groups(@Locale() locale: Lang, @Query('kind') kind?: string, @Query('search') search?: string) {
    return this.community.listGroups({ kind, search }, locale);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('groups/:id')
  group(@CurrentUser() user: AuthUser | undefined, @Param('id') id: string, @Locale() locale: Lang) {
    return this.community.getGroup(user, id, locale);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('groups/:id/messages')
  groupMessages(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id') id: string,
    @Locale() locale: Lang,
    @Query('cursor') cursor?: string,
  ) {
    return this.community.getGroupMessages(user, id, { cursor }, locale);
  }

  @Get('requirements')
  requirements(
    @Locale() locale: Lang,
    @Query('category') category?: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.community.listRequirements({ category, country, search, cursor }, locale);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('requirements/:id')
  requirement(@CurrentUser() user: AuthUser | undefined, @Param('id') id: string, @Locale() locale: Lang) {
    return this.community.getRequirement(user, id, locale);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('search')
  search(@CurrentUser() user: AuthUser | undefined, @Query('q') q: string) {
    return this.community.search(user, q ?? '');
  }

  // ── authenticated ────────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/groups')
  myGroups(@CurrentUser() user: AuthUser, @Locale() locale: Lang) {
    return this.community.myGroups(user.id, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my/saved')
  saved(@CurrentUser() user: AuthUser) {
    return this.community.savedPosts(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('groups')
  createGroup(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.community.createGroup(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('groups/:id/join')
  join(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.joinGroup(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('groups/:id/leave')
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.leaveGroup(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('groups/:id/invite')
  invite(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InviteDto) {
    return this.community.inviteUser(user, id, dto.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('groups/:id/remove')
  removeMember(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InviteDto) {
    return this.community.removeMember(user, id, dto.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('groups/:id/read')
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.markGroupRead(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Post('posts')
  createPost(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.community.createPost(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('requirements')
  createRequirement(@CurrentUser() user: AuthUser, @Body() dto: CreateRequirementDto) {
    return this.community.createRequirement(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('requirements/:id/respond')
  respond(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RespondRequirementDto) {
    return this.community.respondToRequirement(user, id, dto).then((r) => r.response);
  }

  /** REST fallback for sending a message (Socket.IO is the primary path). */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('messages')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    if (dto.groupId) {
      return this.community.sendGroupMessage(user, dto.groupId, dto.body, {
        replyToId: dto.replyToId,
        attachmentIds: dto.attachmentIds,
      });
    }
    if (dto.toUserId) {
      return this.community.sendDm(user, dto.toUserId, dto.body, { attachmentIds: dto.attachmentIds });
    }
    return { ok: false, error: 'Missing target' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('messages/:id/translation')
  messageTranslation(@CurrentUser() user: AuthUser, @Param('id') id: string, @Locale() locale: Lang) {
    return this.community.translateMessage(user, id, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('dm/:userId')
  dm(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Locale() locale: Lang,
    @Query('cursor') cursor?: string,
  ) {
    return this.community.getDmMessages(user, userId, { cursor }, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('dm/:userId/read')
  dmRead(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.community.markDmRead(user, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('unread-summary')
  unreadSummary(@CurrentUser() user: AuthUser) {
    return this.community.unreadSummary(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/save')
  save(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.savePost(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id/save')
  unsave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.unsavePost(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('report')
  report(@CurrentUser() user: AuthUser, @Body() dto: ReportDto) {
    return this.community.report(user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('block')
  block(@CurrentUser() user: AuthUser, @Body() body: BlockUserDto) {
    return this.community.block(user, body.blockedId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('unblock')
  unblock(@CurrentUser() user: AuthUser, @Body() body: BlockUserDto) {
    return this.community.unblock(user, body.blockedId);
  }

  // ── admin moderation ─────────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Get('admin/reports')
  adminReports(@Query('status') status?: string) {
    return this.community.reports(status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Post('admin/reports/:id/resolve')
  resolveReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ResolveReportDto,
  ) {
    return this.community.resolveReport(user, id, body.action, body.note);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Post('admin/messages/:id/delete')
  deleteMessage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.deleteMessage(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Get('admin/analytics')
  analytics() {
    return this.community.analytics();
  }

  // ── admin group / feed / user management ─────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Get('admin/groups')
  adminGroups() {
    return this.community.adminGroups();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Post('admin/groups')
  adminCreateGroup(@CurrentUser() user: AuthUser, @Body() body: AdminCreateGroupDto) {
    return this.community.adminCreateGroup(user, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Post('admin/groups/:id')
  adminUpdateGroup(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: AdminUpdateGroupDto) {
    return this.community.adminUpdateGroup(user, id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Delete('admin/groups/:id')
  adminDeleteGroup(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.adminDeleteGroup(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Get('admin/feed')
  adminFeed(@Query('groupId') groupId?: string) {
    return this.community.adminFeed(groupId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Post('admin/posts/:id/delete')
  adminDeletePost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.adminDeletePost(user, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Post('admin/posts/:id/pin')
  adminPinPost(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: PinPostDto) {
    return this.community.adminPinPost(user, id, !!body.pinned);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('community_moderate')
  @Post('admin/users/:id/ban')
  adminBanUser(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.community.adminBanUser(user, id);
  }
}
