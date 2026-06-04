import { Module } from '@nestjs/common';
import { UsersService } from '@modules/users/users.service';
import { PrismaModule } from '@prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
