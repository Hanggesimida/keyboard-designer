"use client"

import { RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

interface Preview3DOverlayProps {
  loading?: boolean
  onResetCamera: () => void
  /** 当前布局缺失的期望 GLB 文件名 */
  missingModels?: readonly string[]
}

/** 3D 预览壳层 overlay：加载态、缺模提示、复位视角、操作提示 */
export function Preview3DOverlay({
  loading = false,
  onResetCamera,
  missingModels = [],
}: Preview3DOverlayProps) {
  const hasMissing = missingModels.length > 0

  return (
    <>
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex flex-col items-start gap-2">
        {hasMissing && (
          <div className="max-w-full rounded border border-amber-500/40 bg-amber-950/85 px-3 py-2 text-[11px] leading-relaxed text-amber-100 backdrop-blur-sm shadow-sm">
            <span className="font-medium text-amber-50">缺失相关模型：</span>
            <span className="break-all">{missingModels.join("、")}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="pointer-events-auto size-7 bg-popover/90 text-muted-foreground hover:text-foreground border border-border backdrop-blur-sm"
            title="复位视角"
            onClick={(e) => {
              e.stopPropagation()
              onResetCamera()
            }}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <span className="select-none rounded border border-border bg-popover/90 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
            拖动旋转 · 滚轮缩放 · 右键平移
          </span>
        </div>
      </div>
    </>
  )
}
