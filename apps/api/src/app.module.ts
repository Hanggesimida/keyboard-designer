import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DesignModule } from '@modules/design/design.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    DesignModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
