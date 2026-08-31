import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendOtpDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsOptional()
  @IsString()
  captchaToken?: string;
}
