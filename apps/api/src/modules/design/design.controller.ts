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
} from '@nestjs/common';
import { DesignService } from './design.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

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
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.designService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateDesignDto,
  ) {
    return this.designService.update(id, user.id, dto);
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
