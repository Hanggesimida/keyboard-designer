import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface SetupTokenPayload {
  sub: string;
  jti: string;
  purpose: string;
}

@Injectable()
export class JwtSetupStrategy extends PassportStrategy(Strategy, 'jwt-setup') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SETUP_TOKEN_SECRET'),
    });
  }

  validate(payload: SetupTokenPayload) {
    if (payload.purpose !== 'setup_password') {
      throw new UnauthorizedException('无效的令牌类型');
    }
    return { sub: payload.sub, jti: payload.jti };
  }
}
