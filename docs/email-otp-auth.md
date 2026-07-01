# 邮箱验证码注册/登录功能实现文档

> 技术栈：Next.js（前端）+ NestJS（后端）+ Redis（验证码存储）+ PostgreSQL（用户存储）+ 腾讯云邮件推送（SES）

---

## 一、方案概述

### 设计决策

采用**单接口 OTP 一体化**模式：前端无需区分「注册」或「登录」，后端根据邮箱是否存在自动判断，并通过响应的 `action` 字段告诉前端下一步做什么。

| 用户类型 | verify-otp 响应 | 前端下一步 |
|----------|-----------------|------------|
| 老用户（已设密码） | `{ action: "logged_in", accessToken }` | 保存 token，跳转首页 |
| 新用户（首次注册） | `{ action: "setup_password", setupToken }` | 跳转密码设置页 |

> `setupToken` 是一个短期临时令牌（TTL=10min），仅用于后续调用 `set-password` 接口，不具备登录权限。设置密码成功后才颁发正式 `accessToken`。

### 完整接口清单

```
POST /auth/send-otp       发送验证码
POST /auth/verify-otp     校验验证码（自动区分注册/登录）
POST /auth/set-password   新用户设置密码（消耗 setupToken）
```

### 核心流程

```
用户输入邮箱
    ↓
前端：POST /auth/send-otp { email, turnstileToken }
    ↓
后端：Turnstile 验证 → 生成 OTP → 存 Redis（TTL=5min）→ SES 发送邮件
    ↓
用户收到邮件，输入验证码
    ↓
前端：POST /auth/verify-otp { email, otp }
    ↓
后端：校验 OTP → 删除 OTP key
    ├── 老用户 → 颁发 accessToken → { action: "logged_in", accessToken }
    └── 新用户 → 创建无密码账户 → 颁发 setupToken（短期）→ { action: "setup_password", setupToken }
    ↓（仅新用户）
前端跳转密码设置页
    ↓
前端：POST /auth/set-password { password } + Header: Authorization: Bearer {setupToken}
    ↓
后端：验证 setupToken → 设置密码 → 使 setupToken 失效 → 颁发正式 accessToken
    ↓
登录完成，跳转首页
```

### 设计原则

| 原则 | 说明 |
|------|------|
| 验证码一次性使用 | 校验通过后立即从 Redis 删除 |
| 发送频率限制 | 同一邮箱 60 秒内只能发一次 |
| 暴力破解防护 | 同一邮箱最多尝试 5 次，超出锁定 15 分钟 |
| 验证码有效期 | 300 秒（5 分钟） |
| Turnstile 人机验证 | 仅在发送验证码时校验，降低用户体验负担 |
| setupToken 短期有效 | 仅 10 分钟有效，且只能使用一次 |

---

## 二、腾讯云邮件推送（SES）配置

### 2.1 开通服务

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/ses)，搜索「邮件推送」并开通。
2. 进入「发件域名」→「新建域名」，填写你的发信域名（如 `mail.yourdomain.com`）。
3. 按照腾讯云提示，在 DNS 服务商处添加 SPF、DKIM、DMARC 记录，等待验证通过（通常 5–30 分钟）。
4. 进入「发件地址」→「新建发件地址」，创建如 `noreply@mail.yourdomain.com`。
5. 进入「邮件模板」→「新建模板」，创建验证码模板：

```html
<!DOCTYPE html>
<html>
<body>
  <p>您好，</p>
  <p>您的验证码为：<strong style="font-size:24px;">{{code}}</strong></p>
  <p>验证码有效期为 5 分钟，请勿泄露给他人。</p>
  <p>如非本人操作，请忽略此邮件。</p>
</body>
</html>
```

记录模板 ID（`TENCENT_SES_TEMPLATE_ID`）。

6. 进入「访问管理」→「API 密钥管理」，获取 `SecretId` 和 `SecretKey`，并添加邮件推送权限。

### 2.2 环境变量（`.env.development`）

```bash
# 腾讯云 SES
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SES_REGION=ap-hongkong        # 或 ap-guangzhou，按实际选择
TENCENT_SES_FROM=noreply@mail.yourdomain.com
TENCENT_SES_TEMPLATE_ID=123456

# setupToken 独立密钥，与 JWT_SECRET 分开
SETUP_TOKEN_SECRET=jw-setup-secret-key
```

---

## 三、后端实现（NestJS）

