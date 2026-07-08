import { createHash } from 'crypto';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as opentype from 'opentype.js';
import { PrismaService } from '@prisma/prisma.service';
import { Role } from 'generated/prisma/enums';
import { CosService } from '../../common/cos/cos.service';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FONTS_PER_USER = 20;
const ALLOWED_EXTS = new Set(['ttf', 'otf']);

export interface UserFontDto {
  id: string;
  displayName: string;
  url: string;
  format: string;
  fileSize: number;
  createdAt: Date;
}

@Injectable()
export class FontsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cosService: CosService,
  ) {}

  async listByUser(userId: string): Promise<UserFontDto[]> {
    const rows = await this.prisma.userFont.findMany({
      where: { userId, deletedAt: null },
      include: { blob: true },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toDto(row));
  }

  async upload(
    userId: string,
    file: Express.Multer.File,
    displayName?: string,
  ): Promise<{ font: UserFontDto; created: boolean }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传字体文件');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('字体文件不能超过 15 MB');
    }

    const format = this.resolveFormat(file);
    const { familyName } = this.parseFont(file.buffer);
    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    let blob = await this.prisma.fontBlob.findUnique({
      where: { contentHash },
    });

    if (!blob) {
      const cosKey = `fonts/blobs/${contentHash}.${format}`;
      const contentType =
        format === 'otf' ? 'font/otf' : 'font/ttf';
      try {
        const url = await this.cosService.uploadBuffer(
          cosKey,
          file.buffer,
          contentType,
          { cacheBust: false },
        );
        blob = await this.prisma.fontBlob.create({
          data: {
            contentHash,
            cosKey,
            url,
            format,
            fileSize: file.size,
            familyName,
          },
        });
      } catch (err) {
        // 并发上传同一新文件：unique 冲突时改用已有 Blob
        const existing = await this.prisma.fontBlob.findUnique({
          where: { contentHash },
        });
        if (!existing) throw err;
        blob = existing;
      }
    }

    const existingUserFont = await this.prisma.userFont.findUnique({
      where: { userId_blobId: { userId, blobId: blob.id } },
      include: { blob: true },
    });

    const resolvedName =
      displayName?.trim() ||
      familyName ||
      this.filenameWithoutExt(file.originalname) ||
      '未命名字体';

    if (existingUserFont && !existingUserFont.deletedAt) {
      return { font: this.toDto(existingUserFont), created: false };
    }

    if (existingUserFont?.deletedAt) {
      const restored = await this.prisma.userFont.update({
        where: { id: existingUserFont.id },
        data: { deletedAt: null, displayName: resolvedName },
        include: { blob: true },
      });
      return { font: this.toDto(restored), created: false };
    }

    const activeCount = await this.prisma.userFont.count({
      where: { userId, deletedAt: null },
    });
    if (activeCount >= MAX_FONTS_PER_USER) {
      throw new HttpException(
        `最多上传 ${MAX_FONTS_PER_USER} 个字体`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const created = await this.prisma.userFont.create({
      data: {
        userId,
        blobId: blob.id,
        displayName: resolvedName,
      },
      include: { blob: true },
    });

    return { font: this.toDto(created), created: true };
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const row = await this.prisma.userFont.findUnique({ where: { id } });
    if (!row || row.deletedAt) {
      throw new NotFoundException('字体不存在');
    }
    if (row.userId !== userId) {
      throw new ForbiddenException('无权删除该字体');
    }

    await this.prisma.userFont.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 按 UserFont id 解析 url（含软删）。
   * 普通用户只能解析自己的；管理员可解析任意用户（代导出用）。
   */
  async resolveByIds(
    userId: string,
    role: Role,
    ids: string[],
  ): Promise<UserFontDto[]> {
    const unique = [...new Set(ids.filter(Boolean))].slice(0, 100);
    if (unique.length === 0) return [];

    const rows = await this.prisma.userFont.findMany({
      where: {
        id: { in: unique },
        ...(role === Role.ADMIN ? {} : { userId }),
      },
      include: { blob: true },
    });

    return rows.map((row) => this.toDto(row));
  }

  private toDto(row: {
    id: string;
    displayName: string;
    createdAt: Date;
    blob: { url: string; format: string; fileSize: number };
  }): UserFontDto {
    return {
      id: row.id,
      displayName: row.displayName,
      url: row.blob.url,
      format: row.blob.format,
      fileSize: row.blob.fileSize,
      createdAt: row.createdAt,
    };
  }

  private resolveFormat(file: Express.Multer.File): 'ttf' | 'otf' {
    const name = (file.originalname || '').toLowerCase();
    const ext = name.includes('.')
      ? name.slice(name.lastIndexOf('.') + 1)
      : '';

    if (ALLOWED_EXTS.has(ext)) {
      return ext as 'ttf' | 'otf';
    }

    // MIME 兜底（浏览器差异较大）
    const mime = (file.mimetype || '').toLowerCase();
    if (mime.includes('otf') || mime.includes('opentype')) return 'otf';
    if (mime.includes('ttf') || mime.includes('truetype') || mime.includes('sfnt')) {
      return 'ttf';
    }

    throw new BadRequestException('仅支持 .ttf 或 .otf 字体文件');
  }

  private parseFont(buffer: Buffer): { familyName: string | null } {
    try {
      const arrayBuf = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;
      const font = opentype.parse(arrayBuf);
      const names = font.names as unknown as
        | Record<string, Record<string, string> | undefined>
        | undefined;
      const familyName =
        names?.fontFamily?.en ||
        names?.fullName?.en ||
        null;
      return { familyName };
    } catch {
      throw new BadRequestException('无效的字体文件，无法解析');
    }
  }

  private filenameWithoutExt(name?: string): string | null {
    if (!name) return null;
    const base = name.replace(/^.*[\\/]/, '');
    const cleaned = base.replace(/\.(ttf|otf)$/i, '').trim();
    return cleaned || null;
  }
}
