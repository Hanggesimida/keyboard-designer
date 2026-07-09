import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '@modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
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

  async validate(payload: { sub: string; email?: string; role?: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      parentId: user.parentId,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
