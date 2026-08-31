import { Injectable, Logger } from '@nestjs/common';
import { Role } from 'generated/prisma/enums';
import { FontsService } from '@modules/fonts/fonts.service';
import {
  textDescriptorsToPathResults,
  type TextDescriptor,
  type PathResult,
  type UserFontAssetMap,
} from './font-to-path';
import {
  generateJigSvg,
  type DesignPayload,
} from './generate-jig';
import {
  collectUserFontIdsFromRefs,
  normalizeFontFamilyRef,
  parseUserFontId,
  toUserFontRef,
} from './font-ref';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly fontsService: FontsService) {}

  async textsToPaths(
    userId: string,
    role: Role,
    texts: TextDescriptor[],
  ): Promise<PathResult[]> {
    const ids = this.collectIdsFromDescriptors(texts);
    const userAssets = await this.resolveUserAssetMap(userId, role, ids);
    return textDescriptorsToPathResults(texts, userAssets);
  }

  async generateJig(
    userId: string,
    role: Role,
    design: DesignPayload,
  ): Promise<string> {
    const ids = this.collectIdsFromDesign(design);
    const userAssets = await this.resolveUserAssetMap(userId, role, ids);
    return generateJigSvg(design, userAssets);
  }

  private collectIdsFromDescriptors(texts: TextDescriptor[]): string[] {
    return collectUserFontIdsFromRefs(...texts.map((t) => t.fontFamily));
  }

  private collectIdsFromDesign(design: DesignPayload): string[] {
    const refs: Array<string | null | undefined> = [design.fontFamily];
    for (const keyMap of Object.values(design.layerKeycapOverrides ?? {})) {
      for (const ov of Object.values(keyMap)) {
        refs.push(ov.fontFamily);
      }
    }
    return collectUserFontIdsFromRefs(...refs);
  }

  private async resolveUserAssetMap(
    userId: string,
    role: Role,
    ids: string[],
  ): Promise<UserFontAssetMap> {
    if (ids.length === 0) return {};
    try {
      const fonts = await this.fontsService.resolveByIds(userId, role, ids);
      const map: UserFontAssetMap = {};
      for (const font of fonts) {
        map[toUserFontRef(font.id)] = { url: font.url };
      }
      return map;
    } catch (err) {
      this.logger.warn(
        `resolve user fonts failed: ${err instanceof Error ? err.message : err}`,
      );
      return {};
    }
  }
}

/** 从任意字符串中尽量抽出 uf:id（兼容 CSS uf- 形式） */
export function extractUserFontId(fontFamily: string): string | null {
  return parseUserFontId(normalizeFontFamilyRef(fontFamily));
}
