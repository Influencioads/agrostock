import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsArray, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { LOCALES } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { EARNING_TYPES, WalletService } from '../wallet/wallet.service';

/** Roles a user may request self-service (admin is never requestable). */
export const REQUESTABLE_ROLES = ['buyer', 'seller', 'transporter', 'loaderco', 'worker'] as const;

export class RoleRequestDto {
  @ApiProperty({ enum: REQUESTABLE_ROLES })
  @IsIn(REQUESTABLE_ROLES as unknown as string[])
  role!: (typeof REQUESTABLE_ROLES)[number];

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/**
 * NOTE: this is a *mock* top-up — it credits the wallet with no payment gateway.
 * It exists for demo/escrow flows only and must be replaced by a real, webhook-
 * driven payment integration before any production/financial use.
 */
export class TopupDto {
  @ApiProperty({ example: 500, minimum: 1, maximum: 1_000_000 })
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  amount!: number;
}

/** Withdraw earned/available balance out to a (mock) external account. */
export class WithdrawDto {
  @ApiProperty({ example: 250, minimum: 1, maximum: 1_000_000 })
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  amount!: number;
}

/**
 * Extended profile. `phone` / `whatsapp` / `contactEmail` are PRIVATE — shown
 * only to the owner (here) and to admins; the public directory masks them.
 */
export class UpdateProfileDto {
  @ApiProperty({ required: false, maxLength: 600 }) @IsOptional() @IsString() @MaxLength(600) bio?: string;
  @ApiProperty({ required: false, example: 'Dubai, UAE' }) @IsOptional() @IsString() @MaxLength(120) location?: string;
  @ApiProperty({ required: false, example: '08:00' }) @IsOptional() @Matches(/^\d{2}:\d{2}$/, { message: 'availableFrom must be HH:MM' }) availableFrom?: string;
  @ApiProperty({ required: false, example: '20:00' }) @IsOptional() @Matches(/^\d{2}:\d{2}$/, { message: 'availableTo must be HH:MM' }) availableTo?: string;
  @ApiProperty({ required: false, example: 'GMT+4' }) @IsOptional() @IsString() @MaxLength(40) timezone?: string;
  @ApiProperty({ required: false, example: 'EN · AR' }) @IsOptional() @IsString() @MaxLength(120) languages?: string;
  @ApiProperty({ required: false, example: '🌾' }) @IsOptional() @IsString() @MaxLength(8) avatarEmoji?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() marketId?: string;
  // Operational registration data (transporters / loader companies). Editable post-signup.
  @ApiProperty({ required: false, example: 'Amritsar' }) @IsOptional() @IsString() @MaxLength(120) originCity?: string;
  @ApiProperty({ required: false, example: 'India' }) @IsOptional() @IsString() @MaxLength(120) originCountry?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) operatingCities?: string[];
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) operatingCountries?: string[];
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) supplyingCities?: string[];
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) supplyingCountries?: string[];
  @ApiProperty({ required: false, example: 4 }) @IsOptional() @IsInt() @Min(0) @Max(24) minWorkHours?: number;
  @ApiProperty({ required: false, example: 50 }) @IsOptional() @IsInt() @Min(0) minDistanceKm?: number;
  @ApiProperty({ required: false, example: 5 }) @IsOptional() @IsInt() @Min(0) minLoaders?: number;
  @ApiProperty({ required: false, example: '+971 50 123 4567' }) @IsOptional() @Matches(/^[+\d][\d\s()-]{5,24}$/, { message: 'phone must be a valid number' }) phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @Matches(/^[+\d][\d\s()-]{5,24}$/, { message: 'whatsapp must be a valid number' }) whatsapp?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() contactEmail?: string;
}

/** Persist the user's chosen UI locale so server-rendered content (notifications,
 * push, email) reaches them in the right language across devices and sessions. */
export class SetLocaleDto {
  @ApiProperty({ enum: LOCALES })
  @IsIn(LOCALES as unknown as string[])
  locale!: string;
}

