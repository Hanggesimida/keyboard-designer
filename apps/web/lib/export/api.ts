import { request, requestBlob } from "@/lib/api/request"
import type { DesignPayload, TextDescriptor } from "./contracts"

export function textsToPaths(texts: TextDescriptor[]) {
  return request<{
    results: Array<{ id: string; pathD: string | null }>
  }>("/texts-to-paths", {
    method: "POST",
    body: { texts },
  })
}

export function generateJig(design: DesignPayload): Promise<Blob> {
  return requestBlob("/generate-jig", {
    method: "POST",
    body: { design },
  })
}
