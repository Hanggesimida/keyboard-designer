import { IsIn } from 'class-validator';
import { AccountType } from 'generated/prisma/enums';

/** 管理员仅可在 NORMAL / ENTERPRISE_MAIN 间切换；ENTERPRISE_SUB 由主账号系统自动分配 */
export class UpdateAccountTypeDto {
  @IsIn([AccountType.NORMAL, AccountType.ENTERPRISE_MAIN])
  accountType: AccountType;
}
