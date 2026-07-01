# 支付宝支付接入文档

> 技术栈：Next.js（前端）+ NestJS（后端）+ alipay-sdk（支付宝 Node.js SDK）+ PostgreSQL（订单存储）

---

## 一、方案概述

### 设计决策

采用**支付宝电脑网站支付（PC 端跳转）**模式：用户点击支付后，后端调用支付宝 `alipay.trade.page.pay` 接口，返回一个 HTML 表单（或支付链接），前端打开新窗口跳转至支付宝收银台完成支付。支付完成后，支付宝通过异步通知（`notify_url`）回调后端更新订单状态。

| 环境 | 支付链路 | 说明 |
|------|----------|------|
| 开发/测试 | `mock-callback` 自动完成 | 不调用支付宝，本地联调无障碍 |
| 生产 | 真实支付宝 → 异步回调 | AlipayProvider 实现后自动接管 |

> 架构上，`PaymentService` 通过 `IPaymentProvider` 接口与具体渠道解耦，只需实现 `AlipayProvider` 中的两个方法，**不改动 Service / Controller / 前端任何代码**。

### 完整接口清单

```
POST /payments/initiate       发起支付（需 JWT）→ 返回支付宝跳转 URL
POST /payments/alipay/notify  支付宝异步回调（无需 JWT，支付宝服务器调用）
```

### 核心流程

```
用户在结账页选择「支付宝」→ 点击「立即支付」
    ↓
前端：POST /orders { designId, addressId }
    ↓
后端：创建 Order（status=PENDING）→ 返回 { id, orderNo, totalAmount }
    ↓
前端：POST /payments/initiate { orderId, method: "ALIPAY" }
    ↓
后端：创建 Payment 记录 → 调用 AlipayProvider.createPayment
    ↓
AlipayProvider：调用 alipay.trade.page.pay → 返回 { payData: { payUrl } }
    ↓
前端：window.open(payUrl) 打开支付宝收银台
    ↓
用户在支付宝完成付款
    ↓
支付宝：POST /payments/alipay/notify（异步，携带签名）
    ↓
后端：AlipayProvider.verifyCallback 验签 → 解析 out_trade_no → orderId
    ↓
PaymentService：更新 Payment(PAID) + Order(PAID) + 推送管理员通知
    ↓
后端返回字符串 "success"（支付宝要求的响应格式）
```

### 现有桩位说明

| 文件 | 现状 | 接入后的变化 |
|------|------|-------------|
| `payment/providers/alipay.provider.ts` | `createPayment` / `verifyCallback` 均抛 `ServiceUnavailableException` | **只改这一个文件** |
| `payment/payment.service.ts` | `initiate` 捕获 Provider 异常后降级到 mock | Provider 不再抛异常，`payData.payUrl` 正常返回 |
| `payment/payment.controller.ts` | `alipayNotify` 已预留路由，调用 `handleAlipayNotify` | 验签通过后补全 TODO 逻辑 |

---

## 二、支付宝开放平台配置

### 2.1 创建应用

