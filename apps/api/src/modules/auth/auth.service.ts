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
import { TurnstileService } from '@modules/auth/turnstile.service';
import { RedisService } from '@redis/redis.service';
import { SendOtpDto } from '@modules/auth/dto/send-otp.dto';
import { VerifyOtpDto } from '@modules/auth/dto/verify-otp.dto';
import { SetPasswordDto } from '@modules/auth/dto/set-password.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';

const SETUP_TOKEN_TTL = 600; // setupToken 有效期 10 分钟

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private otpService: OtpService,
    private turnstileService: TurnstileService,
    private redis: RedisService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    await this.turnstileService.verify(dto.turnstileToken);
    await this.otpService.sendOtp(dto.email);
    return { message: '验证码已发送，请查收邮件' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    await this.otpService.verifyOtp(dto.email, dto.otp);

    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      return {
        action: 'logged_in' as const,
        accessToken: this.generateAccessToken(existingUser),
      };
    }

    // 新用户：创建无密码账户，颁发短期 setupToken
    const newUser = await this.usersService.create({ email: dto.email });
    const setupToken = await this.generateSetupToken(newUser.id);

    return {
      action: 'setup_password' as const,
      setupToken,
    };
  }

  async setPassword(
    userId: string,
    jti: string,
    dto: SetPasswordDto,
  ) {
    const key = `setup_token:${userId}`;
    const storedJti = await this.redis.get(key);

    if (!storedJti || storedJti !== jti) {
      throw new UnauthorizedException('setupToken 已失效或无效');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const updated = await this.usersService.setPassword(userId, hashed);

    // 消耗 setupToken，保证一次性使用
    await this.redis.del(key);

    return {
      action: 'logged_in' as const,
      accessToken: this.generateAccessToken(updated),
    };
  }

  async login(dto: LoginDto) {
    if (dto.turnstileToken) {
      await this.turnstileService.verify(dto.turnstileToken);
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    return {
      accessToken: this.generateAccessToken(user),
    };
  }

  private generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
  }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
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
}
