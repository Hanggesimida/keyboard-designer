import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '@modules/users/users.service';
import { OtpService } from '@modules/auth/otp.service';
import { CaptchaService } from '@modules/auth/captcha.service';
import { RedisService } from '@redis/redis.service';
import { SendOtpDto } from '@modules/auth/dto/send-otp.dto';
import { VerifyOtpDto } from '@modules/auth/dto/verify-otp.dto';
import { SetPasswordDto } from '@modules/auth/dto/set-password.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { ChangePasswordDto } from '@modules/auth/dto/change-password.dto';
import { ForgotPasswordDto } from '@modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '@modules/auth/dto/reset-password.dto';

const SETUP_TOKEN_TTL = 600;
const CHANGE_PASSWORD_TOKEN_TTL = 600;

type AuthUser = {
  id: string;
  email: string;
  role: string;
  accountType: string;
  mustChangePassword?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private otpService: OtpService,
    private captchaService: CaptchaService,
    private redis: RedisService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    await this.captchaService.verify(dto.captchaToken);
    await this.otpService.sendOtp(dto.email);
    return { message: '验证码已发送，请查收邮件' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.email, dto.otp);

    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      this.assertActive(existingUser);
      return this.issueAuthResponse(existingUser);
    }

    const newUser = await this.usersService.create({ email: dto.email });
    const setupToken = await this.generateSetupToken(newUser.id);

    return {
      action: 'setup_password' as const,
      setupToken,
    };
  }

  async setPassword(userId: string, jti: string, dto: SetPasswordDto) {
    const key = `setup_token:${userId}`;
    const storedJti = await this.redis.get(key);

    if (!storedJti || storedJti !== jti) {
      throw new UnauthorizedException('setupToken 已失效或无效');
    }

    const user = await this.usersService.findByIdForAuth(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const updated = await this.usersService.setPassword(userId, hashed);

    await this.redis.del(key);

    return {
      action: 'logged_in' as const,
      accessToken: this.generateAccessToken(updated),
    };
  }

  async login(dto: LoginDto) {
    await this.captchaService.verify(dto.captchaToken);

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    this.assertActive(user);

    return this.issueAuthResponse(user);
  }

  async changePasswordWithToken(
    userId: string,
    jti: string,
    dto: ChangePasswordDto,
  ) {
    const key = `change_password_token:${userId}`;
    const storedJti = await this.redis.get(key);

    if (!storedJti || storedJti !== jti) {
      throw new UnauthorizedException('changePasswordToken 已失效或无效');
    }

    const user = await this.usersService.findByIdForAuth(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (!user.mustChangePassword) {
      throw new BadRequestException('当前不需要强制修改密码');
    }

    if (user.password) {
      const sameAsCurrent = await bcrypt.compare(dto.newPassword, user.password);
      if (sameAsCurrent) {
        throw new BadRequestException('新密码不能与当前密码相同');
      }
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.usersService.setPassword(userId, hashed);
    await this.redis.del(key);

    return {
      action: 'logged_in' as const,
      accessToken: this.generateAccessToken(updated),
    };
  }

  async changePasswordAuthenticated(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdForAuth(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (user.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('请输入当前密码');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) {
        throw new UnauthorizedException('当前密码错误');
      }
      const sameAsCurrent = await bcrypt.compare(
        dto.newPassword,
        user.password,
      );
      if (sameAsCurrent) {
        throw new BadRequestException('新密码不能与当前密码相同');
      }
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.usersService.setPassword(userId, hashed);

    return {
      action: 'logged_in' as const,
      accessToken: this.generateAccessToken(updated),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user?.password) {
      await this.otpService.sendOtp(dto.email);
    }
    return {
      message: '若该邮箱已注册且设置了密码，验证码将发送至您的邮箱',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.otpService.verifyOtp(dto.email, dto.otp);

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new BadRequestException('该邮箱未注册或未设置密码');
    }

    this.assertActive(user);

    if (user.password) {
      const sameAsCurrent = await bcrypt.compare(
        dto.newPassword,
        user.password,
      );
      if (sameAsCurrent) {
        throw new BadRequestException('新密码不能与当前密码相同');
      }
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.usersService.setPassword(user.id, hashed);

    return {
      action: 'logged_in' as const,
      accessToken: this.generateAccessToken(updated),
    };
  }

  private assertActive(user: { isActive: boolean }) {
    if (!user.isActive) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }
  }

  private async issueAuthResponse(user: {
    id: string;
    email: string;
    role: string;
    accountType: string;
    mustChangePassword: boolean;
  }) {
    if (user.mustChangePassword) {
      const changePasswordToken = await this.generateChangePasswordToken(
        user.id,
      );
      return {
        action: 'change_password' as const,
        changePasswordToken,
      };
    }

    return {
      accessToken: this.generateAccessToken(user),
    };
  }

  private generateAccessToken(user: AuthUser) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
    });
  }

  private async generateSetupToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const secret = this.config.getOrThrow<string>('SETUP_TOKEN_SECRET');

    await this.redis.set(`setup_token:${userId}`, jti, 'EX', SETUP_TOKEN_TTL);

    return this.jwtService.sign(
      { sub: userId, jti, purpose: 'setup_password' },
      { secret, expiresIn: `${SETUP_TOKEN_TTL}s` },
    );
  }

  private async generateChangePasswordToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const secret =
      this.config.get<string>('CHANGE_PASSWORD_TOKEN_SECRET') ??
      this.config.getOrThrow<string>('SETUP_TOKEN_SECRET');

    await this.redis.set(
      `change_password_token:${userId}`,
      jti,
      'EX',
      CHANGE_PASSWORD_TOKEN_TTL,
    );

    return this.jwtService.sign(
      { sub: userId, jti, purpose: 'change_password' },
      { secret, expiresIn: `${CHANGE_PASSWORD_TOKEN_TTL}s` },
    );
  }
}
