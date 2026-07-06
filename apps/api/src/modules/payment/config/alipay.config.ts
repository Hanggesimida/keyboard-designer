import { ConfigService } from '@nestjs/config';

export interface AlipayConfig {
  appId: string;
  /** 应用私钥（商户侧，用于请求签名） */
  appPrivateKey: string;
  /** 支付宝公钥（平台侧，用于验签回调） */
  officialPublicKey: string;
  gateway: string;
  notifyUrl: string;
  returnUrl: string;
}

/** 是否已配置支付宝（用于判断是否降级 mock 支付） */
export function isAlipayEnabled(config: ConfigService): boolean {
  const appId = config.get<string>('ALIPAY_APP_ID');
  const appPrivateKey = config.get<string>('ALIPAY_APP_PRIVATE_KEY');
  const officialPublicKey = config.get<string>('ALIPAY_OFFICIAL_PUBLIC_KEY');
  return Boolean(appId && appPrivateKey && officialPublicKey);
}

/** 读取并校验支付宝配置，未配置时抛错 */
export function getAlipayConfig(config: ConfigService): AlipayConfig {
  return {
    appId: config.getOrThrow<string>('ALIPAY_APP_ID'),
    appPrivateKey: config.getOrThrow<string>('ALIPAY_APP_PRIVATE_KEY'),
    officialPublicKey: config.getOrThrow<string>('ALIPAY_OFFICIAL_PUBLIC_KEY'),
    gateway: config.get<string>(
      'ALIPAY_GATEWAY',
      'https://openapi.alipay.com/gateway.do',
    ),
    notifyUrl: config.getOrThrow<string>('ALIPAY_NOTIFY_URL'),
    returnUrl: config.get<string>('ALIPAY_RETURN_URL', ''),
  };
}
