import { Module } from '@nestjs/common';
import { FontsModule } from '@modules/fonts/fonts.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [FontsModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
