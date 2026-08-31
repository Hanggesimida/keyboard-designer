import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountType } from 'generated/prisma/enums';
import { ACCOUNT_TYPES_KEY } from '@modules/auth/decorators/account-type.decorator';

@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const accountTypes = this.reflector.getAllAndOverride<AccountType[]>(
      ACCOUNT_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!accountTypes || accountTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!accountTypes.includes(user.accountType)) {
      throw new ForbiddenException('当前账号类型无权访问该功能');
    }

    return true;
  }
}
