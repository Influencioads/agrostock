import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { AuditService } from '../common/audit.service';
import { WalletService } from '../wallet/wallet.service';
import { Prisma } from '@prisma/client';
import { ReviewsModule, ReviewsService } from '../reviews/reviews.module';
import { TextTranslationService } from '../translation/text-translation.service';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';

const ref = () => 'LD-' + Math.floor(100 + Math.random() * 900);
const otp = () => String(Math.floor(1000 + Math.random() * 9000));
/** A worker who logs in by phone still needs a unique User.email; synthesise one. */
const syntheticEmail = (phone: string) => `w_${phone.replace(/[^0-9]/g, '')}@workers.agrotraders.local`;

// ── DTOs ────────────────────────────────────────────────────────────────
class CreateTeamDto {
  @IsString() @MaxLength(80) name!: string;
}
class UpdateTeamDto {
  @IsString() @MaxLength(80) name!: string;
}
class CreateWorkerDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) skill?: string;
  @IsOptional() @IsInt() @Min(0) dailyWageCents?: number;
  // Where the worker is based / operates, so crew appear in the directory's location filters.
  @IsOptional() @IsString() @MaxLength(120) originCity?: string;
  @IsOptional() @IsString() @MaxLength(120) originCountry?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) operatingCities?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) operatingCountries?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(24) minWorkHours?: number;
  /** When both are present, a worker login (User) is created and linked. */
  @IsOptional() @IsString() @MaxLength(120) loginHandle?: string;
  @IsOptional() @IsString() @MaxLength(72) loginPassword?: string;
}
class UpdateWorkerDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() teamId?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) skill?: string;
  @IsOptional() @IsInt() @Min(0) dailyWageCents?: number;
  @IsOptional() @IsString() @MaxLength(120) originCity?: string;
  @IsOptional() @IsString() @MaxLength(120) originCountry?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) operatingCities?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) operatingCountries?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(24) minWorkHours?: number;
  @IsOptional() @IsIn(['available', 'on_site', 'off']) status?: 'available' | 'on_site' | 'off';
}
class CreateJobDto {
  @IsString() location!: string;
  @IsOptional() @IsInt() @Min(1) workersNeeded?: number;
  @IsOptional() @IsInt() @Min(0) payCents?: number;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsDateString() neededDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() orderId?: string;
}
class AssignDto {
  @IsOptional() @IsArray() @IsString({ each: true }) workerIds?: string[];
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() workerId?: string;
}
class UnassignDto {
  @IsString() workerId!: string;
}
class JobStatusDto {
  @IsIn(['in_progress', 'pending_proof', 'completed']) status!: 'in_progress' | 'pending_proof' | 'completed';
}
class AttendanceCheckinDto {
  @IsString() workerId!: string;
  @IsString() jobId!: string;
}
class AttendanceCheckoutDto {
  @IsString() id!: string;
}
class RateDto {
  @IsString() @MaxLength(80) service!: string;
  @IsInt() @Min(0) rateCents!: number;
  @IsOptional() @IsString() @MaxLength(12) unit?: string;
}
class UpdateRateDto {
  @IsOptional() @IsString() @MaxLength(80) service?: string;
  @IsOptional() @IsInt() @Min(0) rateCents?: number;
  @IsOptional() @IsString() @MaxLength(12) unit?: string;
}
class ReviewDto {
  @IsInt() @Min(1) @Max(5) stars!: number;
  @IsOptional() @IsString() @MaxLength(600) text?: string;
}
class AvailabilityDto {
  @IsArray() cells!: { weekday: number; slot: string; available: boolean }[];
}
class WorkerAvailabilityDto {
  @IsBoolean() available!: boolean;
}

@Injectable()
export class LoadersService {
  constructor(
    private prisma: PrismaService,
    private wallets: WalletService,
    private reviewsSvc: ReviewsService,
    private text: TextTranslationService,
  ) {}

