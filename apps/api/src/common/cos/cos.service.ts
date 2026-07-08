import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const COS = require('cos-nodejs-sdk-v5');

@Injectable()
export class CosService {
  private readonly client: InstanceType<typeof COS>;
  private readonly bucket: string;
  private readonly region: string;
  private readonly domain: string;

  constructor(private readonly config: ConfigService) {
    this.client = new COS({
      SecretId: this.config.getOrThrow<string>('TENCENT_SECRET_ID'),
      SecretKey: this.config.getOrThrow<string>('TENCENT_SECRET_KEY'),
    });
    this.bucket = this.config.getOrThrow<string>('TENCENT_COS_BUCKET');
    this.region = this.config.getOrThrow<string>('TENCENT_COS_REGION');
    this.domain = this.config.getOrThrow<string>('TENCENT_COS_DOMAIN');
  }

  /** 根据 key 拼公网 URL；cacheBust 为缩略图等可变对象加时间戳 */
  buildPublicUrl(key: string, cacheBust = false): string {
    const baseUrl = this.domain.endsWith('/')
      ? this.domain.slice(0, -1)
      : this.domain;
    const url = `${baseUrl}/${key}`;
    return cacheBust ? `${url}?t=${Date.now()}` : url;
  }

  /** 上传 Buffer 到 COS，返回公网 URL */
  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
    options?: { cacheBust?: boolean },
  ): Promise<string> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.client.putObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          },
          (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      return this.buildPublicUrl(key, options?.cacheBust ?? true);
    } catch (err) {
      throw new InternalServerErrorException(
        `COS 上传失败：${(err as Error).message}`,
      );
    }
  }
}
