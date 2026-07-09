import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { AccountType } from 'generated/prisma/enums';

const AUTH_SELECT = {
  id: true,
  email: true,
  role: true,
  accountType: true,
  isActive: true,
  parentId: true,
  mustChangePassword: true,
  passwordChangedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByIdForAuth(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...AUTH_SELECT, password: true },
    });
    if (!user) return null;
    const { password, ...profile } = user;
    return { ...profile, hasPassword: password != null };
  }

  create(data: {
    email: string;
    password?: string;
    accountType?: AccountType;
    parentId?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  setPassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
      select: AUTH_SELECT,
    });
  }
}
