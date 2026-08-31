import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService, type OrderRequestUser } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { BatchCreateOrderDto } from './dto/batch-create-order.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser() user: OrderRequestUser, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user, dto);
  }

  @Post('batch')
  createBatch(
    @CurrentUser() user: OrderRequestUser,
    @Body() dto: BatchCreateOrderDto,
  ) {
    return this.orderService.createBatch(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }, @Query() query: QueryOrdersDto) {
    return this.orderService.findAllByUser(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.orderService.findOne(id, user.id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.orderService.cancel(id, user.id);
  }
}
