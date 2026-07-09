import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8, { message: '密码长度不能少于 8 位' })
  @MaxLength(64, { message: '密码长度不能超过 64 位' })
  newPassword: string;
}
