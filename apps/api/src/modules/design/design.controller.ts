import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DesignService } from './design.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Role } from 'generated/prisma/enums';

@UseGuards(JwtAuthGuard)
@Controller('designs')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDesignDto,
  ) {
    return this.designService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.designService.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id') id: string,
  ) {
    return this.designService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateDesignDto,
  ) {
    return this.designService.update(id, user.id, dto);
  }

  @Post(':id/thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadThumbnail(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'image/webp' }),
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.designService.updatePreview(id, user.id, file.buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.designService.remove(id, user.id);
  }
}
