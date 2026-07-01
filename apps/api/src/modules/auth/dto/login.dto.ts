import { IsEmail, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
