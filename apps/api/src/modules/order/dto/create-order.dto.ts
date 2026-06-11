import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  designId: string;

  @IsString()
  addressId: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  note?: string;
}
