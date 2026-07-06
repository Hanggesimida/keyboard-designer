import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/** 仅允许非生产环境访问（用于 mock 支付等开发接口） */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('该接口在生产环境不可用');
    }
    return true;
  }
}
