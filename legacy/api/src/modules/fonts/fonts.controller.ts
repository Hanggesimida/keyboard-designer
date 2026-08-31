import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Role } from 'generated/prisma/enums';
import { FontsService } from './fonts.service';
import { ResolveFontsDto } from './dto/resolve-fonts.dto';

@UseGuards(JwtAuthGuard)
@Controller('fonts')
export class FontsController {
  constructor(private readonly fontsService: FontsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.fontsService.listByUser(user.id);
  }

  @Post('resolve')
  resolve(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: ResolveFontsDto,
  ) {
    return this.fontsService.resolveByIds(user.id, user.role, dto.ids ?? []);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body('displayName') displayName: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { font, created } = await this.fontsService.upload(
      user.id,
      file,
      displayName,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return font;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.fontsService.softDelete(user.id, id);
  }
}
