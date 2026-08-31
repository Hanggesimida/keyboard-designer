import { SetMetadata } from '@nestjs/common';
import { AccountType } from 'generated/prisma/enums';

export const ACCOUNT_TYPES_KEY = 'accountTypes';

/** 标记接口仅允许指定 accountType 的用户访问（与 @Roles 正交，可叠加使用） */
export const RequireAccountType = (...accountTypes: AccountType[]) =>
  SetMetadata(ACCOUNT_TYPES_KEY, accountTypes);
