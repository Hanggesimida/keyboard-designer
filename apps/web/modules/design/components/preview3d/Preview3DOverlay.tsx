"use client"

import { useTranslations } from "next-intl"
import {
  ArrowDownToLine,
  Box,
  ImageDown,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  CASE_MATERIAL_PRESETS,
  type CaseMaterialPresetId,
} from "@/modules/design/lib/preview3d/caseMaterialPresets"

const PREVIEW_3D_SHELL_STYLE = {
  backgroundColor: "var(--design-preview3d-bg)",
  backgroundImage:
    "radial-gradient(circle, var(--design-canvas-grid-dot) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
} as const

/** 不透明加载遮罩：盖住空 Canvas / chunk 下载期空白 */
export function Preview3DLoadingCover() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center"
      style={PREVIEW_3D_SHELL_STYLE}
      aria-busy
    >
      <Spinner className="size-5 text-muted-foreground" />
    </div>
  )
}

/** next/dynamic 的 loading：与场景就绪遮罩同一视觉 */
export function Preview3DChunkFallback() {
  return (
    <div className="relative h-full w-full">
      <Preview3DLoadingCover />
    </div>
  )
}

interface Preview3DOverlayProps {
  loading?: boolean
  exporting?: boolean
  onResetCamera: () => void
  onTopView: () => void
  onExportPng?: () => void
  showCase: boolean
  onToggleCase: () => void
  showRealism: boolean
  onToggleRealism: () => void
  caseMaterialPreset: CaseMaterialPresetId
  onCaseMaterialPresetChange: (preset: CaseMaterialPresetId) => void
  /** 当前布局缺失的期望 GLB 文件名 */
  missingModels?: readonly string[]
}

/** 3D 预览壳层 overlay：加载态、缺模提示、视角、导出及显示开关 */
export function Preview3DOverlay({
  loading = false,
  exporting = false,
  onResetCamera,
  onTopView,
  onExportPng,
  showCase,
  onToggleCase,
  showRealism,
  onToggleRealism,
  caseMaterialPreset,
  onCaseMaterialPresetChange,
  missingModels = [],
}: Preview3DOverlayProps) {
  const t = useTranslations("Design.preview3d")
  const hasMissing = missingModels.length > 0

  return (
    <>
      {loading && <Preview3DLoadingCover />}

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-foreground cursor-pointer"
            title={t("topView")}
            onClick={(e) => {
              e.stopPropagation()
              onTopView()
            }}
          >
            <ArrowDownToLine className="size-3.5" />
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
          <Select
            value={caseMaterialPreset}
            onValueChange={(value) => {
              if (typeof value === "string") {
                onCaseMaterialPresetChange(value as CaseMaterialPresetId)
              }
            }}
          >
            <SelectTrigger
              size="sm"
              disabled={!showCase}
              className="h-7 w-[112px] border-0 bg-transparent px-2 text-[11px] shadow-none"
              aria-label={t("caseMaterial")}
              title={t("caseMaterial")}
            >
              <SelectValue>
                {t(`materials.${caseMaterialPreset}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="top" align="start">
              {CASE_MATERIAL_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {t(`materials.${preset.id}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={
              showRealism
                ? "size-7 text-foreground bg-accent cursor-pointer"
                : "size-7 text-foreground cursor-pointer"
            }
            title={showRealism ? t("disableRealism") : t("enableRealism")}
            aria-pressed={showRealism}
            onClick={(e) => {
              e.stopPropagation()
              onToggleRealism()
            }}
          >
            <Sparkles className="size-3.5" />
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
