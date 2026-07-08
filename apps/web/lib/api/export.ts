import { request, requestBlob } from './request';

/** 与 Nest ExportModule / 旧 Next texts-to-paths 契约一致 */
export interface TextDescriptor {
  id: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: number;
  fontStyle?: string;
  lines: string[];
  lineHeightRatio: number;
  letterSpacing: number;
  fill: string;
}

export interface PathResult {
  id: string;
  pathD: string | null;
}

export function textsToPaths(
  texts: TextDescriptor[],
): Promise<{ results: PathResult[] }> {
  return request<{ results: PathResult[] }>('/texts-to-paths', {
    method: 'POST',
    body: { texts },
  });
}

/** 生成治具 SVG；成功返回 Blob，文件名可从 Content-Disposition 推断由调用方命名 */
export function generateJig(design: unknown): Promise<Blob> {
  return requestBlob('/generate-jig', {
    method: 'POST',
    body: { design },
  });
}
