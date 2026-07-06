# 微信支付接入文档

> 技术栈：Next.js（前端）+ NestJS（后端）+ wechatpay-node-v3（微信支付 API v3 SDK）+ PostgreSQL（订单存储）

---

## 一、方案概述

### 设计决策

采用**微信 Native 支付（PC 端扫码）**模式：用户在结账页选择「微信支付」后，后端调用微信支付 `POST /v3/pay/transactions/native` 接口，返回 `code_url`；前端展示二维码，用户用微信 App 扫码完成付款。支付完成后，微信通过异步通知（`notify_url`）回调后端更新订单状态。 

| 环境 | 支付链路 | 说明 |
|------|----------|------|
| 开发/测试 | `mock-callback` 自动完成 | 不调用微信，本地联调无障碍 |
| 生产 | 真实微信支付 → 异步回调 | WechatProvider 实现后自动接管 |

> 架构上，`PaymentService` 通过 `IPaymentProvider` 接口与具体渠道解耦，只需实现 `WechatProvider` 中的三个方法，并补全 `handleWechatNotify` / `refundByAdmin` 中的微信分支，**不改动 Controller 路由与前端结账流程骨架**。

### 与支付宝的差异

| 项目 | 支付宝（已实现） | 微信支付（待接入） |
|------|------------------|-------------------|
| PC 端交互 | HTML 表单跳转收银台 | 展示二维码，App 扫码 |
| 返回给前端 | `payData.formHtml` | `payData.codeUrl` |
| 回调格式 | `application/x-www-form-urlencoded` | `application/json`（资源字段 AES 加密） |
| 回调响应 | 纯文本 `"success"` | JSON `{ "code": "SUCCESS", "message": "成功" }` |
| 金额单位 | 元（字符串，如 `"99.00"`） | **分**（整数，如 `9900`） |
| 验签 | RSA2，body 可直接解析 | API v3 证书验签 + 解密 `resource` |
| raw body | 默认 body-parser 即可 | **必须保留原始请求体**用于验签 |

### 完整接口清单

```
POST /payments/initiate       发起支付（需 JWT）→ 返回 codeUrl 供前端生成二维码
POST /payments/wechat/notify  微信异步回调（无需 JWT，微信服务器调用）
```

### 核心流程

```
用户在结账页选择「微信支付」→ 点击「立即支付」
    ↓
前端：POST /orders { designId, addressId }
    ↓
后端：创建 Order（status=PENDING）→ 返回 { id, orderNo, totalAmount }
    ↓
前端：POST /payments/initiate { orderId, method: "WECHAT" }
    ↓
后端：创建 Payment 记录 → 调用 WechatProvider.createPayment
    ↓
WechatProvider：调用 /v3/pay/transactions/native → 返回 { payData: { codeUrl } }
    ↓
前端：展示二维码（codeUrl），用户微信扫码付款
    ↓
微信：POST /payments/wechat/notify（异步，JSON + 签名头）
    ↓
后端：WechatProvider.verifyCallback 验签 + 解密 → 解析 out_trade_no → paymentId
    ↓
PaymentService：更新 Payment(PAID) + Order(PAID) + 推送管理员通知
    ↓
后端返回 JSON { "code": "SUCCESS", "message": "成功" }
    ↓
前端轮询 GET /orders/:id，检测到 PAID 后跳转订单详情
```

### 现有桩位说明

| 文件 | 现状 | 接入后的变化 |
|------|------|-------------|
| `payment/providers/wechat.provider.ts` | `createPayment` / `verifyCallback` / `refund` 均抛 `ServiceUnavailableException` | **核心实现文件** |
| `payment/config/wechat.config.ts` | 不存在 | 新增，对齐 `alipay.config.ts` 模式 |
| `payment/payment.service.ts` | `createProviderPayment` 仅判断 `isAlipayEnabled`；`handleWechatNotify` 仅验签占位；`refundByAdmin` 仅支持支付宝 | 补充微信启用判断、回调落库、退款分支 |
| `payment/payment.controller.ts` | `wechatNotify` 已预留路由 | 需传入 **raw body** 与签名头 |
| `apps/web/lib/payment/wechat.ts` | 不存在 | 新增二维码展示与轮询逻辑 |
| `apps/web/hooks/queries/payments/usePayOrder.ts` | 仅处理支付宝 | 增加微信分支 |

