import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tencentcloud = require('tencentcloud-sdk-nodejs-ses');

const SesClient = tencentcloud.ses.v20201002.Client;

@Injectable()
export class EmailService {
  private client: InstanceType<typeof SesClient>;
  private from: string;
  private templateId: number;

  constructor(private config: ConfigService) {
    const secretId = this.config.getOrThrow<string>('TENCENT_SECRET_ID');
    const secretKey = this.config.getOrThrow<string>('TENCENT_SECRET_KEY');
    const region = this.config.getOrThrow<string>('TENCENT_SES_REGION');
    this.from = this.config.getOrThrow<string>('TENCENT_SES_FROM');
    this.templateId = Number(
      this.config.getOrThrow<string>('TENCENT_SES_TEMPLATE_ID'),
    );

    this.client = new SesClient({
      credential: { secretId, secretKey },
      region,
    });
  }

  async sendOtp(to: string, code: string, expireMinutes: number): Promise<void> {
    try {
      await this.client.SendEmail({
        FromEmailAddress: this.from,
        Destination: [to],
        Template: {
          TemplateID: this.templateId,
          TemplateData: JSON.stringify({ code, expire: String(expireMinutes) }),
        },
        Subject: '您的验证码',
      });
    } catch (err) {
      throw new InternalServerErrorException(
        `发送验证码邮件失败：${(err as Error).message}`,
      );
    }
  }
}
