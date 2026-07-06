import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  reason?: string;
}
