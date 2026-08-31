import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SKIP_MUST_CHANGE_PASSWORD_KEY } from '@modules/auth/decorators/skip-must-change-password.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = await super.canActivate(context);
    if (!activated) return false;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_MUST_CHANGE_PASSWORD_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const user = context.switchToHttp().getRequest().user as
      | { mustChangePassword?: boolean }
      | undefined;

    if (user?.mustChangePassword) {
      throw new ForbiddenException('请先修改密码后再继续操作');
    }

    return true;
  }
}
