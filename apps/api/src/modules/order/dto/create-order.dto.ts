import {
  IsString,
  IsOptional,
  IsPositive,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  designId: string;

  @IsString()
  addressId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAmount: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string;
}
