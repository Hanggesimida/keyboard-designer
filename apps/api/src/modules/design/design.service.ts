import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma } from 'generated/prisma/client';
import { Role, AccountType, DesignStatus } from 'generated/prisma/enums';
import { CosService } from '../../common/cos/cos.service';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';

/** 当前请求用户的最小上下文，用于权限判断 */
export interface RequestUserContext {
  id: string;
  role?: Role;
  accountType?: AccountType;
}

type DesignWithOwner = Prisma.DesignGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        parentId: true;
        accountType: true;
        email: true;
        name: true;
      };
    };
  };
}>;

const OWNER_SELECT = {
  user: {
    select: {
      id: true,
      parentId: true,
      accountType: true,
      email: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class DesignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cosService: CosService,
  ) {}

  create(userId: string, dto: CreateDesignDto) {
    return this.prisma.design.create({
      data: {
        name: dto.name,
        data: dto.data,
        previewUrl: dto.previewUrl,
        userId,
      },
    });
  }

  findAllByUser(userId: string, status?: DesignStatus) {
    return this.prisma.design.findMany({
      where: { userId, ...(status && { status }) },
      select: {
        id: true,
        name: true,
        previewUrl: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** 企业主账号查看团队（自己 + 所有子账号）设计，可选按子账号 ID 过滤 */
  findAllByOwner(
    mainUserId: string,
    subUserId?: string,
    status?: DesignStatus,
  ) {
    return this.prisma.design.findMany({
      where: {
        user: subUserId
          ? { id: subUserId, parentId: mainUserId }
          : { parentId: mainUserId },
        ...(status && { status }),
      },
      select: {
        id: true,
        name: true,
        previewUrl: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * 权限判断：
   * - ADMIN 或本人：可读写
   * - 企业主账号访问其子账号的设计：可读写（子账号无需先提交才能被主账号编辑）
   */
  private assertDesignAccess(
    design: { userId: string; user?: { parentId: string | null } },
    user: RequestUserContext,
  ) {
    if (user.role === Role.ADMIN || design.userId === user.id) {
      return;
    }

    if (
      user.accountType === AccountType.ENTERPRISE_MAIN &&
      design.user?.parentId === user.id
    ) {
      return;
    }

    throw new ForbiddenException('无权访问该设计方案');
  }

  async findOne(
    id: string,
    user: RequestUserContext,
  ): Promise<DesignWithOwner> {
    const design = await this.prisma.design.findUnique({
      where: { id },
      include: OWNER_SELECT,
    });

    if (!design) {
      throw new NotFoundException(`设计方案 ${id} 不存在`);
    }

    this.assertDesignAccess(design, user);

    return design;
  }

  async update(id: string, user: RequestUserContext, dto: UpdateDesignDto) {
    await this.findOne(id, user);

    return this.prisma.design.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.data !== undefined && { data: dto.data }),
        ...(dto.previewUrl !== undefined && { previewUrl: dto.previewUrl }),
      },
    });
  }

  async updatePreview(id: string, user: RequestUserContext, buffer: Buffer) {
    const design = await this.findOne(id, user);

    const key = `designs/${design.userId}/${id}.webp`;
    const previewUrl = await this.cosService.uploadBuffer(
      key,
      buffer,
      'image/webp',
    );

    const updated = await this.prisma.design.update({
      where: { id },
      data: { previewUrl },
      select: { previewUrl: true },
    });

    return { previewUrl: updated.previewUrl };
  }

  /** 设计所有者（子账号或普通用户）本人提交设计，等待企业主账号审核/下单 */
  async submit(id: string, userId: string) {
    const design = await this.prisma.design.findUnique({ where: { id } });

    if (!design) {
      throw new NotFoundException(`设计方案 ${id} 不存在`);
    }

    if (design.userId !== userId) {
      throw new ForbiddenException('只能提交本人的设计方案');
    }

    return this.prisma.design.update({
      where: { id },
      data: { status: DesignStatus.SUBMITTED, submittedAt: new Date() },
    });
  }

  async remove(id: string, user: RequestUserContext) {
    await this.findOne(id, user);

    try {
      await this.prisma.design.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new ConflictException(
          '该设计方案已关联订单，无法删除。如需删除，请先取消相关订单。',
        );
      }
      throw err;
    }
  }
}
