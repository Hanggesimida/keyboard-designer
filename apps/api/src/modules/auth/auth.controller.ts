import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@modules/auth/auth.service';
import { SendOtpDto } from '@modules/auth/dto/send-otp.dto';
import { VerifyOtpDto } from '@modules/auth/dto/verify-otp.dto';
import { SetPasswordDto } from '@modules/auth/dto/set-password.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';

interface SetupTokenUser {
  sub: string;
  jti: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  /**
   * 使用 setupToken（Bearer）+ 新密码完成注册，通过独立的 jwt-setup Strategy 验证
   */
  @Post('set-password')
  @UseGuards(AuthGuard('jwt-setup'))
  setPassword(
    @Req() req: { user: SetupTokenUser },
    @Body() dto: SetPasswordDto,
  ) {
    return this.authService.setPassword(req.user.sub, req.user.jti, dto);
  }
}
