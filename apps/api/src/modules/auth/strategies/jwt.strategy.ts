import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // 优先从 Authorization Bearer header 提取，
      // 回退到 query param ?token=（用于 EventSource SSE 连接）
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => (req.query?.token as string) ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', ''),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
