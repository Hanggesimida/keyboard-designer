import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { DesignService, type RequestUserContext } from './design.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { QueryDesignsDto } from './dto/query-designs.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('designs')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateDesignDto) {
    return this.designService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query() query: QueryDesignsDto,
  ) {
    return this.designService.findAllByUser(user.id, query.status);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUserContext, @Param('id') id: string) {
    return this.designService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateDesignDto,
  ) {
    return this.designService.update(id, user, dto);
  }

  @Patch(':id/submit')
  submit(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.designService.submit(id, user.id);
  }

  @Post(':id/thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadThumbnail(
    @CurrentUser() user: RequestUserContext,
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
    return this.designService.updatePreview(id, user, file.buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: RequestUserContext, @Param('id') id: string) {
    return this.designService.remove(id, user);
  }
}