### 3.1 安装依赖

```bash
cd apps/api
npm install tencentcloud-sdk-nodejs-ses
```

### 3.2 Redis Key 设计

| Key | 类型 | TTL | 说明 |
|-----|------|-----|------|
| `otp:{email}` | string | 300s | 验证码值 |
| `otp:cooldown:{email}` | string | 60s | 发送冷却锁 |
| `otp:attempts:{email}` | string | 900s | 失败次数计数 |
| `setup_token:{userId}` | string | 600s | 新用户设置密码的临时令牌（jti） |

### 3.3 邮件服务 `email.service.ts`

路径：`apps/api/src/modules/email/email.service.ts`

```typescript
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

  async sendOtp(to: string, code: string): Promise<void> {
    try {
      await this.client.SendEmail({
        FromEmailAddress: this.from,
        Destination: [to],
        Template: {
          TemplateID: this.templateId,
          TemplateData: JSON.stringify({ code }),
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
```

### 3.4 OTP 服务 `otp.service.ts`

路径：`apps/api/src/modules/auth/otp.service.ts`

```typescript
import {
  Injectable,
  BadRequestException,
  TooManyRequestsException,
} from '@nestjs/common';
import { RedisService } from '@redis/redis.service';
import { EmailService } from '@modules/email/email.service';

const OTP_TTL = 300;
const COOLDOWN_TTL = 60;
const MAX_ATTEMPTS = 5;
const LOCK_TTL = 900;

@Injectable()
export class OtpService {
  constructor(
    private redis: RedisService,
    private emailService: EmailService,
  ) {}

  private otpKey(email: string) { return `otp:${email}`; }
  private cooldownKey(email: string) { return `otp:cooldown:${email}`; }
  private attemptsKey(email: string) { return `otp:attempts:${email}`; }

  async sendOtp(email: string): Promise<void> {
    const cooldown = await this.redis.get(this.cooldownKey(email));
    if (cooldown) {
      throw new TooManyRequestsException('请勿频繁发送，请 60 秒后重试');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await Promise.all([
      this.redis.set(this.otpKey(email), code, 'EX', OTP_TTL),
      this.redis.set(this.cooldownKey(email), '1', 'EX', COOLDOWN_TTL),
    ]);

    await this.emailService.sendOtp(email, code);
  }

  async verifyOtp(email: string, code: string): Promise<void> {
    const attemptsKey = this.attemptsKey(email);

    const attempts = await this.redis.get(attemptsKey);
    if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
      throw new TooManyRequestsException('验证码输入错误次数过多，请 15 分钟后重试');
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

    await this.redis.del(this.otpKey(email), attemptsKey);
  }
}
```

### 3.5 DTO 定义

**`send-otp.dto.ts`**（新增）：

```typescript
import { IsEmail, IsString } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  turnstileToken: string;
}
```

**`verify-otp.dto.ts`**（新增，替换原 register/login dto）：

```typescript
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  otp: string;
}
```

**`set-password.dto.ts`**（新增）：

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';

export class SetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;
}
```

### 3.6 `auth.service.ts`

```typescript
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