/** "$1,180" → 1180 (dollars); 0 when unparseable. */
const parseAmount = (s: string | null | undefined): number => {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** Order value is realised once the buyer has committed. `shipped` is legacy. */
/** Order statuses that count as transacted revenue (money changed hands). Shared
 * so seller earnings charts and admin platform GMV stay in lockstep. */
export const EARNED_STATUSES = ['paid', 'packed', 'dispatched', 'shipped', 'in_transit', 'delivered'] as const;

/** Everything the buyer still has running. */
const ACTIVE_STATUSES = ['processing', 'paid', 'packed', 'dispatched', 'shipped', 'in_transit'] as const;

/** Prefer the numeric column; fall back to parsing the legacy display string. */
const orderDollars = (o: { amountCents: number | null; amount: string }) =>
  o.amountCents !== null ? o.amountCents / 100 : parseAmount(o.amount);

/**
 * Bucket dated amounts into the trailing `months` calendar months, returning a
 * numeric series aligned oldest→newest (matching the dashboard BarChart).
 */
export function monthlySeries(
  rows: { createdAt: Date; value: number }[],
  months: number,
): number[] {
  const now = new Date();
  const keys: string[] = [];
  const buckets: Record<string, number> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    keys.push(key);
    buckets[key] = 0;
  }
  for (const r of rows) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key in buckets) buckets[key] += r.value;
  }
  return keys.map((k) => Math.round(buckets[k]));
}

