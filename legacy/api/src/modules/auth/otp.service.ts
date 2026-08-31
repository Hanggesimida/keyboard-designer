import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '@redis/redis.service';
import { EmailService } from '@modules/email/email.service';

const OTP_TTL = 300;       // 验证码有效期 5 分钟
const COOLDOWN_TTL = 60;   // 发送冷却 60 秒
const MAX_ATTEMPTS = 5;    // 最大错误次数
const LOCK_TTL = 900;      // 锁定时长 15 分钟

@Injectable()
export class OtpService {
  constructor(
    private redis: RedisService,
    private emailService: EmailService,
  ) {}

  private otpKey(email: string) {
    return `otp:${email}`;
  }

  private cooldownKey(email: string) {
    return `otp:cooldown:${email}`;
  }

  private attemptsKey(email: string) {
    return `otp:attempts:${email}`;
  }

  async sendOtp(email: string): Promise<void> {
    const cooldown = await this.redis.get(this.cooldownKey(email));
    if (cooldown) {
      throw new HttpException(
        '请勿频繁发送，请 60 秒后重试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await Promise.all([
      this.redis.set(this.otpKey(email), code, 'EX', OTP_TTL),
      this.redis.set(this.cooldownKey(email), '1', 'EX', COOLDOWN_TTL),
    ]);

    await this.emailService.sendOtp(email, code, OTP_TTL / 60);
  }

  async verifyOtp(email: string, code: string): Promise<void> {
    const attemptsKey = this.attemptsKey(email);

    const attempts = await this.redis.get(attemptsKey);
    if (attempts && parseInt(attempts, 10) >= MAX_ATTEMPTS) {
      throw new HttpException(
        '验证码输入错误次数过多，请 15 分钟后重试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const stored = await this.redis.get(this.otpKey(email));
    if (!stored) {
      throw new BadRequestException('验证码不存在或已过期');
    }

    if (stored !== code) {
      const pipeline = this.redis.pipeline();
      pipeline.incr(attemptsKey);
      pipeline.expire(attemptsKey, LOCK_TTL);
      await pipeline.exec();
      throw new BadRequestException('验证码错误');
    }

    // 校验通过：删除验证码和错误计数，一次性使用
    await this.redis.del(this.otpKey(email), attemptsKey);
  }
}
