import { Global, Module } from '@nestjs/common';
import { EmailService } from '@modules/email/email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
