import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { SupportService } from './support.service';
import { SupportGateway } from './support.gateway';
import {
  AssignDto,
  CreateTicketDto,
  NoteDto,
  PriorityDto,
  RateDto,
  SendSupportMessageDto,
  StatusDto,
  TagDto,
  TransferDto,
} from './dto';

@ApiTags('support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(
    private support: SupportService,
    private gateway: SupportGateway,
  ) {}

  // ── user endpoints ───────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('tickets')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.gateway.createTicket(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tickets/mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.support.myTickets(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tickets/:id')
  ticket(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.getTicket(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('tickets/:id/messages')
  message(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendSupportMessageDto) {
    return this.gateway.postMessage(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:id/read')
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.support.markRead(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:id/rate')
  rate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RateDto) {
    return this.support.rate(user, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('tickets/:id/reopen')
  reopen(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gateway.reopenTicket(user, id);
  }

  // ── staff endpoints ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Get('inbox')
  inbox(@Query() q: Record<string, string>) {
    return this.support.inbox(q);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Get('agents')
  agents() {
    return this.support.listAgents();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Get('analytics')
  analytics() {
    return this.support.analytics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/assign')
  assign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AssignDto) {
    return this.gateway.assignTicket(user, id, dto.agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/transfer')
  transfer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TransferDto) {
    return this.gateway.assignTicket(user, id, dto.agentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/note')
  note(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: NoteDto) {
    return this.support.addNote(user, id, dto.body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/status')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: StatusDto) {
    return this.gateway.changeStatus(user, id, dto.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/priority')
  priority(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PriorityDto) {
    return this.gateway.setPriority(user, id, dto.priority);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/tag')
  tag(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TagDto) {
    return this.support.addTag(user, id, dto.label);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/escalate')
  escalate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gateway.changeStatus(user, id, 'escalated');
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gateway.resolveTicket(user, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @RequirePermissions('support_agent')
  @Post('tickets/:id/close')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.gateway.changeStatus(user, id, 'closed');
  }
}
