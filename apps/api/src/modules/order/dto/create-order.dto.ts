import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  ORDER_QUANTITY_MAX,
  ORDER_QUANTITY_MIN,
} from '../order.constants';

export class CreateOrderDto {
  @IsString()
  designId: string;

  @IsString()
  addressId: string;

  @IsOptional()
  @IsInt()
  @Min(ORDER_QUANTITY_MIN)
  @Max(ORDER_QUANTITY_MAX)
  quantity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string;
}
