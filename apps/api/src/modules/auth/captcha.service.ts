import { Injectable } from '@nestjs/common';

@Injectable()
export class CaptchaService {
  /**
   * 人机验证桩位，后续可接入腾讯云/阿里云等验证码服务。
   * 当前不做任何校验。
   */
  async verify(_token?: string): Promise<void> {}
}
