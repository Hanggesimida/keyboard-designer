import type {
  DesignPayload,
  PathResult,
  TextDescriptor,
} from "./contracts"
import { textsToPaths as browserTextsToPaths, generateJig as browserGenerateJig } from "./browser"

export type { DesignPayload, PathResult, TextDescriptor } from "./contracts"

export async function textsToPaths(
  texts: TextDescriptor[],
): Promise<{ results: PathResult[] }> {
  return browserTextsToPaths(texts)
}

export async function generateJig(design: DesignPayload): Promise<Blob> {
  return browserGenerateJig(design)
}