@Injectable()
export class MeService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private wallets: WalletService,
  ) {}

  /** Stores the photo as a local WebP and points the profile at it. */
  async setAvatar(userId: string, file?: Express.Multer.File) {
    const avatarUrl = await this.uploads.saveImage(file, 'avatars');
    await this.prisma.profile.upsert({
      where: { userId },
      update: { avatarUrl },
      create: { userId, avatarUrl },
    });
    return { avatarUrl };
  }

  /** Seller revenue as trailing 8- and 12-month series (dollars) for charts. */
  async revenueSeries(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { sellerId: userId, status: { in: [...EARNED_STATUSES] } },
      select: { amount: true, amountCents: true, createdAt: true },
    });
    const rows = orders.map((o) => ({ createdAt: o.createdAt, value: orderDollars(o) }));
    return { data8: monthlySeries(rows, 8), data12: monthlySeries(rows, 12) };
  }

  /**
   * Role-appropriate money series (dollars/month) powering the dashboard chart:
   * sellers see sales, buyers see spend, service roles see wallet earnings.
   */
  async moneySeries(user: AuthUser) {
    const id = user.id;
    let rows: { createdAt: Date; value: number }[] = [];
    if (user.role === 'seller') {
      const orders = await this.prisma.order.findMany({
        where: { sellerId: id, status: { in: [...EARNED_STATUSES] } },
        select: { amount: true, amountCents: true, createdAt: true },
      });
      rows = orders.map((o) => ({ createdAt: o.createdAt, value: orderDollars(o) }));
    } else if (user.role === 'buyer') {
      const orders = await this.prisma.order.findMany({
        where: { buyerId: id, status: { in: [...EARNED_STATUSES] } },
        select: { amount: true, amountCents: true, createdAt: true },
      });
      rows = orders.map((o) => ({ createdAt: o.createdAt, value: orderDollars(o) }));
    } else {
      // transporter / loaderco / worker: earnings from real work only — money
      // credited on job completion (payout / escrow_release), never top-ups.
      const txns = await this.prisma.walletTx.findMany({
        where: { wallet: { userId: id }, type: { in: EARNING_TYPES } },
        select: { amountCents: true, createdAt: true },
      });
      rows = txns.map((t) => ({ createdAt: t.createdAt, value: t.amountCents / 100 }));
    }
    return { data8: monthlySeries(rows, 8), data12: monthlySeries(rows, 12) };
  }

  async wallet(userId: string) {
    await this.wallets.ensure(userId);
    return this.prisma.wallet.findUnique({
      where: { userId },
      include: { txns: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async topup(userId: string, amountDollars: number) {
    await this.wallets.credit(userId, Math.round(amountDollars * 100), 'topup', 'Top up');
    return this.wallet(userId);
  }

  /**
   * Request a payout. Funds are NOT debited here — an admin reviews the request
   * and the debit happens on approval. Guards against requesting more than the
   * current balance minus any already-pending payouts.
   */
  async withdraw(userId: string, amountDollars: number) {
    const cents = Math.round(amountDollars * 100);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { balanceCents: true } });
    const balance = wallet?.balanceCents ?? 0;
    const pending = await this.prisma.payoutRequest.aggregate({
      where: { userId, status: 'pending' },
      _sum: { amountCents: true },
    });
    const reserved = pending._sum.amountCents ?? 0;
    if (cents <= 0) throw new BadRequestException('Enter a valid amount.');
    if (cents > balance - reserved) throw new BadRequestException('Amount exceeds your available balance.');
    await this.prisma.payoutRequest.create({ data: { userId, amountCents: cents, status: 'pending' } });
    return this.wallet(userId);
  }

  /**
   * Read-only earnings view: money actually earned from completed work
   * (payout / escrow_release credits) — never top-ups. Powers the Earnings tab.
   */
  async earnings(userId: string) {
    await this.wallets.ensure(userId);
    const txns = await this.prisma.walletTx.findMany({
      where: { wallet: { userId }, type: { in: EARNING_TYPES } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const all = await this.prisma.walletTx.findMany({
      where: { wallet: { userId }, type: { in: EARNING_TYPES } },
      select: { amountCents: true, createdAt: true },
    });
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sum = (from: Date) =>
      all.filter((t) => t.createdAt >= from).reduce((n, t) => n + t.amountCents, 0);
    return {
      earnedCents: all.reduce((n, t) => n + t.amountCents, 0),
      weekCents: sum(startOfWeek),
      monthCents: sum(startOfMonth),
      txns,
    };
  }

  /** Own profile — includes the private contact fields (owner may see them). */
  profile(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      include: { market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } } },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.marketId) {
      const market = await this.prisma.market.findUnique({ where: { id: dto.marketId } });
      if (!market) throw new BadRequestException('Unknown market');
    }
    const data = {
      bio: dto.bio,
      location: dto.location,
      availableFrom: dto.availableFrom,
      availableTo: dto.availableTo,
      timezone: dto.timezone,
      languages: dto.languages,
      avatarEmoji: dto.avatarEmoji,
      marketId: dto.marketId === '' ? null : dto.marketId,
      originCity: dto.originCity,
      originCountry: dto.originCountry,
      operatingCities: dto.operatingCities,
      operatingCountries: dto.operatingCountries,
      supplyingCities: dto.supplyingCities,
      supplyingCountries: dto.supplyingCountries,
      minWorkHours: dto.minWorkHours,
      minDistanceKm: dto.minDistanceKm,
      minLoaders: dto.minLoaders,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      contactEmail: dto.contactEmail,
    };
    return this.prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
      include: { market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } } },
    });
  }

  /** Save the user's preferred UI locale (drives server-rendered notification text). */
  setLocale(userId: string, locale: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { locale },
      select: { id: true, locale: true },
    });
  }

  myRoleRequests(userId: string) {
    return this.prisma.roleRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRoleRequest(user: AuthUser, role: string, note?: string) {
    if (user.roles.includes(role)) {
      throw new BadRequestException('You already have access to this role.');
    }
    const pending = await this.prisma.roleRequest.findFirst({
      where: { userId: user.id, role: role as Role, status: 'pending' },
    });
    if (pending) throw new BadRequestException('You already have a pending request for this role.');
    return this.prisma.roleRequest.create({
      data: { userId: user.id, role: role as Role, note },
    });
  }

  /** Role-specific KPI numbers for the console header cards. */
  async dashboard(user: AuthUser) {
    const id = user.id;
    switch (user.role) {
      case 'seller': {
        const [products, orders] = await Promise.all([
          this.prisma.product.count({ where: { sellerId: id } }),
          this.prisma.order.count({ where: { sellerId: id } }),
        ]);
        return { kpis: { products, orders } };
      }
      case 'buyer': {
        const [orders, active, bids, rfqs] = await Promise.all([
          this.prisma.order.count({ where: { buyerId: id } }),
          this.prisma.order.count({ where: { buyerId: id, status: { in: [...ACTIVE_STATUSES] } } }),
          this.prisma.auctionBid.count({ where: { bidderId: id } }),
          this.prisma.buyerBid.count({ where: { buyerId: id, status: 'open' } }),
        ]);
        // `bids`/`rfqs` are the dashboard display contract, not DB names — kept stable.
        return { kpis: { orders, active, bids, rfqs } };
      }
      case 'transporter': {
        const [trips, requests, vehicles] = await Promise.all([
          this.prisma.trip.count({ where: { transporterId: id } }),
          this.prisma.transportRequest.count({ where: { status: { in: ['open', 'quoted'] } } }),
          this.prisma.vehicle.count({ where: { ownerId: id } }),
        ]);
        return { kpis: { trips, requests, vehicles } };
      }
      case 'loaderco': {
        const [workers, teams, jobs] = await Promise.all([
          this.prisma.worker.count({ where: { loadercoId: id } }),
          this.prisma.team.count({ where: { loadercoId: id } }),
          this.prisma.loaderJob.count({ where: { loadercoId: id } }),
        ]);
        return { kpis: { workers, teams, jobs } };
      }
      case 'worker': {
        const w = await this.prisma.worker.findUnique({ where: { userId: id } });
        const [assignments, completed, earned] = await Promise.all([
          w ? this.prisma.jobAssignment.count({ where: { workerId: w.id } }) : 0,
          w ? this.prisma.jobAssignment.count({ where: { workerId: w.id, status: 'completed' } }) : 0,
          this.prisma.walletTx.aggregate({
            _sum: { amountCents: true },
            where: { wallet: { userId: id }, type: { in: EARNING_TYPES } },
          }),
        ]);
        return {
          kpis: { assignments, completed, earnedCents: earned._sum.amountCents ?? 0 },
          rating: w?.rating ? Number(w.rating) : 0,
          available: (w?.status ?? 'off') !== 'off',
        };
      }
      default:
        return { kpis: {} };
    }
  }
}

