import fs from 'fs';
import path from 'path';

/**
 * 解析内置字体 / 治具数据文件路径。
 *
 * 查找顺序：
 * 1. process.cwd()/assets（Docker runner WORKDIR=/app，或本地 apps/api）
 * 2. 相对 monorepo：apps/web/public/fonts（开发时复用 web TTF，避免复制 49MB）
 * 3. 相对 monorepo：apps/web/modules/design/data（开发兜底）
 *
 * 注意：api 使用 webpack 打包为单一 dist/main.js，勿依赖 __dirname 定位源码目录。
 */

function candidateAssetRoots(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, 'assets'),
    path.join(cwd, 'apps', 'api', 'assets'),
  ];
}

function firstExisting(...candidates: string[]): string | null {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** relativePath 形如 fonts/inter/xxx.ttf */
export function resolveBundledFontPath(relativePath: string): string | null {
  const rel = relativePath.replace(/^[/\\]+/, '');
  const fromAssets = candidateAssetRoots().map((root) => path.join(root, rel));
  const fromWebPublic = [
    path.join(process.cwd(), '..', 'web', 'public', rel),
    path.join(process.cwd(), 'apps', 'web', 'public', rel),
  ];
  return firstExisting(...fromAssets, ...fromWebPublic);
}

/** segments 相对 design-data，如 ('layouts','ansi-87.json') 或 ('jig','keycap_jig.svg') */
export function resolveDesignDataPath(...segments: string[]): string | null {
  const fromAssets = candidateAssetRoots().map((root) =>
    path.join(root, 'design-data', ...segments),
  );
  const fromWeb = [
    path.join(
      process.cwd(),
      '..',
      'web',
      'modules',
      'design',
      'data',
      ...segments,
    ),
    path.join(
      process.cwd(),
      'apps',
      'web',
      'modules',
      'design',
      'data',
      ...segments,
    ),
  ];
  return firstExisting(...fromAssets, ...fromWeb);
}
