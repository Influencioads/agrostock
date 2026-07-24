import {
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { Lang } from '@agrotraders/i18n';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { Locale } from '../common/locale';
import { localizeProduct } from '../products/products.module';
import { sellableWhere } from '../products/sellable';

/**
 * F02: a real per-user wishlist. The old "Saved" surfaces returned a Safe Deal
 * catalog filter instead of the buyer's own picks, and the product-card heart
 * had no handler. This owns the persistence + mutations so the client can add,
 * remove, list, and reflect saved state.
 */
@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  /**
   * The saved products themselves, newest-saved first, localized like the catalog.
   * API-10: only listings that are still sellable are returned. Without this the
   * wishlist leaked full detail (name, price, seller, attributes) for moderated /
   * hidden / rejected products that `GET /products/:slug` deliberately 404s, and
   * every such row was a dead tap in the client's Saved list.
   */
  async list(userId: string, locale: Lang = 'en') {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId, product: sellableWhere() },
      orderBy: { createdAt: 'desc' },
      select: {
        product: {
          include: {
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
            seller: { select: { id: true, name: true } },
            market: { select: { id: true, slug: true, name: true, city: true, country: true, flag: true } },
            translations: { where: { locale } },
          },
        },
      },
    });
    return rows.map((r) => localizeProduct(r.product));
  }

  /** Just the saved product ids — drives the heart toggle state on cards. */
  async ids(userId: string) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId, product: sellableWhere() },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  /**
   * Idempotent add: re-saving an already-saved product is a no-op, not an error.
   * API-10: only a sellable listing can be saved — an existence-only check let a
   * caller confirm (and then read) ids that `GET /products/:slug` hides.
   */
  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, ...sellableWhere() },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    try {
      await this.prisma.wishlistItem.create({ data: { userId, productId } });
    } catch (e) {
      // Unique (userId, productId) violation — already saved, treat as success.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
    return { saved: true };
  }

  /** Idempotent remove: deleting a product that isn't saved is a no-op. */
  async remove(userId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return { saved: false };
  }
}

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private svc: WishlistService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Locale() locale: Lang) {
    return this.svc.list(u.id, locale);
  }

  @Get('ids')
  ids(@CurrentUser() u: AuthUser) {
    return this.svc.ids(u.id);
  }

  @Post(':productId')
  add(@CurrentUser() u: AuthUser, @Param('productId') productId: string) {
    return this.svc.add(u.id, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() u: AuthUser, @Param('productId') productId: string) {
    return this.svc.remove(u.id, productId);
  }
}

@Module({
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
