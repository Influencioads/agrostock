import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { InvoiceKind, Prisma } from '@prisma/client';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { MAX_MONEY_CENTS, MAX_QTY } from '../common/limits';
import { Type } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { purposeSecret } from '../auth/token-purpose';
import { jwtAccessSecret } from '../config/secrets';
import { NotificationsService } from '../notifications/notifications.service';
import { TextTranslationService } from '../translation/text-translation.service';
import { Locale } from '../common/locale';
import type { Lang } from '@agrotraders/i18n';
import { assertLegacyFinancialWritesEnabled } from '../common/legacy-finance.guard';

const isAdmin = (u: AuthUser) => (u.roles ?? [u.role]).includes('admin');
const usd = (cents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
/** "$1,180" → 118000 cents. Fallback for orders predating `amountCents`. */
const parseCents = (s: string | null | undefined) => {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/** PDF links are opened by the OS/browser, which cannot send a bearer header. */
const PDF_TOKEN_TTL = '5m';

// ── DTOs ─────────────────────────────────────────────────────────

export class InvoiceLineDto {
  @ApiProperty() @IsString() @MaxLength(200) description!: string;
  @ApiProperty({ default: 1 }) @IsOptional() @IsNumber() @Min(0) @Max(MAX_QTY) qty?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(16) unit?: string;
  @ApiProperty() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) unitPriceCents!: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ enum: ['order', 'trip', 'loaderjob', 'assignment'] })
  @IsIn(['order', 'trip', 'loaderjob', 'assignment'])
  kind!: InvoiceKind;

  @ApiProperty({ description: 'Id of the Order / Trip / LoaderJob / JobAssignment being billed' })
  @IsString() subjectId!: string;

  @ApiProperty({ required: false, type: [InvoiceLineDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];

  @ApiProperty({ required: false, default: 0 }) @IsOptional() @IsInt() @Min(0) @Max(MAX_MONEY_CENTS) taxCents?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dueAt?: string;
  @ApiProperty({ required: false, maxLength: 600 }) @IsOptional() @IsString() @MaxLength(600) notes?: string;
}

export class UpdateInvoiceStatusDto {
  @ApiProperty({ enum: ['paid', 'void'] }) @IsIn(['paid', 'void']) status!: 'paid' | 'void';
}

const INVOICE_INCLUDE = {
  lines: { orderBy: { sort: 'asc' as const } },
  issuer: { select: { id: true, name: true, email: true, country: true } },
  recipient: { select: { id: true, name: true, email: true, country: true } },
  order: { select: { id: true, reference: true, product: { select: { name: true } } } },
} as const;

interface PdfTokenPayload {
  inv: string;
  sub: string;
  typ: 'invoice_download';
}

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private text: TextTranslationService,
  ) {}

  /**
   * Localize a batch of invoices in place: the embedded `order.product.name`, the
   * composed English line `description`s, and the free-text `notes`. All ride the
   * generic translate-on-read cache (no per-type translation table). Batched into
   * one round-trip; mutates the joined objects (same references). No-op for en.
   */
  private async localizeInvoices<
    T extends {
      notes?: string | null;
      order?: { product?: { name?: string | null } | null } | null;
      lines?: { description: string }[];
    },
  >(invoices: T[], locale: Lang): Promise<void> {
    const texts: (string | null | undefined)[] = [];
    const apply: ((v: string) => void)[] = [];
    for (const inv of invoices) {
      const product = inv.order?.product;
      if (product && typeof product.name === 'string') {
        texts.push(product.name);
        apply.push((v) => { product.name = v; });
      }
      if (typeof inv.notes === 'string') {
        texts.push(inv.notes);
        apply.push((v) => { inv.notes = v; });
      }
      for (const line of inv.lines ?? []) {
        texts.push(line.description);
        apply.push((v) => { line.description = v; });
      }
    }
    if (!texts.length) return;
    const out = await this.text.localizeMany(texts, locale);
    out.forEach((v, i) => {
      if (typeof v === 'string') apply[i](v);
    });
  }

  /** Purpose-derived key (F16): invoice tokens can never pass the access strategy. */
  private secret() {
    return purposeSecret(jwtAccessSecret(), 'invoice_download');
  }

  /**
   * Monotonic per-year sequence. An upsert-with-increment is atomic; a
   * `count() + 1` would hand two concurrent creates the same number.
   */
  private async nextNumber(tx: Prisma.TransactionClient) {
    const year = new Date().getFullYear();
    const counter = await tx.counter.upsert({
      where: { key: `invoice-${year}` },
      create: { key: `invoice-${year}`, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `INV-${year}-${String(counter.value).padStart(6, '0')}`;
  }

  /**
   * Resolve what's being billed: who receives the invoice, and a default line
   * if the issuer didn't supply one. Also enforces that the caller is the party
   * entitled to bill this subject.
   */
  private async resolveSubject(kind: InvoiceKind, subjectId: string, issuer: AuthUser) {
    switch (kind) {
      case 'order': {
        const order = await this.prisma.order.findUnique({ where: { id: subjectId }, include: { product: { select: { name: true } } } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.sellerId !== issuer.id && !isAdmin(issuer)) throw new ForbiddenException('Only the seller can invoice this order.');
        const amountCents = order.amountCents ?? parseCents(order.amount);
        return {
          recipientId: order.buyerId,
          currency: order.currency,
          link: { orderId: order.id },
          // F14: the order total is the server-authoritative amount — the issuer
          // cannot invoice for more than the committed order.
          authoritativeCents: amountCents,
          defaultLine: {
            description: `${order.product?.name ?? 'Goods'} — order ${order.reference}`,
            qty: order.qtyValue ?? 1,
            unit: order.qtyUnit ?? undefined,
            unitPriceCents: order.unitPriceCents ?? amountCents,
          },
        };
      }
      case 'trip': {
        const trip = await this.prisma.trip.findUnique({
          where: { id: subjectId },
          include: {
            order: { select: { id: true, buyerId: true, reference: true, amount: true, amountCents: true } },
            request: { include: { quotes: { where: { status: 'accepted' }, take: 1 } } },
          },
        });
        if (!trip) throw new NotFoundException('Trip not found');
        if (trip.transporterId !== issuer.id && !isAdmin(issuer)) throw new ForbiddenException('Only the assigned transporter can invoice this trip.');
        const recipientId = trip.order?.buyerId ?? trip.request?.createdById;
        if (!recipientId) throw new BadRequestException('This trip has no billable counterparty.');
        // Freight price precedence: accepted quote → dispatched order total →
        // hire budget (trips minted via hire-accept carry a request but no quote).
        let freightCents = trip.request?.quotes[0]?.priceCents ?? 0;
        if (!freightCents && trip.order) freightCents = trip.order.amountCents ?? parseCents(trip.order.amount);
        if (!freightCents && trip.requestId) {
          const hire = await this.prisma.hireRequest.findFirst({
            where: { transportRequestId: trip.requestId },
            select: { budgetCents: true },
          });
          freightCents = hire?.budgetCents ?? 0;
        }
        return {
          recipientId,
          currency: 'USD',
          link: { tripId: trip.id },
          // F14: when the freight price came from an accepted quote or the order
          // total, that's authoritative — the transporter can't inflate it.
          authoritativeCents: freightCents > 0 ? freightCents : undefined,
          defaultLine: {
            description: `Freight ${trip.fromCity} → ${trip.toCity} (${trip.reference})`,
            qty: 1,
            unit: undefined,
            unitPriceCents: freightCents,
          },
        };
      }
      case 'loaderjob': {
        const job = await this.prisma.loaderJob.findUnique({ where: { id: subjectId } });
        if (!job) throw new NotFoundException('Job not found');
        if (job.loadercoId !== issuer.id && !isAdmin(issuer)) throw new ForbiddenException('Only the assigned loader company can invoice this job.');
        return {
          recipientId: job.createdById,
          currency: 'USD',
          link: { loaderJobId: job.id },
          authoritativeCents: job.payCents ?? undefined,
          defaultLine: {
            description: `Loading crew at ${job.location} (${job.reference})`,
            qty: job.workersNeeded,
            unit: 'worker',
            unitPriceCents: job.payCents ? Math.round(job.payCents / Math.max(job.workersNeeded, 1)) : 0,
          },
        };
      }
      case 'assignment': {
        const assignment = await this.prisma.jobAssignment.findUnique({
          where: { id: subjectId },
          include: { job: true, worker: true },
        });
        if (!assignment) throw new NotFoundException('Assignment not found');
        if (assignment.worker.userId !== issuer.id && !isAdmin(issuer)) throw new ForbiddenException('Only the assigned worker can invoice this shift.');
        const recipientId = assignment.job.loadercoId ?? assignment.job.createdById;
        const shiftCents = assignment.job.payCents ? Math.round(assignment.job.payCents / Math.max(assignment.job.workersNeeded, 1)) : 0;
        return {
          recipientId,
          currency: 'USD',
          link: { jobAssignmentId: assignment.id },
          authoritativeCents: shiftCents > 0 ? shiftCents : undefined,
          defaultLine: {
            description: `Shift on job ${assignment.job.reference} at ${assignment.job.location}`,
            qty: 1,
            unit: 'shift',
            unitPriceCents: shiftCents,
          },
        };
      }
    }
  }

  async create(issuer: AuthUser, dto: CreateInvoiceDto) {
    const subject = await this.resolveSubject(dto.kind, dto.subjectId, issuer);
    if (subject.recipientId === issuer.id) throw new BadRequestException('You cannot invoice yourself.');

    const lines = (dto.lines?.length ? dto.lines : [subject.defaultLine]).map((l, i) => {
      const qty = l.qty ?? 1;
      return {
        description: l.description,
        qty,
        unit: l.unit ?? null,
        unitPriceCents: l.unitPriceCents,
        amountCents: Math.round(l.unitPriceCents * qty),
        sort: i,
      };
    });
    const subtotalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);
    if (subtotalCents <= 0) throw new BadRequestException('An invoice needs at least one priced line.');
    const taxCents = dto.taxCents ?? 0;
    const totalCents = subtotalCents + taxCents;
    // F14 / BL-06: when the subject carries a server-authoritative amount (order
    // total, accepted freight quote, job pay), the issuer cannot bill MORE than it.
    // The cap must apply to the GRAND TOTAL, not just the subtotal — otherwise an
    // unbounded `taxCents` reintroduces the inflated-total bug F14 closed.
    if (subject.authoritativeCents != null && totalCents > subject.authoritativeCents) {
      throw new BadRequestException('Invoice total cannot exceed the agreed amount for this order.');
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      const number = await this.nextNumber(tx);
      return tx.invoice.create({
        data: {
          number,
          kind: dto.kind,
          status: 'issued',
          currency: subject.currency,
          subtotalCents,
          taxCents,
          totalCents,
          notes: dto.notes,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          issuerId: issuer.id,
          recipientId: subject.recipientId,
          ...subject.link,
          lines: { create: lines },
        },
        include: INVOICE_INCLUDE,
      });
    });

    // create() persists + fans out to realtime/push/email.
    await this.notifications.create({
      userId: invoice.recipientId,
      system: 'wallet',
      type: 'wallet.invoice',
      params: { issuer: invoice.issuer.name, number: invoice.number, amount: usd(invoice.totalCents, invoice.currency) },
      data: { invoiceId: invoice.id },
      linkUrl: '/console/invoices',
    });
    return invoice;
  }

  async mine(userId: string, role?: 'issued' | 'received', locale: Lang = 'en') {
    const where =
      role === 'issued' ? { issuerId: userId } : role === 'received' ? { recipientId: userId } : { OR: [{ issuerId: userId }, { recipientId: userId }] };
    const rows = await this.prisma.invoice.findMany({ where, orderBy: { issuedAt: 'desc' }, include: INVOICE_INCLUDE });
    await this.localizeInvoices(rows, locale);
    return rows;
  }

  private async readable(id: string, userId: string, admin: boolean) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: INVOICE_INCLUDE });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!admin && invoice.issuerId !== userId && invoice.recipientId !== userId) {
      throw new ForbiddenException('Not your invoice');
    }
    return invoice;
  }

  async one(id: string, user: AuthUser, locale: Lang = 'en') {
    const invoice = await this.readable(id, user.id, isAdmin(user));
    await this.localizeInvoices([invoice], locale);
    return invoice;
  }

  async setStatus(id: string, user: AuthUser, status: 'paid' | 'void') {
    if (status === 'paid') assertLegacyFinancialWritesEnabled('Invoice payment status');
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.issuerId !== user.id && !isAdmin(user)) throw new ForbiddenException('Only the issuer can change this invoice.');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status, paidAt: status === 'paid' ? new Date() : null },
      include: INVOICE_INCLUDE,
    });
    // Tell the issuer their invoice was settled (transactional → also emails).
    if (status === 'paid') {
      await this.notifications.create({
        userId: updated.issuerId,
        system: 'wallet',
        type: 'wallet.invoice_paid',
        params: { number: updated.number, amount: usd(updated.totalCents, updated.currency) },
        data: { invoiceId: updated.id },
        linkUrl: '/console/invoices',
      });
    }
    return updated;
  }

  /**
   * Mint a short-lived, single-invoice token. The PDF route takes this in the
   * query string because mobile opens the URL through `Linking.openURL` and
   * native share sheets, neither of which can attach an Authorization header.
   */
  async pdfToken(id: string, user: AuthUser) {
    await this.readable(id, user.id, isAdmin(user));
    const token = await this.jwt.signAsync({ inv: id, sub: user.id, typ: 'invoice_download' } satisfies PdfTokenPayload, {
      secret: this.secret(),
      expiresIn: PDF_TOKEN_TTL,
    });
    return { token, expiresIn: PDF_TOKEN_TTL };
  }

  /** Verifies the query token, then re-checks the subject is still a party. */
  async forToken(id: string, token?: string) {
    if (!token) throw new UnauthorizedException('Missing token');
    let payload: PdfTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<PdfTokenPayload>(token, { secret: this.secret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (payload.typ !== 'invoice_download' || payload.inv !== id) {
      throw new UnauthorizedException('Token is not valid for this invoice');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Unknown user');
    const admin = new Set([user.role, ...user.roles]).has('admin');
    return this.readable(id, payload.sub, admin);
  }

  /** Streams the invoice straight to the response — nothing is buffered. */
  renderPdf(invoice: Awaited<ReturnType<InvoicesService['one']>>, res: Response) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    const money = (c: number) => usd(c, invoice.currency);

    doc.fontSize(22).fillColor('#166534').text('AgroTraders', { continued: false });
    doc.fontSize(9).fillColor('#6b7280').text('Agricultural trade platform');
    doc.moveDown(1.2);

    doc.fontSize(16).fillColor('#111827').text(`Invoice ${invoice.number}`);
    doc.fontSize(9).fillColor('#6b7280')
      .text(`Issued ${invoice.issuedAt.toISOString().slice(0, 10)}`)
      .text(`Status: ${invoice.status}`)
      .text(invoice.dueAt ? `Due ${invoice.dueAt.toISOString().slice(0, 10)}` : 'Due on receipt');
    doc.moveDown(1);

    const top = doc.y;
    doc.fontSize(9).fillColor('#6b7280').text('FROM', 50, top);
    doc.fontSize(11).fillColor('#111827').text(invoice.issuer.name, 50, top + 12);
    doc.fontSize(9).fillColor('#6b7280').text(invoice.issuer.email, 50, top + 27);

    doc.fontSize(9).fillColor('#6b7280').text('BILL TO', 320, top);
    doc.fontSize(11).fillColor('#111827').text(invoice.recipient.name, 320, top + 12);
    doc.fontSize(9).fillColor('#6b7280').text(invoice.recipient.email, 320, top + 27);
    doc.moveDown(3);

    // line-item table
    let y = doc.y + 10;
    doc.fontSize(9).fillColor('#6b7280');
    doc.text('DESCRIPTION', 50, y).text('QTY', 330, y).text('UNIT PRICE', 390, y).text('AMOUNT', 480, y);
    y += 14;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    y += 8;

    doc.fontSize(10).fillColor('#111827');
    for (const line of invoice.lines) {
      const height = doc.heightOfString(line.description, { width: 260 });
      doc.text(line.description, 50, y, { width: 260 });
      doc.text(`${line.qty}${line.unit ? ` ${line.unit}` : ''}`, 330, y);
      doc.text(money(line.unitPriceCents), 390, y);
      doc.text(money(line.amountCents), 480, y);
      y += Math.max(height, 12) + 8;
    }

    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    y += 10;
    doc.fontSize(10).fillColor('#6b7280').text('Subtotal', 390, y).fillColor('#111827').text(money(invoice.subtotalCents), 480, y);
    y += 16;
    doc.fillColor('#6b7280').text('Tax', 390, y).fillColor('#111827').text(money(invoice.taxCents), 480, y);
    y += 18;
    doc.fontSize(12).fillColor('#166534').text('Total', 390, y).text(money(invoice.totalCents), 480, y);

    if (invoice.notes) {
      doc.moveDown(3).fontSize(9).fillColor('#6b7280').text(invoice.notes, 50, doc.y, { width: 495 });
    }
    doc.end();
  }
}

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private invoices: InvoicesService) {}

  /**
   * Deliberately outside the controller's auth guards: authorization comes from
   * the signed `token` query param (see InvoicesService.pdfToken). Declared
   * first so `:id` never shadows it.
   */
  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    const invoice = await this.invoices.forToken(id, token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.number}.pdf"`);
    this.invoices.renderPdf(invoice, res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'transporter', 'loaderco', 'worker', 'admin')
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(u, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() u: AuthUser, @Locale() locale: Lang, @Query('role') role?: 'issued' | 'received') {
    return this.invoices.mine(u.id, role, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/pdf-token')
  pdfToken(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.invoices.pdfToken(id, u);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  setStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.invoices.setStatus(id, u, dto.status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  one(@CurrentUser() u: AuthUser, @Param('id') id: string, @Locale() locale: Lang) {
    return this.invoices.one(id, u, locale);
  }
}

@Module({
  imports: [JwtModule.register({})],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