@ApiTags('me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private svc: MeService) {}

  @Get('wallet')
  wallet(@CurrentUser() u: AuthUser) {
    return this.svc.wallet(u.id);
  }
  @Post('wallet/topup')
  topup(@CurrentUser() u: AuthUser, @Body() b: TopupDto) {
    return this.svc.topup(u.id, b.amount);
  }
  @Post('wallet/withdraw')
  withdraw(@CurrentUser() u: AuthUser, @Body() b: WithdrawDto) {
    return this.svc.withdraw(u.id, b.amount);
  }
  @Get('earnings')
  earnings(@CurrentUser() u: AuthUser) {
    return this.svc.earnings(u.id);
  }
  @Get('dashboard')
  dashboard(@CurrentUser() u: AuthUser) {
    return this.svc.dashboard(u);
  }
  @Get('analytics/revenue')
  revenue(@CurrentUser() u: AuthUser) {
    return this.svc.revenueSeries(u.id);
  }
  @Get('analytics/series')
  series(@CurrentUser() u: AuthUser) {
    return this.svc.moneySeries(u);
  }

  @Get('profile')
  profile(@CurrentUser() u: AuthUser) {
    return this.svc.profile(u.id);
  }

  @Put('profile')
  updateProfile(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.svc.updateProfile(u.id, dto);
  }

  @ApiConsumes('multipart/form-data')
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@CurrentUser() u: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    return this.svc.setAvatar(u.id, file);
  }

  @Put('locale')
  setLocale(@CurrentUser() u: AuthUser, @Body() dto: SetLocaleDto) {
    return this.svc.setLocale(u.id, dto.locale);
  }

  @Get('role-requests')
  roleRequests(@CurrentUser() u: AuthUser) {
    return this.svc.myRoleRequests(u.id);
  }

  @Post('role-requests')
  requestRole(@CurrentUser() u: AuthUser, @Body() dto: RoleRequestDto) {
    return this.svc.createRoleRequest(u, dto.role, dto.note);
  }
}

@Module({ controllers: [MeController], providers: [MeService] })
export class MeModule {}
