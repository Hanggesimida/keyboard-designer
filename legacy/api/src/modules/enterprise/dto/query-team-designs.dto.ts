import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DesignStatus } from 'generated/prisma/client';

export class QueryTeamDesignsDto {
  @IsEnum(DesignStatus)
  @IsOptional()
  status?: DesignStatus;

  /** 按子账号 ID 过滤，不传则返回团队全部设计 */
  @IsString()
  @IsOptional()
  subUserId?: string;
}