  /**
   * Release a held hire budget to the provider (worker / loader company) once
   * the linked job completes — this is how a provider actually earns money.
   * No-op for jobs that never came from a hire, or already settled.
   */
  private async releaseJobEscrow(jobId: string, tx: Prisma.TransactionClient, onlyTargetType?: 'worker' | 'loaderco') {
    const hire = await tx.hireRequest.findFirst({
      where: { loaderJobId: jobId, escrowState: 'held', ...(onlyTargetType ? { targetType: onlyTargetType } : {}) },
    });
    if (!hire || !hire.budgetCents) return;
    await this.wallets.credit(hire.targetUserId, hire.budgetCents, 'escrow_release', 'Job completed — payout', tx);
    await tx.hireRequest.update({ where: { id: hire.id }, data: { escrowState: 'released' } });
  }

  // ── teams & workers (loaderco) ──
  async teams(loadercoId: string, locale: Lang = 'en') {
    const rows = await this.prisma.team.findMany({
      where: { loadercoId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { workers: true } },
        workers: { select: { id: true, name: true, status: true, rating: true, skill: true }, orderBy: { name: 'asc' } },
      },
    });
    return this.text.localizeRows(rows, ['name'], locale);
  }
  addTeam(loadercoId: string, name: string) {
    return this.prisma.team.create({ data: { loadercoId, name } });
  }
  async updateTeam(id: string, loadercoId: string, name: string) {
    const t = await this.prisma.team.findUnique({ where: { id } });
    if (!t || t.loadercoId !== loadercoId) throw new ForbiddenException('Not your team');
    return this.prisma.team.update({ where: { id }, data: { name } });
  }
  async delTeam(id: string, loadercoId: string) {
    const t = await this.prisma.team.findUnique({ where: { id } });
    if (!t || t.loadercoId !== loadercoId) throw new ForbiddenException('Not your team');
    await this.prisma.worker.updateMany({ where: { teamId: id }, data: { teamId: null } });
    await this.prisma.loaderReview.updateMany({ where: { teamId: id }, data: { teamId: null } });
    await this.prisma.team.delete({ where: { id } });
    return { ok: true };
  }

  async workers(loadercoId: string, locale: Lang = 'en') {
    const rows = await this.prisma.worker.findMany({
      where: { loadercoId },
      orderBy: { createdAt: 'desc' },
      include: { team: { select: { id: true, name: true } }, user: { select: { id: true, email: true } } },
    });
    return this.text.localizeRows(rows, ['skill'], locale);
  }

  private async assertTeamOwned(teamId: string | undefined | null, loadercoId: string) {
    if (!teamId) return;
    const t = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!t || t.loadercoId !== loadercoId) throw new ForbiddenException('Not your team');
  }

  async addWorker(loadercoId: string, b: CreateWorkerDto) {
    await this.assertTeamOwned(b.teamId, loadercoId);
    const wantsLogin = !!(b.loginHandle && b.loginPassword);
    return this.prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (wantsLogin) {
        userId = await this.createWorkerLogin(tx, b.name, b.loginHandle!, b.loginPassword!);
      }
      return tx.worker.create({
        data: {
          loadercoId,
          name: b.name,
          teamId: b.teamId,
          phone: b.phone ?? (wantsLogin && !b.loginHandle!.includes('@') ? b.loginHandle : undefined),
          skill: b.skill,
          dailyWageCents: b.dailyWageCents,
          originCity: b.originCity,
          originCountry: b.originCountry,
          operatingCities: b.operatingCities ?? [],
          operatingCountries: b.operatingCountries ?? [],
          minWorkHours: b.minWorkHours,
          userId,
        },
        include: { team: { select: { id: true, name: true } }, user: { select: { id: true, email: true } } },
      });
    });
  }

  /** Create a worker User account. Handle may be an email or a phone number. */
  private async createWorkerLogin(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    name: string,
    handle: string,
    password: string,
  ) {
    const isEmail = handle.includes('@');
    const email = isEmail ? handle.trim().toLowerCase() : syntheticEmail(handle);
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('An account with this login already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await tx.user.create({ data: { email, passwordHash, name, role: 'worker' } });
    if (!isEmail) await tx.profile.create({ data: { userId: user.id, phone: handle } });
    return user.id;
  }

  async updateWorker(id: string, loadercoId: string, b: UpdateWorkerDto) {
    const w = await this.prisma.worker.findUnique({ where: { id } });
    if (!w || w.loadercoId !== loadercoId) throw new ForbiddenException('Not your worker');
    if (b.teamId) await this.assertTeamOwned(b.teamId, loadercoId);
    return this.prisma.worker.update({
      where: { id },
      data: {
        name: b.name,
        teamId: b.teamId === undefined ? undefined : b.teamId, // allow null to unassign
        phone: b.phone,
        skill: b.skill,
        dailyWageCents: b.dailyWageCents,
        originCity: b.originCity,
        originCountry: b.originCountry,
        operatingCities: b.operatingCities,
        operatingCountries: b.operatingCountries,
        minWorkHours: b.minWorkHours,
        status: b.status,
      },
      include: { team: { select: { id: true, name: true } }, user: { select: { id: true, email: true } } },
    });
  }

  async delWorker(id: string, loadercoId: string) {
    const w = await this.prisma.worker.findUnique({ where: { id } });
    if (!w || w.loadercoId !== loadercoId) throw new ForbiddenException();
    await this.prisma.jobAssignment.deleteMany({ where: { workerId: id } });
    await this.prisma.worker.delete({ where: { id } });
    return { ok: true };
  }

  // ── jobs ──
  createJob(userId: string, b: CreateJobDto) {
    return this.prisma.loaderJob.create({
      data: {
        reference: ref(),
        location: b.location,
        workersNeeded: b.workersNeeded ?? 1,
        payCents: b.payCents,
        cargo: b.cargo,
        neededDate: b.neededDate ? new Date(b.neededDate) : undefined,
        notes: b.notes,
        orderId: b.orderId,
        otp: otp(),
        createdById: userId,
      },
    });
  }
  async openJobs(locale: Lang = 'en') {
    const rows = await this.prisma.loaderJob.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        order: { select: { reference: true, qty: true, product: { select: { name: true } } } },
      },
    });
    return this.text.localizeRows(rows, ['cargo', 'notes'], locale);
  }
  async myJobs(loadercoId: string, locale: Lang = 'en') {
    const rows = await this.prisma.loaderJob.findMany({
      where: { loadercoId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        order: { select: { reference: true, qty: true, product: { select: { name: true } } } },
        assignments: { include: { worker: { select: { id: true, name: true, status: true } } } },
      },
    });
    return this.text.localizeRows(rows, ['cargo', 'notes'], locale);
  }
  /** Full detail for one job — viewable while open (any loaderco) or once owned. */
  async jobDetail(jobId: string, loadercoId: string, locale: Lang = 'en') {
    const job = await this.prisma.loaderJob.findUnique({
      where: { id: jobId },
      include: {
        createdBy: { select: { id: true, name: true, role: true, country: true } },
        order: {
          select: {
            reference: true,
            qty: true,
            amountCents: true,
            status: true,
            product: { select: { name: true, emoji: true, imageUrl: true } },
            buyer: { select: { name: true } },
            seller: { select: { name: true } },
          },
        },
        assignments: {
          include: { worker: { select: { id: true, name: true, status: true, skill: true, phone: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attendance: {
          include: { worker: { select: { id: true, name: true } } },
          orderBy: { checkInAt: 'desc' },
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.loadercoId && job.loadercoId !== loadercoId) throw new ForbiddenException('Not your job');
    const [localized] = await this.text.localizeRows([job], ['cargo', 'notes'], locale);
    return localized;
  }
  async claim(jobId: string, loadercoId: string) {
    const job = await this.prisma.loaderJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.loadercoId) throw new ForbiddenException('Already claimed');
    return this.prisma.loaderJob.update({ where: { id: jobId }, data: { loadercoId, status: 'assigned' } });
  }

  /** Assign one worker, several workers, or a whole team to a claimed job. */
  async assign(jobId: string, loadercoId: string, b: AssignDto) {
    const job = await this.prisma.loaderJob.findUnique({ where: { id: jobId } });
    if (!job || job.loadercoId !== loadercoId) throw new ForbiddenException('Not your job');

    const ids = new Set<string>([...(b.workerIds ?? []), ...(b.workerId ? [b.workerId] : [])]);
    if (b.teamId) {
      await this.assertTeamOwned(b.teamId, loadercoId);
      const teamWorkers = await this.prisma.worker.findMany({ where: { teamId: b.teamId, loadercoId }, select: { id: true } });
      teamWorkers.forEach((w) => ids.add(w.id));
    }
    if (ids.size === 0) throw new BadRequestException('Select at least one worker or a team');

    const owned = await this.prisma.worker.findMany({ where: { id: { in: [...ids] }, loadercoId }, select: { id: true } });
    if (owned.length === 0) throw new ForbiddenException('None of those workers belong to you');

    await this.prisma.$transaction(async (tx) => {
      for (const w of owned) {
        await tx.jobAssignment.upsert({
          where: { jobId_workerId: { jobId, workerId: w.id } },
          update: {},
          create: { jobId, workerId: w.id, status: 'assigned' },
        });
        await tx.worker.update({ where: { id: w.id }, data: { status: 'on_site' } });
      }
      if (job.status === 'assigned' || job.status === 'open') {
        await tx.loaderJob.update({ where: { id: jobId }, data: { status: 'in_progress' } });
      }
    });
    return this.myJobOne(jobId, loadercoId);
  }

  async unassign(jobId: string, loadercoId: string, workerId: string) {
    const job = await this.prisma.loaderJob.findUnique({ where: { id: jobId } });
    if (!job || job.loadercoId !== loadercoId) throw new ForbiddenException('Not your job');
    await this.prisma.jobAssignment.deleteMany({ where: { jobId, workerId } });
    await this.prisma.worker.update({ where: { id: workerId }, data: { status: 'available' } }).catch(() => undefined);
    return this.myJobOne(jobId, loadercoId);
  }

  async setJobStatus(jobId: string, loadercoId: string, status: JobStatusDto['status']) {
    const job = await this.prisma.loaderJob.findUnique({ where: { id: jobId } });
    if (!job || job.loadercoId !== loadercoId) throw new ForbiddenException('Not your job');
    await this.prisma.$transaction(async (tx) => {
      if (status === 'completed') {
        const asgs = await tx.jobAssignment.findMany({ where: { jobId }, select: { workerId: true } });
        await tx.jobAssignment.updateMany({ where: { jobId }, data: { status: 'completed' } });
        await tx.worker.updateMany({ where: { id: { in: asgs.map((a) => a.workerId) } }, data: { status: 'available' } });
        await tx.attendance.updateMany({ where: { jobId, checkOutAt: null }, data: { checkOutAt: new Date() } });
        await this.releaseJobEscrow(jobId, tx);
      }
      await tx.loaderJob.update({ where: { id: jobId }, data: { status: status as JobStatus } });
    });
    return this.myJobOne(jobId, loadercoId);
  }

  private myJobOne(jobId: string, loadercoId: string) {
    return this.prisma.loaderJob.findFirst({
      where: { id: jobId, loadercoId },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        order: { select: { reference: true, qty: true, product: { select: { name: true } } } },
        assignments: { include: { worker: { select: { id: true, name: true, status: true } } } },
      },
    });
  }

  // ── worker side ──
  private async workerFor(userId: string) {
    const w = await this.prisma.worker.findUnique({ where: { userId } });
    if (!w) throw new NotFoundException('No worker profile linked to this account');
    return w;
  }
  async workerJobs(userId: string) {
    const w = await this.workerFor(userId);
    return this.prisma.jobAssignment.findMany({
      where: { workerId: w.id },
      orderBy: { createdAt: 'desc' },
      include: { job: { include: { createdBy: { select: { name: true } } } } },
    });
  }
  async accept(assignmentId: string, userId: string) {
    const w = await this.workerFor(userId);
    const a = await this.prisma.jobAssignment.findUnique({ where: { id: assignmentId } });
    if (!a || a.workerId !== w.id) throw new ForbiddenException('Not your assignment');
    return this.prisma.jobAssignment.update({ where: { id: assignmentId }, data: { status: 'accepted' } });
  }
  async checkIn(assignmentId: string, userId: string) {
    const w = await this.workerFor(userId);
    const a = await this.prisma.jobAssignment.findUnique({ where: { id: assignmentId } });
    if (!a || a.workerId !== w.id) throw new ForbiddenException('Not your assignment');
    await this.prisma.attendance.create({ data: { jobId: a.jobId, workerId: w.id, checkInAt: new Date() } });
    await this.prisma.worker.update({ where: { id: w.id }, data: { status: 'on_site' } });
    return this.prisma.jobAssignment.update({ where: { id: assignmentId }, data: { status: 'checked_in' } });
  }
  async checkOut(assignmentId: string, userId: string) {
    const w = await this.workerFor(userId);
    const a = await this.prisma.jobAssignment.findUnique({ where: { id: assignmentId } });
    if (!a || a.workerId !== w.id) throw new ForbiddenException('Not your assignment');
    await this.prisma.$transaction(async (tx) => {
      await tx.attendance.updateMany({
        where: { jobId: a.jobId, workerId: w.id, checkOutAt: null },
        data: { checkOutAt: new Date() },
      });
      await tx.jobAssignment.update({ where: { id: assignmentId }, data: { status: 'completed' } });
      await tx.worker.update({ where: { id: w.id }, data: { status: 'available' } });
      // A direct worker hire completes on the worker's own check-out — pay them.
      await this.releaseJobEscrow(a.jobId, tx, 'worker');
    });
    return { ok: true };
  }

  /** A worker's own shift history — every check-in / check-out they logged. */
  async workerAttendance(userId: string) {
    const w = await this.workerFor(userId);
    return this.prisma.attendance.findMany({
      where: { workerId: w.id },
      orderBy: [{ checkInAt: 'desc' }, { date: 'desc' }],
      take: 60,
      include: { job: { select: { id: true, reference: true, location: true } } },
    });
  }

  /** Ratings & reviews this worker has received (unified reviews). */
  async workerReviews(userId: string) {
    // Ensure the caller actually has a worker profile, then read their reviews.
    await this.workerFor(userId);
    return this.reviewsSvc.forUser(userId, 'worker');
  }

  /** Worker toggles whether they're accepting jobs (available ↔ off). */
  async setWorkerAvailability(userId: string, available: boolean) {
    const w = await this.workerFor(userId);
    return this.prisma.worker.update({ where: { id: w.id }, data: { status: available ? 'available' : 'off' } });
  }

  // ── attendance (loaderco capture + read) ──
  attendanceList(loadercoId: string, date?: string) {
    const where: { job: { loadercoId: string }; date?: { gte: Date; lt: Date } } = { job: { loadercoId } };
    if (date) {
      const start = new Date(date);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        where.date = { gte: start, lt: end };
      }
    }
    return this.prisma.attendance.findMany({
      where,
      orderBy: { checkInAt: 'desc' },
      take: 200,
      include: {
        worker: { select: { id: true, name: true } },
        job: { select: { id: true, reference: true, location: true } },
      },
    });
  }
  async attendanceCheckin(loadercoId: string, workerId: string, jobId: string) {
    const [worker, job] = await Promise.all([
      this.prisma.worker.findUnique({ where: { id: workerId } }),
      this.prisma.loaderJob.findUnique({ where: { id: jobId } }),
    ]);
    if (!worker || worker.loadercoId !== loadercoId) throw new ForbiddenException('Not your worker');
    if (!job || job.loadercoId !== loadercoId) throw new ForbiddenException('Not your job');
    const row = await this.prisma.attendance.create({
      data: { jobId, workerId, checkInAt: new Date(), recordedById: loadercoId },
      include: { worker: { select: { id: true, name: true } }, job: { select: { id: true, reference: true, location: true } } },
    });
    await this.prisma.worker.update({ where: { id: workerId }, data: { status: 'on_site' } });
    return row;
  }
  async attendanceCheckout(loadercoId: string, id: string) {
    const row = await this.prisma.attendance.findUnique({ where: { id }, include: { job: true } });
    if (!row || row.job.loadercoId !== loadercoId) throw new ForbiddenException('Not your attendance record');
    const updated = await this.prisma.attendance.update({
      where: { id },
      data: { checkOutAt: new Date() },
      include: { worker: { select: { id: true, name: true } }, job: { select: { id: true, reference: true, location: true } } },
    });
    await this.prisma.worker.update({ where: { id: row.workerId }, data: { status: 'available' } }).catch(() => undefined);
    return updated;
  }

  // ── crew availability grid (loaderco) ──
  availability(loadercoId: string) {
    return this.prisma.crewAvailability.findMany({ where: { loadercoId } });
  }
  async setAvailability(loadercoId: string, cells: { weekday: number; slot: string; available: boolean }[]) {
    await this.prisma.$transaction(
      cells.map((c) =>
        this.prisma.crewAvailability.upsert({
          where: { loadercoId_weekday_slot: { loadercoId, weekday: c.weekday, slot: c.slot } },
          update: { available: c.available },
          create: { loadercoId, weekday: c.weekday, slot: c.slot, available: c.available },
        }),
      ),
    );
    return this.availability(loadercoId);
  }

  // ── rate card (loaderco) ──
  rates(loadercoId: string) {
    return this.prisma.loaderRate.findMany({ where: { loadercoId }, orderBy: { createdAt: 'asc' } });
  }
  addRate(loadercoId: string, b: RateDto) {
    return this.prisma.loaderRate.create({ data: { loadercoId, service: b.service, rateCents: b.rateCents, unit: b.unit ?? 'MT' } });
  }
  async updateRate(id: string, loadercoId: string, b: UpdateRateDto) {
    const r = await this.prisma.loaderRate.findUnique({ where: { id } });
    if (!r || r.loadercoId !== loadercoId) throw new ForbiddenException('Not your rate');
    return this.prisma.loaderRate.update({ where: { id }, data: { service: b.service, rateCents: b.rateCents, unit: b.unit } });
  }
  async delRate(id: string, loadercoId: string) {
    const r = await this.prisma.loaderRate.findUnique({ where: { id } });
    if (!r || r.loadercoId !== loadercoId) throw new ForbiddenException('Not your rate');
    await this.prisma.loaderRate.delete({ where: { id } });
    return { ok: true };
  }

  // ── reviews (unified) ──
  /** Star reviews received by a loader company. */
  reviews(loadercoId: string) {
    return this.reviewsSvc.forUser(loadercoId, 'loaderco');
  }
  /** Posted by the client who created the job, once it is completed. */
  reviewJob(userId: string, jobId: string, b: ReviewDto) {
    return this.reviewsSvc.createOrEdit(userId, {
      kind: 'loaderjob',
      subjectId: jobId,
      revieweeRole: 'loaderco',
      stars: b.stars,
      text: b.text,
    });
  }
}

@ApiTags('loaders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loaders')
export class LoadersController {
  constructor(private svc: LoadersService) {}

  // teams
  @Roles('loaderco') @Get('teams') teams(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.teams(u.id, locale);
  }
  @Roles('loaderco') @Post('teams') addTeam(@CurrentUser() u: AuthUser, @Body() b: CreateTeamDto) {
    return this.svc.addTeam(u.id, b.name);
  }
  @Roles('loaderco') @Patch('teams/:id') updateTeam(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: UpdateTeamDto) {
    return this.svc.updateTeam(id, u.id, b.name);
  }
  @Roles('loaderco') @Post('teams/:id/delete') delTeam(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.delTeam(id, u.id);
  }

  // workers
  @Roles('loaderco') @Get('workers') workers(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.workers(u.id, locale);
  }
  @Roles('loaderco') @Post('workers') addWorker(@CurrentUser() u: AuthUser, @Body() b: CreateWorkerDto) {
    return this.svc.addWorker(u.id, b);
  }
  @Roles('loaderco') @Patch('workers/:id') updateWorker(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: UpdateWorkerDto) {
    return this.svc.updateWorker(id, u.id, b);
  }
  @Roles('loaderco') @Post('workers/:id/delete') delWorker(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.delWorker(id, u.id);
  }

  // jobs
  @Post('jobs') createJob(@CurrentUser() u: AuthUser, @Body() b: CreateJobDto) {
    return this.svc.createJob(u.id, b);
  }
  @Roles('loaderco') @Get('jobs/open') openJobs(@Locale() locale: Lang) {
    return this.svc.openJobs(locale);
  }
  @Roles('loaderco') @Get('jobs/mine') myJobs(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.myJobs(u.id, locale);
  }
  @Roles('loaderco') @Get('jobs/:id') jobDetail(@CurrentUser() u: AuthUser, @Param('id') id: string, @Locale() locale: Lang) {
    return this.svc.jobDetail(id, u.id, locale);
  }
  @Roles('loaderco') @Post('jobs/:id/claim') claim(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.claim(id, u.id);
  }
  @Roles('loaderco') @Post('jobs/:id/assign') assign(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: AssignDto) {
    return this.svc.assign(id, u.id, b);
  }
  @Roles('loaderco') @Post('jobs/:id/unassign') unassign(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: UnassignDto) {
    return this.svc.unassign(id, u.id, b.workerId);
  }
  @Roles('loaderco') @Post('jobs/:id/status') setJobStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: JobStatusDto) {
    return this.svc.setJobStatus(id, u.id, b.status);
  }
  @Post('jobs/:id/review') reviewJob(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: ReviewDto) {
    return this.svc.reviewJob(u.id, id, b);
  }

  // availability
  @Roles('loaderco') @Get('availability') availability(@CurrentUser() u: AuthUser) {
    return this.svc.availability(u.id);
  }
  @Roles('loaderco') @Put('availability') setAvailability(@CurrentUser() u: AuthUser, @Body() b: AvailabilityDto) {
    return this.svc.setAvailability(u.id, b.cells ?? []);
  }

  // attendance
  @Roles('loaderco') @Get('attendance') attendance(@CurrentUser() u: AuthUser, @Query('date') date?: string) {
    return this.svc.attendanceList(u.id, date);
  }
  @Roles('loaderco') @Post('attendance/checkin') attendanceCheckin(@CurrentUser() u: AuthUser, @Body() b: AttendanceCheckinDto) {
    return this.svc.attendanceCheckin(u.id, b.workerId, b.jobId);
  }
  @Roles('loaderco') @Post('attendance/checkout') attendanceCheckout(@CurrentUser() u: AuthUser, @Body() b: AttendanceCheckoutDto) {
    return this.svc.attendanceCheckout(u.id, b.id);
  }

  // rates
  @Roles('loaderco') @Get('rates') rates(@CurrentUser() u: AuthUser) {
    return this.svc.rates(u.id);
  }
  @Roles('loaderco') @Post('rates') addRate(@CurrentUser() u: AuthUser, @Body() b: RateDto) {
    return this.svc.addRate(u.id, b);
  }
  @Roles('loaderco') @Patch('rates/:id') updateRate(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() b: UpdateRateDto) {
    return this.svc.updateRate(id, u.id, b);
  }
  @Roles('loaderco') @Post('rates/:id/delete') delRate(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.delRate(id, u.id);
  }

  // reviews
  @Roles('loaderco') @Get('reviews') reviews(@CurrentUser() u: AuthUser) {
    return this.svc.reviews(u.id);
  }

  // worker side
  @Roles('worker') @Get('worker/jobs') workerJobs(@CurrentUser() u: AuthUser) {
    return this.svc.workerJobs(u.id);
  }
  @Roles('worker') @Post('assignments/:id/accept') accept(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.accept(id, u.id);
  }
  @Roles('worker') @Post('assignments/:id/checkin') checkIn(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.checkIn(id, u.id);
  }
  @Roles('worker') @Post('assignments/:id/checkout') checkOut(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.checkOut(id, u.id);
  }
  @Roles('worker') @Get('worker/attendance') workerAttendance(@CurrentUser() u: AuthUser) {
    return this.svc.workerAttendance(u.id);
  }
  @Roles('worker') @Get('worker/reviews') workerReviews(@CurrentUser() u: AuthUser) {
    return this.svc.workerReviews(u.id);
  }
  @Roles('worker') @Post('worker/availability') setWorkerAvailability(@CurrentUser() u: AuthUser, @Body() b: WorkerAvailabilityDto) {
    return this.svc.setWorkerAvailability(u.id, b.available);
  }
}

/** Admin oversight of loader companies, their crews, jobs and rate cards. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@RequirePermissions('loaders_manage')
@Controller('admin/loaders')
export class AdminLoadersController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** All loader-company accounts with crew/team/job counts and listing status. */
  @Get('companies')
  async companies(@Query('search') search?: string) {
    const where: Prisma.UserWhereInput = {
      OR: [{ role: 'loaderco' }, { roles: { has: 'loaderco' } }],
    };
    if (search) {
      where.AND = [{ OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }];
    }
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        active: true,
        kycStatus: true,
        profile: { select: { listApproved: true, phone: true, whatsapp: true, location: true } },
        _count: { select: { workers: true, teams: true, loaderJobsManaged: true } },
      },
    });
  }

  @Get('companies/:id')
  async company(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        active: true,
        kycStatus: true,
        profile: true,
        workers: { orderBy: { createdAt: 'desc' }, include: { team: { select: { name: true } } } },
        teams: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { workers: true } } } },
        loaderJobsManaged: { orderBy: { createdAt: 'desc' }, take: 50 },
        loaderRates: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!user) throw new NotFoundException('Loader company not found');
    return user;
  }

  @Patch('companies/:id/listing')
  async setListing(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: { approved: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Loader company not found');
    await this.prisma.profile.upsert({
      where: { userId: id },
      update: { listApproved: !!body.approved },
      create: { userId: id, listApproved: !!body.approved },
    });
    await this.audit.log({ actorId: admin.id, action: 'loaders.listing', entityType: 'User', entityId: id, meta: { approved: !!body.approved } });
    return { ok: true, listApproved: !!body.approved };
  }

  @Patch('rates/:id')
  async updateRate(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() body: { service?: string; rateCents?: number; unit?: string }) {
    const existing = await this.prisma.loaderRate.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Rate not found');
    const updated = await this.prisma.loaderRate.update({
      where: { id },
      data: { service: body.service, rateCents: body.rateCents, unit: body.unit },
    });
    await this.audit.log({ actorId: admin.id, action: 'loaders.rate_update', entityType: 'LoaderRate', entityId: id, meta: { ...body } });
    return updated;
  }
}

@Module({
  imports: [ReviewsModule],
  controllers: [LoadersController, AdminLoadersController],
  providers: [LoadersService],
})
export class LoadersModule {}
