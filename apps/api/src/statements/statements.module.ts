import {
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { purposeSecret } from '../auth/token-purpose';

const STATEMENT_TOKEN_TTL = '5m';
const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const day = (d: Date) => d.toISOString().slice(0, 10);
const label = (type: string) => type.replace(/_/g, ' ');

interface StatementTokenPayload {
  sub: string;
  stmt: 'wallet';
  typ: 'statement_download';
}

interface Row {
  createdAt: Date;
  type: string;
  note: string | null;
  amountCents: number;
  balanceCents: number;
  who?: string;
}

/** `2026-01-31` → an end-exclusive upper bound covering the whole day. */
function toRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  const filter: Prisma.DateTimeFilter = {};
  if (from && !Number.isNaN(Date.parse(from))) filter.gte = new Date(from);
  if (to && !Number.isNaN(Date.parse(to))) {
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    filter.lt = end;
  }
  return filter.gte || filter.lt ? filter : undefined;
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

@Injectable()
export class StatementsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /** Purpose-derived key (F16): statement tokens can never pass the access strategy. */
  private secret() {
    return purposeSecret(this.config.get<string>('JWT_SECRET') || 'change-me-access-secret', 'statement_download');
  }

  async mintToken(user: AuthUser) {
    const token = await this.jwt.signAsync({ sub: user.id, stmt: 'wallet', typ: 'statement_download' } satisfies StatementTokenPayload, {
      secret: this.secret(),
      expiresIn: STATEMENT_TOKEN_TTL,
    });
    return { token, expiresIn: STATEMENT_TOKEN_TTL };
  }

  private async userFromToken(token?: string): Promise<string> {
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload = await this.jwt.verifyAsync<StatementTokenPayload>(token, { secret: this.secret() });
      if (payload.typ !== 'statement_download' || payload.stmt !== 'wallet') throw new Error('wrong subject');
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** A user's own ledger with a running balance, sliced to the date range. */
  private async userRows(userId: string, from?: string, to?: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!wallet) return { owner: { name: '—', email: '' }, currentBalanceCents: 0, rows: [] as Row[] };

    // Running balance needs the full history; the range only limits what we show.
    const all = await this.prisma.walletTx.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'asc' } });
    let balance = 0;
    const withBalance: Row[] = all.map((t) => {
      balance += t.amountCents;
      return { createdAt: t.createdAt, type: t.type, note: t.note, amountCents: t.amountCents, balanceCents: balance };
    });
    const range = toRange(from, to);
    const rows = range
      ? withBalance.filter(
          (r) => (!range.gte || r.createdAt >= (range.gte as Date)) && (!range.lt || r.createdAt < (range.lt as Date)),
        )
      : withBalance;
    return { owner: wallet.user, currentBalanceCents: wallet.balanceCents, rows };
  }

  /** Platform-wide ledger (admin export) — every wallet, newest first. */
  private async platformRows(from?: string, to?: string) {
    const createdAt = toRange(from, to);
    const txns = await this.prisma.walletTx.findMany({
      where: createdAt ? { createdAt } : {},
      orderBy: { createdAt: 'desc' },
      include: { wallet: { include: { user: { select: { name: true, role: true } } } } },
    });
    const rows: Row[] = txns.map((t) => ({
      createdAt: t.createdAt,
      type: t.type,
      note: t.note,
      amountCents: t.amountCents,
      balanceCents: t.wallet.balanceCents,
      who: `${t.wallet.user.name} (${t.wallet.user.role})`,
    }));
    return { rows };
  }

  // ── User statement (token-authed) ──────────────────────────────

  async streamUserCsv(token: string | undefined, res: Response, from?: string, to?: string) {
    const userId = await this.userFromToken(token);
    const { rows } = await this.userRows(userId, from, to);
    this.sendCsv(res, 'wallet-statement', ['Date', 'Type', 'Note', 'Amount', 'Balance'],
      rows.map((r) => [day(r.createdAt), label(r.type), r.note ?? '', (r.amountCents / 100).toFixed(2), (r.balanceCents / 100).toFixed(2)]));
  }

  async streamUserPdf(token: string | undefined, res: Response, from?: string, to?: string) {
    const userId = await this.userFromToken(token);
    const { owner, currentBalanceCents, rows } = await this.userRows(userId, from, to);
    this.renderPdf(res, {
      title: 'Wallet statement',
      subtitle: `${owner.name}${owner.email ? ` · ${owner.email}` : ''}`,
      footerBalance: `Current balance: ${usd(currentBalanceCents)}`,
      from,
      to,
      rows,
      showWho: false,
    });
  }

  // ── Admin platform statement (bearer-authed) ───────────────────

  async streamPlatformCsv(res: Response, from?: string, to?: string) {
    const { rows } = await this.platformRows(from, to);
    this.sendCsv(res, 'platform-statement', ['Date', 'User', 'Type', 'Note', 'Amount', 'Wallet balance'],
      rows.map((r) => [day(r.createdAt), r.who ?? '', label(r.type), r.note ?? '', (r.amountCents / 100).toFixed(2), (r.balanceCents / 100).toFixed(2)]));
  }

  async streamPlatformPdf(res: Response, from?: string, to?: string) {
    const { rows } = await this.platformRows(from, to);
    this.renderPdf(res, { title: 'Platform statement', subtitle: 'All wallets', from, to, rows, showWho: true });
  }

  // ── Renderers ──────────────────────────────────────────────────

  private sendCsv(res: Response, name: string, header: string[], body: (string | number)[][]) {
    const lines = [header, ...body].map((r) => r.map(csvCell).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
    res.send(lines);
  }

  private renderPdf(
    res: Response,
    opts: { title: string; subtitle: string; footerBalance?: string; from?: string; to?: string; rows: Row[]; showWho: boolean },
  ) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="statement.pdf"');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(22).fillColor('#166534').text('AgroTraders');
    doc.fontSize(9).fillColor('#6b7280').text('Agricultural trade platform');
    doc.moveDown(1.2);

    doc.fontSize(16).fillColor('#111827').text(opts.title);
    doc.fontSize(9).fillColor('#6b7280').text(opts.subtitle);
    const period = opts.from || opts.to ? `Period: ${opts.from ?? 'start'} → ${opts.to ?? 'today'}` : 'Period: all time';
    doc.text(period).text(`Generated ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown(1);

    // columns: Date [User] Type Amount Balance
    const cols = opts.showWho
      ? { date: 50, who: 120, type: 300, amount: 400, balance: 480 }
      : { date: 50, type: 200, amount: 380, balance: 480 };
    let y = doc.y + 6;
    doc.fontSize(9).fillColor('#6b7280');
    doc.text('DATE', cols.date, y);
    if (opts.showWho) doc.text('USER', (cols as { who: number }).who, y);
    doc.text('TYPE', cols.type, y).text('AMOUNT', cols.amount, y).text('BALANCE', cols.balance, y);
    y += 14;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    y += 8;

    doc.fontSize(9);
    if (opts.rows.length === 0) {
      doc.fillColor('#6b7280').text('No transactions in this period.', 50, y);
      doc.end();
      return;
    }
    for (const r of opts.rows) {
      if (y > 780) {
        doc.addPage();
        y = 50;
      }
      doc.fillColor('#111827').text(day(r.createdAt), cols.date, y, { width: 65 });
      if (opts.showWho) doc.fillColor('#111827').text(r.who ?? '', (cols as { who: number }).who, y, { width: 170 });
      doc.fillColor('#374151').text(label(r.type), cols.type, y, { width: opts.showWho ? 95 : 170 });
      doc.fillColor(r.amountCents < 0 ? '#b91c1c' : '#166534').text(usd(r.amountCents), cols.amount, y, { width: 75 });
      doc.fillColor('#111827').text(usd(r.balanceCents), cols.balance, y, { width: 65 });
      y += 16;
    }

    if (opts.footerBalance) {
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.6).fontSize(11).fillColor('#166534').text(opts.footerBalance, 50, y + 8, { align: 'right', width: 495 });
    }
    doc.end();
  }
}

@ApiTags('statements')
@Controller()
export class StatementsController {
  constructor(private statements: StatementsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('me/wallet/statement/token')
  token(@CurrentUser() u: AuthUser) {
    return this.statements.mintToken(u);
  }

  @Get('me/wallet/statement.csv')
  csv(@Query('token') token: string, @Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    return this.statements.streamUserCsv(token, res, from, to);
  }

  @Get('me/wallet/statement.pdf')
  pdf(@Query('token') token: string, @Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    return this.statements.streamUserPdf(token, res, from, to);
  }
}

@Module({
  imports: [JwtModule.register({})],
  controllers: [StatementsController],
  providers: [StatementsService],
  exports: [StatementsService],
})
export class StatementsModule {}
