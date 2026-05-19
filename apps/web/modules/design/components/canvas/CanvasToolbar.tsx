"use client"

import { Undo2, Redo2, RotateCcw, FileImage, FileCode2, FileJson2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import type { ExportArtboardParams } from "@/modules/design/lib/design/exportArtboard"
import {
  exportArtboardJson,
  exportArtboardPng,
  exportArtboardSvg,
} from "@/modules/design/lib/design/exportArtboard"

interface CanvasToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  getExportParams: () => ExportArtboardParams
}

export function CanvasToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  getExportParams,
}: CanvasToolbarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 select-none rounded bg-black/30 px-2 py-0.5 backdrop-blur-sm">
      <button
        type="button"
        title="撤销 (Ctrl+Z)"
        disabled={!canUndo}
        onClick={(e) => { e.stopPropagation(); onUndo() }}
        className="flex items-center justify-center rounded p-0.5 transition-colors disabled:opacity-25 enabled:hover:bg-white/10 enabled:hover:text-white/70 text-white/40"
      >
        <Undo2 className="size-3.5" />
      </button>
      <button
        type="button"
        title="重做 (Ctrl+Y)"
        disabled={!canRedo}
        onClick={(e) => { e.stopPropagation(); onRedo() }}
        className="flex items-center justify-center rounded p-0.5 transition-colors disabled:opacity-25 enabled:hover:bg-white/10 enabled:hover:text-white/70 text-white/40"
      >
        <Redo2 className="size-3.5" />
      </button>

      <span className="mx-0.5 h-3 w-px bg-white/15" />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            title="重置为原始布局"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center rounded p-0.5 transition-colors text-white/40 hover:bg-white/10 hover:text-orange-400/80"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重置为原始布局？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将清除所有键帽覆盖样式、全局样式修改、画板背景及画布图片，恢复到初始默认状态。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onReset}>
              确认重置
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <span className="mx-0.5 h-3 w-px bg-white/15" />

      <button
        type="button"
        title="导出 PNG"
        onClick={(e) => { e.stopPropagation(); exportArtboardPng(getExportParams()) }}
        className="flex items-center justify-center gap-1 rounded px-1 py-0.5 transition-colors text-white/40 hover:bg-white/10 hover:text-white/70"
      >
        <FileImage className="size-3.5" />
        <span className="text-[11px] leading-none">PNG</span>
      </button>

      <button
        type="button"
        title="导出 SVG"
        onClick={(e) => { e.stopPropagation(); exportArtboardSvg(getExportParams()) }}
        className="flex items-center justify-center gap-1 rounded px-1 py-0.5 transition-colors text-white/40 hover:bg-white/10 hover:text-white/70"
      >
        <FileCode2 className="size-3.5" />
        <span className="text-[11px] leading-none">SVG</span>
      </button>

      <button
        type="button"
        title="导出 JSON"
        onClick={(e) => { e.stopPropagation(); exportArtboardJson() }}
        className="flex items-center justify-center gap-1 rounded px-1 py-0.5 transition-colors text-white/40 hover:bg-white/10 hover:text-white/70"
      >
        <FileJson2 className="size-3.5" />
        <span className="text-[11px] leading-none">JSON</span>
      </button>
    </div>
  )
}
