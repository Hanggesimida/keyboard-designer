import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateDesignDto } from './dto/create-design.dto';
import { UpdateDesignDto } from './dto/update-design.dto';

@Injectable()
export class DesignService {
  constructor(private readonly prisma: PrismaService) {}

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

  findAllByUser(userId: string) {
    return this.prisma.design.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        previewUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const design = await this.prisma.design.findUnique({ where: { id } });

    if (!design) {
      throw new NotFoundException(`设计方案 ${id} 不存在`);
    }

    if (design.userId !== userId) {
      throw new ForbiddenException('无权访问该设计方案');
    }

    return design;
  }

  async update(id: string, userId: string, dto: UpdateDesignDto) {
    await this.findOne(id, userId);

    return this.prisma.design.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.data !== undefined && { data: dto.data }),
        ...(dto.previewUrl !== undefined && { previewUrl: dto.previewUrl }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);

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
