import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { WalletModule } from './wallet/wallet.service';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CatalogModule } from './catalog/catalog.module';
import { AdminModule } from './admin/admin.module';
import { OrdersModule } from './orders/orders.module';
import { BuyerBidsModule } from './buyer-bids/buyer-bids.module';
import { InvoicesModule } from './invoices/invoices.module';
import { KycModule } from './kyc/kyc.module';
import { StatementsModule } from './statements/statements.module';
import { AuctionsModule } from './auctions/auctions.module';
import { TransportModule } from './transport/transport.module';
import { LoadersModule } from './loaders/loaders.module';
import { AdsModule } from './ads/ads.module';
import { DriversModule } from './drivers/drivers.module';
import { CmsModule } from './cms/cms.module';
import { BrandingModule } from './branding/branding.module';
import { MeModule } from './me/me.module';
import { MarketsModule } from './markets/markets.module';
import { DirectoryModule } from './directory/directory.module';
import { HiresModule } from './hires/hires.module';
import { FxModule } from './fx/fx.module';
import { GeoModule } from './geo/geo.module';
import { CommonModule } from './common/common.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PushModule } from './push/push.module';
import { MailModule } from './mail/mail.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { UploadsModule } from './uploads/uploads.module';
import { CommunityModule } from './community/community.module';
import { SupportModule } from './support/support.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TranslationModule } from './translation/translation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    WalletModule,
    AuthModule,
    ProductsModule,
    CatalogModule,
    AdminModule,
    OrdersModule,
    BuyerBidsModule,
    InvoicesModule,
    KycModule,
    StatementsModule,
    AuctionsModule,
    TransportModule,
    LoadersModule,
    AdsModule,
    DriversModule,
    CmsModule,
    BrandingModule,
    MeModule,
    MarketsModule,
    DirectoryModule,
    HiresModule,
    FxModule,
    GeoModule,
    // Chat systems + shared realtime/attachment/notification infrastructure.
    CommonModule,
    RealtimeModule,
    TranslationModule,
    NotificationsModule,
    PushModule,
    MailModule,
    AttachmentsModule,
    UploadsModule,
    CommunityModule,
    SupportModule,
    ReviewsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
