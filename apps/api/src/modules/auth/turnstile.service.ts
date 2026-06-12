import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TurnstileService {
  private readonly secretKey: string;

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get<string>('TURNSTILE_SECRET_KEY') ?? '';
  }

  async verify(token: string): Promise<void> {
    const formData = new URLSearchParams();
    formData.append('secret', this.secretKey);
    formData.append('response', token);

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      },
    );

    const data = (await res.json()) as { success: boolean };

    if (!data.success) {
      throw new BadRequestException('人机验证失败，请刷新后重试');
    }
  }
}
