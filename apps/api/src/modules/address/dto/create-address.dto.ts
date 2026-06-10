import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MaxLength(50)
  name: string; // 收件人姓名

  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @IsString()
  @MaxLength(50)
  province: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsString()
  @MaxLength(50)
  district: string;

  @IsString()
  @MaxLength(200)
  detail: string; // 详细地址

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