---

## 二、微信支付商户平台配置

### 2.1 开通商户号

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com)，完成企业主体认证并获取 **商户号（mchid）**。
2. 在「产品中心」→「我的产品」中开通 **Native 支付**（扫码支付）。
3. 记录商户号，后续写入环境变量 `WECHAT_MCH_ID`。

### 2.2 关联 AppID

Native 支付需要绑定一个 **AppID**，常见来源：

| AppID 类型 | 适用场景 | 获取位置 |
|------------|----------|----------|
| 微信开放平台 · 网站应用 | PC 网站扫码支付（**推荐**） | [微信开放平台](https://open.weixin.qq.com) |
| 公众号 | 已有认证服务号且已关联商户号 | 公众平台 → 开发 → 基本配置 |
| 小程序 | 仅小程序内支付 | 小程序后台 |

> 在商户平台「产品中心」→「AppID 账号管理」中，将 AppID 与商户号完成绑定。

### 2.3 配置 API 证书与密钥

微信支付 API v3 使用商户 API 证书 + API v3 密钥：

1. 商户平台 →「账户中心」→「API 安全」→ 申请 **API 证书**，下载后得到：
   - `apiclient_key.pem`（商户私钥，用于请求签名）
   - `apiclient_cert.pem`（商户证书，可选备份）
2. 在同一页面设置 **API v3 密钥**（32 位字符串），用于解密回调通知中的 `resource` 字段。
3. 在「账户中心」→「API 安全」→「平台证书」中下载/刷新 **微信支付平台证书**（用于验签回调），或通过 SDK 自动拉取。

> **安全提示**：私钥与 API v3 密钥永远不要提交到 Git。生产环境建议通过 Docker secret 或密钥管理服务注入。

### 2.4 配置通知地址

Native 下单时的 `notify_url` 由后端在每次请求中传入，无需在商户平台单独配置固定地址，但需确保：

- 地址公网可访问，如 `https://jinwenkey.com/api/payments/wechat/notify`
- 使用 HTTPS（微信生产环境强制要求）
- 本地开发可用 [ngrok](https://ngrok.com) 或 [cpolar](https://cpolar.com) 暴露端口

### 2.5 沙箱与联调

微信支付 API v3 **没有独立的沙箱网关**，联调方式：

1. 使用真实商户号 + **0.01 元**小额订单测试。
2. 在商户平台「开发配置」中将自己的微信号设为 **支付体验者**。
3. 关注回调日志与商户平台的「交易中心」→「交易记录」核对状态。

---

## 三、后端接入步骤

### 3.1 安装依赖

```bash
# 在 apps/api 目录下
cd apps/api
npm install wechatpay-node-v3
```

`wechatpay-node-v3` 封装了 API v3 签名、验签、Native 下单、退款等常用能力。

### 3.2 添加环境变量

在 `apps/api/.env.development`（本地）和生产 `.env` / `docker-compose.yml` 中添加：

```env
# 微信支付（Native 扫码）
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
# 商户 API 私钥（apiclient_key.pem 内容，换行用 \n 转义）
WECHAT_MCH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# API v3 密钥（32 位，商户平台设置）
WECHAT_API_V3_KEY=your-32-char-apiv3-key-here1234
WECHAT_NOTIFY_URL=https://your-domain.com/api/payments/wechat/notify
# 可选：商户证书序列号（不填时 SDK 可从私钥推导）
# WECHAT_MCH_SERIAL_NO=XXXXXXXX
```

同时在 `docker-compose.yml` 的 `api` 服务 environment 中追加对应变量（参考现有 `ALIPAY_*` 写法）。

### 3.3 新增 wechat.config.ts

创建 `apps/api/src/modules/payment/config/wechat.config.ts`：

```typescript
import { ConfigService } from '@nestjs/config';

export interface WechatConfig {
  appId: string;
  mchId: string;
  mchPrivateKey: string;
  apiV3Key: string;
  notifyUrl: string;
  mchSerialNo?: string;
}

/** 是否已配置微信支付（用于判断是否降级 mock 支付） */
export function isWechatEnabled(config: ConfigService): boolean {
  const appId = config.get<string>('WECHAT_APP_ID');
  const mchId = config.get<string>('WECHAT_MCH_ID');
  const mchPrivateKey = config.get<string>('WECHAT_MCH_PRIVATE_KEY');
  const apiV3Key = config.get<string>('WECHAT_API_V3_KEY');
  return Boolean(appId && mchId && mchPrivateKey && apiV3Key);
}

export function getWechatConfig(config: ConfigService): WechatConfig {
  return {
    appId: config.getOrThrow<string>('WECHAT_APP_ID'),
    mchId: config.getOrThrow<string>('WECHAT_MCH_ID'),
    mchPrivateKey: config.getOrThrow<string>('WECHAT_MCH_PRIVATE_KEY'),
    apiV3Key: config.getOrThrow<string>('WECHAT_API_V3_KEY'),
    notifyUrl: config.getOrThrow<string>('WECHAT_NOTIFY_URL'),
    mchSerialNo: config.get<string>('WECHAT_MCH_SERIAL_NO'),
  };
}

/** 将 Decimal 元转为微信要求的整数分 */
export function yuanToFen(amount: { toString(): string }): number {
  return Math.round(parseFloat(amount.toString()) * 100);
}
```

### 3.4 实现 WechatProvider

编辑现有桩位文件 `apps/api/src/modules/payment/providers/wechat.provider.ts`：

```typescript
import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WxPay from 'wechatpay-node-v3';
import type { Order, Payment } from 'generated/prisma/client';
import {
  getWechatConfig,
  isWechatEnabled,
  yuanToFen,
} from '../config/wechat.config';
import type {
  IPaymentProvider,
  PaymentResult,
  VerifyResult,
  RefundOptions,
  RefundResult,
} from './payment-provider.interface';

/** 微信回调解密后的交易结构 */
interface WechatTransactionResource {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  amount?: { total: number; payer_total?: number };
}

@Injectable()
export class WechatProvider implements IPaymentProvider {
  private client: WxPay | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): WxPay {
    if (!isWechatEnabled(this.config)) {
      throw new ServiceUnavailableException('微信支付未配置');
    }

    if (!this.client) {
      const cfg = getWechatConfig(this.config);
      this.client = new WxPay({
        appid: cfg.appId,
        mchid: cfg.mchId,
        publicKey: Buffer.from(''), // SDK 会通过平台证书接口拉取；也可传入本地平台公钥
        privateKey: Buffer.from(cfg.mchPrivateKey),
        key: cfg.apiV3Key,
        serial_no: cfg.mchSerialNo,
      });
    }

    return this.client;
  }

  /**
   * Native 下单，返回 code_url 供前端生成二维码。
   */
  async createPayment(order: Order, payment: Payment): Promise<PaymentResult> {
    const cfg = getWechatConfig(this.config);
    const client = this.getClient();

    try {
      const result = (await client.transactions_native({
        appid: cfg.appId,
        mchid: cfg.mchId,
        description: `烬炆定制键帽 ${order.orderNo}`,
        out_trade_no: payment.id,
        notify_url: cfg.notifyUrl,
        amount: {
          total: yuanToFen(payment.amount),
          currency: 'CNY',
        },
      })) as { code_url?: string; status?: number; data?: { code_url?: string } };

      const codeUrl = result.code_url ?? result.data?.code_url;
      if (!codeUrl) {
        throw new Error('微信未返回 code_url');
      }

      return { payData: { codeUrl } };
    } catch (err) {
      throw new ServiceUnavailableException(
        `微信支付发起失败：${(err as Error).message}`,
      );
    }
  }

  /**
   * 验签并解密微信异步通知。
   * controller 需传入 rawBody（字符串）与签名相关请求头。
   */
  async verifyCallback(payload: {
    rawBody: string | Buffer;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<VerifyResult> {
    const cfg = getWechatConfig(this.config);
    const client = this.getClient();

    const timestamp = String(payload.headers['wechatpay-timestamp'] ?? '');
    const nonce = String(payload.headers['wechatpay-nonce'] ?? '');
    const signature = String(payload.headers['wechatpay-signature'] ?? '');
    const serial = String(payload.headers['wechatpay-serial'] ?? '');

    const bodyStr =
      typeof payload.rawBody === 'string'
        ? payload.rawBody
        : payload.rawBody.toString('utf8');

    const verified = await client.verifySign({
      timestamp,
      nonce,
      body: bodyStr,
      serial,
      signature,
    });

    if (!verified) {
      throw new BadRequestException('微信回调验签失败');
    }

    const envelope = JSON.parse(bodyStr) as {
      resource: {
        ciphertext: string;
        associated_data: string;
        nonce: string;
      };
    };

    const decrypted = client.decipher_gcm<{ out_trade_no: string; trade_state: string }>(
      envelope.resource.ciphertext,
      envelope.resource.associated_data,
      envelope.resource.nonce,
      cfg.apiV3Key,
    );

    const paymentId = decrypted.out_trade_no ?? '';

    if (decrypted.trade_state !== 'SUCCESS') {
      return { success: false, paymentId };
    }

    return { success: true, paymentId };
  }

  async refund(payment: Payment, options: RefundOptions): Promise<RefundResult> {
    const cfg = getWechatConfig(this.config);
    const client = this.getClient();

    if (!payment.thirdPartyId) {
      throw new BadRequestException('缺少微信交易号，无法退款');
    }

    try {
      const result = (await client.refunds({
        out_trade_no: payment.id,
        out_refund_no: options.outRequestNo,
        reason: options.reason,
        amount: {
          refund: yuanToFen({ toString: () => options.amount }),
          total: yuanToFen(payment.amount),
          currency: 'CNY',
        },
      })) as Record<string, unknown>;

      const status = result.status ?? (result as { data?: { status?: string } }).data?.status;
      const success = status === 'SUCCESS' || status === 'PROCESSING';

      return { success, rawResponse: result };
    } catch (err) {
      throw new ServiceUnavailableException(
        `微信退款失败：${(err as Error).message}`,
      );
    }
  }
}
```

> **说明**：不同版本的 `wechatpay-node-v3` 方法名可能略有差异（如 `transactions_native` vs `native`），请以安装版本的 TypeScript 类型定义为准微调。若 SDK 验签需本地平台证书，可将 `publicKey` 设为平台证书 PEM 内容。

### 3.5 保留 raw body（微信回调验签必需）

微信 API v3 验签依赖**未经 JSON 解析的原始请求体**。在 `apps/api/src/main.ts` 中为回调路由启用 raw body：

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // 微信回调：保留 raw body
  app.use('/payments/wechat/notify', express.raw({ type: 'application/json' }));

  // 其余路由：常规 JSON / urlencoded 解析
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? false
        : (process.env.CORS_ORIGIN ?? 'http://localhost:3000'),
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

### 3.6 更新 PaymentController 微信回调

```typescript
@Post('wechat/notify')
@HttpCode(HttpStatus.OK)
wechatNotify(@Req() req: RawBodyRequest<Request>) {
  return this.paymentService.handleWechatNotify({
    rawBody: req.rawBody ?? req.body,
    headers: req.headers,
  });
}
```

需在文件顶部引入 `RawBodyRequest`（`@nestjs/common`）与 Express `Request` 类型。

### 3.7 补全 PaymentService

#### 3.7.1 createProviderPayment 支持微信

将 `createProviderPayment` 中的启用判断扩展为：

```typescript
import { isWechatEnabled } from './config/wechat.config';

private async createProviderPayment(/* ... */) {
  const useAlipay =
    method === PaymentMethod.ALIPAY && isAlipayEnabled(this.config);
  const useWechat =
    method === PaymentMethod.WECHAT && isWechatEnabled(this.config);

  if (!useAlipay && !useWechat) {
    return this.buildInitiateResponse(payment.id, method);
  }

  try {
    const provider =
      method === PaymentMethod.ALIPAY
        ? this.alipayProvider
        : this.wechatProvider;
    // ... 其余不变
  } catch {
    return this.buildInitiateResponse(payment.id, method);
  }
}
```

#### 3.7.2 handleWechatNotify 落库逻辑

参照 `handleAlipayNotify`，补全订单状态更新：

```typescript
async handleWechatNotify(payload: {
  rawBody: string | Buffer;
  headers: Record<string, string | string[] | undefined>;
}) {
  const result = await this.wechatProvider.verifyCallback(payload);

  if (!result.success) {
    return { code: 'SUCCESS', message: '成功' };
  }

  const payment = await this.prisma.payment.findUnique({
    where: { id: result.paymentId },
    include: { order: true },
  });

  if (!payment) {
    return { code: 'SUCCESS', message: '成功' };
  }

  if (payment.status === PaymentStatus.PAID) {
    return { code: 'SUCCESS', message: '成功' };
  }

  // 解密后的 transaction_id 需从 verifyCallback 扩展返回，或在此二次解析 rawBody
  const bodyStr =
    typeof payload.rawBody === 'string'
      ? payload.rawBody
      : payload.rawBody.toString('utf8');

  const [, updatedOrder] = await this.prisma.$transaction([
    this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        thirdPartyId: extractWechatTransactionId(bodyStr), // 见下方辅助函数
        thirdPartyData: JSON.parse(bodyStr) as Prisma.InputJsonValue,
      },
    }),
    this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID, paidAt: new Date() },
    }),
  ]);

  this.notifyOrderPaid(updatedOrder).catch(() => {});

  return { code: 'SUCCESS', message: '成功' };
}
```

建议在 `VerifyResult` 中扩展 `thirdPartyId?: string`，在 `verifyCallback` 解密后直接返回 `transaction_id`，避免 Service 层重复解密。

#### 3.7.3 refundByAdmin 支持微信

将 `refundByAdmin` 中「仅支持支付宝」的限制改为按 `payment.method` 分发：

```typescript
if (payment.method === PaymentMethod.ALIPAY) {
  refundResult = await this.alipayProvider.refund(payment, { amount: refundAmount, outRequestNo, reason });
} else if (payment.method === PaymentMethod.WECHAT) {
  refundResult = await this.wechatProvider.refund(payment, { amount: refundAmount, outRequestNo, reason });
} else {
  throw new BadRequestException('不支持的支付方式');
}
```

微信退款为异步时，`status === 'PROCESSING'` 也可视为受理成功，后续可通过退款回调或主动查询确认最终状态（首版可只做同步受理）。

---

## 四、前端接入步骤

### 4.1 扩展 InitiatePaymentResult 类型

在 `apps/web/lib/api/payments.ts` 中：

```typescript
export interface InitiatePaymentResult {
  paymentId: string;
  method: PaymentMethod;
  payData?: {
    formHtml?: string;  // 支付宝
    codeUrl?: string;   // 微信 Native 二维码链接
  };
  mockPayUrl?: string;
  tip?: string;
}
```

### 4.2 新增 wechat.ts 工具

创建 `apps/web/lib/payment/wechat.ts`：

```typescript
import type { InitiatePaymentResult } from '@/lib/api/payments';

/** 判断是否为真实微信支付（Native 扫码） */
export function isRealWechatPayment(result: InitiatePaymentResult): boolean {
  return Boolean(result.payData?.codeUrl);
}

/**
 * 将 code_url 转为二维码图片 URL（无需额外依赖）
 * 生产环境也可改用 qrcode.react 等组件在本地渲染。
 */
export function wechatCodeUrlToQrImage(codeUrl: string, size = 240): string {
  const encoded = encodeURIComponent(codeUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}
```

> 若不想依赖第三方 QR 服务，可安装 `qrcode.react` 在页面内渲染二维码。

### 4.3 更新 usePayOrder

在 `apps/web/hooks/queries/payments/usePayOrder.ts` 中增加微信分支。微信 Native 支付需要**弹层展示二维码**（与支付宝新窗口跳转不同），建议：

1. `initiatePayment` 返回 `codeUrl` 时，将 `codeUrl` 存入组件 state 并打开 Dialog。
2. Dialog 内展示二维码 +「请使用微信扫一扫」提示。
3. 调用已有的 `pollOrderUntilPaid(getOrder, orderId, ...)` 等待异步通知。
4. 检测到 `PAID` 后关闭 Dialog 并 `router.push`。

伪代码：

```typescript
if (isRealWechatPayment(payment)) {
  onWechatQr?.(payment.payData!.codeUrl!); // 由结账页展示二维码 Dialog
  pollOrderUntilPaid(getOrder, orderId, {
    onPaid: () => router.push(target),
    onTimeout: () => onError?.('支付处理中，请在订单详情查看支付状态'),
    onError: () => onError?.('查询支付状态失败，请在订单详情查看'),
  });
  return;
}
```

### 4.4 结账页二维码 Dialog（示例）

在 `PaymentConfirmSection` 或独立组件中：

```tsx
const [wechatCodeUrl, setWechatCodeUrl] = useState<string | null>(null);

payOrder({
  orderId: order.id,
  method,
  onWechatQr: (codeUrl) => setWechatCodeUrl(codeUrl),
  // ...
});

// Dialog 内容
{wechatCodeUrl && (
  <Dialog open onOpenChange={() => setWechatCodeUrl(null)}>
    <DialogContent>
      <p className="text-center text-sm text-muted-foreground">请使用微信扫一扫完成支付</p>
      <img
        src={wechatCodeUrlToQrImage(wechatCodeUrl)}
        alt="微信支付二维码"
        className="mx-auto size-60"
      />
    </DialogContent>
  </Dialog>
)}
```

---

## 五、安全与生产加固

### 5.1 验签与解密必须在服务端进行

API v3 密钥、商户私钥仅存在于后端。前端只接收 `codeUrl`，不参与验签或解密。

### 5.2 幂等处理

`handleWechatNotify` 必须在更新前检查 `payment.status === PAID`，防止微信重复通知导致重复更新。

### 5.3 回调响应格式

微信要求 HTTP 200 且 body 为：

```json
{ "code": "SUCCESS", "message": "成功" }
```

验签失败应返回 HTTP 4xx，以便微信重试；业务已处理或非 SUCCESS 状态仍返回 SUCCESS  JSON，避免无限重试。

### 5.4 生产环境禁用 mock-callback

与支付宝相同，`mock-callback` 已受 `DevOnlyGuard` 保护，生产环境不可用。

### 5.5 日志与对账

- 将解密前的 envelope 与解密后的 `transaction_id` 写入 `payment.thirdPartyData`
- 定期在商户平台「交易中心」核对订单与本地 `Payment` 记录

### 5.6 金额精度

`yuanToFen` 使用 `Math.round(parseFloat * 100)`。若业务存在复杂折扣，需确保与订单 `totalAmount` 一致，避免「下单金额与回调金额不符」导致关单。

---

## 六、环境变量汇总

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `WECHAT_APP_ID` | `wx1234567890abcdef` | 与商户号绑定的 AppID |
| `WECHAT_MCH_ID` | `1234567890` | 微信支付商户号 |
| `WECHAT_MCH_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----...` | 商户 API 私钥（`apiclient_key.pem`） |
| `WECHAT_API_V3_KEY` | 32 位字符串 | API v3 密钥，用于解密回调 |
| `WECHAT_NOTIFY_URL` | `https://your-domain.com/api/payments/wechat/notify` | 异步通知地址（必须 HTTPS、公网可访问） |
| `WECHAT_MCH_SERIAL_NO` | 可选 | 商户证书序列号 |

---

## 七、管理员退款

### 接口

```
POST /admin/orders/:id/refund   管理员一键全额退款（需 JWT + ADMIN 角色）
Body: { reason?: string }
```

### 流程（接入微信后）

1. 校验订单状态为 `PAID` / `APPROVED` / `PROCESSING`
2. 按 `payment.method` 调用 `AlipayProvider.refund` 或 `WechatProvider.refund`
3. 微信：`out_refund_no` 使用 `Refund.outRequestNo` 保证幂等
4. 成功后：`Payment.status → REFUNDED`，`Order.status → REFUNDED`

### 前端

管理后台 `RefundActionButton` 无需区分渠道，后端按支付方式自动路由。

---

## 八、接入检查清单

完成接入后，按以下顺序逐项验证：

- [ ] `npm install wechatpay-node-v3` 安装成功
- [ ] 环境变量已配置（本地 `.env.development` + 生产 `.env` / `docker-compose.yml`）
- [ ] 商户平台已开通 Native 支付，AppID 已与商户号绑定
- [ ] `main.ts` 已为 `/payments/wechat/notify` 启用 raw body
- [ ] 配置完成后，`POST /payments/initiate` + `method: WECHAT` 返回 `payData.codeUrl`（不再是 `mockPayUrl`）
- [ ] 前端 Dialog 正确展示二维码
- [ ] 微信扫码支付 0.01 元测试单后，后端收到 `POST /payments/wechat/notify`
- [ ] 验签通过，`payment.status` 变为 `PAID`，`order.status` 变为 `PAID`
- [ ] 管理员通知正常推送（SSE 收到 `ORDER_PAID` 事件）
- [ ] 前端轮询检测到订单变为 `PAID`，自动跳转订单详情
- [ ] 生产环境 `mock-callback` 不可访问
- [ ] 管理员可对微信支付订单执行一键退款

---

## 九、相关文件索引

| 类型 | 文件路径 | 说明 |
|------|----------|------|
| Provider 核心 | `apps/api/src/modules/payment/providers/wechat.provider.ts` | 下单、验签、退款 |
| 配置 | `apps/api/src/modules/payment/config/wechat.config.ts` | 环境变量与启用判断 |
| Service | `apps/api/src/modules/payment/payment.service.ts` | 发起、回调、退款编排 |
| Controller | `apps/api/src/modules/payment/payment.controller.ts` | `POST /payments/wechat/notify` |
| Raw body | `apps/api/src/main.ts` | 微信验签所需原始 body |
| 前端支付 Hook | `apps/web/hooks/queries/payments/usePayOrder.ts` | 支付宝 / 微信 / mock 分支 |
| 前端微信工具 | `apps/web/lib/payment/wechat.ts` | 二维码与类型判断 |
| 结账页 | `apps/web/modules/checkout/components/PaymentConfirmSection.tsx` | 支付方式选择与二维码 Dialog |
| Admin 退款 | `apps/api/src/modules/admin/orders/admin-order.controller.ts` | `POST /admin/orders/:id/refund` |
| 数据库 Schema | `apps/api/prisma/schema.prisma` | `PaymentMethod.WECHAT`、`Refund` 模型 |

---

## 十、可选扩展

| 场景 | 接口 / 产品 | 说明 |
|------|-------------|------|
| 手机浏览器 H5 | `/v3/pay/transactions/h5` | 需 `scene_info`，支付完成后 redirect 回站点 |
| 微信内 JSAPI | `/v3/pay/transactions/jsapi` | 需用户 openid，适用于公众号 / 小程序内 |
| 退款结果通知 | 退款回调 URL | 与支付回调类似，解密后更新 `Refund` 状态 |
| 替换 QR 第三方 | `qrcode.react` | 避免使用 `api.qrserver.com` 外链 |

当前 PC 结账页与支付宝并列的「微信支付」选项，**Native 扫码**是最小改动、与现有架构最契合的方案。
