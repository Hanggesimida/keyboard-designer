import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Role } from 'generated/prisma/enums';
import { ExportService } from './export.service';
import { TextsToPathsDto } from './dto/texts-to-paths.dto';
import { GenerateJigDto } from './dto/generate-jig.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * POST /texts-to-paths
   * Body: { texts: TextDescriptor[] }
   * Response: { results: Array<{ id: string; pathD: string | null }> }
   */
  @Post('texts-to-paths')
  @HttpCode(200)
  async textsToPaths(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: TextsToPathsDto,
  ) {
    const results = await this.exportService.textsToPaths(
      user.id,
      user.role,
      dto.texts,
    );
    return { results };
  }

  /**
   * POST /generate-jig
   * Body: { design: DesignPayload }
   * Response: image/svg+xml attachment
   */
  @Post('generate-jig')
  @HttpCode(200)
  async generateJig(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: GenerateJigDto,
    @Res() res: Response,
  ) {
    const svgString = await this.exportService.generateJig(
      user.id,
      user.role,
      dto.design,
    );

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts =
      `${now.getFullYear()}-` +
      `${pad(now.getMonth() + 1)}-` +
      `${pad(now.getDate())}-` +
      `${pad(now.getHours())}` +
      `${pad(now.getMinutes())}` +
      `${pad(now.getSeconds())}`;
    const filename = `jig-${dto.design.templateId ?? 'custom'}-${ts}.svg`;

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(svgString);
  }
}