const SETUP_TOKEN_TTL = 600; // 10 分钟

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
      // 老用户，直接颁发正式 JWT
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

  async setPassword(userId: string, jti: string, dto: SetPasswordDto) {
    const key = `setup_token:${userId}`;
    const storedJti = await this.redis.get(key);

    if (!storedJti || storedJti !== jti) {
      throw new UnauthorizedException('setupToken 已失效或无效');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.setPassword(userId, hashed);

    // 消耗 setupToken，一次性使用
    await this.redis.del(key);

    return {
      action: 'logged_in' as const,
      accessToken: this.generateAccessToken(user),
    };
  }

  private generateAccessToken(user: { id: string; email: string; role: string }) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async generateSetupToken(userId: string): Promise<string> {
    const jti = randomUUID();
    const secret = this.config.getOrThrow<string>('SETUP_TOKEN_SECRET');

    // 存入 Redis，用于后续 set-password 时的一次性校验
    await this.redis.set(`setup_token:${userId}`, jti, 'EX', SETUP_TOKEN_TTL);

    return this.jwtService.sign(
      { sub: userId, jti, purpose: 'setup_password' },
      { secret, expiresIn: `${SETUP_TOKEN_TTL}s` },
    );
  }
}
```

### 3.7 `auth.controller.ts`

```typescript
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '@modules/auth/auth.service';
import { SendOtpDto } from '@modules/auth/dto/send-otp.dto';
import { VerifyOtpDto } from '@modules/auth/dto/verify-otp.dto';
import { SetPasswordDto } from '@modules/auth/dto/set-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  /**
   * 使用 setupToken（Bearer token）+ 新密码完成注册
   * 复用 JWT PassportStrategy，但通过 purpose 字段区分
   */
  @Post('set-password')
  @UseGuards(AuthGuard('jwt-setup'))
  setPassword(@Req() req: { user: { sub: string; jti: string } }, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(req.user.sub, req.user.jti, dto);
  }
}
```

### 3.8 `jwt-setup.strategy.ts`（新增）

`set-password` 接口使用独立的 Passport Strategy，以区分普通 JWT 和 setupToken。

路径：`apps/api/src/modules/auth/strategies/jwt-setup.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtSetupStrategy extends PassportStrategy(Strategy, 'jwt-setup') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('SETUP_TOKEN_SECRET'),
    });
  }

  validate(payload: { sub: string; jti: string; purpose: string }) {
    if (payload.purpose !== 'setup_password') {
      throw new UnauthorizedException('无效的令牌类型');
    }
    return { sub: payload.sub, jti: payload.jti };
  }
}
```

### 3.9 `auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module';
import { EmailModule } from '@modules/email/email.module';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { OtpService } from '@modules/auth/otp.service';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { JwtSetupStrategy } from '@modules/auth/strategies/jwt-setup.strategy';
import { TurnstileService } from '@modules/auth/turnstile.service';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new InternalServerErrorException('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy, JwtSetupStrategy, TurnstileService],
})
export class AuthModule {}
```

---

## 四、前端实现（Next.js）

### 4.1 用户体验流程（多步骤）

```
[步骤 1] 输入邮箱页
    ↓ 填写邮箱 + Turnstile → 点击「发送验证码」
[步骤 2] 输入验证码页
    ↓ 填写 6 位验证码 → 点击「验证」
    ├── 老用户 → 直接跳首页（登录完成）
    └── 新用户 → 进入步骤 3
[步骤 3] 设置密码页（仅新用户）
    ↓ 填写密码 → 点击「完成注册」→ 跳首页
```

### 4.2 API 封装

路径：`apps/web/src/lib/api/auth.ts`

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL;

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? '请求失败');
  return data as T;
}

export function sendOtp(email: string, turnstileToken: string) {
  return post<{ message: string }>('/auth/send-otp', { email, turnstileToken });
}

export type VerifyOtpResult =
  | { action: 'logged_in'; accessToken: string }
  | { action: 'setup_password'; setupToken: string };

export function verifyOtp(email: string, otp: string) {
  return post<VerifyOtpResult>('/auth/verify-otp', { email, otp });
}

export function setPassword(password: string, setupToken: string) {
  return post<{ action: 'logged_in'; accessToken: string }>(
    '/auth/set-password',
    { password },
    setupToken,
  );
}
```

### 4.3 验证码倒计时 Hook

路径：`apps/web/src/hooks/useOtpCountdown.ts`

```typescript
import { useState, useRef, useCallback } from 'react';

export function useOtpCountdown(seconds = 60) {
  const [countdown, setCountdown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setCountdown(seconds);
    timer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [seconds]);

  return { countdown, start, isCooling: countdown > 0 };
}
```

### 4.4 多步骤页面结构

推荐使用单页多步骤（`step` 状态控制）或独立路由均可。

**推荐路由方案**：

```
/login                  步骤 1：输入邮箱 + 发送验证码
/login/verify           步骤 2：输入验证码
/login/set-password     步骤 3：新用户设置密码（仅新用户跳转）
```

**关键状态流转（使用 `sessionStorage` 跨步骤传递）**：

```typescript
// 步骤 1 完成后
sessionStorage.setItem('auth_email', email);
router.push('/login/verify');

// 步骤 2 完成后
const result = await verifyOtp(email, otp);
if (result.action === 'logged_in') {
  saveToken(result.accessToken);   // 保存正式 token
  router.push('/');
} else {
  sessionStorage.setItem('setup_token', result.setupToken);
  router.push('/login/set-password');
}

// 步骤 3 完成后
const setupToken = sessionStorage.getItem('setup_token')!;
const result = await setPassword(password, setupToken);
sessionStorage.removeItem('setup_token');
saveToken(result.accessToken);
router.push('/');
```

