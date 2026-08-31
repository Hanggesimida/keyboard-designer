import type { DesignPayload, TextDescriptor } from "../contracts"

export async function textsToPaths(texts: TextDescriptor[]) {
  const { textDescriptorsToPathResults } = await import("./font-to-path")
  return { results: await textDescriptorsToPathResults(texts) }
}

export async function generateJig(design: DesignPayload): Promise<Blob> {
  const { generateJigSvg } = await import("./generate-jig")
  const svg = await generateJigSvg(design)
  return new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
}
