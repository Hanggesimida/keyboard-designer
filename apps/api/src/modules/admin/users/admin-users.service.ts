import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { Role, AccountType } from 'generated/prisma/enums';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateAccountTypeDto } from './dto/update-account-type.dto';

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  accountType: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAdminUsersDto) {
    const { page = 1, limit = 20, search, role, accountType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(accountType && { accountType }),
      ...(search && {
        email: { contains: search, mode: 'insensitive' },
      }),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: USER_SELECT,
      }),
    ]);

    return { total, page, limit, items };
  }

  async updateRole(
    targetUserId: string,
    dto: UpdateUserRoleDto,
    operatorId: string,
  ) {
    if (targetUserId === operatorId) {
      throw new BadRequestException('不能修改自己的角色');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: USER_SELECT,
    });

    if (!target) {
      throw new NotFoundException(`用户 ${targetUserId} 不存在`);
    }

    if (target.role === dto.role) {
      return target;
    }

    if (target.role === Role.ADMIN && dto.role === Role.USER) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('系统至少需要保留一名管理员');
      }
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: USER_SELECT,
    });
  }

  async updateAccountType(targetUserId: string, dto: UpdateAccountTypeDto) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { ...USER_SELECT, parentId: true },
    });

    if (!target) {
      throw new NotFoundException(`用户 ${targetUserId} 不存在`);
    }

    if (target.accountType === AccountType.ENTERPRISE_SUB) {
      throw new BadRequestException(
        '企业子账号不可由管理员直接设置，请通过其所属主账号管理',
      );
    }

    if (target.accountType === dto.accountType) {
      return target;
    }

    // 主账号降级为普通用户前，必须先移除/转移其名下的子账号，避免产生孤儿子账号
    if (
      target.accountType === AccountType.ENTERPRISE_MAIN &&
      dto.accountType === AccountType.NORMAL
    ) {
      const subAccountCount = await this.prisma.user.count({
        where: { parentId: targetUserId },
      });
      if (subAccountCount > 0) {
        throw new BadRequestException(
          '该用户名下仍有子账号，请先移除或转移子账号后再取消其企业主账号身份',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { accountType: dto.accountType },
      select: USER_SELECT,
    });
  }
}
