import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { Role } from 'generated/prisma/enums';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAdminUsersDto) {
    const { page = 1, limit = 20, search, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
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
}
