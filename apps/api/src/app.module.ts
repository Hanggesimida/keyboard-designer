import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@prisma/prisma.module';
import { RedisModule } from '@redis/redis.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DesignModule } from '@modules/design/design.module';
import { AddressModule } from '@modules/address/address.module';
import { PricingModule } from '@modules/pricing/pricing.module';
import { OrderModule } from '@modules/order/order.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { AdminModule } from '@modules/admin/admin.module';
import { EmailModule } from '@modules/email/email.module';
import { CosModule } from './common/cos/cos.module';
import { FontsModule } from '@modules/fonts/fonts.module';
import { ExportModule } from '@modules/export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV ?? 'development'}`,
    }),
    CosModule,
    PrismaModule,
    RedisModule,
    EmailModule,
    AuthModule,
    DesignModule,
    FontsModule,
    ExportModule,
    AddressModule,
    PricingModule,
    OrderModule,
    PaymentModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
