"use client"

import { useTranslations } from "next-intl"
import { Box, ImageDown, RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

interface Preview3DOverlayProps {
  loading?: boolean
  exporting?: boolean
  onResetCamera: () => void
  onExportPng?: () => void
  showCase: boolean
  onToggleCase: () => void
  /** 当前布局缺失的期望 GLB 文件名 */
  missingModels?: readonly string[]
}

/** 3D 预览壳层 overlay：加载态、缺模提示、复位视角、导出 PNG、托盘开关、操作提示 */
export function Preview3DOverlay({
  loading = false,
  exporting = false,
  onResetCamera,
  onExportPng,
  showCase,
  onToggleCase,
  missingModels = [],
}: Preview3DOverlayProps) {
  const t = useTranslations("Design.preview3d")
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
            <span className="font-medium text-amber-50">{t("missingModels")}</span>
            <span className="break-all">{missingModels.join("、")}</span>
          </div>
        )}
        <div className="pointer-events-auto flex items-center rounded-lg border border-border bg-popover/80 pl-1 pr-2 backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-foreground cursor-pointer"
            title={t("resetView")}
            onClick={(e) => {
              e.stopPropagation()
              onResetCamera()
            }}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          {onExportPng && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-foreground cursor-pointer"
              title={t("exportPng")}
              disabled={loading || exporting}
              onClick={(e) => {
                e.stopPropagation()
                onExportPng()
              }}
            >
              {exporting ? (
                <Spinner className="size-3.5" />
              ) : (
                <ImageDown className="size-3.5" />
              )}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={
              showCase
                ? "size-7 text-foreground bg-accent cursor-pointer"
                : "size-7 text-foreground cursor-pointer"
            }
            title={showCase ? t("hideCase") : t("showCase")}
            onClick={(e) => {
              e.stopPropagation()
              onToggleCase()
            }}
          >
            <Box className="size-3.5" />
          </Button>
          <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
          <span className="select-none px-1.5 text-[11px] text-foreground/75">
            {t("hint")}
          </span>
        </div>
      </div>
    </>
  )
}
