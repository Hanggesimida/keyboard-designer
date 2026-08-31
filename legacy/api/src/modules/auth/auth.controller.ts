import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@modules/auth/auth.service';
import { SendOtpDto } from '@modules/auth/dto/send-otp.dto';
import { VerifyOtpDto } from '@modules/auth/dto/verify-otp.dto';
import { SetPasswordDto } from '@modules/auth/dto/set-password.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { ChangePasswordDto } from '@modules/auth/dto/change-password.dto';
import { ForgotPasswordDto } from '@modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@modules/auth/dto/reset-password.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SkipMustChangePassword } from '@modules/auth/decorators/skip-must-change-password.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';

interface SetupTokenUser {
  sub: string;
  jti: string;
}

interface ChangePasswordTokenUser {
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

  @Post('set-password')
  @UseGuards(AuthGuard('jwt-setup'))
  setPassword(
    @Req() req: { user: SetupTokenUser },
    @Body() dto: SetPasswordDto,
  ) {
    return this.authService.setPassword(req.user.sub, req.user.jti, dto);
  }

  @Post('change-initial-password')
  @SkipMustChangePassword()
  @UseGuards(AuthGuard('jwt-change-password'))
  changeInitialPassword(
    @Req() req: { user: ChangePasswordTokenUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePasswordWithToken(
      req.user.sub,
      req.user.jti,
      dto,
    );
  }

  @Post('change-password')
  @SkipMustChangePassword()
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePasswordAuthenticated(user.id, dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
