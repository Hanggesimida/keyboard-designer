import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;
}