---

## 五、接口规范

### POST `/auth/send-otp`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | ✓ | 邮箱地址 |
| `turnstileToken` | string | ✓ | Turnstile 人机验证 token |

**响应**：

```json
{ "message": "验证码已发送，请查收邮件" }
```

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 邮箱格式错误 |
| 429 | 发送过于频繁（60s 冷却） |
| 500 | 邮件发送失败 |

---

### POST `/auth/verify-otp`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | ✓ | 邮箱地址 |
| `otp` | string | ✓ | 6 位验证码 |

**响应（老用户）**：

```json
{
  "action": "logged_in",
  "accessToken": "eyJhbGci..."
}
```

**响应（新用户）**：

```json
{
  "action": "setup_password",
  "setupToken": "eyJhbGci..."
}
```

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 验证码错误或已过期 |
| 429 | 错误次数过多，账户临时锁定 |

---

### POST `/auth/set-password`

请求头：`Authorization: Bearer {setupToken}`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `password` | string | ✓ | 新密码（8–64 位） |

**响应**：

```json
{
  "action": "logged_in",
  "accessToken": "eyJhbGci..."
}
```

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 密码格式不合规 |
| 401 | setupToken 无效或已过期 |

---

## 六、安全要点清单

- [x] Turnstile 人机验证（发送验证码时强制校验）
- [x] 发送频率限制（60s 冷却，Redis `cooldown` key）
- [x] 验证码一次性使用（校验后立即删除 Redis key）
- [x] 暴力破解防护（5 次错误后锁定 15 分钟）
- [x] 验证码有效期 5 分钟（Redis TTL）
- [x] 验证码不在响应中返回
- [x] setupToken 短期有效（10 分钟）且一次性（Redis jti 存储）
- [x] setupToken 与正式 accessToken 使用不同密钥和 Strategy
- [x] 密码使用 bcrypt（cost=10）哈希存储
- [ ] 生产环境使用 HTTPS
- [ ] `accessToken` 建议存储在 `httpOnly cookie` 而非 `sessionStorage`

---

## 七、数据库（Prisma）

`password` 字段需为可选，因为新用户在设置密码前短暂存在无密码状态：

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?  // 可选，OTP 注册时初始为 null，set-password 后填入
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

执行迁移：

```bash
cd apps/api
npx prisma migrate dev --name make-password-optional
```

`UsersService` 需新增 `setPassword` 方法：

```typescript
async setPassword(id: string, hashedPassword: string) {
  return this.prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}
```

---

## 八、文件变更清单

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts          ← 重构（send-otp / verify-otp / set-password）
│   │   │   ├── auth.module.ts              ← 引入 EmailModule、OtpService、JwtSetupStrategy
│   │   │   ├── auth.service.ts             ← 重构（单接口逻辑 + setupToken 生成）
│   │   │   ├── otp.service.ts              ← 新增
│   │   │   └── dto/
│   │   │       ├── send-otp.dto.ts         ← 新增
│   │   │       ├── verify-otp.dto.ts       ← 新增（替换 register/login dto）
│   │   │       ├── set-password.dto.ts     ← 新增
│   │   │       ├── register.dto.ts         ← 删除（已合并进 verify-otp）
│   │   │       └── login.dto.ts            ← 删除（已合并进 verify-otp）
│   │   │   └── strategies/
│   │   │       ├── jwt.strategy.ts         ← 保持不变
│   │   │       └── jwt-setup.strategy.ts   ← 新增
│   │   └── email/
│   │       ├── email.module.ts             ← 新增
│   │       └── email.service.ts            ← 新增
│   └── modules/users/
│       └── users.service.ts               ← 新增 setPassword 方法
├── .env.development                        ← 新增 SES 配置 + SETUP_TOKEN_SECRET
└── package.json                            ← 新增 tencentcloud-sdk-nodejs-ses

apps/web/
├── src/
│   ├── lib/api/auth.ts                     ← 新增 sendOtp / verifyOtp / setPassword
│   ├── hooks/useOtpCountdown.ts            ← 新增
│   └── app/(auth)/login/
│       ├── page.tsx                        ← 步骤 1：输入邮箱
│       ├── verify/page.tsx                 ← 步骤 2：输入验证码
│       └── set-password/page.tsx           ← 步骤 3：新用户设置密码
└── .env.development.local                  ← 确认 NEXT_PUBLIC_API_URL
```
