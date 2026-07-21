"use client"

import { RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

interface Preview3DOverlayProps {
  loading?: boolean
  onResetCamera: () => void
}

/** 3D 预览壳层 overlay：加载态、复位视角、操作提示 */
export function Preview3DOverlay({ loading = false, onResetCamera }: Preview3DOverlayProps) {
  return (
    <>
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2">
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
    </>
  )
}
