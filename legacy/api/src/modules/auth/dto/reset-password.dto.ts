import { IsEmail, IsString, MinLength, MaxLength, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @Length(6, 6, { message: '验证码为 6 位数字' })
  @Matches(/^\d+$/, { message: '验证码只能包含数字' })
  otp: string;

  @IsString()
  @MinLength(8, { message: '密码长度不能少于 8 位' })
  @MaxLength(64, { message: '密码长度不能超过 64 位' })
  newPassword: string;
}