1. 登录 [支付宝开放平台](https://open.alipay.com)，进入「开发者中心」→「网页&移动应用」→「立即创建」。
2. 选择「网页应用」，填写应用名称（如 `jw-keyboard-designer`），提交审核。
3. 审核通过后记录 **APPID**（形如 `2021001234567890`）。

### 2.2 配置密钥

推荐使用支付宝官方工具生成 RSA2（SHA256WithRSA）密钥对：

1. 下载 [支付宝密钥工具](https://opendocs.alipay.com/common/02kipg)，生成 2048 位 RSA2 密钥对。
2. 将**应用公钥**上传到开放平台：「应用详情」→「开发设置」→「接口加签方式」→「上传应用公钥」。
3. 上传后平台自动生成**支付宝公钥**，复制备用（用于验签）。
4. 本地保存**应用私钥**（`ALIPAY_PRIVATE_KEY`，永远不要提交到 Git）。

### 2.3 配置通知地址

在「应用详情」→「功能列表」→「电脑网站支付」中，填写：

- **异步通知地址（notify_url）**：`https://your-domain.com/payments/alipay/notify`
- **同步返回地址（return_url）**：`https://your-domain.com/profile/orders`（用户付款后跳回）

> 本地开发时，支付宝无法回调内网地址，可使用 [ngrok](https://ngrok.com) 或 [cpolar](https://cpolar.com) 将本地端口暴露到公网，或直接用沙箱环境调试。

### 2.4 开启沙箱（开发阶段推荐）

1. 在开放平台「沙箱」→「沙箱应用」中获取沙箱 APPID 和密钥。
2. 使用沙箱账号（买家账号/卖家账号）测试支付流程，无需真实资金。
3. 沙箱网关：`https://openapi.alipaydev.com/gateway.do`。

---

## 三、后端接入步骤

### 3.1 安装依赖

```bash
# 在 apps/api 目录下
cd apps/api
npm install alipay-sdk
```

`alipay-sdk` 是支付宝官方维护的 Node.js SDK，支持 RSA2 签名、验签及各类接口调用。

### 3.2 添加环境变量

在 `apps/api/.env.development`（本地）和生产 `.env` 中添加：

```env
# 支付宝
ALIPAY_APP_ID=2021001234567890
ALIPAY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
ALIPAY_NOTIFY_URL=https://your-domain.com/payments/alipay/notify
ALIPAY_RETURN_URL=https://your-domain.com/profile/orders
# 沙箱时替换 GATEWAY 为 https://openapi.alipaydev.com/gateway.do
```

> **安全提示**：私钥中的换行符需用 `\n` 转义后写成单行，或通过文件挂载方式注入，避免多行字符串导致解析异常。

### 3.3 实现 AlipayProvider

这是整个接入工作最核心的一步。编辑现有桩位文件：

```
apps/api/src/modules/payment/providers/alipay.provider.ts
```

完整实现如下：

```typescript
import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AlipaySdk from 'alipay-sdk';
import type { Order, Payment } from 'generated/prisma/client';
import type { IPaymentProvider, PaymentResult, VerifyResult } from './payment-provider.interface';

@Injectable()
export class AlipayProvider implements IPaymentProvider {
  private readonly sdk: AlipaySdk;

  constructor(private readonly config: ConfigService) {
    const appId = config.getOrThrow<string>('ALIPAY_APP_ID');
    const privateKey = config.getOrThrow<string>('ALIPAY_PRIVATE_KEY');
    const alipayPublicKey = config.getOrThrow<string>('ALIPAY_PUBLIC_KEY');
    const gateway = config.get<string>('ALIPAY_GATEWAY', 'https://openapi.alipay.com/gateway.do');

    this.sdk = new AlipaySdk({
      appId,
      privateKey,
      alipayPublicKey,
      gateway,
    });
  }

  /**
   * 调用 alipay.trade.page.pay，返回 HTML 表单字符串。
   * 前端将该 HTML 写入新窗口的 document，即可跳转到支付宝收银台。
   */
  async createPayment(order: Order, payment: Payment): Promise<PaymentResult> {
    const notifyUrl = this.config.getOrThrow<string>('ALIPAY_NOTIFY_URL');
    const returnUrl = this.config.get<string>('ALIPAY_RETURN_URL', '');

    try {
      const formHtml = await this.sdk.pageExecute('alipay.trade.page.pay', {
        returnUrl,
        notifyUrl,
        bizContent: {
          out_trade_no: payment.id,      // 商户侧唯一支付单号，用 paymentId
          product_code: 'FAST_INSTANT_TRADE_PAY',
          total_amount: order.totalAmount.toString(),
          subject: `JW Keyboard 定制键盘 ${order.orderNo}`,
          body: `订单号：${order.orderNo}`,
        },
      });

      return { payData: { formHtml } };
    } catch (err) {
      throw new ServiceUnavailableException(
        `支付宝支付发起失败：${(err as Error).message}`,
      );
    }
  }

  /**
   * 验证支付宝异步通知签名，返回标准化结果。
   * 支付宝以 application/x-www-form-urlencoded 格式 POST 通知数据。
   */
  async verifyCallback(rawBody: Record<string, string>): Promise<VerifyResult> {
    const isValid = this.sdk.checkNotifySign(rawBody);

    if (!isValid) {
      throw new BadRequestException('支付宝回调验签失败');
    }

    // out_trade_no 在发起支付时设置为 paymentId
    const paymentId = rawBody.out_trade_no;
    const tradeStatus = rawBody.trade_status;

    // 只处理支付成功的通知
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      // 其他状态（WAIT_BUYER_PAY / TRADE_CLOSED）返回成功但不更新订单
      return { success: false, orderId: '' };
    }

    return { success: true, orderId: paymentId };
  }
}
```

### 3.4 补全 PaymentService 中的异步通知逻辑

编辑 `apps/api/src/modules/payment/payment.service.ts`，将 `handleAlipayNotify` 中的 TODO 替换为真实逻辑：

```typescript
async handleAlipayNotify(rawBody: Record<string, string>) {
  const result = await this.alipayProvider.verifyCallback(rawBody);

  // 验签通过但非支付成功状态（如关闭订单），直接返回 success 告知支付宝不再重试
  if (!result.success) {
    return 'success';
  }

  // out_trade_no 对应 paymentId
  const payment = await this.prisma.payment.findUnique({
    where: { id: result.orderId },
    include: { order: true },
  });

  if (!payment) {
    // 收到未知 paymentId，仍返回 success 避免支付宝反复重试
    return 'success';
  }

  if (payment.status === PaymentStatus.PAID) {
    // 幂等：已处理过则直接返回
    return 'success';
  }

  // 事务：同步更新 Payment 和 Order 状态
  const [, updatedOrder] = await this.prisma.$transaction([
    this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: new Date(),
        thirdPartyId: rawBody.trade_no,         // 支付宝交易流水号
        thirdPartyData: rawBody as unknown as Prisma.InputJsonValue,
      },
    }),
    this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.PAID, paidAt: new Date() },
    }),
  ]);

  // fire-and-forget：推送管理员通知
  this.notifyOrderPaid(updatedOrder).catch(() => {});

  return 'success';
}
```

> **重要**：支付宝要求后端在收到 `notify_url` 请求后，返回纯文本字符串 `"success"`（不含引号），否则会在 24 小时内以一定间隔反复重试（最多 8 次）。

### 3.5 处理 raw body 解析问题

支付宝异步通知以 `application/x-www-form-urlencoded` 格式 POST，NestJS 默认的 `body-parser` 会自动解析，无需额外配置。

如果发现 `rawBody` 为空，检查 `main.ts` 中是否开启了 `bodyParser`：

```typescript
// apps/api/src/main.ts
const app = await NestFactory.create(AppModule);
// 默认已启用，确认没有 bodyParser: false
```

### 3.6 更新 initiate 返回类型（可选）

当前前端的 `InitiatePaymentResult` 接口中只有 `mockPayUrl`，需新增 `payData` 字段，以便前端获取支付宝返回的 `formHtml`：

在 `apps/web/lib/api/payments.ts` 中更新类型：

```typescript
export interface InitiatePaymentResult {
  paymentId: string;
  method: PaymentMethod;
  // mock 模式
  mockPayUrl?: string;
  tip?: string;
  // 真实支付宝模式
  payData?: {
    formHtml?: string;   // alipay.trade.page.pay 返回的 HTML 表单
  };
}
```

---

## 四、前端接入步骤

### 4.1 修改 PaymentConfirmSection 支持真实跳转

当后端返回 `payData.formHtml` 时，前端需将 HTML 写入新窗口以触发支付宝跳转，同时轮询订单状态，等待异步通知完成后再跳转到订单详情页。

编辑 `apps/web/modules/checkout/components/PaymentConfirmSection.tsx`，修改 `handlePay` 函数：

```typescript
onSuccess: (payment) => {
  // 判断是否有真实支付宝表单
  if (payment.payData?.formHtml) {
    // 将 HTML 写入新窗口，触发支付宝收银台跳转
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(payment.payData.formHtml);
      win.document.close();
    }
    // 开始轮询订单状态，等待支付宝异步通知完成
    pollOrderStatus(order.id);
  } else {
    // 开发 mock 模式：自动调用 mockCallback
    mockCallback(payment.paymentId, {
      onSuccess: () => router.push(`/profile/orders/${order.id}`),
      onError: (err) => setSubmitError(
        err instanceof ApiError ? err.message : '支付回调失败，请联系客服'
      ),
    });
  }
},
```

### 4.2 实现轮询订单状态

支付宝支付在用户付款后约 1–5 秒触发异步通知，前端可通过轮询 `GET /orders/:id` 等待订单状态从 `PENDING` 变为 `PAID`：

```typescript
function pollOrderStatus(orderId: string) {
  const MAX_POLLS = 20;      // 最多轮询 20 次（约 60 秒）
  const INTERVAL_MS = 3000;  // 每 3 秒轮询一次
  let count = 0;

  const timer = setInterval(async () => {
    count++;
    try {
      const order = await fetchOrder(orderId);  // GET /orders/:id
      if (order.status === 'PAID') {
        clearInterval(timer);
        router.push(`/profile/orders/${orderId}`);
      } else if (count >= MAX_POLLS) {
        clearInterval(timer);
        setSubmitError('支付超时，请在「我的订单」中查看支付状态');
      }
    } catch {
      clearInterval(timer);
    }
  }, INTERVAL_MS);
}
```

> **提示**：如果后续接入 SSE（服务端推送），可用 `NotificationsService` 替代轮询，体验更佳。

---

## 五、安全与生产加固

### 5.1 验签必须在服务端进行

切勿在前端校验支付宝签名，私钥和公钥均只应存在于后端环境变量中。

### 5.2 幂等处理

`handleAlipayNotify` 中已包含幂等检查（`payment.status === PAID` 时直接返回 `success`），防止支付宝重复回调导致重复更新。

### 5.3 notify_url 不能带参数

支付宝要求 `notify_url` 必须是可公网访问的完整 URL，且**不允许携带 `#` 锚点**，路径中的参数应写在路径本身中而非 query string。

### 5.4 生产环境禁用 mock-callback

在 `apps/api/src/modules/payment/payment.controller.ts` 的 `mockCallback` 上添加环境守卫：

```typescript
@UseGuards(JwtAuthGuard, DevOnlyGuard)  // DevOnlyGuard 检查 NODE_ENV !== 'production'
@Post('mock-callback')
@HttpCode(HttpStatus.OK)
mockCallback(@Body() dto: MockCallbackDto) {
  return this.paymentService.mockCallback(dto);
}
```

### 5.5 日志记录

建议在 `handleAlipayNotify` 中记录原始回调数据，存入 `payment.thirdPartyData`（已在 Schema 中预留 `Json?` 字段），便于日后对账和排查异常。

---

## 六、环境变量汇总

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `ALIPAY_APP_ID` | `2021001234567890` | 支付宝应用 ID |
| `ALIPAY_PRIVATE_KEY` | `-----BEGIN RSA...` | 应用私钥（RSA2）|
| `ALIPAY_PUBLIC_KEY` | `-----BEGIN PUBLIC...` | 支付宝公钥（用于验签）|
| `ALIPAY_GATEWAY` | `https://openapi.alipay.com/gateway.do` | 生产网关；沙箱替换为 `alipaydev.com` |
| `ALIPAY_NOTIFY_URL` | `https://your-domain.com/payments/alipay/notify` | 异步通知地址（必须公网可访问）|
| `ALIPAY_RETURN_URL` | `https://your-domain.com/profile/orders` | 同步返回地址（付款后跳回）|

---

## 七、接入检查清单

完成接入后，按以下顺序逐项验证：

- [ ] `npm install alipay-sdk` 安装成功
- [ ] 环境变量已配置（本地 `.env.development` + 生产 `.env`）
- [ ] 支付宝开放平台已上传应用公钥
- [ ] 沙箱模式下，`POST /payments/initiate` 返回 `payData.formHtml`（不再是 `mockPayUrl`）
- [ ] 新窗口打开 formHtml 能跳转到沙箱收银台
- [ ] 沙箱买家账号完成付款后，后端 `POST /payments/alipay/notify` 被调用
- [ ] 验签通过，`payment.status` 变为 `PAID`，`order.status` 变为 `PAID`
- [ ] 管理员通知正常推送（SSE 收到 `ORDER_PAID` 事件）
- [ ] 前端轮询检测到订单变为 `PAID`，自动跳转到订单详情页
- [ ] 切换生产网关后，真实支付宝账号完成端到端测试
- [ ] 生产环境 `mock-callback` 接口已禁用或限制访问

---

## 八、相关文件索引

| 类型 | 文件路径 | 说明 |
|------|----------|------|
| Provider 核心 | `apps/api/src/modules/payment/providers/alipay.provider.ts` | 唯一需要完整实现的文件 |
| Service 回调 | `apps/api/src/modules/payment/payment.service.ts` | 补全 `handleAlipayNotify` TODO |
| Controller | `apps/api/src/modules/payment/payment.controller.ts` | 路由已就绪，无需修改 |
| Provider 接口 | `apps/api/src/modules/payment/providers/payment-provider.interface.ts` | 接口约束，无需修改 |
| 模块注册 | `apps/api/src/modules/payment/payment.module.ts` | 无需修改 |
| 前端支付 | `apps/web/modules/checkout/components/PaymentConfirmSection.tsx` | 增加 formHtml 处理 + 轮询 |
| 前端 API 类型 | `apps/web/lib/api/payments.ts` | 新增 `payData` 字段 |
| 数据库 Schema | `apps/api/prisma/schema.prisma` | 无需变更（字段已预留）|
