import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { OtpService } from '@modules/auth/otp.service';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { JwtSetupStrategy } from '@modules/auth/strategies/jwt-setup.strategy';
import { CaptchaService } from '@modules/auth/captcha.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new InternalServerErrorException(
            'JWT_SECRET is not configured in environment variables',
          );
        }
        return {
          secret,
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    JwtSetupStrategy,
    CaptchaService,
  ],
})
export class AuthModule {}
