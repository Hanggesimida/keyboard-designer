import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '@prisma/prisma.service';
import { AccountType, DesignStatus } from 'generated/prisma/enums';
import { CreateSubAccountDto } from './dto/create-sub-account.dto';
import { UpdateSubAccountDto } from './dto/update-sub-account.dto';

const SUB_ACCOUNT_SELECT = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class EnterpriseService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubAccount(mainUserId: string, dto: CreateSubAccountDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('该邮箱已被注册');
    }

    const initialPassword = this.generateInitialPassword();
    const hashed = await bcrypt.hash(initialPassword, 10);

    const subAccount = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.displayName,
        password: hashed,
        accountType: AccountType.ENTERPRISE_SUB,
        parentId: mainUserId,
        mustChangePassword: true,
      },
      select: SUB_ACCOUNT_SELECT,
    });

    // 一次性返回明文初始密码，由主账号线下转告设计师；服务端不再存储明文
    return { ...subAccount, initialPassword };
  }

  async findSubAccounts(mainUserId: string) {
    const subAccounts = await this.prisma.user.findMany({
      where: { parentId: mainUserId },
      select: {
        ...SUB_ACCOUNT_SELECT,
        _count: {
          select: {
            designs: true,
          },
        },
        designs: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subAccounts.map(({ designs, _count, ...rest }) => ({
      ...rest,
      designCount: _count.designs,
      draftCount: designs.filter((d) => d.status === DesignStatus.DRAFT).length,
      submittedCount: designs.filter((d) => d.status === DesignStatus.SUBMITTED)
        .length,
      orderedCount: designs.filter((d) => d.status === DesignStatus.ORDERED)
        .length,
    }));
  }

  async updateSubAccount(
    mainUserId: string,
    subAccountId: string,
    dto: UpdateSubAccountDto,
  ) {
    await this.assertOwnsSubAccount(mainUserId, subAccountId);

    return this.prisma.user.update({
      where: { id: subAccountId },
      data: {
        ...(dto.displayName !== undefined && { name: dto.displayName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: SUB_ACCOUNT_SELECT,
    });
  }

  async resetSubAccountPassword(mainUserId: string, subAccountId: string) {
    await this.assertOwnsSubAccount(mainUserId, subAccountId);

    const initialPassword = this.generateInitialPassword();
    const hashed = await bcrypt.hash(initialPassword, 10);

    await this.prisma.user.update({
      where: { id: subAccountId },
      data: {
        password: hashed,
        mustChangePassword: true,
      },
    });

    return { initialPassword };
  }

  private async assertOwnsSubAccount(mainUserId: string, subAccountId: string) {
    const subAccount = await this.prisma.user.findUnique({
      where: { id: subAccountId },
      select: { id: true, parentId: true },
    });

    if (!subAccount) {
      throw new NotFoundException(`子账号 ${subAccountId} 不存在`);
    }

    if (subAccount.parentId !== mainUserId) {
      throw new ForbiddenException('无权操作该子账号');
    }
  }

  /** 生成人类可读、有一定强度的随机初始密码，如 Xk3m-Pq8t */
  private generateInitialPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(8);
    let raw = '';
    for (const byte of bytes) {
      raw += chars[byte % chars.length];
    }
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  }
}
