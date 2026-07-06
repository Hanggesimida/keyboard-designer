import { ConfigService } from '@nestjs/config';

export interface AlipayConfig {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gateway: string;
  notifyUrl: string;
  returnUrl: string;
}

/** 是否已配置支付宝（用于判断是否降级 mock 支付） */
export function isAlipayEnabled(config: ConfigService): boolean {
  const appId = config.get<string>('ALIPAY_APP_ID');
  const privateKey = config.get<string>('ALIPAY_PRIVATE_KEY');
  const alipayPublicKey = config.get<string>('ALIPAY_PUBLIC_KEY');
  return Boolean(appId && privateKey && alipayPublicKey);
}

/** 读取并校验支付宝配置，未配置时抛错 */
export function getAlipayConfig(config: ConfigService): AlipayConfig {
  return {
    appId: config.getOrThrow<string>('ALIPAY_APP_ID'),
    privateKey: config.getOrThrow<string>('ALIPAY_PRIVATE_KEY'),
    alipayPublicKey: config.getOrThrow<string>('ALIPAY_PUBLIC_KEY'),
    gateway: config.get<string>(
      'ALIPAY_GATEWAY',
      'https://openapi.alipay.com/gateway.do',
    ),
    notifyUrl: config.getOrThrow<string>('ALIPAY_NOTIFY_URL'),
    returnUrl: config.get<string>('ALIPAY_RETURN_URL', ''),
  };
}
