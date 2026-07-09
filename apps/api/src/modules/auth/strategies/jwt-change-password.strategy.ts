import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface ChangePasswordTokenPayload {
  sub: string;
  jti: string;
  purpose: string;
}

@Injectable()
export class JwtChangePasswordStrategy extends PassportStrategy(
  Strategy,
  'jwt-change-password',
) {
  constructor(config: ConfigService) {
    const secret =
      config.get<string>('CHANGE_PASSWORD_TOKEN_SECRET') ??
      config.getOrThrow<string>('SETUP_TOKEN_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: ChangePasswordTokenPayload) {
    if (payload.purpose !== 'change_password') {
      throw new UnauthorizedException('无效的令牌类型');
    }
    return { sub: payload.sub, jti: payload.jti };
  }
}
